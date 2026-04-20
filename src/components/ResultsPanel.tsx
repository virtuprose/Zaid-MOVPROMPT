import { Copy, Check, RefreshCw, Sparkles, ChevronDown, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  modelLabel?: string;
  stitchHint?: boolean;
  elementsLegend?: { index: number; kind: "image" | "video" | "audio"; preview?: string }[];
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

const ResultCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg p-3 sm:p-4 bg-secondary/50 border border-border">
    <div className="flex items-start justify-between gap-2 mb-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <CopyButton text={value} />
    </div>
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
  </div>
);

const isMeaningful = (v?: string) => !!v && v.trim().length > 0 && v.trim().toLowerCase() !== "(none)";

// Parse a mainPrompt that uses [BRACKETED SECTION HEADERS] (Seedance shooting-script format)
// into discrete sections. Returns null if the text doesn't follow the format.
const parseScriptedPrompt = (text: string): { header: string; body: string }[] | null => {
  if (!text) return null;
  // Header line: starts the line, wrapped in [ ... ], may include — | timecodes
  const headerRe = /^\[([^\]\n]{2,160})\]\s*$/gm;
  const matches: { header: string; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text)) !== null) {
    matches.push({ header: m[1].trim(), index: m.index, length: m[0].length });
  }
  if (matches.length < 3) return null; // need a real script with multiple sections
  const sections: { header: string; body: string }[] = [];
  // Optional preamble before first header
  if (matches[0].index > 0) {
    const pre = text.slice(0, matches[0].index).trim();
    if (pre.length > 0) sections.push({ header: "INTRO", body: pre });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections.push({ header: matches[i].header, body: text.slice(start, end).trim() });
  }
  return sections;
};

