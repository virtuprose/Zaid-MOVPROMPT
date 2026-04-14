import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./ImageUploadZone";
import { ConfigPanel } from "./ConfigPanel";
import { ResultsPanel } from "./ResultsPanel";
import { Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WorkflowType = "single" | "twoframe" | "multishot";

interface ShotResult {
  shotName?: string;
  mainPrompt: string;
  negativePrompt: string;
  cameraSuggestions: string;
  modelNotes: string;
}

interface WorkflowPanelProps {
  type: WorkflowType;
}

export const WorkflowPanel = ({ type }: WorkflowPanelProps) => {
  const { toast } = useToast();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [style, setStyle] = useState("35mm Film");
  const [model, setModel] = useState("runway");
  const [results, setResults] = useState<ShotResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const maxImages = type === "twoframe" ? 2 : 1;

  const handleImageSelect = useCallback((index: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = { file, preview };
      return next;
    });
    setResults(null);
  }, []);

  const handleImageRemove = useCallback((index: number) => {
    setImages((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setResults(null);
  }, []);

  const hasRequiredImages = type === "twoframe" ? images.length === 2 : images.length >= 1;

  const handleGenerate = async () => {
    if (!hasRequiredImages) return;
    setIsLoading(true);
    setResults(null);

    try {
      // Convert images to base64
      const imageBase64s = await Promise.all(
        images.map(async (img) => {
          const buffer = await img.file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          bytes.forEach((b) => (binary += String.fromCharCode(b)));
          return btoa(binary);
        })
      );

      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: {
          images: imageBase64s,
          workflowType: type,
          style,
          targetModel: model,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({
        title: "Generation failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        {hasRequiredImages && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <ConfigPanel style={style} model={model} onStyleChange={setStyle} onModelChange={setModel} />
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-8 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Scene...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Cinematic Prompt
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {results && (
          <ResultsPanel results={results} onRegenerate={handleGenerate} isLoading={isLoading} />
        )}
      </AnimatePresence>
    </div>
  );
};
