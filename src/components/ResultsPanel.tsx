import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface ShotResult {
  shotName?: string;
  mainPrompt: string;
  negativePrompt: string;
  cameraSuggestions: string;
  modelNotes: string;
  suggestedAspectRatio?: string;
  suggestedDuration?: string;
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
  <div className={`rounded-lg p-3 sm:p-4 ${accent ? "bg-primary/5 border border-primary/20" : "bg-secondary/50 border border-border"}`}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <span className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
      <CopyButton text={value} />
    </div>
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
  </div>
);

export const ResultsPanel = forwardRef<HTMLDivElement, ResultsPanelProps>(({ results, onRegenerate, isLoading }, ref) => {
  const { t } = useLanguage();

  const handleCopyAll = () => {
    const allText = results.map((r, i) => {
      const prefix = r.shotName ? `--- ${r.shotName} ---\n` : results.length > 1 ? `--- Shot ${i + 1} ---\n` : "";
      return `${prefix}Main Prompt:\n${r.mainPrompt}\n\nNegative Prompt:\n${r.negativePrompt}\n\nCamera:\n${r.cameraSuggestions}\n\nModel Notes:\n${r.modelNotes}`;
    }).join("\n\n");
    navigator.clipboard.writeText(allText);
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base sm:text-lg font-semibold">{t("results.title")}</h3>
        <div className="flex gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="px-2 sm:px-3">
            <Copy className="w-3.5 h-3.5 sm:me-1.5" /> <span className="hidden sm:inline">{t("results.copyAll")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading} className="px-2 sm:px-3">
            <RefreshCw className={`w-3.5 h-3.5 sm:me-1.5 ${isLoading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">{t("results.regenerate")}</span>
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
              {(result.suggestedAspectRatio || result.suggestedDuration) && (
                <div className="flex items-center gap-3 flex-wrap">
                  {result.suggestedAspectRatio && (
                    <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md">
                      📐 {result.suggestedAspectRatio}
                    </span>
                  )}
                  {result.suggestedDuration && (
                    <span className="text-xs font-mono bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-md">
                      ⏱ {result.suggestedDuration}
                    </span>
                  )}
                </div>
              )}
              <ResultCard label={t("results.mainPrompt")} value={result.mainPrompt} accent />
              <ResultCard label={t("results.negativePrompt")} value={result.negativePrompt} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ResultCard label={t("results.cameraSuggestions")} value={result.cameraSuggestions} />
                <ResultCard label={t("results.modelNotes")} value={result.modelNotes} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
});

ResultsPanel.displayName = "ResultsPanel";
