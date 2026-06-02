// OrchestratorDebugPanel — calls director-orchestrate with debug:true and
// renders the trace of validation/auth/ownership/filter steps + the exact
// short-circuit reason when nothing would be submitted. No credits are
// charged because debug mode never reaches the render-submit branch.
import { useState } from "react";
import { Bug, ChevronDown, ChevronRight, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TraceStep = {
  step: string;
  ok: boolean;
  detail?: string;
  data?: Record<string, unknown>;
  durationMs?: number;
};

type DebugResponse = {
  dryRun?: boolean;
  shortCircuitedAt?: string;
  reason?: string;
  wouldReturnStatus?: number;
  wouldSubmit?: number;
  creditsCharged?: number;
  targets?: Array<{ id: string; model?: string; durationSec?: number }>;
  trace?: TraceStep[];
};

export function OrchestratorDebugPanel({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "director-orchestrate",
        { body: { sessionId, debug: true } },
      );
      if (error) {
        setError(error.message || "Debug call failed");
        return;
      }
      setResult(data as DebugResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debug call failed");
    } finally {
      setLoading(false);
    }
  };

  const trace = result?.trace ?? [];
  const shorted = result?.shortCircuitedAt;

  return (
    <section
      aria-label="Orchestrator debug panel"
      className="mb-3 rounded-xl border border-border/40 bg-[hsl(240_5%_8%)]/70 backdrop-blur-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/90 hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Bug className="w-4 h-4 text-accent" />
        <span className="font-display tracking-tight">Orchestrator debug</span>
        <span className="text-xs text-muted-foreground">
          dry-run · no credits
        </span>
        {result && (
          <span
            className={cn(
              "ml-auto text-[10px] tabular-nums px-2 py-0.5 rounded-full border",
              shorted
                ? "border-destructive/40 text-destructive"
                : "border-primary/40 text-primary",
            )}
          >
            {shorted
              ? `short-circuit @ ${shorted}`
              : `would submit ${result.wouldSubmit ?? 0}`}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary/50 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bug className="w-3.5 h-3.5" />
              )}
              {loading ? "Inspecting…" : result ? "Re-run inspect" : "Inspect"}
            </button>
            <span className="text-[10px] text-muted-foreground">
              Calls{" "}
              <code className="text-foreground/80">director-orchestrate</code>{" "}
              with{" "}
              <code className="text-foreground/80">{`{ debug: true }`}</code>.
            </span>
          </div>

          {error && (
            <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded-md px-2 py-1.5">
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Stat
                  label="Short-circuit"
                  value={shorted ?? "—"}
                  tone={shorted ? "warn" : "ok"}
                />
                <Stat
                  label="Would submit"
                  value={String(result.wouldSubmit ?? 0)}
                  tone={result.wouldSubmit ? "ok" : "muted"}
                />
                <Stat
                  label="Credits charged"
                  value={String(result.creditsCharged ?? 0)}
                  tone="muted"
                />
              </div>

              {shorted && result.reason && (
                <div className="text-xs border border-destructive/30 bg-destructive/5 rounded-md px-2 py-1.5">
                  <span className="text-muted-foreground">Reason: </span>
                  <span className="text-destructive">{result.reason}</span>
                  {result.wouldReturnStatus && (
                    <span className="text-muted-foreground">
                      {" "}
                      (would return HTTP {result.wouldReturnStatus})
                    </span>
                  )}
                </div>
              )}

              {/* Trace list */}
              <ol className="space-y-1">
                {trace.map((s, i) => (
                  <TraceRow key={`${s.step}-${i}`} step={s} />
                ))}
              </ol>

              {result.targets && result.targets.length > 0 && (
                <div className="text-[11px]">
                  <div className="text-muted-foreground mb-1">
                    Resolved render targets ({result.targets.length})
                  </div>
                  <ul className="space-y-0.5">
                    {result.targets.map((t) => (
                      <li
                        key={t.id}
                        className="font-mono text-foreground/80 tabular-nums"
                      >
                        <span className="text-muted-foreground">·</span>{" "}
                        {t.id.slice(0, 8)} · {t.model ?? "?"} ·{" "}
                        {t.durationSec ?? "?"}s
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
}) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-xs font-medium truncate",
          tone === "ok" && "text-primary",
          tone === "warn" && "text-destructive",
          tone === "muted" && "text-foreground/80",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function TraceRow({ step }: { step: TraceStep }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = step.data && Object.keys(step.data).length > 0;
  return (
    <li
      className={cn(
        "rounded-md border text-[11px] overflow-hidden",
        step.ok
          ? "border-border/40 bg-muted/10"
          : "border-destructive/40 bg-destructive/5",
      )}
    >
      <button
        type="button"
        onClick={() => hasData && setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 text-left",
          hasData ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
        )}
      >
        {step.ok ? (
          <Check className="w-3 h-3 text-primary shrink-0" />
        ) : (
          <X className="w-3 h-3 text-destructive shrink-0" />
        )}
        <span className="font-mono text-foreground/90">{step.step}</span>
        {step.detail && (
          <span
            className={cn(
              "truncate",
              step.ok ? "text-muted-foreground" : "text-destructive",
            )}
          >
            — {step.detail}
          </span>
        )}
        {typeof step.durationMs === "number" && (
          <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">
            {step.durationMs}ms
          </span>
        )}
      </button>
      {expanded && hasData && (
        <pre className="text-[10px] leading-snug bg-black/40 text-foreground/70 px-2 py-1.5 overflow-x-auto">
          {JSON.stringify(step.data, null, 2)}
        </pre>
      )}
    </li>
  );
}
