import { useMemo, useState } from "react";
import { Activity, ChevronDown, Paperclip, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Attachment = { kind?: string; name?: string; url?: string };
type Bubble =
  | { role: "assistant" | "user"; content?: string; attachments?: Attachment[] }
  | { role: "model_choice"; recommended_model_id: string; alternatives?: string[]; reason?: string; chosen?: string }
  | { role: "result" | "questions"; [k: string]: unknown };

type Props = {
  bubbles: Bubble[];
  currentAttachmentCount: number;
  className?: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function SessionHealthPanel({ bubbles, currentAttachmentCount, className }: Props) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    let mergedAttachments = 0;
    const seen = new Set<string>();
    let lastModel:
      | { recommended: string; chosen?: string; alternatives?: string[]; step: number }
      | null = null;
    let assistantTurns = 0;
    let userTurns = 0;

    bubbles.forEach((b, i) => {
      if (b.role === "user") {
        userTurns += 1;
        const list = (b as { attachments?: Attachment[] }).attachments;
        if (Array.isArray(list)) {
          for (const a of list) {
            const key = a?.url || `${a?.kind ?? ""}:${a?.name ?? ""}`;
            if (key && !seen.has(key)) {
              seen.add(key);
              mergedAttachments += 1;
            }
          }
        }
      } else if (b.role === "assistant") {
        assistantTurns += 1;
      } else if (b.role === "model_choice") {
        lastModel = {
          recommended: (b as any).recommended_model_id,
          chosen: (b as any).chosen,
          alternatives: (b as any).alternatives,
          step: i + 1,
        };
      }
    });

    const bytes = (() => {
      try {
        return new Blob([JSON.stringify(bubbles)]).size;
      } catch {
        return 0;
      }
    })();

    return {
      mergedAttachments,
      currentAttachmentCount,
      bytes,
      bubbleCount: bubbles.length,
      assistantTurns,
      userTurns,
      lastModel,
    };
  }, [bubbles, currentAttachmentCount]);

  const modelLabel = stats.lastModel
    ? `${stats.lastModel.recommended}${stats.lastModel.chosen && stats.lastModel.chosen !== stats.lastModel.recommended ? ` → ${stats.lastModel.chosen}` : ""}`
    : "Not selected yet";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-[hsl(240_8%_6%)]/70 backdrop-blur-sm text-xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-foreground/80 font-medium">Session health</span>
        <div className="flex items-center gap-3 ml-auto text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            {stats.mergedAttachments}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {stats.bubbleCount}
          </span>
          <span className="inline-flex items-center gap-1 max-w-[180px] truncate">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="truncate">{modelLabel}</span>
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              open ? "rotate-180" : "rotate-0",
            )}
          />
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 pb-3 pt-1 border-t border-border/30">
          <Stat
            icon={<Paperclip className="w-3.5 h-3.5 text-primary" />}
            label="Attachments"
            value={`${stats.mergedAttachments} merged`}
            sub={`${stats.currentAttachmentCount} staged this turn`}
          />
          <Stat
            icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />}
            label="Chat history"
            value={`${stats.bubbleCount} bubbles`}
            sub={`${stats.userTurns} you · ${stats.assistantTurns} Director · ${formatBytes(stats.bytes)}`}
          />
          <Stat
            icon={<Sparkles className="w-3.5 h-3.5 text-accent" />}
            label="Last model step"
            value={stats.lastModel ? stats.lastModel.recommended : "—"}
            sub={
              stats.lastModel
                ? `Step #${stats.lastModel.step}${
                    stats.lastModel.chosen
                      ? ` · chosen ${stats.lastModel.chosen}`
                      : " · awaiting confirm"
                  }${
                    stats.lastModel.alternatives?.length
                      ? ` · alts ${stats.lastModel.alternatives.join(", ")}`
                      : ""
                  }`
                : "Director hasn't recommended a model yet."
            }
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-foreground text-sm font-medium mt-0.5 truncate" title={value}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground/80 mt-0.5 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}
