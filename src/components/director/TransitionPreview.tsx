// TransitionPreview — frame-accurate (24fps) audition of hard cut / crossfade /
// match cut transitions with draggable per-boundary overrides.
//
// Per transition preset we ship a default overlap (in frames). The user can:
//   • Drag the diamond marker at each boundary to nudge the cut point
//     (offsetFrames, positive = later).
//   • Drag the right edge of the shaded overlap region to lengthen/shorten
//     that specific transition's blend window (overlapFrames).
//   • Double-click either handle to reset that boundary to preset defaults.
//   • Hold Shift while scrubbing to snap the playhead to the nearest frame.
//   • Arrow keys step ±1 frame, Shift+Arrow steps ±1 second (frame-aligned).
//
// All overrides are local — exported preview MP4 uses them; the server-side
// stitch endpoint still receives only the chosen preset.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Play, Pause, RotateCcw, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  TRANSITION_LABELS,
  type StitchTransition,
} from "@/lib/director/stitch";

// ───────────────────────── constants ─────────────────────────
const FPS = 24;
const FRAME = 1 / FPS; // seconds per frame (~0.04167)

const DEFAULT_OVERLAP_FRAMES: Record<StitchTransition, number> = {
  hard_cut: 0,
  crossfade: 12, // 0.5s at 24fps
  match_cut: 4, // ~167ms
};

// Blend ramp length in ms. "full" = use the overlap window length itself.
const BLEND_MS_RULE: Record<StitchTransition, number | "full"> = {
  hard_cut: 0,
  crossfade: "full",
  match_cut: 80,
};

// ───────────────────────── helpers ─────────────────────────
function pickRecorderMime(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates: Array<{ mime: string; ext: "mp4" | "webm" }> = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return null;
}

const snapFrame = (sec: number) => Math.round(sec * FPS) / FPS;

// Timecode m:ss:ff
const fmtTC = (sec: number) => {
  const total = Math.max(0, sec);
  let frames = Math.round(total * FPS);
  const totalSeconds = Math.floor(frames / FPS);
  const f = frames % FPS;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
};

// ───────────────────────── types ─────────────────────────
type Override = { offsetFrames: number; overlapFrames: number };

type Props = {
  clipUrls: string[];
  durations: number[];
  transition: StitchTransition;
  onTransitionChange: (next: StitchTransition) => void;
};

