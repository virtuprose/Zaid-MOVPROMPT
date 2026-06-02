import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Film,
  Clock,
  Volume2,
  Frame,
  Sparkles,
  Wand2,
  Check,
  Play,
  Loader2,
  CloudUpload,
  Rows3,
  LayoutGrid,
  Combine,
  X,
  Eye,
} from "lucide-react";

import { exportPlanToDrive } from "@/lib/director/driveExport";
import {
  stitchPlanShots,
  cancelStitch as cancelStitchOnServer,
  TRANSITION_LABELS,
  TRANSITION_DESCRIPTIONS,
  type StitchTransition,
  type TransitionOverride,
} from "@/lib/director/stitch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransitionPreview } from "@/components/director/TransitionPreview";
import { OrchestratorDebugPanel } from "@/components/director/OrchestratorDebugPanel";
import { useDebugVisible } from "@/hooks/useDebugVisible";
import {
  type DirectorPlan,
  type PlannedShot,
  type RoutingBudget,
  emptyPlan,
  missingAxes,
  readPlan,
  statusLabel,
} from "@/lib/director/plan";
import { routeShot, type RouteDecision, type TasteSignals } from "@/lib/director/router";
import { MODEL_CATALOG } from "@/lib/director/videoModelCatalog";
import { orchestratePlan } from "@/lib/director/orchestrator";
import { loadMemoryFor, tasteSignalsFor } from "@/lib/director/memory";
import { usePricing, estimateVideoCost } from "@/lib/credits/pricing";

type Props = {
  sessionId: string | undefined;
};

const STATUS_DOT: Record<PlannedShot["status"], string> = {
  draft: "bg-muted-foreground/40",
  ready: "bg-cyan-400",
  rendering: "bg-amber-400 animate-pulse",
  done: "bg-emerald-500",
  failed: "bg-destructive",
};

const BUDGETS: { id: RoutingBudget; label: string; hint: string }[] = [
  { id: "quality", label: "Quality", hint: "Prefer top-tier models" },
  { id: "balanced", label: "Balanced", hint: "Best fit per shot" },
  { id: "cheap", label: "Cheap", hint: "Fast & low-cost tier" },
];

/**
 * Read-only-ish Plan panel — Stage 1 (structure) + Stage 2 (routing).
 * The panel auto-hides while plan.shots is empty so existing sessions are
 * unaffected. Once the orchestrator (Stage 3) populates shots, this surfaces
 * the routed model per shot with an override popover and a session-level
 * budget selector.
 */
