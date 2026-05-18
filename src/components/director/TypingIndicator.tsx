import { useEffect, useMemo, useState } from "react";
import { AssistantAvatar, type AvatarState } from "./AssistantAvatar";

export type IndicatorPhase =
  | "thinking"
  | "analyzing_image"
  | "decomposing_scene"
  | "choosing_model"
  | "writing_prompt";

type Props = {
  captions?: string[];
  state?: "thinking" | "scanning";
  phase?: IndicatorPhase;
};

const PHASE_CAPTIONS: Record<IndicatorPhase, string[]> = {
  thinking: ["Working the brief…", "Calling the shot…", "Sketching the angle…"],
  analyzing_image: [
    "Reading the frame…",
    "Catching the light…",
    "Logging the mise-en-scène…",
    "Pulling the palette…",
  ],
  decomposing_scene: [
    "Blocking foreground…",
    "Placing midground…",
    "Setting the key light…",
    "Marking the move…",
  ],
  choosing_model: ["Matching the right engine…", "Weighing the lenses on offer…"],
  writing_prompt: [
    "Locking the lens…",
    "Calling the shot…",
    "Dialing the grade…",
    "Final polish…",
  ],
};

const PHASE_AVATAR: Record<IndicatorPhase, AvatarState> = {
  thinking: "thinking",
  analyzing_image: "scanning",
  decomposing_scene: "scanning",
  choosing_model: "thinking",
  writing_prompt: "thinking",
};

export function TypingIndicator({ captions, state, phase }: Props) {
  const list = useMemo(() => {
    if (captions && captions.length) return captions;
    if (phase) return PHASE_CAPTIONS[phase];
    return PHASE_CAPTIONS.thinking;
  }, [captions, phase]);

  const avatarState: AvatarState =
    state ?? (phase ? PHASE_AVATAR[phase] : "thinking");

  const [i, setI] = useState(0);
  // Reset rotation when the phase changes so the first phase-specific caption shows immediately.
  useEffect(() => {
    setI(0);
  }, [phase, list]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (list.length <= 1) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % list.length), 2200);
    return () => window.clearInterval(id);
  }, [list]);

  return (
    <div className="flex items-end gap-2 motion-safe:animate-fade-up" aria-live="polite">
      <AssistantAvatar size="sm" state={avatarState} />
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2">
          {prefersReduced ? (
            <span className="text-xs text-muted-foreground">Director is working…</span>
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

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-primary/80 motion-safe:animate-dot-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
