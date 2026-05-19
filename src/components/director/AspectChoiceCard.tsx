import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type AspectRatio = "16:9" | "9:16" | "1:1";

const OPTIONS: Array<{
  value: AspectRatio;
  label: string;
  caption: string;
  boxClass: string;
}> = [
  { value: "16:9", label: "16:9", caption: "Cinematic widescreen", boxClass: "w-10 h-[22px]" },
  { value: "9:16", label: "9:16", caption: "Vertical / social", boxClass: "w-[22px] h-10" },
  { value: "1:1", label: "1:1", caption: "Square", boxClass: "w-8 h-8" },
];

type Props = {
  chosen?: AspectRatio;
  disabled?: boolean;
  onChoose: (aspect: AspectRatio) => void;
};

export function AspectChoiceCard({ chosen, disabled, onChoose }: Props) {
  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-3 max-w-2xl">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          Pick an aspect ratio
        </div>
        <div className="text-sm text-foreground/85 leading-snug">
          Which frame shape should this key frame be? I'll lock it for any frame-by-frame extension.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isChosen = chosen === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || !!chosen}
              onClick={() => onChoose(opt.value)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                "border-border/40 bg-background/40 hover:bg-background/70 hover:border-border/70",
                isChosen && "border-primary/70 bg-primary/10 hover:bg-primary/10",
                (disabled || (!!chosen && !isChosen)) && "opacity-50",
                "disabled:cursor-not-allowed",
              )}
              aria-pressed={isChosen}
            >
              <div className="flex items-center justify-center w-12 h-12">
                <div
                  className={cn(
                    "rounded-sm border border-border/60 bg-muted/40",
                    opt.boxClass,
                    isChosen && "border-primary/70 bg-primary/20",
                  )}
                />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                  {opt.label}
                  {isChosen && <Check className="h-3 w-3 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{opt.caption}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
