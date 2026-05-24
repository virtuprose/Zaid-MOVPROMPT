import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AssistantAvatar, type AvatarState } from "./AssistantAvatar";

/**
 * Single source of truth for every "waiting" state in the Director:
 * - <CinematicLoader />  → full bubble (avatar + 3 dots + rotating caption)
 * - <CinematicSpinner /> → inline 3-dot spinner that replaces every `Loader2 animate-spin`
 *
 * Same dots, same color, same rotation timing everywhere.
 */

type LoaderProps = {
  /** Single static caption. Ignored when `captions` is provided. */
  caption?: string;
  /** Rotating captions. Cycles every 2.2s. */
  captions?: string[];
  /** Avatar mood — defaults to "thinking" for chat, can be "scanning" for vision work. */
  avatarState?: AvatarState;
  /** Hide the avatar (for inline / card usage). */
  hideAvatar?: boolean;
  className?: string;
};

export function CinematicLoader({
  caption,
  captions,
  avatarState = "thinking",
  hideAvatar = false,
  className,
}: LoaderProps) {
  const list = useMemo(() => {
    if (captions && captions.length) return captions;
    if (caption) return [caption];
    return ["Director is working…"];
  }, [caption, captions]);

  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
  }, [list]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (list.length <= 1) return;
    const id = window.setInterval(
      () => setI((n) => (n + 1) % list.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, [list]);

  return (
    <div
      className={cn(
        "flex items-end gap-2 motion-safe:animate-fade-up",
        className,
      )}
      aria-live="polite"
    >
      {!hideAvatar && <AssistantAvatar size="sm" state={avatarState} />}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2">
          {prefersReduced ? (
            <span className="text-xs text-muted-foreground">
              Director is working…
            </span>
          ) : (
            <>
              <Dot delay="0ms" />
              <Dot delay="160ms" />
              <Dot delay="320ms" />
            </>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/80 px-1 transition-opacity">
          {list[i]}
        </span>
      </div>
    </div>
  );
}

/**
 * Inline 3-dot spinner. Drop-in replacement for `<Loader2 className="animate-spin" />`
 * inside buttons, badges and overlays.
 */
type SpinnerProps = {
  size?: "xs" | "sm" | "md";
  tone?: "primary" | "current" | "muted";
  className?: string;
};

const DOT_SIZE: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "h-1 w-1",
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
};

const GAP: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "gap-[3px]",
  sm: "gap-1",
  md: "gap-1.5",
};

const TONE: Record<NonNullable<SpinnerProps["tone"]>, string> = {
  primary: "bg-primary/80",
  current: "bg-current",
  muted: "bg-muted-foreground/70",
};

export function CinematicSpinner({
  size = "xs",
  tone = "current",
  className,
}: SpinnerProps) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    return (
      <span
        className={cn(
          "inline-block rounded-full",
          DOT_SIZE[size],
          TONE[tone],
          "opacity-70",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center", GAP[size], className)}
    >
      <SpinnerDot size={size} tone={tone} delay="0ms" />
      <SpinnerDot size={size} tone={tone} delay="160ms" />
      <SpinnerDot size={size} tone={tone} delay="320ms" />
    </span>
  );
}

function SpinnerDot({
  size,
  tone,
  delay,
}: {
  size: NonNullable<SpinnerProps["size"]>;
  tone: NonNullable<SpinnerProps["tone"]>;
  delay: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full motion-safe:animate-dot-bounce",
        DOT_SIZE[size],
        TONE[tone],
      )}
      style={{ animationDelay: delay }}
    />
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-primary/80 motion-safe:animate-dot-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

/* ---------- Curated stage caption sets ---------- */

export type LoadingStage =
  | "panels"
  | "character_sheet"
  | "reference"
  | "story_bundle"
  | "story_render"
  | "render_handoff"
  | "image"
  | "custom";

export const STAGE_CAPTIONS: Record<Exclude<LoadingStage, "custom">, string[]> = {
  panels: [
    "Blocking the sequence…",
    "Lighting each panel…",
    "Locking continuity…",
    "Color-grading the set…",
  ],
  character_sheet: [
    "Casting the subject…",
    "Locking the wardrobe…",
    "Studying the angles…",
    "Pinning the look…",
  ],
  reference: [
    "Framing the reference…",
    "Setting the key light…",
    "Dialing the grade…",
    "Final polish…",
  ],
  story_bundle: [
    "Casting the character…",
    "Dressing the prop…",
    "Scouting locations…",
    "Aligning the look…",
  ],
  story_render: [
    "Loading the dailies…",
    "Cueing all four acts…",
    "Rolling cameras…",
    "Watching the timeline…",
  ],
  render_handoff: [
    "Handing off to the renderer…",
    "Locking the shot list…",
    "Queueing the job…",
  ],
  image: [
    "Composing the frame…",
    "Lighting the scene…",
    "Locking the lens…",
    "Final polish…",
  ],
};
