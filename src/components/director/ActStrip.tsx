import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Film, Loader2, CheckCircle2, XCircle, Play } from "lucide-react";
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
  refreshSignal?: number;
  onActsUpdate: (next: ActTile[]) => void;
  onStitch: () => void;
};

const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const statusWord = (status: ActTile["status"], elapsedMs: number) => {
  if (status === "queued") return "Queued";
  if (status === "completed") return "Ready";
  if (status === "failed") return "Failed";
  return elapsedMs > 90_000 ? "Finalizing" : "Rendering";
};

export function ActStrip({ title, acts, stitchStatus, stitchedVideoUrl, disabled, refreshSignal, onStitch, onActsUpdate }: Props) {
  const pending = useMemo(
    () => acts.filter((a) => a.status === "queued" || a.status === "processing"),
    [acts],
  );
  const allDone = acts.length > 0 && acts.every((a) => a.status === "completed");
  const anyFailed = acts.some((a) => a.status === "failed");

  // Track when each act first entered "processing" so we can show an elapsed timer.
  const startedAtRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const map = startedAtRef.current;
    const now = Date.now();
    for (const a of acts) {
      if ((a.status === "processing" || a.status === "queued") && !map[a.jobId]) {
        map[a.jobId] = now;
      }
    }
  }, [acts]);

  // 1s ticker to re-render elapsed timers while anything is pending.
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (pending.length === 0) return;
    const h = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, [pending.length]);

  // Adaptive polling: 2s for the first 60s, 4s after. Resets whenever a new
  // act enters pending. Also triggered immediately on refreshSignal bumps.
  const pendingKey = useMemo(() => pending.map((p) => p.jobId).sort().join("|"), [pending]);
  const pendingSinceRef = useRef<number>(0);
  useEffect(() => {
    if (pending.length === 0) {
      pendingSinceRef.current = 0;
      return;
    }
    if (pendingSinceRef.current === 0) pendingSinceRef.current = Date.now();

    let cancelled = false;
    let timeoutHandle = 0;

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
      schedule();
    };

    const schedule = () => {
      if (cancelled) return;
      const elapsed = Date.now() - pendingSinceRef.current;
      const delay = elapsed < 60_000 ? 2000 : 4000;
      timeoutHandle = window.setTimeout(tick, delay);
    };

    // Kick off immediately on mount / refreshSignal / pending change.
    void tick();

    return () => {
      cancelled = true;
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, refreshSignal]);

  const completedCount = acts.filter((a) => a.status === "completed").length;

  // Longest elapsed time across pending acts, for the footer telemetry line.
  const longestElapsedMs = pending.reduce((max, p) => {
    const start = startedAtRef.current[p.jobId];
    if (!start) return max;
    const e = nowTick - start;
    return e > max ? e : max;
  }, 0);

  // First completed act — used for the inline preview banner.
  const firstCompleted = acts.find((a) => a.status === "completed" && a.videoUrl);
  const showFirstReadyBanner = !!firstCompleted && !allDone && !stitchedVideoUrl;

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
            Story render · 4 acts in parallel
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

      {showFirstReadyBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80 motion-safe:animate-fade-up">
          <Play className="h-3.5 w-3.5 text-primary" />
          <span>
            Act {firstCompleted!.actIndex} ready · {acts.length - completedCount} more rendering…
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {acts.map((act) => {
          const StatusIcon =
            act.status === "completed" ? CheckCircle2 : act.status === "failed" ? XCircle : Loader2;
          const start = startedAtRef.current[act.jobId];
          const elapsedMs = start && act.status !== "completed" && act.status !== "failed" ? nowTick - start : 0;
          const isPending = act.status === "queued" || act.status === "processing";
          return (
            <div key={act.jobId} className="space-y-1">
              <div
                className={cn(
                  "relative rounded-lg overflow-hidden border aspect-video bg-background/30",
                  act.status === "completed" && "border-primary/40",
                  act.status === "failed" && "border-destructive/40",
                  isPending && "border-border/40",
                )}
              >
                {act.videoUrl ? (
                  <video
                    src={act.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                    <StatusIcon
                      className={cn(
                        "h-5 w-5",
                        isPending && "animate-spin",
                        act.status === "failed" && "text-destructive",
                      )}
                    />
                  </div>
                )}
                <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                  Act {act.actIndex}
                </div>
                {isPending && (
                  <div className="absolute bottom-1 right-1 text-[9px] font-mono bg-background/80 text-foreground/90 px-1 py-0.5 rounded tabular-nums">
                    {formatElapsed(elapsedMs)}
                  </div>
                )}
                {isPending && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-background/40">
                    <div className="h-full w-1/3 bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_2.2s_linear_infinite]" />
                  </div>
                )}
                {act.status === "failed" && act.error && (
                  <div className="absolute bottom-1 left-1 right-1 text-[9px] text-destructive bg-background/80 px-1 py-0.5 rounded truncate" title={act.error}>
                    {act.error}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "text-[10px] text-center tabular-nums",
                  act.status === "completed" && "text-primary/80",
                  act.status === "failed" && "text-destructive/80",
                  isPending && "text-muted-foreground/70",
                )}
              >
                {statusWord(act.status, elapsedMs)}
              </div>
            </div>
          );
        })}
      </div>

      {pending.length > 0 && (
        <div className="text-[10px] text-muted-foreground/60 flex items-center justify-between gap-2">
          <span>Typically 3–6 min · 1080p · 15s · audio</span>
          <span className="tabular-nums">
            longest {formatElapsed(longestElapsedMs)}
          </span>
        </div>
      )}

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
                : "Renders are running in parallel. The Stitch button unlocks when all 4 finish."}
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
