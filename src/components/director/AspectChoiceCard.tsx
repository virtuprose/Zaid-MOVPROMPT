import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type ImageQuality = "1K" | "2K" | "4K";

const ASPECTS: Array<{
  value: AspectRatio;
  label: string;
  caption: string;
  boxClass: string;
}> = [
  { value: "16:9", label: "16:9", caption: "Cinematic widescreen", boxClass: "w-10 h-[22px]" },
  { value: "9:16", label: "9:16", caption: "Vertical / social", boxClass: "w-[22px] h-10" },
  { value: "1:1", label: "1:1", caption: "Square", boxClass: "w-8 h-8" },
];

export const QUALITY_4K_CREDITS_PER_PANEL = 3;

const QUALITIES: Array<{
  value: ImageQuality;
  label: string;
  caption: string;
}> = [
  { value: "1K", label: "1K", caption: "~1024px · free" },
  { value: "2K", label: "2K", caption: "~2048px · free upscale" },
  { value: "4K", label: "4K", caption: `~4096px · +${QUALITY_4K_CREDITS_PER_PANEL} cr / panel` },
];

type Props = {
  chosen?: AspectRatio;
  disabled?: boolean;
  onChoose: (aspect: AspectRatio, quality: ImageQuality) => void;
};

export function AspectChoiceCard({ chosen, disabled, onChoose }: Props) {
  const [quality, setQuality] = useState<ImageQuality>("1K");
  const locked = !!chosen || disabled;

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-4 max-w-2xl">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          Frame & quality
        </div>
        <div className="text-sm text-foreground/85 leading-snug">
          Pick an aspect ratio (I'll lock it for any frame extension) and an output resolution.
        </div>
      </div>

      {/* Quality row */}
      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Resolution
        </div>
        <div className="flex flex-wrap gap-2">
          {QUALITIES.map((q) => {
            const isOn = quality === q.value;
            return (
              <button
                key={q.value}
                type="button"
                disabled={locked}
                onClick={() => setQuality(q.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-left transition-colors",
                  "border-border/40 bg-background/40 hover:bg-background/70 hover:border-border/70",
                  isOn && "border-primary/70 bg-primary/10 hover:bg-primary/10",
                  locked && "opacity-50 cursor-not-allowed",
                )}
                aria-pressed={isOn}
              >
                <div className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                  {q.label}
                  {isOn && <Check className="h-3 w-3 text-primary" />}
                </div>
                <div className="text-[10px] text-muted-foreground">{q.caption}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect row (clicking commits the choice) */}
      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
          Aspect ratio
        </div>
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((opt) => {
            const isChosen = chosen === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled || !!chosen}
                onClick={() => onChoose(opt.value, quality)}
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
    </div>
  );
}
