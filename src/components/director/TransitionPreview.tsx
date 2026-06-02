// TransitionPreview — client-side audition of hard cut / crossfade / match cut
// timing across the source clips, BEFORE paying to render the stitched MP4.
//
// Uses two stacked <video> elements (A/B) and an rAF playhead. When the
// playhead enters an overlap window, the next clip's video starts playing
// and we cross-fade opacity from A→B for the configured blend duration.
//
//   hard_cut  : 0s overlap, 0ms blend     → instant snap
//   crossfade : 0.5s overlap, 500ms blend → soft dissolve
//   match_cut : 0.15s overlap, 80ms blend → tight cinematic cut
//
// The on-screen timeline shows each clip as a bar with transition markers,
// and the scrubber lets the user seek any point in the virtual timeline.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  TRANSITION_LABELS,
  type StitchTransition,
} from "@/lib/director/stitch";

const TRANSITION_CONFIG: Record<
  StitchTransition,
  { overlapSec: number; blendMs: number }
> = {
  hard_cut: { overlapSec: 0, blendMs: 0 },
  crossfade: { overlapSec: 0.5, blendMs: 500 },
  match_cut: { overlapSec: 0.15, blendMs: 80 },
};

type Props = {
  clipUrls: string[];
  durations: number[];
  transition: StitchTransition;
  onTransitionChange: (next: StitchTransition) => void;
};

