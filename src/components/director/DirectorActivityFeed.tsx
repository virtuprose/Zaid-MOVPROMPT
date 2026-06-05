import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  MessageCircleMore,
  PenLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityStepKind =
  | "reading"
  | "mining"
  | "skill"
  | "preflight"
  | "thinking"
  | "reference"
  | "model"
  | "prompt"
  | "error";

export type ActivityStep = {
  id: string;
  kind: ActivityStepKind;
  label: string;
  status: "running" | "done" | "failed";
  detail?: string;
  ts?: number;
};

const ICONS: Record<ActivityStepKind, React.ComponentType<{ className?: string }>> = {
  reading: FileText,
  mining: MessageCircleMore,
  skill: Sparkles,
  preflight: ListChecks,
  thinking: Brain,
  reference: ImageIcon,
  model: Cpu,
  prompt: PenLine,
  error: AlertTriangle,
};

const ROTATING_CAPTIONS: Record<ActivityStepKind, string> = {
  reading: "Reading the brief",
  mining: "Listening to the free chat",
  skill: "Loading a specialist playbook",
  preflight: "Checking what's already known",
  thinking: "Thinking it through",
  reference: "Painting the key frame",
  model: "Picking the right engine",
  prompt: "Composing the prompt",
  error: "Recovering from a hiccup",
};

type Props = {
  steps: ActivityStep[];
  /** When true the feed stays mounted but minimized into a single status line. */
  collapsedDefault?: boolean;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Reveals `text` one character at a time while `enabled` is true. */
function useTypewriter(text: string, enabled: boolean) {
  const [out, setOut] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setOut(text);
      return;
    }
    setOut("");
    if (!text) return;
    // Cap total typing time at ~900ms so long labels don't drag.
    const perChar = Math.max(14, Math.min(28, Math.floor(900 / Math.max(1, text.length))));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, perChar);
    return () => window.clearInterval(id);
  }, [text, enabled]);

  return { text: out, done: out.length >= text.length };
}

export function DirectorActivityFeed({ steps, collapsedDefault = false }: Props) {
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Track which step ids were FIRST seen in a running state.
  // Only those should replay the typing animation; pre-completed steps render instant.
  const seenRunningRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const s of steps) {
      if (s.status === "running") seenRunningRef.current.add(s.id);
    }
  }, [steps]);

  // Sequential reveal: include every step up to (and including) the first still-running one.
  // Steps after a running step stay hidden until that step finishes.
  const visibleSteps = useMemo(() => {
    const out: ActivityStep[] = [];
    for (const s of steps) {
      out.push(s);
      if (s.status === "running") break;
    }
    return out;
  }, [steps]);

  const current = useMemo(() => {
    const running = [...visibleSteps].reverse().find((s) => s.status === "running");
    return running ?? visibleSteps[visibleSteps.length - 1];
  }, [visibleSteps]);

  const elapsed = useMemo(() => {
    if (steps.length === 0) return 0;
    const first = steps[0].ts ?? Date.now();
    const last = current?.ts ?? Date.now();
    return Math.max(0, Math.round((last - first) / 100) / 10);
  }, [steps, current]);

  if (steps.length === 0) return null;

  const caption = current ? ROTATING_CAPTIONS[current.kind] : "";

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 backdrop-blur-sm overflow-hidden motion-safe:animate-fade-up">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] text-muted-foreground/90 hover:text-foreground transition-colors"
        aria-label={collapsed ? "Expand activity" : "Collapse activity"}
      >
        <span className="inline-flex items-center gap-2">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                current?.status === "running" && "bg-primary motion-safe:animate-ping",
                current?.status === "done" && "bg-emerald-500/60",
                current?.status === "failed" && "bg-amber-500/60",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                current?.status === "running" && "bg-primary",
                current?.status === "done" && "bg-emerald-500",
                current?.status === "failed" && "bg-amber-500",
              )}
            />
          </span>
          <span className="font-medium tracking-wide uppercase text-[10px]">Director activity</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{visibleSteps.length} step{visibleSteps.length === 1 ? "" : "s"}</span>
          {elapsed > 0 && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{elapsed.toFixed(1)}s</span>
            </>
          )}
        </span>
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {!collapsed && (
        <ol className="px-3 pb-2 space-y-1.5">
          {visibleSteps.map((s, idx) => (
            <ActivityRow
              key={s.id}
              step={s}
              isLast={idx === visibleSteps.length - 1}
              animateType={seenRunningRef.current.has(s.id)}
              expanded={!!expanded[s.id]}
              onToggle={() => s.detail && setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
            />
          ))}
        </ol>
      )}

      {caption && (
        <div className="border-t border-border/30 px-3 py-1.5 text-[11px] text-muted-foreground/80 bg-background/30">
          <span
            key={current?.id /* re-mount on step change to retrigger fade */}
            className="inline-flex items-center gap-1.5 motion-safe:animate-fade-in"
          >
            <span className="inline-block h-1 w-1 rounded-full bg-primary/70 motion-safe:animate-pulse" />
            {caption}
            {current?.status === "running" && <span className="text-muted-foreground/60">…</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  step: s,
  isLast,
  animateType,
  expanded,
  onToggle,
}: {
  step: ActivityStep;
  isLast: boolean;
  animateType: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = ICONS[s.kind];
  const canExpand = !!s.detail;
  // Type only while this step is the actively-running one and we first observed it running.
  const isRunning = s.status === "running";
  const { text: typed, done: typeDone } = useTypewriter(s.label, animateType && isRunning);
  const labelToShow = animateType && isRunning ? typed : s.label;
  const showCaret = animateType && isRunning;

  return (
    <li
      className="flex items-start gap-2 text-[12.5px] leading-snug motion-safe:animate-fade-up"
      style={{ animationDuration: "220ms" }}
    >
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {s.status === "running" ? (
          <Loader2 className="h-3.5 w-3.5 text-primary motion-safe:animate-spin" />
        ) : s.status === "failed" ? (
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-500 motion-safe:animate-scale-in"
            style={{ animationDuration: "180ms" }}
          />
        ) : (
          <Check
            className="h-3.5 w-3.5 text-muted-foreground/70 motion-safe:animate-scale-in"
            style={{ animationDuration: "180ms" }}
          />
        )}
      </span>
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/80">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          disabled={!canExpand}
          onClick={onToggle}
          className={cn(
            "flex items-center gap-1 text-left",
            s.status === "failed" ? "text-amber-500/90" : "text-foreground/85",
            canExpand && "hover:text-foreground",
          )}
        >
          <span className="truncate">
            {labelToShow}
            {showCaret && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-[0.9em] w-[2px] -mb-[0.1em] bg-primary/80 align-middle animate-caret-blink"
              />
            )}
          </span>
          {canExpand && typeDone && (
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform",
                expanded && "rotate-90",
              )}
            />
          )}
        </button>
        {canExpand && expanded && (
          <p className="mt-1 whitespace-pre-wrap text-[11.5px] text-muted-foreground/80 rounded-md bg-background/40 border border-border/30 px-2 py-1.5 motion-safe:animate-fade-in">
            {s.detail}
          </p>
        )}
      </div>
    </li>
  );
}
