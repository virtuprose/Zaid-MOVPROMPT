import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextChip } from "@/lib/director/sessionContext";

const HINT_KEY = "director.freechat.hint.dismissed";

type Props = {
  chips: ContextChip[];
  onChipClick: (token: string) => void;
  active: boolean; // true when in free_chat and we have context
};

export function FreeChatChips({ chips, onChipClick, active }: Props) {
  const [hintDismissed, setHintDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(HINT_KEY) === "1";
  });

  useEffect(() => {
    if (!active) return;
    // expose hint state only while active
  }, [active]);

  if (!active) return null;

  const dismissHint = () => {
    setHintDismissed(true);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-2 space-y-2">
      {!hintDismissed && (
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[11px] text-foreground/80">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
          <span className="flex-1 leading-relaxed">
            Free chat can see your panels, style and attachments. Try{" "}
            <span className="font-medium text-foreground">"why panel 3?"</span> or click a chip
            below.
          </span>
          <button
            type="button"
            onClick={dismissHint}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss hint"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.token}
              type="button"
              onClick={() => onChipClick(c.token)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/20",
                "px-2.5 py-1 text-[11px] text-muted-foreground transition-colors",
                "hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
              )}
              title={`Insert ${c.token}`}
            >
              <span className="font-mono text-[10px] text-primary/80">@</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
