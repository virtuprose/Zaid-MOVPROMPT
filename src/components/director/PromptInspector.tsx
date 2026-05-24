import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { composePromptPreview, referenceRole } from "@/lib/director/composePromptPreview";
import type { StyleSpec } from "@/lib/director/api";

export type InspectorContext = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  basePrompt?: string;
  perShotPrompts?: string[];
  styleSpec?: StyleSpec;
  lockMode?: "character" | "scene" | "auto";
  referenceUrls?: string[];
  aspectRatio?: "1:1" | "16:9" | "9:16";
  subjectKind?: "character" | "product";
  isChain?: boolean;
  totalShots?: number;
};

type Props = {
  ctx: InspectorContext;
  shotIndex?: number; // for storyboard panels
  triggerClassName?: string;
  triggerTitle?: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
        {title}
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v?: string | number | null }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground/80 min-w-[88px]">{k}</span>
      <span className="text-foreground/90 break-words">{String(v)}</span>
    </div>
  );
}

export function PromptInspector({ ctx, shotIndex, triggerClassName, triggerTitle }: Props) {
  const [copied, setCopied] = useState(false);

  const composed = useMemo(() => {
    const beat =
      ctx.mode === "storyboard_panels"
        ? (shotIndex && ctx.perShotPrompts?.[shotIndex - 1]) ||
          ctx.perShotPrompts?.[0] ||
          ctx.basePrompt ||
          ""
        : ctx.basePrompt || "";
    return composePromptPreview({
      mode: ctx.mode,
      beat,
      shotIndex,
      totalShots: ctx.totalShots ?? ctx.perShotPrompts?.length,
      styleSpec: ctx.styleSpec,
      lockMode: ctx.lockMode,
      referenceUrls: ctx.referenceUrls,
      aspectRatio: ctx.aspectRatio,
      subjectKind: ctx.subjectKind,
      isChain: ctx.isChain,
    });
  }, [ctx, shotIndex]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const refs = ctx.referenceUrls ?? [];
  const spec = ctx.styleSpec;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={
            triggerClassName ??
            "absolute top-1 right-[68px] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-background/85 hover:bg-background text-foreground p-1.5 rounded"
          }
          title={triggerTitle ?? "Inspect prompt"}
          aria-label={triggerTitle ?? "Inspect prompt"}
        >
          <FileText className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[420px] p-3 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Section title={shotIndex ? `Composed prompt · Shot ${shotIndex}` : "Composed prompt"}>
          <div className="relative">
            <pre className="text-[11px] leading-snug font-mono whitespace-pre-wrap bg-muted/40 border border-border/40 rounded p-2 max-h-56 overflow-auto text-foreground/90">
              {composed}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCopy}
              className="absolute top-1 right-1 h-6 px-2 text-[10px]"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="space-y-1">
            <KV k="mode" v={ctx.mode} />
            {ctx.mode === "storyboard_panels" && (
              <KV
                k="shot"
                v={
                  shotIndex
                    ? `${shotIndex} of ${ctx.totalShots ?? ctx.perShotPrompts?.length ?? "?"}`
                    : undefined
                }
              />
            )}
            <KV k="aspect" v={ctx.aspectRatio} />
            <KV k="lock_mode" v={ctx.lockMode} />
            <KV k="subject_kind" v={ctx.subjectKind} />
            <KV k="isChain" v={ctx.isChain ? "true" : undefined} />
            {spec && (
              <>
                <KV k="lens" v={spec.lens} />
                <KV k="lighting" v={spec.lighting} />
                <KV k="palette" v={spec.palette} />
                <KV k="film_emulation" v={spec.film_emulation} />
                <KV k="grade" v={spec.grade} />
                <KV k="mood" v={spec.mood} />
              </>
            )}
          </div>
        </Section>

        <Section title={`References (${refs.length})`}>
          {refs.length === 0 ? (
            <div className="text-xs text-muted-foreground/70 italic">No references attached.</div>
          ) : (
            <ul className="space-y-1">
              {refs.map((url, i) => (
                <li key={`${url}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                    {referenceRole(i, refs.length, ctx.mode)}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate flex-1"
                    title={url}
                  >
                    {url.split("/").pop()?.split("?")[0] || url}
                  </a>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/70" />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </PopoverContent>
    </Popover>
  );
}
