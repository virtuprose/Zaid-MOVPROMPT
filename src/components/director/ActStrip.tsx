import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Film, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { pollVideoJob } from "@/lib/director/api";

export type ActTile = {
  jobId: string;
  actIndex: number;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
};

type Props = {
  storyRenderId: string;
  title: string;
  acts: ActTile[];
  stitchStatus?: "idle" | "running" | "done" | "failed";
  stitchedVideoUrl?: string;
  disabled?: boolean;
  onActsUpdate: (next: ActTile[]) => void;
  onStitch: () => void;
};

export function ActStrip({ storyRenderId, title, acts, stitchStatus, stitchedVideoUrl, disabled, onStitch, onActsUpdate }: Props) {
  const pending = useMemo(
    () => acts.filter((a) => a.status === "queued" || a.status === "processing"),
    [acts],
  );
  const allDone = acts.length > 0 && acts.every((a) => a.status === "completed");
  const anyFailed = acts.some((a) => a.status === "failed");

  // Poll pending acts every 4s.
  useEffect(() => {
    if (pending.length === 0) return;
    let cancelled = false;
    const tick = async () => {
      const updates = await Promise.all(
        pending.map(async (act) => {
          try {
            const job = await pollVideoJob(act.jobId);
            return {
              ...act,
              status: (job.status as ActTile["status"]) || act.status,
              videoUrl: job.video_url || act.videoUrl,
              error: job.error || act.error,
            };
          } catch {
            return act;
          }
        }),
      );
      if (cancelled) return;
      const next = acts.map((a) => updates.find((u) => u.jobId === a.jobId) ?? a);
      const changed = next.some((n, i) => n.status !== acts[i].status || n.videoUrl !== acts[i].videoUrl);
      if (changed) onActsUpdate(next);
    };
    const handle = window.setInterval(tick, 4000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [pending, acts, onActsUpdate]);

  const completedCount = acts.filter((a) => a.status === "completed").length;

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
            Story render · 8 acts in parallel
          </div>
          <div className="text-sm text-foreground/90 truncate font-medium">{title}</div>
        </div>
        <div className="text-[11px] text-muted-foreground/70">
          {completedCount} / {acts.length} done
        </div>
      </div>

      <div className="h-px bg-muted/40 overflow-hidden rounded-full">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / Math.max(acts.length, 1)) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {acts.map((act) => {
          const StatusIcon =
            act.status === "completed" ? CheckCircle2 : act.status === "failed" ? XCircle : Loader2;
          return (
            <div
              key={act.jobId}
              className={cn(
                "relative rounded-lg overflow-hidden border aspect-video bg-background/30",
                act.status === "completed" && "border-primary/40",
                act.status === "failed" && "border-destructive/40",
                (act.status === "queued" || act.status === "processing") && "border-border/40",
              )}
            >
              {act.videoUrl ? (
                <video
                  src={act.videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  loop
                  onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                  onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                  <StatusIcon
                    className={cn(
                      "h-5 w-5",
                      (act.status === "queued" || act.status === "processing") && "animate-spin",
                      act.status === "failed" && "text-destructive",
                    )}
                  />
                </div>
              )}
              <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                Act {act.actIndex}
              </div>
              {act.status === "failed" && act.error && (
                <div className="absolute bottom-1 left-1 right-1 text-[9px] text-destructive bg-background/80 px-1 py-0.5 rounded truncate" title={act.error}>
                  {act.error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stitchedVideoUrl ? (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground/80">Stitched story · final</div>
          <video src={stitchedVideoUrl} controls className="w-full rounded-lg border border-primary/30" />
          <a
            href={stitchedVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Open in new tab
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-muted-foreground/70">
            {allDone
              ? "All acts ready. Stitch into one video."
              : anyFailed && pending.length === 0
                ? "Some acts failed — stitch the rest, or re-render the whole story."
                : "Renders are running in parallel. The Stitch button unlocks when all 8 finish."}
          </div>
          <Button
            type="button"
            size="sm"
            variant={allDone ? "default" : "outline"}
            disabled={disabled || !allDone || stitchStatus === "running"}
            onClick={onStitch}
            className="rounded-full gap-1.5"
          >
            <Film className="h-3.5 w-3.5" />
            {stitchStatus === "running" ? "Stitching…" : stitchStatus === "failed" ? "Retry stitch" : "Stitch into one video"}
          </Button>
        </div>
      )}
    </div>
  );
}
