import { useMemo, useState } from "react";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { VideoModel } from "@/lib/director/videoModels";
import { getModelControls, type VideoOptions } from "@/lib/director/videoModelControls";

type Props = {
  open: boolean;
  model: VideoModel | null;
  onCancel: () => void;
  onConfirm: (options: VideoOptions) => void;
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

export function VideoOptionsDialog({ open, model, onCancel, onConfirm }: Props) {
  const controls = useMemo(
    () => (model ? getModelControls(model.id) : null),
    [model],
  );
  const [options, setOptions] = useState<VideoOptions>({});

  // Reset to defaults whenever the model changes
  useMemo(() => {
    if (controls) setOptions({ ...controls.defaults });
  }, [controls]);

  if (!model || !controls) return null;

  const set = (patch: Partial<VideoOptions>) =>
    setOptions((prev) => ({ ...prev, ...patch }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" /> Render settings
          </DialogTitle>
          <DialogDescription>
            Tune the controls supported by {model.label} before rendering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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

          {controls.durations && controls.durations.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Duration
              </Label>
              <Segmented
                value={options.duration}
                options={controls.durations}
                onChange={(v) => set({ duration: v })}
                format={(v) => `${v}s`}
              />
            </div>
          )}

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

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(options)}
            className="gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
          >
            <Film className="w-4 h-4" /> Render with {model.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
