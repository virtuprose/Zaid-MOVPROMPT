import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, forwardRef } from "react";
import { motion } from "framer-motion";

interface ShotResult {
  shotName?: string;
  mainPrompt: string;
  negativePrompt: string;
  cameraSuggestions: string;
  modelNotes: string;
}

interface ResultsPanelProps {
  results: ShotResult[];
  onRegenerate: () => void;
  isLoading: boolean;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const ResultCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`rounded-lg p-4 ${accent ? "bg-primary/5 border border-primary/20" : "bg-secondary/50 border border-border"}`}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <span className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
      <CopyButton text={value} />
    </div>
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
  </div>
);

export const ResultsPanel = forwardRef<HTMLDivElement, ResultsPanelProps>(({ results, onRegenerate, isLoading }, ref) => {
  const handleCopyAll = () => {
    const allText = results.map((r, i) => {
      const prefix = r.shotName ? `--- ${r.shotName} ---\n` : results.length > 1 ? `--- Shot ${i + 1} ---\n` : "";
      return `${prefix}Main Prompt:\n${r.mainPrompt}\n\nNegative Prompt:\n${r.negativePrompt}\n\nCamera:\n${r.cameraSuggestions}\n\nModel Notes:\n${r.modelNotes}`;
    }).join("\n\n");
    navigator.clipboard.writeText(allText);
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Generated Prompts</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Regenerate
          </Button>
        </div>
      </div>

      {results.map((result, idx) => (
        <Card key={idx} className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              {results.length > 1 && (
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {idx + 1}/{results.length}
                </span>
              )}
              <span className="text-accent">{result.shotName || `Shot ${idx + 1}`}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <ResultCard label="Main Prompt" value={result.mainPrompt} accent />
              <ResultCard label="Negative Prompt" value={result.negativePrompt} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ResultCard label="Camera Suggestions" value={result.cameraSuggestions} />
                <ResultCard label="Model-Specific Notes" value={result.modelNotes} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
});

ResultsPanel.displayName = "ResultsPanel";
