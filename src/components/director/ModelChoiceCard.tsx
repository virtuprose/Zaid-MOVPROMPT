import { useState } from "react";
import { Check, Sparkles, Clock, Ratio, Volume2, Monitor, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { findVideoModel, VIDEO_MODEL_GROUPS } from "@/lib/director/videoModels";
import type { LockedSpec } from "@/lib/director/api";

type Props = {
  recommendedId: string;
  alternatives?: string[];
  reason: string;
  lockedSpec?: LockedSpec;
  disabled?: boolean;
  hasReferenceImage?: boolean;
  onConfirm: (modelId: string) => void;
};

const AUDIO_LABEL: Record<NonNullable<LockedSpec["audio"]>, string> = {
  silent: "silent",
  sfx: "SFX",
  music: "music",
  dialogue: "dialogue",
  full: "full audio",
};

const INPUT_MODE_LABEL: Record<NonNullable<LockedSpec["input_mode"]>, string> = {
  "text-to-video": "fresh generation",
  "image-to-video": "image-to-video",
  "video-edit": "video edit",
  "motion-control": "motion control",
  "multi-reference": "multi-reference",
};

function SpecChips({ spec }: { spec: LockedSpec }) {
  const chips: Array<{ icon: typeof Clock; label: string }> = [];
  if (spec.duration_seconds) chips.push({ icon: Clock, label: `${spec.duration_seconds}s` });
  if (spec.aspect_ratio) chips.push({ icon: Ratio, label: spec.aspect_ratio });
  if (spec.audio) chips.push({ icon: Volume2, label: AUDIO_LABEL[spec.audio] });
  if (spec.resolution) chips.push({ icon: Monitor, label: spec.resolution.toUpperCase() });
  if (spec.input_mode) chips.push({ icon: Film, label: INPUT_MODE_LABEL[spec.input_mode] });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
        Locked
      </span>
      {chips.map((c, i) => {
        const Icon = c.icon;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
          >
            <Icon className="w-2.5 h-2.5" />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

export function ModelChoiceCard({
  recommendedId,
  alternatives = [],
  reason,
  lockedSpec,
  disabled,
  hasReferenceImage = false,
  onConfirm,
}: Props) {
  const allowModel = (m: { requiresReference?: boolean }) =>
    hasReferenceImage || !m.requiresReference;

  const recommendedRaw = findVideoModel(recommendedId);
  const recommended = recommendedRaw && allowModel(recommendedRaw) ? recommendedRaw : undefined;
  const [selected, setSelected] = useState<string>(recommended?.id ?? recommendedId);
  const [showAll, setShowAll] = useState(false);
  const altModels = alternatives
    .map((id) => findVideoModel(id))
    .filter((m): m is NonNullable<typeof m> => !!m && m.id !== recommended?.id && allowModel(m));

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-[hsl(240_10%_7%)] to-[hsl(240_8%_5%)] p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-foreground/90">
          Which model should I write this prompt for?
          {reason && (
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{reason}</div>
          )}
        </div>
      </div>

      {/* Recommended + alternatives chips */}
      <div className="flex flex-wrap gap-2">
        {recommended && (
          <ModelChip
            model={recommended}
            recommended
            selected={selected === recommended.id}
            disabled={disabled}
            onClick={() => setSelected(recommended.id)}
          />
        )}
        {altModels.map((m) => (
          <ModelChip
            key={m.id}
            model={m}
            selected={selected === m.id}
            disabled={disabled}
            onClick={() => setSelected(m.id)}
          />
        ))}
      </div>

      {/* Browse all */}
      {!showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Browse all models →
        </button>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/40 p-3">
          {VIDEO_MODEL_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.models.filter(allowModel).map((m) => (
                  <ModelChip
                    key={m.id}
                    model={m}
                    selected={selected === m.id}
                    disabled={disabled}
                    onClick={() => setSelected(m.id)}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          disabled={disabled || !selected}
          onClick={() => onConfirm(selected)}
          className="gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Generate for {findVideoModel(selected)?.label || selected}
        </Button>
      </div>
    </div>
  );
}

function ModelChip({
  model,
  selected,
  recommended,
  disabled,
  onClick,
  compact,
}: {
  model: { id: string; label: string; note?: string };
  selected?: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative inline-flex flex-col items-start gap-0.5 rounded-lg border px-3 text-left transition-all",
        compact ? "py-1" : "py-1.5",
        selected
          ? "border-primary bg-primary/15 text-foreground shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)]"
          : "border-border/50 bg-muted/10 text-foreground/80 hover:border-border hover:bg-muted/20",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      title={model.note}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium">
        {model.label}
        {recommended && (
          <span className="inline-flex items-center rounded-full bg-primary/25 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Recommended
          </span>
        )}
      </span>
      {!compact && model.note && (
        <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[260px]">
          {model.note}
        </span>
      )}
    </button>
  );
}