const ScriptedPrompt = ({ sections }: { sections: { header: string; body: string }[] }) => {
  // Default: open the first 2 sections, collapse the rest
  const [openMap, setOpenMap] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(sections.map((_, i) => [i, i < 2]))
  );
  const toggle = (i: number) => setOpenMap((p) => ({ ...p, [i]: !p[i] }));
  return (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <Collapsible key={i} open={!!openMap[i]} onOpenChange={() => toggle(i)}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 bg-background/60 hover:bg-background border border-primary/20 transition-colors group">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary font-mono text-start">
              [{s.header}]
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <CopyButton text={s.body} />
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${openMap[i] ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap px-3 pt-2 pb-1">{s.body}</p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

const MainPromptHero = ({ value, result, modelLabel }: { value: string; result: ShotResult; modelLabel?: string }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const buildFullPrompt = () => {
    let out = value;
    if (isMeaningful(result.negativePrompt)) out += `\n\n[NEGATIVE PROMPT]\n${result.negativePrompt}`;
    if (isMeaningful(result.audioBlock)) out += `\n\n[AUDIO DIRECTION]\n${result.audioBlock}`;
    if (isMeaningful(result.shotStructure)) out += `\n\n[SHOT STRUCTURE]\n${result.shotStructure}`;
    if (isMeaningful(result.cameraSuggestions)) out += `\n\n[CAMERA SUGGESTIONS]\n${result.cameraSuggestions}`;
    return out;
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildFullPrompt());
      setCopied(true);
      toast.success(t("results.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("results.failedCopy"));
    }
  };
  const sections = parseScriptedPrompt(value);
  return (
    <div className="relative rounded-xl p-4 sm:p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/40 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> {t("results.mainPrompt")}
          {sections && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              {sections.length} sections
            </span>
          )}
        </span>
      </div>
      {sections ? (
        <div className="mb-3">
          <ScriptedPrompt sections={sections} />
        </div>
      ) : (
        <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap mb-3">{value}</p>
      )}
      <p className="text-xs text-muted-foreground italic mb-3">{t("results.pasteHint")}</p>
      <Button
        onClick={handleCopy}
        size="lg"
        className={`w-full gap-2 font-semibold ${copied ? "bg-green-500/90 hover:bg-green-500/90" : ""}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
        {copied
          ? t("results.copied")
          : modelLabel
            ? `${t("results.copyIntoModel")} ${modelLabel}`
            : t("results.copyMainPrompt")}
      </Button>
    </div>
  );
};

const SectionToggle = ({ label, count, open }: { label: string; count?: number; open: boolean }) => (
  <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 bg-secondary/30 hover:bg-secondary/60 border border-border transition-colors group">
    <span className="text-sm font-medium text-foreground flex items-center gap-2">
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{count}</span>
      )}
    </span>
    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
  </CollapsibleTrigger>
);

export const ResultsPanel = forwardRef<HTMLDivElement, ResultsPanelProps>(({ results, onRegenerate, isLoading, agentName, modelLabel, stitchHint, elementsLegend }, ref) => {
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
    <TooltipProvider delayDuration={200}>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleCopyAll} className={`px-2 sm:px-3 ${allCopied ? "border-green-500/50 text-green-400" : ""}`}>
                  {allCopied ? <Check className="w-3.5 h-3.5 sm:me-1.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 sm:me-1.5" />}
                  <span className="hidden sm:inline">{allCopied ? t("results.copied") : t("results.copyFullPackage")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="max-w-xs">{t("results.copyFullPackageHint")}</p></TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isLoading} className="px-2 sm:px-3">
              <RefreshCw className={`w-3.5 h-3.5 sm:me-1.5 ${isLoading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">{t("results.regenerate")}</span>
            </Button>
          </div>
        </div>

        {stitchHint && (
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-foreground/90 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <span>{t("results.multishotStitchHint")}</span>
          </div>
        )}

        {elementsLegend && elementsLegend.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t("elements.legend" as any)}
            </div>
            <div className="flex flex-wrap gap-2">
              {elementsLegend.map((el) => (
                <div key={el.index} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-1">
                  <span className="text-[10px] font-mono font-bold text-primary">@Element {el.index}</span>
                  <div className="w-6 h-6 rounded overflow-hidden bg-secondary flex items-center justify-center">
                    {el.kind === "image" && el.preview && <img src={el.preview} alt="" className="w-full h-full object-cover" />}
                    {el.kind === "video" && el.preview && <video src={el.preview} className="w-full h-full object-cover" muted />}
                    {el.kind === "audio" && <span className="text-[9px]">🔊</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.map((result, idx) => {
          const refinements: { label: string; value: string }[] = [
            { label: t("results.negativePrompt"), value: result.negativePrompt },
          ];
          if (isMeaningful(result.cameraTags)) refinements.push({ label: t("results.cameraTags"), value: result.cameraTags! });
          if (isMeaningful(result.audioBlock)) refinements.push({ label: t("results.audioBlock"), value: result.audioBlock! });
          if (isMeaningful(result.referenceGuidance)) refinements.push({ label: t("results.referenceGuidance"), value: result.referenceGuidance! });
          if (isMeaningful(result.shotStructure)) refinements.push({ label: t("results.shotStructure"), value: result.shotStructure! });

          return <ShotCard key={idx} result={result} idx={idx} total={results.length} refinements={refinements} modelLabel={modelLabel} />;
        })}
      </motion.div>
    </TooltipProvider>
  );
});

const ShotCard = ({
  result,
  idx,
  total,
  refinements,
  modelLabel,
}: {
  result: ShotResult;
  idx: number;
  total: number;
  refinements: { label: string; value: string }[];
  modelLabel?: string;
}) => {
  const { t } = useLanguage();
  const [refinementsOpen, setRefinementsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          {total > 1 && (
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {idx + 1}/{total}
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

          <MainPromptHero value={result.mainPrompt} result={result} modelLabel={modelLabel} />

          <Collapsible open={refinementsOpen} onOpenChange={setRefinementsOpen}>
            <SectionToggle label={t("results.optionalRefinements")} count={refinements.length} open={refinementsOpen} />
            <CollapsibleContent className="pt-3 grid gap-3">
              {refinements.map((r) => (
                <ResultCard key={r.label} label={r.label} value={r.value} />
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <SectionToggle label={t("results.directorsNotes")} count={2} open={notesOpen} />
            <CollapsibleContent className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResultCard label={t("results.cameraSuggestions")} value={result.cameraSuggestions} />
              <ResultCard label={t("results.modelNotes")} value={result.modelNotes} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

ResultsPanel.displayName = "ResultsPanel";