const fmt = (sec: number) => {
  const total = Math.max(0, sec);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const ms = Math.floor((total % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
};

export function TransitionPreview({
  clipUrls,
  durations,
  transition,
  onTransitionChange,
}: Props) {
  const { overlapSec, blendMs } = TRANSITION_CONFIG[transition];

  // Precompute each clip's virtual-timeline start, plus the total length.
  const { starts, total } = useMemo(() => {
    const s: number[] = [];
    let cursor = 0;
    for (let i = 0; i < clipUrls.length; i++) {
      const start = i === 0 ? 0 : cursor - overlapSec;
      s.push(Math.max(0, start));
      cursor = start + (durations[i] ?? 10);
    }
    return { starts: s, total: cursor };
  }, [clipUrls, durations, overlapSec]);

  // Two video slots ping-pong between clips so we can crossfade.
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  // Which slot currently holds which clip index.
  const slotClipRef = useRef<{ a: number; b: number }>({ a: 0, b: 1 });

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0); // virtual playhead seconds
  const [opacityB, setOpacityB] = useState(0); // 0 = A visible, 1 = B visible
  const playheadRef = useRef(0);
  const lastFrameAtRef = useRef<number | null>(null);

  // Helper: find current clip index for a given virtual time.
  const indexAt = useCallback(
    (time: number) => {
      for (let i = starts.length - 1; i >= 0; i--) {
        if (time >= starts[i]) return i;
      }
      return 0;
    },
    [starts],
  );

  // Seek both video slots so A holds clip `i` and B holds clip `i+1`,
  // each scrubbed to the right local time for the virtual time `time`.
  const seekTo = useCallback(
    (time: number) => {
      const i = indexAt(time);
      const localA = Math.max(0, time - starts[i]);
      const a = videoARef.current;
      const b = videoBRef.current;
      slotClipRef.current = { a: i, b: i + 1 < clipUrls.length ? i + 1 : -1 };
      if (a) {
        if (a.src !== clipUrls[i]) a.src = clipUrls[i];
        try {
          a.currentTime = Math.min(localA, (durations[i] ?? 10) - 0.05);
        } catch {
          /* not yet ready */
        }
      }
      if (b) {
        const nextIdx = slotClipRef.current.b;
        if (nextIdx >= 0) {
          if (b.src !== clipUrls[nextIdx]) b.src = clipUrls[nextIdx];
          try {
            b.currentTime = 0;
          } catch {
            /* ignore */
          }
        }
      }
      // Compute opacity based on overlap window.
      const overlapStart =
        i + 1 < clipUrls.length ? starts[i + 1] : Infinity;
      if (time >= overlapStart && overlapSec > 0 && blendMs > 0) {
        const into = (time - overlapStart) * 1000; // ms into overlap
        setOpacityB(Math.min(1, into / blendMs));
      } else if (time >= overlapStart && overlapSec > 0) {
        // hard cut with zero overlap won't trigger this branch; this handles
        // match_cut's instant flip when blendMs is very small.
        setOpacityB(1);
      } else {
        setOpacityB(0);
      }
    },
    [clipUrls, durations, starts, overlapSec, blendMs, indexAt],
  );

  // Reload sources whenever the clip list or transition changes.
  useEffect(() => {
    playheadRef.current = 0;
    setT(0);
    setPlaying(false);
    seekTo(0);
  }, [clipUrls, transition, seekTo]);

  // rAF playback loop.
  useEffect(() => {
    if (!playing) {
      lastFrameAtRef.current = null;
      videoARef.current?.pause();
      videoBRef.current?.pause();
      return;
    }
    let raf = 0;
    const a = videoARef.current;
    const b = videoBRef.current;
    void a?.play().catch(() => {});
    const loop = (now: number) => {
      const last = lastFrameAtRef.current ?? now;
      lastFrameAtRef.current = now;
      const dt = (now - last) / 1000;
      const next = Math.min(total, playheadRef.current + dt);
      playheadRef.current = next;
      setT(next);

      // Reseek/update opacity each frame.
      const i = indexAt(next);
      const overlapStart =
        i + 1 < clipUrls.length ? starts[i + 1] : Infinity;
      if (next >= overlapStart) {
        // Make sure B is playing during the overlap window.
        if (b && b.paused) void b.play().catch(() => {});
        if (overlapSec > 0 && blendMs > 0) {
          const into = (next - overlapStart) * 1000;
          setOpacityB(Math.min(1, into / blendMs));
        } else {
          setOpacityB(1);
        }
        // Once we're past the overlap window, promote B to A.
        const overlapEnd = overlapStart + overlapSec;
        if (next >= overlapEnd && slotClipRef.current.a !== i + 1) {
          // Swap: A becomes the (new) current clip, B preloads i+2.
          seekTo(next);
        }
      } else {
        setOpacityB(0);
      }

      if (next >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, total, indexAt, starts, clipUrls.length, overlapSec, blendMs, seekTo]);

  const togglePlay = () => {
    if (t >= total) {
      playheadRef.current = 0;
      setT(0);
      seekTo(0);
    }
    setPlaying((p) => !p);
  };

  const reset = () => {
    setPlaying(false);
    playheadRef.current = 0;
    setT(0);
    seekTo(0);
  };

  const onScrub = (vals: number[]) => {
    const time = Math.min(total, Math.max(0, vals[0] / 1000));
    playheadRef.current = time;
    setT(time);
    seekTo(time);
  };

  return (
    <div className="space-y-3">
      {/* Transition switcher */}
      <div className="flex items-center gap-1.5">
        {(Object.keys(TRANSITION_LABELS) as StitchTransition[]).map((opt) => {
          const selected = opt === transition;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onTransitionChange(opt)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
                selected
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {TRANSITION_LABELS[opt]}
            </button>
          );
        })}
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          overlap {overlapSec.toFixed(2)}s · blend {blendMs}ms
        </span>
      </div>

      {/* Stacked video stage */}
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-border/40">
        <video
          ref={videoARef}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
          style={{ opacity: 1 - opacityB }}
        />
        <video
          ref={videoBRef}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
          style={{
            opacity: opacityB,
            transition:
              transition === "hard_cut"
                ? "none"
                : `opacity ${blendMs}ms linear`,
          }}
        />
        {/* Active-clip badge */}
        <div className="absolute top-2 left-2 text-[10px] tabular-nums bg-black/70 text-foreground/90 px-1.5 py-0.5 rounded">
          Clip {indexAt(t) + 1} / {clipUrls.length}
        </div>
        <div className="absolute top-2 right-2 text-[10px] tabular-nums bg-black/70 text-foreground/90 px-1.5 py-0.5 rounded">
          {fmt(t)} / {fmt(total)}
        </div>
      </div>

      {/* Timeline w/ transition markers */}
      <div className="space-y-1.5">
        <div className="relative h-2.5 rounded-full bg-muted/40 overflow-hidden">
          {clipUrls.map((_, i) => {
            const left = (starts[i] / total) * 100;
            const width =
              (((durations[i] ?? 10) - (i === clipUrls.length - 1 ? 0 : 0)) /
                total) *
              100;
            return (
              <div
                key={`bar-${i}`}
                className={cn(
                  "absolute top-0 bottom-0 border-r border-background/60",
                  i % 2 === 0 ? "bg-primary/25" : "bg-accent/25",
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
          {/* transition markers — at each clip boundary except the first */}
          {starts.slice(1).map((s, i) => (
            <div
              key={`mark-${i}`}
              className="absolute top-0 bottom-0 w-px bg-foreground/60"
              style={{ left: `${(s / total) * 100}%` }}
              title={`Transition ${i + 1}: ${TRANSITION_LABELS[transition]}`}
            />
          ))}
          {/* overlap shaded regions */}
          {overlapSec > 0 &&
            starts.slice(1).map((s, i) => {
              const left = (s / total) * 100;
              const width = (overlapSec / total) * 100;
              return (
                <div
                  key={`overlap-${i}`}
                  className="absolute top-0 bottom-0 bg-accent/40 mix-blend-screen"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
          {/* playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground"
            style={{ left: `${(t / total) * 100}%` }}
          />
        </div>
        <Slider
          value={[t * 1000]}
          min={0}
          max={Math.max(1, Math.round(total * 1000))}
          step={10}
          onValueChange={onScrub}
          className="cursor-pointer"
        />
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border/40 text-foreground/90 hover:bg-muted/40 transition-colors"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {playing ? "Pause" : t >= total ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Audio is muted in preview — final stitch will include each clip's audio.
        </span>
      </div>
    </div>
  );
}
