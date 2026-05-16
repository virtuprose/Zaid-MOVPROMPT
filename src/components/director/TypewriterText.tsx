import { useEffect, useState } from "react";

type Props = {
  text: string;
  speed?: number; // ms per char
  showCaret?: boolean;
  className?: string;
  onDone?: () => void;
};

export function TypewriterText({ text, speed = 22, showCaret = false, className, onDone }: Props) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(prefersReduced ? text : "");

  useEffect(() => {
    if (prefersReduced) {
      setShown(text);
      onDone?.();
      return;
    }
    setShown("");
    // Scale speed down for very long text so it doesn't feel sluggish.
    const stepMs = text.length > 240 ? Math.max(8, speed * 0.5) : speed;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        onDone?.();
      }
    }, stepMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const isDone = shown.length >= text.length;
  return (
    <span className={className}>
      {shown}
      {(showCaret || !isDone) && (
        <span className="inline-block w-[2px] h-[1em] -mb-[2px] ml-[1px] bg-primary/80 align-middle motion-safe:animate-caret-blink" />
      )}
    </span>
  );
}
