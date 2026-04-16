import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./ImageUploadZone";
import { ConfigPanel } from "./ConfigPanel";
import { ResultsPanel } from "./ResultsPanel";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { SceneBreakdown, type SceneFrame, type ElementDirections } from "./SceneBreakdown";
import { Sparkles, Loader2, ScanSearch, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackGeneration } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

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

export const WorkflowPanel = ({ type }: WorkflowPanelProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("any");
  const [results, setResults] = useState<ShotResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scene breakdown state — now frame-grouped
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
      toast({ title: "Sign in required", description: "Please sign in to analyze scenes.", variant: "destructive" });
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

      // Default all elements to "move"
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
      toast({ title: "Scene analysis failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasRequiredImages) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to generate prompts.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setIsLoading(true);
    setResults(null);

    try {
      const imageBase64s = await Promise.all(images.map((img) => compressImage(img.file)));

      // Build scene breakdown payload grouped by frame
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
      toast({ title: "Generation failed", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const frameLabels: string[] = (() => {
    switch (type) {
      case "twoframe": return ["Start Frame", "End Frame"];
      case "multishot": return ["Concept Image"];
      default: return ["Your Frame"];
    }
  })();

  const labels = {
    single: ["Upload your frame"],
    twoframe: ["Start Frame", "End Frame"],
    multishot: ["Upload concept image"],
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

      <AnimatePresence>
        {hasRequiredImages && phase === "upload" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
              AI will break down your scene into individual elements (subject, background, lighting, atmosphere) so you can control exactly what stays still and what moves.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Scene...</>
                ) : (
                  <><ScanSearch className="w-4 h-4 mr-2" /> Analyze Scene</>
                )}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => { setSceneFrames([]); setPhase("breakdown"); }}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 font-display text-muted-foreground"
              >
                Skip — Go Straight to Generate
              </Button>
            </div>
          </motion.div>
        )}

        {(phase === "breakdown" || phase === "generate") && sceneFrames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
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
                variant="ghost"
                onClick={() => { setPhase("upload"); setSceneFrames([]); setElementDirections({}); setResults(null); }}
                className="text-xs text-muted-foreground gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Start Over
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="text-xs text-muted-foreground gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Re-analyze
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Prompt...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Cinematic Prompt</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {(phase === "breakdown" || phase === "generate") && sceneFrames.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex justify-start">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setPhase("upload"); setResults(null); }}
                className="text-xs text-muted-foreground gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Start Over
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Prompt...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Cinematic Prompt</>
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