// ───────────────────────── component ─────────────────────────
export function TransitionPreview({
  clipUrls,
  durations,
  transition,
  onTransitionChange,
}: Props) {
  const defaultOverlapFrames = DEFAULT_OVERLAP_FRAMES[transition];
  const numBoundaries = Math.max(0, clipUrls.length - 1);

  // Per-boundary overrides. Reset whenever clip list or preset changes.
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  useEffect(() => {
    setOverrides({});
  }, [clipUrls, transition]);

  // Resolve each boundary's effective offset/overlap in frames.
  const effective = useMemo(() => {
    const arr: Override[] = [];
    for (let i = 0; i < numBoundaries; i++) {
      const o = overrides[i];
      arr.push({
        offsetFrames: o?.offsetFrames ?? 0,
        overlapFrames: o?.overlapFrames ?? defaultOverlapFrames,
      });
    }
    return arr;
  }, [overrides, numBoundaries, defaultOverlapFrames]);

  // Compute virtual-timeline starts[] for each clip from overrides.
  // start[i] = start[i-1] + dur[i-1] − overlap[i-1] + offset[i-1]
  const { starts, total } = useMemo(() => {
    const s: number[] = [];
    let cursor = 0;
    for (let i = 0; i < clipUrls.length; i++) {
      if (i === 0) {
        s.push(0);
        cursor = durations[i] ?? 10;
      } else {
        const prevDur = durations[i - 1] ?? 10;
        const ov = effective[i - 1];
        const overlapSec = ov.overlapFrames * FRAME;
        const offsetSec = ov.offsetFrames * FRAME;
        const rawStart = s[i - 1] + prevDur - overlapSec + offsetSec;
        // Must stay after previous clip's start by at least 1 frame.
        const minStart = s[i - 1] + FRAME;
        const start = Math.max(minStart, rawStart);
        s.push(start);
        cursor = start + (durations[i] ?? 10);
      }
    }
    return { starts: s, total: cursor };
  }, [clipUrls, durations, effective]);

  // ──────── video slots & playback ────────
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const slotClipRef = useRef<{ a: number; b: number }>({ a: 0, b: 1 });

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [opacityB, setOpacityB] = useState(0);
  const playheadRef = useRef(0);
  const lastFrameAtRef = useRef<number | null>(null);

  const indexAt = useCallback(
    (time: number) => {
      for (let i = starts.length - 1; i >= 0; i--) {
        if (time >= starts[i]) return i;
      }
      return 0;
    },
    [starts],
  );

  // Blend ms for a given boundary index (depends on preset + that boundary's
  // overlap when crossfade uses "full").
  const blendMsFor = useCallback(
    (boundaryIdx: number) => {
      const rule = BLEND_MS_RULE[transition];
      if (rule === "full") {
        return Math.max(
          0,
          (effective[boundaryIdx]?.overlapFrames ?? defaultOverlapFrames) *
            FRAME *
            1000,
        );
      }
      return rule;
    },
    [transition, effective, defaultOverlapFrames],
  );

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
          /* not ready */
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
      const overlapStart = i + 1 < clipUrls.length ? starts[i + 1] : Infinity;
      const ovFrames = effective[i]?.overlapFrames ?? 0;
      const blend = blendMsFor(i);
      if (time >= overlapStart && ovFrames > 0 && blend > 0) {
        const into = (time - overlapStart) * 1000;
        setOpacityB(Math.min(1, into / blend));
      } else if (time >= overlapStart && ovFrames > 0) {
        setOpacityB(1);
      } else {
        setOpacityB(0);
      }
    },
    [clipUrls, durations, starts, effective, indexAt, blendMsFor],
  );

  // Reset playhead when clip list or transition preset changes.
  useEffect(() => {
    playheadRef.current = 0;
    setT(0);
    setPlaying(false);
    seekTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipUrls, transition]);

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

      const i = indexAt(next);
      const overlapStart = i + 1 < clipUrls.length ? starts[i + 1] : Infinity;
      const ovFrames = effective[i]?.overlapFrames ?? 0;
      const overlapSec = ovFrames * FRAME;
      const blend = blendMsFor(i);
      if (next >= overlapStart) {
        if (b && b.paused) void b.play().catch(() => {});
        if (ovFrames > 0 && blend > 0) {
          const into = (next - overlapStart) * 1000;
          setOpacityB(Math.min(1, into / blend));
        } else {
          setOpacityB(1);
        }
        const overlapEnd = overlapStart + overlapSec;
        if (next >= overlapEnd && slotClipRef.current.a !== i + 1) {
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
  }, [
    playing,
    total,
    indexAt,
    starts,
    clipUrls.length,
    effective,
    blendMsFor,
    seekTo,
  ]);

  // ──────── shift-to-snap scrubbing ────────
  const shiftDownRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const onScrub = (vals: number[]) => {
    let time = Math.min(total, Math.max(0, vals[0] / 1000));
    if (shiftDownRef.current) time = snapFrame(time);
    playheadRef.current = time;
    setT(time);
    seekTo(time);
  };

  // ──────── transport ────────
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

  // ──────── keyboard nudging on timeline ────────
  const timelineWrapRef = useRef<HTMLDivElement | null>(null);
  const onTimelineKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const stepSec = e.shiftKey ? 1 : FRAME;
    const next = Math.max(0, Math.min(total, snapFrame(t + dir * stepSec)));
    playheadRef.current = next;
    setT(next);
    seekTo(next);
  };

  // ──────── drag handles on markers ────────
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: "offset" | "overlap";
    boundaryIdx: number;
    startX: number;
    startOffsetF: number;
    startOverlapF: number;
    pxPerSec: number;
  } | null>(null);

  const updateOverride = useCallback(
    (idx: number, patch: Partial<Override>) => {
      setOverrides((prev) => {
        const current: Override = prev[idx] ?? {
          offsetFrames: 0,
          overlapFrames: defaultOverlapFrames,
        };
        const next: Override = { ...current, ...patch };
        // Clamp overlap: 0..min(prevDur, nextDur) − 1 frame.
        const prevDur = durations[idx] ?? 10;
        const nextDur = durations[idx + 1] ?? 10;
        const maxOverlapF =
          Math.floor(Math.min(prevDur, nextDur) * FPS) - 1;
        next.overlapFrames = Math.max(
          0,
          Math.min(maxOverlapF, Math.round(next.overlapFrames)),
        );
        // Clamp offset so cut stays inside clip A (>= 1 frame into A,
        // <= dur(A) − overlap − 1 frame from end).
        const overlapSec = next.overlapFrames * FRAME;
        const slackForward = prevDur - overlapSec - FRAME;
        const slackBackward = -(prevDur - overlapSec - FRAME);
        const minOffsetF = Math.ceil(slackBackward * FPS);
        const maxOffsetF = Math.floor(slackForward * FPS);
        next.offsetFrames = Math.max(
          minOffsetF,
          Math.min(maxOffsetF, Math.round(next.offsetFrames)),
        );
        return { ...prev, [idx]: next };
      });
    },
    [defaultOverlapFrames, durations],
  );

  const beginDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    kind: "offset" | "overlap",
    boundaryIdx: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pxPerSec = rect.width / Math.max(0.001, total);
    const current: Override = overrides[boundaryIdx] ?? {
      offsetFrames: 0,
      overlapFrames: defaultOverlapFrames,
    };
    dragRef.current = {
      kind,
      boundaryIdx,
      startX: e.clientX,
      startOffsetF: current.offsetFrames,
      startOverlapF: current.overlapFrames,
      pxPerSec,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dFrames = Math.round((dx / d.pxPerSec) * FPS);
    if (d.kind === "offset") {
      updateOverride(d.boundaryIdx, {
        offsetFrames: d.startOffsetF + dFrames,
      });
    } else {
      updateOverride(d.boundaryIdx, {
        overlapFrames: d.startOverlapF + dFrames,
      });
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
    }
  };

  const resetBoundary = (idx: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  // ──────── export (records canvas via MediaRecorder) ────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportCancelRef = useRef(false);

  const runExport = useCallback(async () => {
    if (exporting || clipUrls.length < 2) return;
    const picked = pickRecorderMime();
    if (!picked) {
      toast.error("Your browser cannot record previews. Try Chrome or Safari.");
      return;
    }
    const canvas = canvasRef.current;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!canvas || !a || !b) return;

    const baseW = a.videoWidth || 1280;
    const baseH = a.videoHeight || 720;
    const scale = Math.min(1, 1280 / baseW);
    canvas.width = Math.round(baseW * scale);
    canvas.height = Math.round(baseH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setExporting(true);
    setExportProgress(0);
    exportCancelRef.current = false;
    setPlaying(false);
    playheadRef.current = 0;
    setT(0);
    seekTo(0);
    await new Promise((r) => setTimeout(r, 120));

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: picked.mime,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start(250);

    void a.play().catch(() => {});
    let raf = 0;
    let lastNow: number | null = null;
    let playhead = 0;
    let bStarted = false;
    let promotedFor = -1;

    const tick = (now: number) => {
      if (exportCancelRef.current) {
        recorder.stop();
        return;
      }
      const last = lastNow ?? now;
      lastNow = now;
      const dt = (now - last) / 1000;
      playhead = Math.min(total, playhead + dt);

      const i = indexAt(playhead);
      const overlapStart =
        i + 1 < clipUrls.length ? starts[i + 1] : Infinity;
      const ovFrames = effective[i]?.overlapFrames ?? 0;
      const overlapSec = ovFrames * FRAME;
      const blend = blendMsFor(i);
      let opB = 0;
      if (playhead >= overlapStart) {
        if (!bStarted) {
          void b.play().catch(() => {});
          bStarted = true;
        }
        if (ovFrames > 0 && blend > 0) {
          opB = Math.min(1, ((playhead - overlapStart) * 1000) / blend);
        } else {
          opB = 1;
        }
        const overlapEnd = overlapStart + overlapSec;
        if (playhead >= overlapEnd && promotedFor !== i + 1) {
          promotedFor = i + 1;
          playheadRef.current = playhead;
          setT(playhead);
          seekTo(playhead);
          bStarted = false;
        }
      }

      try {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1 - opB;
        ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
        if (opB > 0) {
          ctx.globalAlpha = opB;
          ctx.drawImage(b, 0, 0, canvas.width, canvas.height);
        }
        ctx.globalAlpha = 1;
      } catch {
        /* video not ready */
      }

      setT(playhead);
      setExportProgress(playhead / total);

      if (playhead >= total) {
        recorder.stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    await done;
    cancelAnimationFrame(raf);
    a.pause();
    b.pause();

    const wasCancelled = exportCancelRef.current;
    setExporting(false);
    setExportProgress(0);
    playheadRef.current = 0;
    setT(0);
    seekTo(0);

    if (wasCancelled) {
      toast.info("Export cancelled");
      return;
    }

    const blob = new Blob(chunks, { type: picked.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transition-preview-${transition}.${picked.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success(`Preview exported (${picked.ext.toUpperCase()})`);
  }, [
    exporting,
    clipUrls,
    total,
    starts,
    effective,
    blendMsFor,
    indexAt,
    seekTo,
    transition,
  ]);

  // ──────── render ────────
  const overlapDefaultMs = defaultOverlapFrames * FRAME * 1000;

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
          {defaultOverlapFrames}f default ({overlapDefaultMs.toFixed(0)} ms) ·{" "}
          {FPS} fps
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
          crossOrigin="anonymous"
          style={{ opacity: 1 - opacityB }}
        />
        <video
          ref={videoBRef}
          className="absolute inset-0 w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          style={{ opacity: opacityB }}
        />
        <div className="absolute top-2 left-2 text-[10px] tabular-nums bg-black/70 text-foreground/90 px-1.5 py-0.5 rounded">
          Clip {indexAt(t) + 1} / {clipUrls.length}
        </div>
        <div className="absolute top-2 right-2 text-[10px] tabular-nums bg-black/70 text-foreground/90 px-1.5 py-0.5 rounded">
          {fmtTC(t)} / {fmtTC(total)}
        </div>
      </div>

      {/* Timeline with draggable markers */}
      <div
        ref={timelineWrapRef}
        tabIndex={0}
        onKeyDown={onTimelineKey}
        className="space-y-1.5 outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-md"
        aria-label="Transition timeline. Arrow keys nudge by frame, Shift+Arrow by one second."
      >
        <div
          ref={trackRef}
          className="relative h-6 rounded-md bg-muted/40 overflow-visible select-none"
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* Clip bars */}
          {clipUrls.map((_, i) => {
            const left = (starts[i] / total) * 100;
            const width = ((durations[i] ?? 10) / total) * 100;
            return (
              <div
                key={`bar-${i}`}
                className={cn(
                  "absolute top-1 bottom-1 rounded-sm",
                  i % 2 === 0 ? "bg-primary/25" : "bg-accent/25",
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}

          {/* Overlap shaded regions + right-edge handle */}
          {effective.map((eff, i) => {
            if (eff.overlapFrames <= 0) return null;
            const overlapSec = eff.overlapFrames * FRAME;
            const startSec = starts[i + 1];
            const left = (startSec / total) * 100;
            const width = (overlapSec / total) * 100;
            return (
              <div
                key={`overlap-${i}`}
                className="absolute top-1 bottom-1 bg-accent/40 pointer-events-none"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}

          {/* Boundary markers (diamond = offset drag, bar = overlap right-edge drag) */}
          {effective.map((eff, i) => {
            const startSec = starts[i + 1];
            const overlapSec = eff.overlapFrames * FRAME;
            const leftPct = (startSec / total) * 100;
            const endPct = ((startSec + overlapSec) / total) * 100;
            const isCustom =
              overrides[i] !== undefined &&
              (overrides[i].offsetFrames !== 0 ||
                overrides[i].overlapFrames !== defaultOverlapFrames);
            return (
              <div key={`mark-${i}`}>
                {/* Cut-point handle (diamond) */}
                <div
                  role="slider"
                  aria-label={`Transition ${i + 1} cut point`}
                  aria-valuetext={`${eff.offsetFrames >= 0 ? "+" : ""}${eff.offsetFrames} frames`}
                  onPointerDown={(e) => beginDrag(e, "offset", i)}
                  onDoubleClick={() => resetBoundary(i)}
                  title={`Cut point · offset ${eff.offsetFrames >= 0 ? "+" : ""}${eff.offsetFrames}f${isCustom ? " (custom)" : ""}\nDrag to nudge · double-click to reset`}
                  className={cn(
                    "absolute top-0 bottom-0 -translate-x-1/2 w-3 cursor-ew-resize flex items-center justify-center",
                    "touch-none",
                  )}
                  style={{ left: `${leftPct}%` }}
                >
                  <div
                    className={cn(
                      "w-2 h-4 rotate-45 border",
                      isCustom
                        ? "bg-primary border-primary"
                        : "bg-foreground border-foreground",
                    )}
                  />
                </div>

                {/* Overlap right-edge handle */}
                {eff.overlapFrames > 0 && (
                  <div
                    role="slider"
                    aria-label={`Transition ${i + 1} overlap length`}
                    aria-valuetext={`${eff.overlapFrames} frames`}
                    onPointerDown={(e) => beginDrag(e, "overlap", i)}
                    onDoubleClick={() => resetBoundary(i)}
                    title={`Overlap ${eff.overlapFrames}f (${(overlapSec * 1000).toFixed(0)} ms)\nDrag right edge to resize · double-click to reset`}
                    className="absolute top-0 bottom-0 -translate-x-1/2 w-2 cursor-ew-resize touch-none flex items-center justify-center"
                    style={{ left: `${endPct}%` }}
                  >
                    <div
                      className={cn(
                        "w-0.5 h-5",
                        isCustom ? "bg-primary" : "bg-foreground/70",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground pointer-events-none"
            style={{ left: `${(t / Math.max(total, 0.001)) * 100}%` }}
          />
        </div>

        <Slider
          value={[t * 1000]}
          min={0}
          max={Math.max(1, Math.round(total * 1000))}
          step={Math.round((FRAME * 1000) / 4)}
          onValueChange={onScrub}
          className="cursor-pointer"
        />
      </div>

      {/* Per-boundary readout */}
      {numBoundaries > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {effective.map((eff, i) => {
            const isCustom =
              overrides[i] !== undefined &&
              (overrides[i].offsetFrames !== 0 ||
                overrides[i].overlapFrames !== defaultOverlapFrames);
            return (
              <button
                key={`chip-${i}`}
                type="button"
                onClick={() => resetBoundary(i)}
                disabled={!isCustom}
                title={isCustom ? "Reset to preset defaults" : "Preset defaults"}
                className={cn(
                  "text-[10px] tabular-nums px-2 py-0.5 rounded-full border transition-colors",
                  isCustom
                    ? "border-primary/50 text-primary hover:bg-primary/10"
                    : "border-border/40 text-muted-foreground",
                )}
              >
                T{i + 1}: {eff.offsetFrames >= 0 ? "+" : ""}
                {eff.offsetFrames}f · {eff.overlapFrames}f overlap
              </button>
            );
          })}
        </div>
      )}

      {/* Transport */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border/40 text-foreground/90 hover:bg-muted/40 transition-colors"
        >
          {playing ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {playing ? "Pause" : t >= total ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            if (exporting) exportCancelRef.current = true;
            else void runExport();
          }}
          disabled={clipUrls.length < 2}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors",
            exporting
              ? "border-destructive/50 text-destructive hover:bg-destructive/10"
              : "border-primary/50 text-primary hover:bg-primary/10",
            "disabled:opacity-40 disabled:hover:bg-transparent",
          )}
          title="Record this audition to a downloadable file"
        >
          {exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Exporting {Math.round(exportProgress * 100)}% · Cancel
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Export preview
            </>
          )}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Drag diamonds to nudge the cut, drag the right edge to resize the
        overlap. Double-click a marker to reset. Hold Shift while scrubbing to
        snap to frames; arrow keys nudge ±1 frame (Shift = ±1 second). Final
        server stitch uses the preset's defaults.
      </p>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
