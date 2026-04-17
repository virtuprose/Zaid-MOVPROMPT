import { Copy, Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

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
}

interface ResultsPanelProps {
  results: ShotResult[];
  onRegenerate: () => void;
  isLoading: boolean;
  agentName?: string;
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

const isMeaningful = (v?: string) => !!v && v.trim().length > 0 && v.trim().toLowerCase() !== "(none)";

export const ResultsPanel = forwardRef<HTMLDivElement, ResultsPanelProps>(({ results, onRegenerate, isLoading, agentName }, ref) => {
  const { t } = useLanguage();
  const [allCopied, setAllCopied] = useState(false);

  const handleCopyAll = async () => {
    const allText = results.map((r, i) => {
      const prefix = r.shotName ? `--- ${r.shotName} ---\n` : results.length > 1 ? `--- ${t("library.shot")} ${i + 1} ---\n` : "";
      let block = `${prefix}${t("results.mainPrompt")}:\n${r.mainPrompt}\n\n${t("results.negativePrompt")}:\n${r.negativePrompt}\n\n${t("results.cameraSuggestions")}:\n${r.cameraSuggestions}\n\n${t("results.modelNotes")}:\n${r.modelNotes}`;
      if (isMeaningful(r.audioBlock)) block += `\n\n${t("results.audioBlock")}:\n${r.audioBlock}`;
      if (isMeaningful(r.cameraTags)) block += `\n\n${t("results.cameraTags")}:\n${r.cameraTags}`;
      if (isMeaningful(r.referenceGuidance)) block += `\n\n${t("results.referenceGuidance")}:\n${r.referenceGuidance}`;
      if (isMeaningful(r.shotStructure)) block += `\n\n${t("results.shotStructure")}:\n${r.shotStructure}`;
      return block;
    }).join("\n\n");
    try {
      await navigator.clipboard.writeText(allText);
      setAllCopied(true);
      toast.success(t("results.copied"));
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      toast.error(t("results.failedCopy"));
    }
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-base sm:text-lg font-semibold">{t("results.title")}</h3>
          {agentName && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> {t("results.generatedBy")} {agentName}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll} className={`px-2 sm:px-3 ${allCopied ? "border-green-500/50 text-green-400" : ""}`}>
            {allCopied ? <Check className="w-3.5 h-3.5 sm:me-1.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 sm:me-1.5" />}
            <span className="hidden sm:inline">{allCopied ? t("results.copied") : t("results.copyAll")}</span>
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
              <span className="text-accent">{result.shotName || `${t("library.shot")} ${idx + 1}`}</span>
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
              {isMeaningful(result.cameraTags) && (
                <ResultCard label={t("results.cameraTags")} value={result.cameraTags!} />
              )}
              {isMeaningful(result.audioBlock) && (
                <ResultCard label={t("results.audioBlock")} value={result.audioBlock!} />
              )}
              {isMeaningful(result.referenceGuidance) && (
                <ResultCard label={t("results.referenceGuidance")} value={result.referenceGuidance!} />
              )}
              {isMeaningful(result.shotStructure) && (
                <ResultCard label={t("results.shotStructure")} value={result.shotStructure!} />
              )}
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
