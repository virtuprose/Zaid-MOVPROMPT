import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
import { Sparkles, Loader2, ScanSearch, RotateCcw, RefreshCw, Info, Volume2, VolumeX, Zap, Clapperboard, ArrowRight, ArrowDown, ArrowLeft } from "lucide-react";
import { PresetPickerPanel } from "./PresetPickerPanel";
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
import { detectAllIntents } from "@/lib/sceneIntent";
import { ModelPicker } from "./ModelPicker";
import { OnboardingExamples, type OnboardingExample } from "./OnboardingExamples";

const ONBOARDING_DONE_KEY = "movprompt.firstGenerationDone";

// Max number of scene elements to include in the AI enhance request.
// Kept deterministic (sorted by @index) so model inputs stay consistent across calls.
const ENHANCE_SCENE_SUMMARY_MAX_ELEMENTS = 20;

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
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [resetSnapshot, setResetSnapshot] = useState<ElementDirections | null>(null);
  const resetSnapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);

  // Enhance my vision (AI rewrite of Describe)
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [enhancedDraft, setEnhancedDraft] = useState<string | null>(null);
  const [enhanceUndoSnapshot, setEnhanceUndoSnapshot] = useState<string | null>(null);
  const enhanceUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEnhanceUndo = useCallback(() => {
    if (enhanceUndoTimerRef.current) {
      clearTimeout(enhanceUndoTimerRef.current);
      enhanceUndoTimerRef.current = null;
    }
    setEnhanceUndoSnapshot(null);
  }, []);

  const handleUndoEnhance = useCallback(() => {
    if (enhanceUndoSnapshot === null) return;
    setDescription(enhanceUndoSnapshot);
    clearEnhanceUndo();
  }, [enhanceUndoSnapshot, clearEnhanceUndo]);

  useEffect(() => {
    return () => {
      if (enhanceUndoTimerRef.current) clearTimeout(enhanceUndoTimerRef.current);
    };
  }, []);

  // handleEnhanceClick / handleApplyEnhanced are defined after flatSceneElements below.

  const clearResetSnapshot = useCallback(() => {
    if (resetSnapshotTimerRef.current) {
      clearTimeout(resetSnapshotTimerRef.current);
      resetSnapshotTimerRef.current = null;
    }
    setResetSnapshot(null);
  }, []);

  const handleUndoReset = useCallback(() => {
    if (!resetSnapshot) return;
    setElementDirections(resetSnapshot);
    clearResetSnapshot();
  }, [resetSnapshot, clearResetSnapshot]);

  useEffect(() => {
    return () => {
      if (resetSnapshotTimerRef.current) clearTimeout(resetSnapshotTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "breakdown" && phase !== "generate") {
      clearResetSnapshot();
      setConfirmResetOpen(false);
    }
  }, [phase, clearResetSnapshot]);
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  });

  const handlePickExample = useCallback(async (example: OnboardingExample) => {
    try {
      const res = await fetch(example.src);
      const blob = await res.blob();
      const file = new File([blob], `${example.alt.replace(/\s+/g, "-").toLowerCase()}.jpg`, { type: blob.type || "image/jpeg" });
      // Reset modes to match the example's intended workflow
      setMultiShotMode(example.workflow === "multishot");
      setTwoFrameMode(example.workflow === "twoframe");
      const preview = URL.createObjectURL(file);
      setImages([{ file, preview }]);
      setResults(null);
      setPhase("upload");
      setSceneFrames([]);
      setElementDirections({});
    } catch (e) {
      console.error("Failed to load example image", e);
    }
  }, []);

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

  const handleEnhanceClick = useCallback(async () => {
    if (description.trim().length < 10 || enhanceLoading) return;
    setEnhanceLoading(true);
    try {
      const sceneSummary = flatSceneElements.length > 0
        ? [...flatSceneElements]
            .sort((a, b) => a.index - b.index)
            .slice(0, ENHANCE_SCENE_SUMMARY_MAX_ELEMENTS)
            .map((el) => {
              const category = (el.category || "element").trim();
              const description = (el.description || "").trim();
              return description
                ? `@${el.index} ${category}: ${description}`
                : `@${el.index} ${category}`;
            })
            .join("; ")
        : undefined;

      const { data, error } = await supabase.functions.invoke("enhance-description", {
        body: { description, sceneSummary },
      });

      if (error) {
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        if (status === 429) {
          toast({ title: t("enhance.error.rateLimit" as any), variant: "destructive" });
        } else if (status === 402) {
          toast({ title: t("enhance.error.credits" as any), variant: "destructive" });
        } else {
          toast({ title: t("enhance.error.generic" as any), variant: "destructive" });
        }
        return;
      }
      if (data?.error || typeof data?.enhanced !== "string" || !data.enhanced.trim()) {
        toast({ title: t("enhance.error.generic" as any), variant: "destructive" });
        return;
      }
      setEnhancedDraft(data.enhanced.trim());
      setEnhanceOpen(true);
    } catch (err) {
      console.error("Enhance error:", err);
      toast({ title: t("enhance.error.generic" as any), variant: "destructive" });
    } finally {
      setEnhanceLoading(false);
    }
  }, [description, enhanceLoading, flatSceneElements, t, toast]);

  const handleApplyEnhanced = useCallback(() => {
    if (!enhancedDraft) return;
    setEnhanceUndoSnapshot(description);
    setDescription(enhancedDraft);
    setEnhanceOpen(false);
    setEnhancedDraft(null);
    if (enhanceUndoTimerRef.current) clearTimeout(enhanceUndoTimerRef.current);
    enhanceUndoTimerRef.current = setTimeout(() => {
      setEnhanceUndoSnapshot(null);
      enhanceUndoTimerRef.current = null;
    }, 8000);
  }, [enhancedDraft, description]);

  const performAutoReset = useCallback(() => {
    setElementDirections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const el of flatSceneElements) {
        if (manualOverrides[el.id]) continue;
        const curr = prev[el.id];
        if (curr?.action !== "move") {
          next[el.id] = { action: "move", note: curr?.note || "" };
          changed = true;
        }
      }
      if (changed) {
        setResetSnapshot(prev);
        if (resetSnapshotTimerRef.current) clearTimeout(resetSnapshotTimerRef.current);
        resetSnapshotTimerRef.current = setTimeout(() => {
          setResetSnapshot(null);
          resetSnapshotTimerRef.current = null;
        }, 8000);
      }
      return changed ? next : prev;
    });
  }, [flatSceneElements, manualOverrides]);

  // Auto-assign Move/Lock based on verbs near @N mentions in the description.
  // Debounced 150ms. Skips elements the user has manually overridden.
  useEffect(() => {
    if (phase !== "breakdown") return;
    if (flatSceneElements.length === 0) return;
    if (description.trim() === "") {
      // Find elements that would be affected and have non-default state (lock or note).
      const atRisk = flatSceneElements.filter((el) => {
        if (manualOverrides[el.id]) return false;
        const dir = elementDirections[el.id];
        if (!dir) return false;
        return dir.action === "lock" || (dir.note ?? "") !== "";
      });
      if (atRisk.length === 0) {
        // Silent reset path (no notable changes — won't capture snapshot since nothing is non-default).
        performAutoReset();
        return;
      }
      // Prompt user before wiping non-default auto-assigned state.
      setPendingResetCount(atRisk.length);
      setConfirmResetOpen(true);
      return;
    }
    // User typed again — invalidate any pending undo snapshot or open confirm dialog.
    if (resetSnapshot) clearResetSnapshot();
    if (confirmResetOpen) setConfirmResetOpen(false);
    const timer = setTimeout(() => {
      const intents = detectAllIntents(description);
      setElementDirections((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const el of flatSceneElements) {
          if (manualOverrides[el.id]) continue;
          const target = intents[el.index] ?? "move";
          const curr = prev[el.id];
          if (curr?.action !== target) {
            next[el.id] = { action: target, note: curr?.note || "" };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [description, flatSceneElements, manualOverrides, phase, resetSnapshot, clearResetSnapshot, elementDirections, confirmResetOpen, performAutoReset]);

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
      setManualOverrides({});
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
      try {
        localStorage.setItem(ONBOARDING_DONE_KEY, "1");
        setHasGeneratedBefore(true);
      } catch {}

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

  // ============ Reusable JSX blocks ============

  const extrasHintBlock = extrasHint && (
    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
      <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <span>{extrasHint}</span>
    </div>
  );

  const audioToggleBlock = contract.supportsAudio && (
    <button
      onClick={() => setAudioEnabled((v) => !v)}
      className={`flex items-center justify-between gap-3 w-full rounded-lg border px-3 py-2 transition-colors ${
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
  );

  const modeToggleBlock = (contract.supportsTwoFrameToggle || contract.supportsMultiShotToggle) && (() => {
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

    const widthClass = both ? "sm:max-w-md" : "sm:max-w-xs";
    const btn = (active: boolean) =>
      `flex-1 min-w-0 basis-[140px] sm:basis-0 px-3 py-2 sm:px-5 sm:py-2.5 text-xs whitespace-normal break-words leading-tight rounded-md transition-all ${
        active
          ? "bg-[rgba(0,212,255,0.15)] border-[1.5px] border-[#00D4FF] text-[#00D4FF] font-bold shadow-[0_0_12px_rgba(0,212,255,0.2)]"
          : "bg-transparent border border-white/[0.12] text-[#8888AA] font-normal hover:border-white/25 hover:text-[#F0F0F5]"
      }`;

    return (
      <div className={`flex flex-wrap justify-center gap-2 ${widthClass} mx-auto`}>
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
  })();

  const uploadBlock = !contract.supportsElementReferences ? (
    activeSlots === 2 ? (
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex-1 flex flex-col">
            <span
              className="block"
              style={{
                fontSize: 11,
                color: "#00D4FF",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {i === 0 ? t("upload.startFrame" as any) : t("upload.endFrame" as any)}
            </span>
            <ImageUploadZone
              label={slotLabels[i] || `Frame ${i + 1}`}
              preview={images[i]?.preview || null}
              onImageSelect={(file) => handleImageSelect(i, file)}
              onImageRemove={() => handleImageRemove(i)}
            />
            {i === 0 && (
              <div
                className="flex sm:hidden items-center justify-center"
                style={{ marginTop: 8, marginBottom: -8 }}
                aria-hidden="true"
              >
                <ArrowDown size={24} style={{ color: "#8888AA" }} />
              </div>
            )}
          </div>
        )).reduce<React.ReactNode[]>((acc, node, idx) => {
          acc.push(node);
          if (idx === 0) {
            acc.push(
              <div
                key="arrow"
                className="hidden sm:flex items-center justify-center self-center"
                aria-hidden="true"
              >
                <ArrowRight size={24} style={{ color: "#8888AA" }} />
              </div>
            );
          }
          return acc;
        }, [])}
      </div>
    ) : (
      <div className="grid gap-4 grid-cols-1">
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
    )
  ) : (
    <ElementGrid items={elementItems} onChange={setElementItems} max={contract.maxElements ?? 10} />
  );

  const enhanceDisabled = description.trim().length < 10 || enhanceLoading;
  const enhanceRow = (phase === "breakdown" || phase === "generate") && (
    <div className="flex flex-col gap-2 -mt-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleEnhanceClick}
          disabled={enhanceDisabled}
          title={description.trim().length < 10 ? t("enhance.tooltip.short" as any) : ""}
          aria-label={t("enhance.button" as any)}
          className="gap-1.5 h-8 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          {enhanceLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("enhance.loading" as any)}</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> {t("enhance.button" as any)}</>
          )}
        </Button>
      </div>
      {enhanceUndoSnapshot !== null && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{t("enhance.applied" as any)}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUndoEnhance}
            className="h-6 px-2 text-xs text-foreground hover:text-primary"
          >
            {t("enhance.undo" as any)}
          </Button>
        </motion.div>
      )}
      <AlertDialog
        open={enhanceOpen}
        onOpenChange={(open) => {
          setEnhanceOpen(open);
          if (!open) setEnhancedDraft(null);
        }}
      >
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("enhance.dialog.title" as any)}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("enhance.dialog.original" as any)}
              </div>
              <div className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">
                {description}
              </div>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {t("enhance.dialog.enhanced" as any)}
              </div>
              <div className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                {enhancedDraft ?? ""}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setEnhanceOpen(false); setEnhancedDraft(null); }}>
              {t("enhance.cancel" as any)}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyEnhanced}>
              {t("enhance.apply" as any)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const descriptionBlock = (phase === "breakdown" || phase === "generate") && (
    <div className="space-y-2">
      {contract.supportsElementReferences ? (
        <MentionTextarea
          value={description}
          onChange={setDescription}
          elements={elementItems}
          placeholder={t("config.placeholder")}
        />
      ) : sceneFrames.length > 0 ? (
        <SceneMentionTextarea
          ref={sceneMentionRef}
          value={description}
          onChange={setDescription}
          elements={flatSceneElements.map(({ index, category, description }) => ({ index, category, description }))}
          placeholder={t("config.placeholder")}
        />
      ) : (
        <ConfigPanel description={description} onDescriptionChange={setDescription} />
      )}
      {enhanceRow}
    </div>
  );

  const ctaRowBlock = hasRequiredImages && phase === "upload" ? (
    <div className="pt-6 mt-6">
      <p
        className="text-center mx-auto"
        style={{
          fontSize: "13px",
          color: "#8888AA",
          maxWidth: "440px",
          marginBottom: "20px",
        }}
      >
        {t("wp.analyzeDesc")}
      </p>
      <div className="flex flex-col items-center" style={{ gap: "12px" }}>
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          aria-label={isAnalyzing ? t("wp.analyzingScene") : t("wp.analyzeScene")}
          aria-busy={isAnalyzing}
          style={{
            backgroundColor: "#00D4FF",
            color: "#0A0A0F",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: "15px",
            padding: "14px 24px",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0, 212, 255, 0.25)",
            height: "auto",
          }}
          className="w-full hover:brightness-110 hover:shadow-[0_4px_18px_rgba(0,212,255,0.35)] focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F] transition-all"
        >
          {isAnalyzing ? (
            <><Loader2 className="w-5 h-5 me-2 animate-spin" aria-hidden="true" /> {t("wp.analyzingScene")}</>
          ) : (
            <><Sparkles className="w-5 h-5 me-2" aria-hidden="true" /> {t("wp.analyzeScene")}</>
          )}
        </Button>
        <Button
          type="button"
          onClick={() => { setSceneFrames([]); setPhase("breakdown"); }}
          disabled={isAnalyzing}
          aria-label={t("wp.skip")}
          style={{
            backgroundColor: "#E6A020",
            color: "#0A0A0F",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: "15px",
            padding: "14px 24px",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(230, 160, 32, 0.3)",
            height: "auto",
          }}
          className="w-full hover:brightness-110 hover:shadow-[0_4px_18px_rgba(230,160,32,0.4)] focus-visible:ring-2 focus-visible:ring-[#E6A020] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          {isAnalyzing ? (
            <><Loader2 className="w-5 h-5 me-2 animate-spin" aria-hidden="true" /> {t("wp.analyzingScene")}</>
          ) : (
            <>{t("wp.skip")} <span aria-hidden="true">→</span></>
          )}
        </Button>
      </div>
    </div>
  ) : (phase === "breakdown" || phase === "generate") ? (
    <div className="pt-6 mt-6 border-t border-white/[0.06] flex justify-center">
      <Button
        size="lg"
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full sm:w-auto px-6 sm:px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
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
  ) : null;

  const showOnboarding =
    !hasGeneratedBefore &&
    phase === "upload" &&
    !contract.supportsElementReferences &&
    images.filter(Boolean).length === 0;

  const leftPanel = (
    <div className="space-y-6">
      {extrasHintBlock}
      {showOnboarding && <OnboardingExamples onPick={handlePickExample} />}
      {uploadBlock}
      {modeToggleBlock}
      <ModelPicker model={selectedModel} onModelChange={(v) => onSwitchModel?.(v)} />
      {descriptionBlock}
      {!contract.supportsElementReferences && sceneFrames.length > 0 && (phase === "breakdown" || phase === "generate") && (
        <p className="text-xs text-muted-foreground px-1 -mt-2">
          {t("scene.autoAssignedHint" as any)}
        </p>
      )}
      {audioToggleBlock}
      {ctaRowBlock}
      {/* Hidden for now — will be re-enabled in a future iteration
      <PresetPickerPanel
        description={description}
        onDescriptionChange={setDescription}
        defaultOpen={false}
      />
      */}
    </div>
  );

  const startOverBtn = (phase === "breakdown" || phase === "generate") && (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        setPhase("upload");
        setSceneFrames([]);
        setElementDirections({});
        setResults(null);
      }}
      aria-label={t("wp.startOver")}
      title={t("wp.startOver")}
      className="gap-1.5 px-2 sm:px-3 text-muted-foreground hover:text-foreground"
    >
      <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("wp.startOver")}</span>
    </Button>
  );

  const canShowBack =
    !isAnalyzing &&
    !isLoading &&
    (phase === "breakdown" || (phase === "generate" && !results));

  const backBtn = canShowBack && (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setPhase("upload")}
      aria-label={t("wp.back" as any)}
      title={t("wp.back" as any)}
      className="gap-1.5 px-2 sm:px-3 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> <span className="hidden sm:inline">{t("wp.back" as any)}</span>
    </Button>
  );

  const showRightEmptyState = !results && !isLoading && !((phase === "breakdown" || phase === "generate") && sceneFrames.length > 0);

  const rightPanel = (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {(phase === "breakdown" || phase === "generate") && sceneFrames.length > 0 && (
          <motion.div key="breakdown-content" {...phaseTransition} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {backBtn}
                {startOverBtn}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                aria-label={t("wp.reAnalyze")}
                title={t("wp.reAnalyze")}
                className="gap-1.5 px-2 sm:px-3 border-white/20 text-muted-foreground hover:text-foreground hover:border-primary/50"
              >
                <ScanSearch className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("wp.reAnalyze")}</span>
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
              <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span>{t("scene.reviewHint" as any)}</span>
            </div>

            {resetSnapshot && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("wp.badgesReset" as any)}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUndoReset}
                  className="h-6 px-2 text-xs text-foreground hover:text-primary"
                >
                  {t("wp.undo" as any)}
                </Button>
              </motion.div>
            )}

            <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("wp.confirmReset.title" as any)}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {(t("wp.confirmReset.description" as any) as string).replace("{count}", String(pendingResetCount))}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmResetOpen(false)}>
                    {t("wp.confirmReset.cancel" as any)}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      performAutoReset();
                      setConfirmResetOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("wp.confirmReset.confirm" as any)}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <SceneBreakdown
              frames={sceneFrames}
              frameLabels={frameLabels}
              framePreviews={images.map((img) => img?.preview || null)}
              directions={elementDirections}
              onDirectionsChange={setElementDirections}
              onInsertMention={(n) => sceneMentionRef.current?.insertMention(n)}
              onManualToggle={(id) => setManualOverrides((prev) => ({ ...prev, [id]: true }))}
            />
          </motion.div>
        )}
        {phase === "generate" && sceneFrames.length === 0 && startOverBtn && (
          <div key="startover-fallback" className="flex items-center justify-start gap-1.5">
            {backBtn}
            {startOverBtn}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && !results && (
          <ResultsSkeleton
            modelLabel={MODEL_GROUPS.flatMap(g => g.models).find(m => m.value === selectedModel)?.label ?? selectedModel}
          />
        )}
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

      {showRightEmptyState && (
        <div
          className="empty-state-pulse flex flex-col items-center justify-center text-center min-h-[280px] rounded-2xl px-6 py-10"
          style={{
            background: "rgba(0, 212, 255, 0.02)",
            border: "1.5px solid rgba(0, 212, 255, 0.18)",
          }}
        >
          <Clapperboard size={64} strokeWidth={1.5} style={{ color: "#00D4FF" }} />
          <h3
            className="font-display mt-5"
            style={{ fontSize: "20px", color: "#F0F0F5", fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            {t("rp.empty.title" as any)}
          </h3>
          <p
            className="mt-2 max-w-sm"
            style={{ fontSize: "13px", color: "#8888AA", lineHeight: 1.5 }}
          >
            {t("rp.empty.subtitle" as any)}
          </p>
        </div>
      )}

    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="lg:grid lg:grid-cols-[40fr_60fr] lg:gap-8 space-y-6 lg:space-y-0">
        <div>{leftPanel}</div>
        <div
          style={{
            background: "#1A1A2E",
            border: "1px solid rgba(0,212,255,0.12)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  );
};
