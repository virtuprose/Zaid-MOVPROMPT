import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  chips: string[];
  onPick: (chip: string) => void;
  disabled?: boolean;
  label?: string;
};

export function QuickReplies({ chips, onPick, disabled, label = "Quick follow-ups" }: Props) {
  if (!chips?.length) return null;
  return (
    <div className="space-y-1.5 motion-safe:animate-fade-up">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        <Sparkles className="h-3 w-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onPick(chip)}
            className={cn(
              "rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs text-foreground/85",
              "hover:border-primary/50 hover:bg-primary/10 hover:text-foreground transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
