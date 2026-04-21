import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./ImageUploadZone";
import { ConfigPanel } from "./ConfigPanel";
import { ResultsPanel } from "./ResultsPanel";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { SceneBreakdown, type SceneFrame, type ElementDirections } from "./SceneBreakdown";
import { ReferenceMediaPanel } from "./ReferenceMediaPanel";
import type { ReferenceMediaItem } from "./ReferenceItem";
import { ElementGrid, type ElementItem } from "./ElementGrid";
import { MentionTextarea } from "./MentionTextarea";
import { SceneMentionTextarea, type SceneMentionTextareaHandle } from "./SceneMentionTextarea";
import { extractVideoKeyframes, compressImageFile } from "@/lib/videoFrames";
import { Sparkles, Loader2, ScanSearch, RotateCcw, RefreshCw, Info, Volume2, VolumeX, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackGeneration } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { getContract, deriveWorkflowType } from "@/lib/modelContracts";
import { MODEL_GROUPS } from "@/lib/models";

type Phase = "upload" | "breakdown" | "generate";

interface ShotResult {
  shotName?: string;
  mainPrompt: string;
  negativePrompt: string;
  cameraSuggestions: string;
  modelNotes: string;
  suggestedAspectRatio?: string;
  suggestedDuration?: string;
  audioBlock?: string;
  cameraTags?: string;
  referenceGuidance?: string;
  shotStructure?: string;
  recommendedModel?: string;
  recommendedModelReason?: string;
}

interface WorkflowPanelProps {
  selectedModel: string;
  onSwitchModel?: (value: string) => void;
}

const phaseTransition = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const },
};

