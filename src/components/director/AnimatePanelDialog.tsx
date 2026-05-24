import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  VIDEO_MODEL_GROUPS,
  findVideoModel,
  type VideoModel,
} from "@/lib/director/videoModels";
import { cn } from "@/lib/utils";

// Models that require an existing video (not a starting image) — hidden here.
const EXCLUDE = new Set(["kling-omni-edit", "kling-motion-control"]);

const STORAGE_KEY = "vp.animatePanel.lastModel";
const FALLBACK_MODEL = "kling-v2.1-master";

export type AnimateDialogResult = {
  provider: string;
  duration: 5 | 10;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "all";
  shotIndex?: number;
  totalPanels?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  directorsNote?: string;
  onConfirm: (result: AnimateDialogResult) => void | Promise<void>;
};

function readLastModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || FALLBACK_MODEL;
  } catch {
    return FALLBACK_MODEL;
  }
}

export function AnimatePanelDialog({
  open,
  onOpenChange,
  mode,
  shotIndex,
  totalPanels,
  aspectRatio,
  directorsNote,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<string>(() => readLastModel());
  const [duration, setDuration] = useState<5 | 10>(5);
  const [recommending, setRecommending] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state and fetch a fresh recommendation each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setRecommendedId(null);
    setAlternatives([]);
    setReason("");
    setRecommending(true);

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("recommend-animate-model", {
          body: {
            mode,
            shotIndex,
            totalPanels,
            aspectRatio: aspectRatio || "16:9",
            directorsNote: directorsNote || "",
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const rec = (data?.recommended_id as string) || FALLBACK_MODEL;
        setRecommendedId(rec);
        setAlternatives(Array.isArray(data?.alternatives) ? data.alternatives : []);
        setReason((data?.reason || "").toString());
        // Auto-select the recommendation on first open (don't override after user
        // manually changes it — but since we reset on open, this is fine).
        setSelected(rec);
      } catch (e) {
        // Silent fallback — keep last picked model.
        setRecommendedId(FALLBACK_MODEL);
        setReason("Kling 2.1 Master is a reliable cinematic baseline for image-to-video.");
      } finally {
        if (!cancelled) setRecommending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, shotIndex, totalPanels, aspectRatio, directorsNote]);

  const groups = useMemo(
    () =>
      VIDEO_MODEL_GROUPS.map((g) => ({
        ...g,
        models: g.models.filter((m) => !EXCLUDE.has(m.id)),
      })).filter((g) => g.models.length > 0),
    [],
  );

  const selectedModel = findVideoModel(selected);
  const isRecommended = selected === recommendedId;
  const isAlt = !isRecommended && alternatives.includes(selected);

  const confirm = async () => {
    if (!selected) return;
    try {
      localStorage.setItem(STORAGE_KEY, selected);
    } catch {
      /* ignore */
    }
    setSubmitting(true);
    try {
      await onConfirm({ provider: selected, duration });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "all"
      ? `Animate all panels${totalPanels ? ` (${totalPanels})` : ""}`
      : `Animate panel${shotIndex !== undefined ? ` ${shotIndex}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "all"
              ? "Pick a video model — I'll queue one clip per panel using each frame as the starting image."
              : "Pick a video model — I'll animate this frame as the starting image."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Recommendation banner */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                AI recommendation
              </span>
              {recommending && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
              )}
            </div>
            {recommendedId ? (
              <>
                <div className="text-sm font-medium text-foreground">
                  {findVideoModel(recommendedId)?.label ?? recommendedId}
                </div>
                {reason && (
                  <p className="text-[11px] text-muted-foreground/85 leading-snug">
                    {reason}
                  </p>
                )}
                {alternatives.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mr-1">
                      Or try:
                    </span>
                    {alternatives.map((id) => {
                      const m = findVideoModel(id);
                      if (!m) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelected(id)}
                          className={cn(
                            "text-[10.5px] px-2 py-0.5 rounded-full border transition-colors",
                            selected === id
                              ? "bg-primary/15 text-primary border-primary/50"
                              : "bg-muted/30 text-muted-foreground/85 border-border/40 hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground/80">
                Asking the Director for a recommendation…
              </p>
            )}
          </div>

          {/* Model picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/85">
                Model
              </div>
              {isRecommended && (
                <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/40 text-[10px] py-0">
                  Recommended
                </Badge>
              )}
              {isAlt && (
                <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/40 text-[10px] py-0">
                  Alternative pick
                </Badge>
              )}
            </div>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a model" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {groups.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <span>{m.label}</span>
                          {m.id === recommendedId && (
                            <span className="text-[9px] uppercase tracking-wider text-accent">★ rec</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selectedModel?.note && (
              <p className="text-[11px] text-muted-foreground/75 leading-snug">
                {selectedModel.note}
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/85">
              Duration
            </div>
            <div className="inline-flex gap-1 rounded-md border border-border bg-muted/30 p-1">
              {([5, 10] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition-colors",
                    duration === d
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Aspect (read-only) */}
          {aspectRatio && (
            <div className="text-[11px] text-muted-foreground/80">
              Aspect ratio: <span className="text-foreground/90 font-medium">{aspectRatio}</span> · matches your storyboard
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={confirm}
            disabled={!selected || submitting}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {mode === "all"
              ? `Queue ${totalPanels ?? ""} renders`.trim()
              : "Animate this shot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
