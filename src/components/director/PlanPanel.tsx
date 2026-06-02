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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type DirectorPlan,
  type PlannedShot,
  type RoutingBudget,
  emptyPlan,
  missingAxes,
  readPlan,
  statusLabel,
} from "@/lib/director/plan";
import { routeShot, type RouteDecision } from "@/lib/director/router";
import { MODEL_CATALOG } from "@/lib/director/videoModelCatalog";
import { orchestratePlan } from "@/lib/director/orchestrator";

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
  // Keep the latest plan in a ref so the realtime handler always patches the
  // freshest version without re-subscribing on every render.
  const planRef = useRef<DirectorPlan>(emptyPlan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
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

  // Precompute router decisions for each shot — cheap, pure function.
  const decisions = useMemo<RouteDecision[]>(
    () => plan.shots.map((s) => routeShot(s, budget)),
    [plan.shots, budget],
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

  if (!loaded || !sessionId || plan.shots.length === 0) return null;

  return (
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
          {saving && <span className="text-[10px] text-muted-foreground ml-1">Saving…</span>}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform ml-1",
              open ? "" : "-rotate-90",
            )}
          />
        </div>
      </div>

      {open && (
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
    </section>
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