export const WorkflowPanel = ({ selectedModel, onSwitchModel }: WorkflowPanelProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<ShotResult[] | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("upload");
  const [sceneFrames, setSceneFrames] = useState<SceneFrame[]>([]);
  const [elementDirections, setElementDirections] = useState<ElementDirections>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [referenceItems, setReferenceItems] = useState<ReferenceMediaItem[]>([]);
  const [elementItems, setElementItems] = useState<ElementItem[]>([]);
  const sceneMentionRef = useRef<SceneMentionTextareaHandle>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Flatten scene frames into a single 1-based indexed list (left-to-right, frame-by-frame).
  const flatSceneElements = useMemo(() => {
    const out: { index: number; category: string; description: string; id: string }[] = [];
    let n = 0;
    for (const frame of sceneFrames) {
      for (const el of frame.elements) {
        n += 1;
        out.push({ index: n, category: el.category, description: el.description, id: el.id });
      }
    }
    return out;
  }, [sceneFrames]);

  const contract = useMemo(() => getContract(selectedModel), [selectedModel]);
  const [twoFrameMode, setTwoFrameMode] = useState(false);
  const [multiShotMode, setMultiShotMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const activeSlots = contract.supportsTwoFrameToggle && twoFrameMode ? 2 : contract.slots;
  const workflowType = deriveWorkflowType(selectedModel, activeSlots, contract.supportsMultiShotToggle && multiShotMode);

  const handleImageSelect = useCallback((index: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = { file, preview };
      return next;
    });
    setResults(null);
    setPhase("upload");
    setSceneFrames([]);
    setElementDirections({});
  }, []);

  const handleImageRemove = useCallback((index: number) => {
    setImages((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setPhase("upload");
  }, []);

  const hasRequiredImages = contract.supportsElementReferences
    ? elementItems.length >= 1
    : images.filter(Boolean).length >= 1;

  const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.split(",")[1]);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!hasRequiredImages) return;
    // Element-only mode (no main frames): skip scene analysis and jump straight to breakdown phase.
    if (images.filter(Boolean).length === 0) {
      setSceneFrames([]);
      setElementDirections({});
      setPhase("breakdown");
      return;
    }
    if (!user) {
      toast({ title: t("wp.signInRequired"), description: t("wp.signInAnalyze"), variant: "destructive" });
      navigate("/auth");
      return;
    }
    setIsAnalyzing(true);
    try {
      const imageBase64s = await Promise.all(images.filter(Boolean).map((img) => compressImage(img.file)));
      const { data, error } = await supabase.functions.invoke("analyze-scene", {
        body: { images: imageBase64s },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const frames: SceneFrame[] = data.frames || [];
      setSceneFrames(frames);

      const dirs: ElementDirections = {};
      for (const frame of frames) {
        for (const el of frame.elements) {
          dirs[el.id] = { action: "move", note: "" };
        }
      }
      setElementDirections(dirs);
      setPhase("breakdown");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({ title: t("wp.analysisFailed"), description: err.message || t("wp.somethingWrong"), variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasRequiredImages) return;
    if (!user) {
      toast({ title: t("wp.signInRequired"), description: t("wp.signInGenerate"), variant: "destructive" });
      navigate("/auth");
      return;
    }
    setIsLoading(true);
    setResults(null);

    try {
      const imageBase64s = await Promise.all(images.filter(Boolean).map((img) => compressImage(img.file)));

      // Process references: images → resized base64; videos → keyframes; audio → metadata only
      const referencesPayload = await Promise.all(
        referenceItems.map(async (ref) => {
          if (ref.kind === "image") {
            const b64 = await compressImageFile(ref.file);
            return { kind: "image", role: ref.role, note: ref.note || undefined, filename: ref.file.name, images: [b64] };
          }
          if (ref.kind === "video") {
            try {
              const frames = await extractVideoKeyframes(ref.file, 3);
              return { kind: "video", role: ref.role, note: ref.note || undefined, filename: ref.file.name, images: frames };
            } catch (e) {
              console.error("Video keyframe extraction failed:", e);
              return { kind: "video", role: ref.role, note: ref.note || undefined, filename: ref.file.name, images: [] };
            }
          }
          return { kind: "audio", role: ref.role, note: ref.note || undefined, filename: ref.file.name };
        })
      );

      // Process @Element references (Seedance 2.0 / 2.0 Fast). Treated like references on the wire.
      const elementsPayload = contract.supportsElementReferences
        ? await Promise.all(
            elementItems.map(async (el, idx) => {
              const base = { role: "style" as const, note: el.note || undefined, filename: el.file.name, index: idx + 1 };
              if (el.kind === "image") {
                const b64 = await compressImageFile(el.file);
                return { ...base, kind: "image", images: [b64] };
              }
              if (el.kind === "video") {
                try {
                  const frames = await extractVideoKeyframes(el.file, 3);
                  return { ...base, kind: "video", images: frames };
                } catch (e) {
                  console.error("Element video keyframe extraction failed:", e);
                  return { ...base, kind: "video", images: [] };
                }
              }
              return { ...base, kind: "audio" };
            }),
          )
        : [];

      const sceneBreakdown = sceneFrames.length > 0
        ? sceneFrames.map((frame) => ({
            frameIndex: frame.frameIndex,
            frameLabel: frameLabels[frame.frameIndex] || `Frame ${frame.frameIndex + 1}`,
            elements: frame.elements.map((el) => ({
              category: el.category,
              description: el.description,
              action: elementDirections[el.id]?.action || "move",
              note: elementDirections[el.id]?.note || "",
            })),
          }))
        : undefined;

      // Resolve @N mentions from description against the flat scene element list
      const mentionedNumbers = Array.from(new Set(
        Array.from((description || "").matchAll(/(?:^|\s)@(\d+)\b/g))
          .map((m) => Number(m[1]))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= flatSceneElements.length),
      ));
      const elementMentions = mentionedNumbers
        .map((n) => flatSceneElements.find((el) => el.index === n))
        .filter((el): el is { index: number; category: string; description: string; id: string } => Boolean(el))
        .map(({ index, category, description }) => ({ index, category, description }));

      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: {
          images: imageBase64s,
          workflowType,
          description,
          targetModel: selectedModel,
          sceneBreakdown,
          audioEnabled: contract.supportsAudio ? audioEnabled : undefined,
          references: referencesPayload.length > 0 ? referencesPayload : undefined,
          elements: elementsPayload.length > 0 ? elementsPayload : undefined,
          autoInjectElements: elementsPayload.length > 0 ? true : undefined,
          elementMentions: elementMentions.length > 0 ? elementMentions : undefined,
          multiShotCount: workflowType === "multishot" && contract.supportsMultiShotToggle ? contract.multiShotCount : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results);
      setAgentName(data.agentName ?? null);
      setPhase("generate");
      trackGeneration(workflowType, selectedModel);

      if (user) {
        supabase.from("prompt_history").insert({
          user_id: user.id,
          workflow_type: workflowType,
          target_model: selectedModel,
          results: data.results,
        }).select("id").single().then(async ({ data: row, error: histErr }) => {
          if (histErr || !row) {
            console.error("Failed to save history:", histErr);
            return;
          }
          try {
            const paths: string[] = [];
            const validImages = images.filter(Boolean);
            for (let i = 0; i < validImages.length; i++) {
              const filePath = `${user.id}/${row.id}/frame_${i}.jpg`;
              const { error: uploadErr } = await supabase.storage
                .from("generation-images")
                .upload(filePath, validImages[i].file, { contentType: "image/jpeg", upsert: true });
              if (uploadErr) {
                console.error("Image upload error:", uploadErr);
              } else {
                paths.push(filePath);
              }
            }
            if (paths.length > 0) {
              await supabase.from("prompt_history")
                .update({ image_paths: paths } as any)
                .eq("id", row.id);
            }
          } catch (e) {
            console.error("Image upload failed:", e);
          }
        });
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: t("wp.generationFailed"), description: err.message || t("wp.somethingWrongRetry"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Slot labels from contract (translation keys)
  const slotLabels: string[] = (() => {
    if (activeSlots === 2) {
      return [t("frame.start"), t("frame.endOptional" as any)];
    }
    return contract.slotLabels.map((k) => t(k as any));
  })();

  // Frame labels for SceneBreakdown
  const frameLabels: string[] = (() => {
    if (workflowType === "twoframe") return [t("frame.start"), t("frame.end")];
    if (workflowType === "multishot") return [t("frame.concept")];
    return [t("frame.your")];
  })();

  const extrasHint = contract.extrasHintKey ? t(contract.extrasHintKey as any) : null;

  return (
    <div className="space-y-6">
      {/* Extras hint */}
      {extrasHint && (
        <div className="max-w-2xl mx-auto flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
          <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span>{extrasHint}</span>
        </div>
      )}

      {/* Audio toggle (Veo 3.1, Seedance 2.0) */}
      {contract.supportsAudio && (
        <button
          onClick={() => setAudioEnabled((v) => !v)}
          className={`flex items-center justify-between gap-3 w-full max-w-xs mx-auto rounded-lg border px-3 py-2 transition-colors ${
            audioEnabled
              ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
              : "border-border bg-secondary/40 hover:bg-secondary/60"
          }`}
          aria-pressed={audioEnabled}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
            {t("contract.audio.label" as any)}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              audioEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                audioEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      )}

      {/* Mode toggle: handles 1↔2 frame, single↔multishot, or 3-way (Single | 2 Frames | Multi-shot) */}
      {(contract.supportsTwoFrameToggle || contract.supportsMultiShotToggle) && (() => {
        const both = contract.supportsTwoFrameToggle && contract.supportsMultiShotToggle;
        const multiLabel = contract.multiShotCount === 10
          ? t("contract.toggle.multiShot10" as any)
          : t("contract.toggle.multiShot3" as any);

        const setMode = (mode: "single" | "twoframe" | "multishot") => {
          setTwoFrameMode(mode === "twoframe");
          setMultiShotMode(mode === "multishot");
          setImages([]);
          setResults(null);
          setPhase("upload");
        };
        const currentMode: "single" | "twoframe" | "multishot" =
          multiShotMode ? "multishot" : twoFrameMode ? "twoframe" : "single";

        const widthClass = both ? "max-w-md" : "max-w-xs";
        const btn = (active: boolean) =>
          `flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
            active ? "bg-card text-foreground shadow-sm ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"
          }`;

        return (
          <div className={`flex justify-center gap-1 rounded-lg bg-secondary/70 border border-border/60 shadow-inner p-1 ${widthClass} mx-auto`}>
            <button onClick={() => setMode("single")} className={btn(currentMode === "single")}>
              {contract.supportsMultiShotToggle && !contract.supportsTwoFrameToggle
                ? t("contract.toggle.singleShot" as any)
                : t("contract.toggle.single" as any)}
            </button>
            {contract.supportsTwoFrameToggle && (
              <button onClick={() => setMode("twoframe")} className={btn(currentMode === "twoframe")}>
                {t("contract.toggle.startEnd" as any)}
              </button>
            )}
            {contract.supportsMultiShotToggle && (
              <button onClick={() => setMode("multishot")} className={btn(currentMode === "multishot")}>
                {multiLabel}
              </button>
            )}
          </div>
        );
      })()}

      {!contract.supportsElementReferences && (
        <div className={`grid gap-4 ${activeSlots === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-lg mx-auto"}`}>
          {Array.from({ length: activeSlots }).map((_, i) => (
            <ImageUploadZone
              key={i}
              label={slotLabels[i] || `Frame ${i + 1}`}
              preview={images[i]?.preview || null}
              onImageSelect={(file) => handleImageSelect(i, file)}
              onImageRemove={() => handleImageRemove(i)}
            />
          ))}
        </div>
      )}

      {contract.supportsElementReferences && (
        <ElementGrid items={elementItems} onChange={setElementItems} max={contract.maxElements ?? 10} />
      )}


      <AnimatePresence mode="wait">
        {hasRequiredImages && phase === "upload" && (
          <motion.div key="upload-phase" {...phaseTransition} className="space-y-3">
            <p className="text-sm text-muted-foreground max-w-md mx-auto text-center">
              {t("wp.analyzeDesc")}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("wp.analyzingScene")}</>
                ) : (
                  <><ScanSearch className="w-4 h-4 me-2" /> {t("wp.analyzeScene")}</>
                )}
              </Button>
              <Button
                size="lg"
                onClick={() => { setSceneFrames([]); setPhase("breakdown"); }}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 font-display font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
              >
                <Zap className="w-4 h-4 me-2" /> {t("wp.skip")}
              </Button>
            </div>
          </motion.div>
        )}

        {(phase === "breakdown" || phase === "generate") && sceneFrames.length > 0 && (
          <motion.div key="breakdown-phase" {...phaseTransition} className="space-y-4">
            <SceneBreakdown
              frames={sceneFrames}
              frameLabels={frameLabels}
              framePreviews={images.map((img) => img?.preview || null)}
              directions={elementDirections}
              onDirectionsChange={setElementDirections}
              onInsertMention={(n) => sceneMentionRef.current?.insertMention(n)}
            />

            <div className="flex justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setPhase("upload"); setSceneFrames([]); setElementDirections({}); setResults(null); }}
                className="gap-1.5 border-white/20 text-muted-foreground hover:text-foreground hover:border-primary/50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {t("wp.startOver")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-1.5 border-white/20 text-muted-foreground hover:text-foreground hover:border-primary/50"
              >
                <ScanSearch className="w-3.5 h-3.5" /> {t("wp.reAnalyze")}
              </Button>
            </div>

            {contract.supportsElementReferences ? (
              <MentionTextarea
                value={description}
                onChange={setDescription}
                elements={elementItems}
                placeholder={t("config.placeholder")}
              />
            ) : (
              <SceneMentionTextarea
                ref={sceneMentionRef}
                value={description}
                onChange={setDescription}
                elements={flatSceneElements.map(({ index, category, description }) => ({ index, category, description }))}
                placeholder={t("config.placeholder")}
              />
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 sm:px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("wp.generatingPrompt")}</>
                ) : results ? (
                  <><RefreshCw className="w-4 h-4 me-2" /> {t("wp.regeneratePrompt")}</>
                ) : (
                  <><Sparkles className="w-4 h-4 me-2" /> {t("wp.generatePrompt")}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {(phase === "breakdown" || phase === "generate") && sceneFrames.length === 0 && (
          <motion.div key="skip-phase" {...phaseTransition} className="space-y-4">
            <div className="flex justify-start">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setPhase("upload"); setResults(null); }}
                className="gap-1.5 border-white/20 text-muted-foreground hover:text-foreground hover:border-primary/50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {t("wp.startOver")}
              </Button>
            </div>
            {contract.supportsElementReferences ? (
              <MentionTextarea
                value={description}
                onChange={setDescription}
                elements={elementItems}
                placeholder={t("config.placeholder")}
              />
            ) : (
              <ConfigPanel description={description} onDescriptionChange={setDescription} />
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 sm:px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("wp.generatingPrompt")}</>
                ) : results ? (
                  <><RefreshCw className="w-4 h-4 me-2" /> {t("wp.regeneratePrompt")}</>
                ) : (
                  <><Sparkles className="w-4 h-4 me-2" /> {t("wp.generatePrompt")}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && !results && <ResultsSkeleton />}
        {results && (
          <ResultsPanel
            results={results}
            onRegenerate={handleGenerate}
            isLoading={isLoading}
            agentName={agentName ?? undefined}
            modelLabel={MODEL_GROUPS.flatMap(g => g.models).find(m => m.value === selectedModel)?.label ?? selectedModel}
            stitchHint={workflowType === "multishot" && contract.supportsMultiShotToggle && (contract.multiShotCount ?? 0) > 1}
            elementsLegend={contract.supportsElementReferences && elementItems.length > 0
              ? elementItems.map((el, idx) => ({ index: idx + 1, kind: el.kind, preview: el.preview }))
              : undefined}
            onSwitchModel={selectedModel === "any" ? onSwitchModel : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
