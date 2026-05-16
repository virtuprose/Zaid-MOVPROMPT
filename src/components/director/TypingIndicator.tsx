import { useEffect, useState } from "react";
import { AssistantAvatar } from "./AssistantAvatar";

type Props = {
  captions?: string[];
  state?: "thinking" | "scanning";
};

const DEFAULTS = [
  "Thinking about the shot…",
  "Sketching the prompt…",
  "Framing it up…",
  "Almost there…",
];

export function TypingIndicator({ captions, state = "thinking" }: Props) {
  const list = captions && captions.length ? captions : DEFAULTS;
  const [i, setI] = useState(0);
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
      <AssistantAvatar size="sm" state={state} />
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2">
          {prefersReduced ? (
            <span className="text-xs text-muted-foreground">Director is typing…</span>
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