export function PlanPanel({ sessionId }: Props) {
  const [plan, setPlan] = useState<DirectorPlan>(emptyPlan);
  const [open, setOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stitching, setStitching] = useState(false);
  const stitchCancelRef = useRef(false);
  const [stitchPreview, setStitchPreview] = useState<{
    status: "composing" | "done" | "failed" | "cancelled";
    startedAt: number;
    clipUrls: string[];
    totalDuration: number;
    videoUrl?: string;
    error?: string;
  } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (stitchPreview?.status !== "composing") return;
    const h = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, [stitchPreview?.status]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [view, setView] = useState<"table" | "rail">(() => {
    if (typeof window === "undefined") return "table";
    return (localStorage.getItem("director.planView") as "table" | "rail") ?? "table";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("director.planView", view);
  }, [view]);
  const [transition, setTransition] = useState<StitchTransition>(() => {
    if (typeof window === "undefined") return "hard_cut";
    const raw = localStorage.getItem("director.stitchTransition") as StitchTransition | null;
    return raw === "crossfade" || raw === "match_cut" ? raw : "hard_cut";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("director.stitchTransition", transition);
  }, [transition]);
  // Per-boundary override array dialed in by the TransitionPreview scrubber.
  // Reset whenever the preset changes so we never ship stale offsets.
  const [stitchOverrides, setStitchOverrides] = useState<TransitionOverride[]>([]);
  useEffect(() => {
    setStitchOverrides([]);
  }, [transition]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const prices = usePricing();

  // Keep the latest plan in a ref so the realtime handler always patches the
  // freshest version without re-subscribing on every render.
  const planRef = useRef<DirectorPlan>(emptyPlan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!sessionId) {
      setPlan(emptyPlan);
      setLoaded(true);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("director_sessions")
        .select("plan")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active) return;
      setPlan(readPlan((data as { plan?: unknown } | null)?.plan));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const budget: RoutingBudget = plan.globals.budget ?? "balanced";

  // Stage 4: unified memory. Loaded once per session; feeds taste signals
  // into the router so previously-liked models get a small bump.
  const [taste, setTaste] = useState<TasteSignals>({});
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    (async () => {
      const memory = await loadMemoryFor(sessionId);
      if (!active) return;
      setTaste(tasteSignalsFor(memory));
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Precompute router decisions for each shot — cheap, pure function.
  const decisions = useMemo<RouteDecision[]>(
    () => plan.shots.map((s) => routeShot(s, budget, taste)),
    [plan.shots, budget, taste],
  );

  const persist = async (next: DirectorPlan) => {
    setPlan(next);
    if (!sessionId) return;
    setSaving(true);
    try {
      await supabase
        .from("director_sessions")
        .update({ plan: next as never })
        .eq("id", sessionId);
    } finally {
      setSaving(false);
    }
  };

  const setBudget = (b: RoutingBudget) => {
    void persist({ ...plan, globals: { ...plan.globals, budget: b } });
  };

  const overrideModel = (shotId: string, modelId: string) => {
    void persist({
      ...plan,
      shots: plan.shots.map((s) =>
        s.id === shotId
          ? { ...s, locked: { ...s.locked, model: modelId, model_user_override: true } }
          : s,
      ),
    });
  };

  const clearOverride = (shotId: string) => {
    void persist({
      ...plan,
      shots: plan.shots.map((s) => {
        if (s.id !== shotId) return s;
        const { model: _m, model_user_override: _o, ...rest } = s.locked;
        return { ...s, locked: rest };
      }),
    });
  };

  // Stage 3: Realtime reconciliation. When a video_job linked to a shot
  // completes or fails, patch the corresponding shot's status + outputUrl.
  useEffect(() => {
    if (!sessionId) return;
    const trackedJobIds = plan.shots
      .map((s) => s.metadata?.video_job_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (trackedJobIds.length === 0) return;

    const channel = supabase
      .channel(`director-plan-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "video_jobs" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            video_url?: string | null;
            error?: string | null;
          };
          if (!row.id || !trackedJobIds.includes(row.id)) return;
          if (row.status !== "completed" && row.status !== "failed") return;

          const current = planRef.current;
          const nextShots = current.shots.map((s) => {
            if (s.metadata?.video_job_id !== row.id) return s;
            if (row.status === "completed") {
              return {
                ...s,
                status: "done" as const,
                outputUrl: row.video_url ?? s.outputUrl,
                error: undefined,
              };
            }
            return {
              ...s,
              status: "failed" as const,
              error: row.error ?? "Render failed",
            };
          });
          void persist({ ...current, shots: nextShots });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, plan.shots.map((s) => s.metadata?.video_job_id).join("|")]);

  const renderable = plan.shots.filter(
    (s) =>
      s.status !== "rendering" &&
      s.status !== "done" &&
      !!s.prompt?.trim() &&
      !!s.locked.model,
  );
  const anyRendering = plan.shots.some((s) => s.status === "rendering");
  const exportableCount = plan.shots.filter(
    (s) => s.status === "done" && !!s.outputUrl,
  ).length;

  // Shots that can be stitched into one MP4 via the shared story-stitch infra.
  // Needs at least 2 completed shots, each linked to a video_job row.
  const stitchable = plan.shots
    .filter(
      (s): s is PlannedShot & { metadata: { video_job_id: string } } =>
        s.status === "done" &&
        !!s.outputUrl &&
        typeof s.metadata?.video_job_id === "string",
    )
    .map((s) => ({
      jobId: s.metadata.video_job_id,
      duration: s.locked.duration_seconds ?? 5,
      url: s.outputUrl as string,
    }));
  const canStitch = stitchable.length >= 2;

  // Per-shot + total credit estimate for the confirm dialog.
  const renderableEstimates = useMemo(
    () =>
      renderable.map((s, i) => {
        const modelId = s.locked.model ?? "seedance-v1-pro";
        const dur = s.locked.duration_seconds ?? 5;
        return {
          shotId: s.id,
          index: plan.shots.findIndex((x) => x.id === s.id),
          intent: s.intent || `Shot ${i + 1}`,
          modelId,
          durationSec: dur,
          cost: estimateVideoCost(prices, modelId, dur),
        };
      }),
    [renderable, prices, plan.shots],
  );
  const totalEstimate = renderableEstimates.reduce((a, b) => a + b.cost, 0);
  const insufficient = balance != null && balance < totalEstimate;

  const exportToDrive = async () => {
    if (!sessionId || exportableCount === 0 || exporting) return;
    setExporting(true);
    const toastId = toast.loading(
      `Exporting ${exportableCount} shot${exportableCount === 1 ? "" : "s"} to Drive…`,
    );
    try {
      const res = await exportPlanToDrive(sessionId);
      toast.success(
        `Exported ${res.uploaded_count} to Drive${res.failed_count > 0 ? ` · ${res.failed_count} failed` : ""}`,
        {
          id: toastId,
          action: {
            label: "Open folder",
            onClick: () => window.open(res.folder.url, "_blank", "noopener"),
          },
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Drive export failed", {
        id: toastId,
      });
    } finally {
      setExporting(false);
    }
  };

  const stitchPlan = async () => {
    if (!sessionId || !canStitch || stitching) return;
    stitchCancelRef.current = false;
    setStitching(true);
    const sourceClips = plan.shots
      .filter((s) => s.status === "done" && !!s.outputUrl)
      .map((s) => s.outputUrl!) as string[];
    const totalDuration = stitchable.reduce((a, b) => a + b.duration, 0);
    setStitchPreview({
      status: "composing",
      startedAt: Date.now(),
      clipUrls: sourceClips,
      totalDuration,
    });
    try {
      const res = await stitchPlanShots({
        sessionId,
        jobIds: stitchable.map((s) => s.jobId),
        durations: stitchable.map((s) => s.duration),
        title: (plan.globals as Record<string, unknown>).title as string | undefined,
        transition,
        overrides: stitchOverrides.length === stitchable.length - 1 ? stitchOverrides : undefined,
      });
      if (stitchCancelRef.current || res?.status === "cancelled" || !res?.video_url) {
        // User cancelled — server-side cancel may have returned before this.
        return;
      }
      setStitchPreview((p) =>
        p ? { ...p, status: "done", videoUrl: res.video_url } : p,
      );
      toast.success("Stitched into one MP4");
    } catch (e) {
      if (stitchCancelRef.current) return;
      const msg = e instanceof Error ? e.message : "Stitch failed";
      setStitchPreview((p) => (p ? { ...p, status: "failed", error: msg } : p));
      toast.error(msg);
    } finally {
      setStitching(false);
    }
  };

  const cancelStitch = async () => {
    // Local ignore-flag so the in-flight stitchPlan promise won't update UI
    // even if the server response races our cancel call.
    stitchCancelRef.current = true;
    setStitching(false);
    setStitchPreview(null);
    toast.message("Cancelling stitch…");
    if (!sessionId) return;
    try {
      await cancelStitchOnServer({ sessionId });
      toast.success("Stitch cancelled");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cancel failed";
      toast.error(msg);
    }
  };




  const openConfirm = async () => {
    if (!sessionId || renderable.length === 0 || running) return;
    setConfirmOpen(true);
    // Refresh balance each time the dialog opens.
    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .maybeSingle();
    setBalance(
      typeof (data as { balance?: number } | null)?.balance === "number"
        ? (data as { balance: number }).balance
        : null,
    );
  };

  const confirmRender = async () => {
    if (!sessionId || renderable.length === 0 || running) return;
    setConfirmOpen(false);
    setRunning(true);
    try {
      const res = await orchestratePlan(sessionId);
      const targetIds = new Set(renderable.map((s) => s.id));
      setPlan((p) => ({
        ...p,
        shots: p.shots.map((s) =>
          targetIds.has(s.id) ? { ...s, status: "rendering" as const, error: undefined } : s,
        ),
      }));
      if (res.failed > 0) {
        toast.error(`${res.failed} shot${res.failed === 1 ? "" : "s"} failed to submit`);
      }
      if (res.submitted > 0) {
        toast.success(`Rendering ${res.submitted} shot${res.submitted === 1 ? "" : "s"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start render");
    } finally {
      setRunning(false);
    }
  };

  if (!loaded || !sessionId) return null;

  // Orchestrator debug stays mounted even on empty plans — that's exactly
  // when it's most useful for diagnosing "why nothing renders".
  if (plan.shots.length === 0) {
    return <OrchestratorDebugPanel sessionId={sessionId} />;
  }

  return (
    <>
    <OrchestratorDebugPanel sessionId={sessionId} />
    <section
      aria-label="Shot plan"
      className="mb-3 rounded-xl border border-border/40 bg-[hsl(240_5%_8%)]/70 backdrop-blur-sm overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-foreground/90 hover:text-foreground transition-colors"
        >
          <Film className="w-4 h-4 text-accent" />
          <span className="font-display tracking-tight">Plan</span>
          <span className="text-xs text-muted-foreground">
            {plan.shots.length} shot{plan.shots.length === 1 ? "" : "s"}
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <div className="mr-1 inline-flex items-center rounded-md border border-border/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("table")}
              title="Table view"
              className={cn(
                "p-1 transition-colors",
                view === "table"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Rows3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("rail")}
              title="Storyboard rail"
              className={cn(
                "p-1 transition-colors border-l border-border/40",
                view === "rail"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {BUDGETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBudget(b.id)}
              title={b.hint}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md border transition-colors",
                budget === b.id
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={openConfirm}
            disabled={running || renderable.length === 0}
            title={
              renderable.length === 0
                ? anyRendering
                  ? "Render already in progress"
                  : "No shots ready to render (need prompt + model)"
                : `Render ${renderable.length} shot${renderable.length === 1 ? "" : "s"}`
            }
            className={cn(
              "ml-1 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
              renderable.length > 0 && !running
                ? "bg-accent/15 border-accent/40 text-accent hover:bg-accent/25"
                : "border-border/30 text-muted-foreground/60 cursor-not-allowed",
            )}
          >
            {running ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Render
            {renderable.length > 0 && (
              <span className="tabular-nums opacity-70">{renderable.length}</span>
            )}
          </button>
          {exportableCount > 0 && (
            <button
              type="button"
              onClick={exportToDrive}
              disabled={exporting}
              title={`Export ${exportableCount} completed shot${exportableCount === 1 ? "" : "s"} to Google Drive`}
              className={cn(
                "ml-1 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
                exporting
                  ? "border-border/30 text-muted-foreground/60 cursor-wait"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {exporting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CloudUpload className="w-3 h-3" />
              )}
              Drive
              <span className="tabular-nums opacity-70">{exportableCount}</span>
            </button>
          )}
          {canStitch && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={stitching}
                    title={`Transition: ${TRANSITION_LABELS[transition]}`}
                    className={cn(
                      "ml-1 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
                      stitching
                        ? "border-border/30 text-muted-foreground/60 cursor-not-allowed"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    <span className="opacity-70">Transition</span>
                    <span className="text-foreground/90">{TRANSITION_LABELS[transition]}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-64 p-1.5 bg-[hsl(240_5%_8%)] border-border/60"
                >
                  <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    Stitch transition
                  </div>
                  {(Object.keys(TRANSITION_LABELS) as StitchTransition[]).map((t) => {
                    const selected = t === transition;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransition(t)}
                        className={cn(
                          "w-full flex flex-col items-start gap-0.5 px-2 py-1.5 rounded text-left transition-colors",
                          selected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/40 text-foreground/90",
                        )}
                      >
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          {selected && <Check className="w-3 h-3" />}
                          {TRANSITION_LABELS[t]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {TRANSITION_DESCRIPTIONS[t]}
                        </span>
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={stitching}
                title="Preview transition timing before stitching"
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
                  stitching
                    ? "border-border/30 text-muted-foreground/60 cursor-not-allowed"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              <button
                type="button"
                onClick={stitchPlan}
                disabled={stitching}
                title={`Stitch ${stitchable.length} completed shots into one MP4 with ${TRANSITION_LABELS[transition].toLowerCase()}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors",
                  stitching
                    ? "border-border/30 text-muted-foreground/60 cursor-wait"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {stitching ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Combine className="w-3 h-3" />
                )}
                Stitch
                <span className="tabular-nums opacity-70">{stitchable.length}</span>
              </button>
            </>
          )}
          {saving && <span className="text-[10px] text-muted-foreground ml-1">Saving…</span>}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform ml-1",
              open ? "" : "-rotate-90",
            )}
          />
        </div>
      </div>

      {stitchPreview && (
        <StitchPreview
          preview={stitchPreview}
          nowTick={nowTick}
          onDismiss={() => setStitchPreview(null)}
          onRetry={stitchPlan}
          onCancel={cancelStitch}
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl bg-[hsl(240_5%_8%)] border-border/60">
          <DialogHeader>
            <DialogTitle>Transition preview</DialogTitle>
            <DialogDescription>
              Audition hard cut, crossfade, and match cut timing across your{" "}
              {stitchable.length} completed shots before paying to render the
              stitched MP4.
            </DialogDescription>
          </DialogHeader>
          {canStitch ? (
            <TransitionPreview
              clipUrls={stitchable.map((s) => s.url)}
              durations={stitchable.map((s) => s.duration)}
              transition={transition}
              onTransitionChange={setTransition}
              onOverridesChange={setStitchOverrides}
            />
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Need at least 2 completed shots to preview transitions.
            </div>
          )}
        </DialogContent>
      </Dialog>







      {open && view === "rail" && (
        <div className="border-t border-border/30 overflow-x-auto">
          <ol className="flex gap-3 p-3 min-w-min">
            {plan.shots.map((shot, idx) => {
              const decision = decisions[idx];
              const isOverride = decision.source === "override";
              return (
                <li
                  key={shot.id}
                  className="shrink-0 w-44 rounded-lg border border-border/40 bg-muted/20 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-video bg-black/60 flex items-center justify-center">
                    {shot.outputUrl ? (
                      <video
                        src={shot.outputUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => void (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />
                    ) : shot.status === "rendering" ? (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    ) : (
                      <Film className="w-5 h-5 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full",
                        STATUS_DOT[shot.status],
                      )}
                      aria-label={statusLabel(shot.status)}
                    />
                    <span className="absolute top-1.5 right-1.5 text-[10px] tabular-nums text-foreground/80 bg-black/50 px-1 rounded">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="p-2 flex flex-col gap-1 min-w-0">
                    <div className="text-xs text-foreground/95 line-clamp-2 min-h-[2rem]">
                      {shot.intent || "Untitled shot"}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {shot.locked.duration_seconds != null && (
                        <span className="tabular-nums">{shot.locked.duration_seconds}s</span>
                      )}
                      {shot.locked.aspect_ratio && (
                        <>
                          <span>·</span>
                          <span>{shot.locked.aspect_ratio}</span>
                        </>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition-colors self-start max-w-full",
                            isOverride
                              ? "bg-accent/15 border-accent/40 text-accent hover:bg-accent/20"
                              : "bg-muted/40 border-border/30 hover:bg-muted/60",
                          )}
                        >
                          {isOverride ? (
                            <Check className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <Wand2 className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span className="truncate">{decision.model.label}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-64 p-2 bg-[hsl(240_5%_8%)] border-border/60"
                      >
                        <div className="px-1 pb-1.5 text-[11px] text-muted-foreground">
                          {isOverride ? "Override" : `Routed (${budget})`} —{" "}
                          {decision.reasons.slice(0, 2).join(" · ") || "best fit"}
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {MODEL_CATALOG.map((m) => {
                            const selected = m.id === decision.modelId;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => overrideModel(shot.id, m.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                                  selected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/40 text-foreground/90",
                                )}
                              >
                                <Sparkles className="w-3 h-3 shrink-0 opacity-60" />
                                <span className="flex-1 truncate">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {m.cost}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {isOverride && (
                          <button
                            type="button"
                            onClick={() => clearOverride(shot.id)}
                            className="mt-2 w-full text-[11px] py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          >
                            Clear override (use Director's pick)
                          </button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {open && view === "table" && (

        <ol className="divide-y divide-border/30 border-t border-border/30">
          {plan.shots.map((shot, idx) => {
            const decision = decisions[idx];
            const missing = missingAxes(shot);
            const routedLabel = decision.model.label;
            const isOverride = decision.source === "override";

            return (
              <li key={shot.id} className="px-3 py-2.5 flex items-start gap-3">
                <span className="shrink-0 w-6 text-xs text-muted-foreground tabular-nums pt-0.5">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "shrink-0 w-1.5 h-1.5 rounded-full mt-2",
                    STATUS_DOT[shot.status],
                  )}
                  aria-label={statusLabel(shot.status)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground/95 truncate">
                    {shot.intent || "Untitled shot"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground items-center">
                    {shot.locked.duration_seconds != null && (
                      <Chip icon={<Clock className="w-3 h-3" />}>
                        {shot.locked.duration_seconds}s
                      </Chip>
                    )}
                    {shot.locked.aspect_ratio && (
                      <Chip icon={<Frame className="w-3 h-3" />}>{shot.locked.aspect_ratio}</Chip>
                    )}
                    {shot.locked.audio && (
                      <Chip icon={<Volume2 className="w-3 h-3" />}>{shot.locked.audio}</Chip>
                    )}

                    {/* Model chip with override popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-colors",
                            isOverride
                              ? "bg-accent/15 border-accent/40 text-accent hover:bg-accent/20"
                              : "bg-muted/40 border-border/30 hover:bg-muted/60",
                          )}
                          title={
                            isOverride
                              ? "User-selected model — click to change"
                              : `Routed by Director (${budget}) — click to override`
                          }
                        >
                          {isOverride ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Wand2 className="w-3 h-3" />
                          )}
                          {routedLabel}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-64 p-2 bg-[hsl(240_5%_8%)] border-border/60"
                      >
                        <div className="px-1 pb-1.5 text-[11px] text-muted-foreground">
                          {isOverride ? "Override" : `Routed (${budget})`} —{" "}
                          {decision.reasons.slice(0, 2).join(" · ") || "best fit"}
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {MODEL_CATALOG.map((m) => {
                            const selected = m.id === decision.modelId;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => overrideModel(shot.id, m.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                                  selected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/40 text-foreground/90",
                                )}
                              >
                                <Sparkles className="w-3 h-3 shrink-0 opacity-60" />
                                <span className="flex-1 truncate">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {m.cost}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {isOverride && (
                          <button
                            type="button"
                            onClick={() => clearOverride(shot.id)}
                            className="mt-2 w-full text-[11px] py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          >
                            Clear override (use Director's pick)
                          </button>
                        )}
                      </PopoverContent>
                    </Popover>

                    {missing.length > 0 && (
                      <span className="text-amber-400/80">
                        missing: {missing.filter((m) => m !== "model").join(", ") || "—"}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground pt-1">
                  {statusLabel(shot.status)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[hsl(240_5%_8%)] border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              Render {renderable.length} shot{renderable.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <div className="text-muted-foreground">
                  Estimated cost across all shots. Each shot is charged when it
                  starts; failed renders are refunded automatically.
                </div>
                <ul className="rounded-md border border-border/40 divide-y divide-border/30 max-h-64 overflow-y-auto">
                  {renderableEstimates.map((e) => (
                    <li
                      key={e.shotId}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs"
                    >
                      <span className="w-6 text-muted-foreground tabular-nums">
                        {String(e.index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate text-foreground/90">
                        {e.intent}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {e.modelId} · {e.durationSec}s
                      </span>
                      <span className="tabular-nums text-foreground/90 w-12 text-right">
                        {e.cost}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">
                    Balance: {balance == null ? "…" : `${balance} credits`}
                  </span>
                  <span className="font-display text-base text-foreground">
                    Total ≈ <span className="text-accent">{totalEstimate}</span>{" "}
                    credits
                  </span>
                </div>
                {insufficient && (
                  <div className="text-destructive text-xs">
                    Not enough credits — top up before rendering.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRender}
              disabled={insufficient || renderable.length === 0}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Render {renderable.length} · {totalEstimate} credits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
    </>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/40 border border-border/30">
      {icon}
      {children}
    </span>
  );
}

type StitchPreviewState = {
  status: "composing" | "done" | "failed" | "cancelled";
  startedAt: number;
  clipUrls: string[];
  totalDuration: number;
  videoUrl?: string;
  error?: string;
};

function StitchPreview({
  preview,
  nowTick,
  onDismiss,
  onRetry,
  onCancel,
}: {
  preview: StitchPreviewState;
  nowTick: number;
  onDismiss: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const elapsedMs = nowTick - preview.startedAt;
  const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const elapsedLabel = `${m}:${s.toString().padStart(2, "0")}`;
  // Rough heuristic — fal compose typically ~3-6s per clip-second of source.
  const estTotalSec = Math.max(20, Math.round(preview.totalDuration * 0.6) + 15);
  const pct =
    preview.status === "done"
      ? 100
      : preview.status === "failed"
        ? 0
        : Math.min(96, Math.round((elapsed / estTotalSec) * 100));

  return (
    <div className="border-t border-border/30 bg-muted/10 px-3 py-3 space-y-2.5 motion-safe:animate-fade-up">
      <div className="flex items-center gap-2">
        <Combine className="w-3.5 h-3.5 text-accent" />
        <div className="text-xs font-medium text-foreground/95">
          {preview.status === "composing" && "Stitching MP4…"}
          {preview.status === "done" && "Stitched MP4 ready"}
          {preview.status === "failed" && "Stitch failed"}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {preview.clipUrls.length} clips · {preview.totalDuration}s
        </div>
        <div className="ml-auto flex items-center gap-2">
          {preview.status === "composing" && (
            <>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {elapsedLabel} / ~{Math.floor(estTotalSec / 60)}:
                {(estTotalSec % 60).toString().padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border border-border/40 text-foreground/80 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40 transition-colors"
                title="Cancel stitch"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </>
          )}
          {preview.status === "failed" && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[10px] px-2 py-0.5 rounded-md border border-border/40 text-foreground/80 hover:bg-muted/40"
            >
              Retry
            </button>
          )}
          {preview.status !== "composing" && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[10px] px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        {preview.status === "composing" ? (
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundSize: "200% 100%",
              animation: "shimmer 2.2s linear infinite",
            }}
          />
        ) : preview.status === "done" ? (
          <div className="h-full w-full bg-emerald-500" />
        ) : (
          <div className="h-full w-full bg-destructive" />
        )}
      </div>

      {preview.status === "done" && preview.videoUrl ? (
        <div className="space-y-1.5">
          <video
            src={preview.videoUrl}
            controls
            autoPlay
            muted
            playsInline
            className="w-full rounded-md border border-primary/30 bg-black aspect-video"
          />
          <a
            href={preview.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline"
          >
            Open MP4 in new tab
          </a>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {preview.clipUrls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative shrink-0 w-24 aspect-video rounded overflow-hidden border border-border/40 bg-black/60"
            >
              <video
                src={url}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                muted
                playsInline
                preload="metadata"
              />
              <span className="absolute top-0.5 left-0.5 text-[9px] tabular-nums bg-black/60 text-foreground/90 px-1 rounded">
                {String(i + 1).padStart(2, "0")}
              </span>
              {preview.status === "composing" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_2.2s_linear_infinite]" />
              )}
            </div>
          ))}
        </div>
      )}

      {preview.status === "failed" && preview.error && (
        <div className="text-[11px] text-destructive">{preview.error}</div>
      )}
      {preview.status === "composing" && (
        <div className="text-[10px] text-muted-foreground">
          Composing on fal · ffmpeg. The preview will appear here as soon as
          rendering completes.
        </div>
      )}
    </div>
  );
}
