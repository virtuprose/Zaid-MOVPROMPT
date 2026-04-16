import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./ImageUploadZone";
import { ConfigPanel } from "./ConfigPanel";
import { ResultsPanel } from "./ResultsPanel";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { SceneBreakdown, type SceneFrame, type ElementDirections } from "./SceneBreakdown";
import { Sparkles, Loader2, ScanSearch, RotateCcw, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackGeneration } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

type WorkflowType = "single" | "twoframe" | "multishot";
type Phase = "upload" | "breakdown" | "generate";

interface ShotResult {
  shotName?: string;
  mainPrompt: string;
  negativePrompt: string;
  cameraSuggestions: string;
  modelNotes: string;
  suggestedAspectRatio?: string;
  suggestedDuration?: string;
}

interface WorkflowPanelProps {
  type: WorkflowType;
}

const phaseTransition = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const },
};

export const WorkflowPanel = ({ type }: WorkflowPanelProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("any");
  const [results, setResults] = useState<ShotResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("upload");
  const [sceneFrames, setSceneFrames] = useState<SceneFrame[]>([]);
  const [elementDirections, setElementDirections] = useState<ElementDirections>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const maxImages = type === "twoframe" ? 2 : 1;

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
    setResults(null);
    setPhase("upload");
    setSceneFrames([]);
    setElementDirections({});
  }, []);

  const hasRequiredImages = type === "twoframe" ? images.length === 2 : images.length >= 1;

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
    if (!user) {
      toast({ title: t("wp.signInRequired"), description: t("wp.signInAnalyze"), variant: "destructive" });
      navigate("/auth");
      return;
    }
    setIsAnalyzing(true);
    try {
      const imageBase64s = await Promise.all(images.map((img) => compressImage(img.file)));
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
      const imageBase64s = await Promise.all(images.map((img) => compressImage(img.file)));

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

      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: {
          images: imageBase64s,
          workflowType: type,
          description,
          targetModel: model,
          sceneBreakdown,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results);
      setPhase("generate");
      trackGeneration(type, model);

      if (user) {
        supabase.from("prompt_history").insert({
          user_id: user.id,
          workflow_type: type,
          target_model: model,
          results: data.results,
        }).then(({ error: histErr }) => {
          if (histErr) console.error("Failed to save history:", histErr);
        });
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: t("wp.generationFailed"), description: err.message || t("wp.somethingWrongRetry"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const frameLabels: string[] = (() => {
    switch (type) {
      case "twoframe": return [t("frame.start"), t("frame.end")];
      case "multishot": return [t("frame.concept")];
      default: return [t("frame.your")];
    }
  })();

  const labels = {
    single: [t("frame.upload")],
    twoframe: [t("frame.start"), t("frame.end")],
    multishot: [t("frame.uploadConcept")],
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${type === "twoframe" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-lg mx-auto"}`}>
        {Array.from({ length: maxImages }).map((_, i) => (
          <ImageUploadZone
            key={i}
            label={labels[type][i] || `Frame ${i + 1}`}
            preview={images[i]?.preview || null}
            onImageSelect={(file) => handleImageSelect(i, file)}
            onImageRemove={() => handleImageRemove(i)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {hasRequiredImages && phase === "upload" && (
          <motion.div
            key="upload-phase"
            {...phaseTransition}
            className="space-y-3"
          >
            <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
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
                variant="ghost"
                onClick={() => { setSceneFrames([]); setPhase("breakdown"); }}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 font-display text-muted-foreground"
              >
                {t("wp.skip")}
              </Button>
            </div>
          </motion.div>
        )}

        {(phase === "breakdown" || phase === "generate") && sceneFrames.length > 0 && (
          <motion.div
            key="breakdown-phase"
            {...phaseTransition}
            className="space-y-4"
          >
            <SceneBreakdown
              frames={sceneFrames}
              frameLabels={frameLabels}
              framePreviews={images.map((img) => img?.preview || null)}
              directions={elementDirections}
              onDirectionsChange={setElementDirections}
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

            <ConfigPanel description={description} model={model} onDescriptionChange={setDescription} onModelChange={setModel} />

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
          <motion.div
            key="skip-phase"
            {...phaseTransition}
            className="space-y-4"
          >
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
            <ConfigPanel description={description} model={model} onDescriptionChange={setDescription} onModelChange={setModel} />

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
          <ResultsPanel results={results} onRegenerate={handleGenerate} isLoading={isLoading} />
        )}
      </AnimatePresence>
    </div>
  );
};
