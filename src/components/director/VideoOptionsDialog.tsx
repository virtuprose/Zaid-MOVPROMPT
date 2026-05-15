import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, ShieldAlert, Sparkles } from "lucide-react";
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
import {
  getModelControls,
  requiresEligibilityCheck,
  type VideoOptions,
} from "@/lib/director/videoModelControls";
import { checkVideoEligibility, rewritePromptSafe } from "@/lib/director/api";

type ConfirmMeta = { rewritten: boolean; summary?: string; original?: string };

type Props = {
  open: boolean;
  model: VideoModel | null;
  prompt: string;
  onCancel: () => void;
  onConfirm: (options: VideoOptions, finalPrompt: string, meta: ConfirmMeta) => void;
};

type Phase = "idle" | "checking" | "rewriting" | "blocked";

const MAX_REWRITES = 2;

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

export function VideoOptionsDialog({ open, model, prompt, onCancel, onConfirm }: Props) {
  const controls = useMemo(
    () => (model ? getModelControls(model.id) : null),
    [model],
  );
  const [options, setOptions] = useState<VideoOptions>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [blockReason, setBlockReason] = useState<string>("");
  const [blockCategories, setBlockCategories] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const cancelledRef = useRef(false);

  // Reset to defaults whenever the model changes / dialog opens
  useEffect(() => {
    if (controls) setOptions({ ...controls.defaults });
    setPhase("idle");
    setBlockReason("");
    setBlockCategories([]);
    setAttempt(0);
    cancelledRef.current = false;
  }, [controls, open]);

  if (!model || !controls) return null;

  const set = (patch: Partial<VideoOptions>) =>
    setOptions((prev) => ({ ...prev, ...patch }));

  const cancel = () => {
    cancelledRef.current = true;
    onCancel();
  };

  const runConfirm = async () => {
    cancelledRef.current = false;
    const needs = requiresEligibilityCheck(model.id);

    if (!needs) {
      onConfirm(options, prompt, { rewritten: false });
      return;
    }

    let currentPrompt = prompt;
    let rewriteSummary: string | undefined;
    let rewrites = 0;

    while (true) {
      if (cancelledRef.current) return;
      setPhase("checking");
      setAttempt(rewrites);
      const elig = await checkVideoEligibility(model.id, currentPrompt);
      if (cancelledRef.current) return;

      if (elig.eligible) {
        onConfirm(options, currentPrompt, {
          rewritten: rewrites > 0,
          summary: rewriteSummary,
          original: rewrites > 0 ? prompt : undefined,
        });
        return;
      }

      if (rewrites >= MAX_REWRITES) {
        setPhase("blocked");
        setBlockReason(elig.reason || "Prompt was rejected by content moderation.");
        setBlockCategories(elig.categories || []);
        return;
      }

      setPhase("rewriting");
      setAttempt(rewrites + 1);
      try {
        const r = await rewritePromptSafe(
          currentPrompt,
          elig.reason || "content moderation",
          model.id,
          elig.categories,
        );
        if (cancelledRef.current) return;
        currentPrompt = r.rewritten_prompt;
        rewriteSummary = r.changes_summary;
        rewrites += 1;
      } catch (e: any) {
        setPhase("blocked");
        setBlockReason(
          (elig.reason ? elig.reason + " — " : "") +
            (e?.message || "Could not rewrite prompt safely."),
        );
        setBlockCategories(elig.categories || []);
        return;
      }
    }
  };

  const busy = phase === "checking" || phase === "rewriting";
  const buttonLabel =
    phase === "checking"
      ? "Checking eligibility…"
      : phase === "rewriting"
        ? `Rewriting safely (${attempt}/${MAX_REWRITES})…`
        : `Render with ${model.label}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
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

          {requiresEligibilityCheck(model.id) && phase === "idle" && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                {model.label} runs a pre-flight content check. If the prompt is flagged, the
                AI Director will rewrite it safely (up to {MAX_REWRITES} attempts) and re-check.
              </span>
            </div>
          )}

          {busy && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-primary flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {phase === "checking"
                ? "Checking prompt eligibility…"
                : `Prompt flagged — rewriting safely (attempt ${attempt}/${MAX_REWRITES})…`}
            </div>
          )}

          {phase === "blocked" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Prompt blocked by content moderation
              </div>
              <div className="text-muted-foreground">{blockReason}</div>
              {blockCategories.length > 0 && (
                <div className="text-[10px] text-muted-foreground/80">
                  Categories: {blockCategories.join(", ")}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground pt-1">
                Try editing the prompt manually, or pick a different model.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={runConfirm}
            disabled={busy || phase === "blocked"}
            className="gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Film className="w-4 h-4" />
            )}{" "}
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
