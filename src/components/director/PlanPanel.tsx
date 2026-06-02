import { useEffect, useState } from "react";
import { ChevronDown, Film, Clock, Volume2, Frame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  type DirectorPlan,
  type PlannedShot,
  emptyPlan,
  missingAxes,
  readPlan,
  statusLabel,
} from "@/lib/director/plan";

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

/**
 * Read-only Plan panel — Stage 1 of the Director → Orchestrator evolution.
 * Surfaces the structured shot plan stored on `director_sessions.plan`.
 * No edit affordances yet; later stages will hook chat turns + the router
 * into this view.
 */
export function PlanPanel({ sessionId }: Props) {
  const [plan, setPlan] = useState<DirectorPlan>(emptyPlan);
  const [open, setOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);

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

  // Hide entirely when no session or plan is empty — keeps the UI clean
  // until the orchestrator stages start populating it.
  if (!loaded || !sessionId || plan.shots.length === 0) return null;

  return (
    <section
      aria-label="Shot plan"
      className="mb-3 rounded-xl border border-border/40 bg-[hsl(240_5%_8%)]/70 backdrop-blur-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/90 hover:text-foreground transition-colors"
      >
        <Film className="w-4 h-4 text-accent" />
        <span className="font-display tracking-tight">Plan</span>
        <span className="text-xs text-muted-foreground">
          {plan.shots.length} shot{plan.shots.length === 1 ? "" : "s"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto w-4 h-4 text-muted-foreground transition-transform",
            open ? "" : "-rotate-90",
          )}
        />
      </button>

      {open && (
        <ol className="divide-y divide-border/30 border-t border-border/30">
          {plan.shots.map((shot, idx) => {
            const missing = missingAxes(shot);
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
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
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
                    {shot.locked.model && (
                      <Chip icon={<Sparkles className="w-3 h-3" />}>{shot.locked.model}</Chip>
                    )}
                    {missing.length > 0 && (
                      <span className="text-amber-400/80">
                        missing: {missing.join(", ")}
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
