import { useEffect, useMemo, useState } from "react";
import { Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { VideoModel } from "@/lib/director/videoModels";
import {
  getModelControls,
  type VideoOptions,
} from "@/lib/director/videoModelControls";

type ConfirmMeta = { rewritten: boolean; summary?: string; original?: string };

type Props = {
  open: boolean;
  model: VideoModel | null;
  prompt: string;
  onCancel: () => void;
  onConfirm: (options: VideoOptions, finalPrompt: string, meta: ConfirmMeta) => void;
};

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T | undefined;
  options: T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-muted/30 p-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              active
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {format ? format(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

function nearest(values: number[], target: number) {
  return values.reduce((best, v) =>
    Math.abs(v - target) < Math.abs(best - target) ? v : best,
  );
}

function DurationControl({
  controls,
  value,
  onChange,
}: {
  controls: ReturnType<typeof getModelControls>;
  value: number | "auto" | undefined;
  onChange: (v: number | "auto") => void;
}) {
  const discrete = controls.durations;
  const hasRange =
    typeof controls.durationMin === "number" &&
    typeof controls.durationMax === "number";
  const hasAuto = !!controls.durationAuto;

  if (!hasRange && (!discrete || discrete.length === 0)) return null;

  if (!hasRange && discrete && discrete.length === 1) {
    return (
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Duration
        </Label>
        <div className="text-xs text-foreground/80">{discrete[0]}s (fixed)</div>
      </div>
    );
  }

  const min = hasRange ? (controls.durationMin as number) : Math.min(...(discrete || [0]));
  const max = hasRange ? (controls.durationMax as number) : Math.max(...(discrete || [0]));
  const step = hasRange ? (controls.durationStep ?? 1) : 1;

  const isAuto = value === "auto";
  const numericValue = typeof value === "number" ? value : Math.round((min + max) / 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Duration
        </Label>
        <div className="flex items-center gap-2">
          {hasAuto && (
            <button
              type="button"
              onClick={() => onChange(isAuto ? Math.round((min + max) / 2) : "auto")}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                isAuto
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Auto
            </button>
          )}
          <span className="text-xs tabular-nums text-foreground/80 min-w-[2.5rem] text-right">
            {isAuto ? "auto" : `${numericValue}s`}
          </span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        disabled={isAuto}
        value={[numericValue]}
        onValueChange={([v]) => {
          const snapped = discrete && !hasRange ? nearest(discrete, v) : v;
          onChange(snapped);
        }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/70">
        <span>{min}s</span>
        <span>{max}s</span>
      </div>
    </div>
  );
}

export function VideoOptionsDialog({ open, model, prompt, onCancel, onConfirm }: Props) {
  const controls = useMemo(
    () => (model ? getModelControls(model.id) : null),
    [model],
  );
  const [options, setOptions] = useState<VideoOptions>({});

  useEffect(() => {
    if (controls) setOptions({ ...controls.defaults });
  }, [controls, open]);

  if (!open || !model || !controls) return null;

  const set = (patch: Partial<VideoOptions>) =>
    setOptions((prev) => ({ ...prev, ...patch }));

  const runConfirm = () => {
    onConfirm(options, prompt, { rewritten: false });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-[hsl(240_5%_8%)] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-base flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" /> Render settings
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Tune the controls supported by {model.label} before rendering.
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close render settings"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {controls.aspectRatios && controls.aspectRatios.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Aspect ratio
            </Label>
            <Segmented
              value={options.aspect_ratio}
              options={controls.aspectRatios}
              onChange={(v) => set({ aspect_ratio: v })}
            />
          </div>
        )}

        <DurationControl
          controls={controls}
          value={options.duration}
          onChange={(v) => set({ duration: v })}
        />

        {controls.resolutions && controls.resolutions.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Resolution
            </Label>
            <Segmented
              value={options.resolution}
              options={controls.resolutions}
              onChange={(v) => set({ resolution: v })}
            />
          </div>
        )}

        {controls.audio && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Audio
              </Label>
              <div className="text-[11px] text-muted-foreground">
                Generate native audio with the video
              </div>
            </div>
            <Switch
              checked={!!options.audio}
              onCheckedChange={(v) => set({ audio: v })}
            />
          </div>
        )}

        {controls.cfgScale && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Prompt adherence (cfg_scale)
              </Label>
              <span className="text-xs text-foreground/80">
                {(options.cfg_scale ?? 0.5).toFixed(2)}
              </span>
            </div>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={[options.cfg_scale ?? 0.5]}
              onValueChange={([v]) => set({ cfg_scale: v })}
            />
          </div>
        )}

        {controls.promptOptimizer && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Prompt optimizer
              </Label>
              <div className="text-[11px] text-muted-foreground">
                Let the model refine your prompt for better results
              </div>
            </div>
            <Switch
              checked={!!options.prompt_optimizer}
              onCheckedChange={(v) => set({ prompt_optimizer: v })}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={runConfirm}
          className="gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
        >
          <Film className="w-4 h-4" /> Render with {model.label}
        </Button>
      </div>
    </div>
  );
}
