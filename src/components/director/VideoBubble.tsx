import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, Film, ExternalLink, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findVideoModel } from "@/lib/director/videoModels";

const RENDER_STAGES = [
  "Warming up the lens",
  "Blocking the shot",
  "Lighting the scene",
  "Rolling camera",
  "Rendering frames",
  "Final color pass",
];

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type VideoBubbleData = {
  jobId: string;
  prompt: string;
  provider: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  liked?: boolean;
};

type Props = {
  data: VideoBubbleData;
  onChange: (next: VideoBubbleData) => void;
};

export function VideoBubble({ data, onChange }: Props) {
  const [hover, setHover] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRendering = data.status !== "completed" && data.status !== "failed";

  useEffect(() => {
    const v = videoRef.current;
    if (!v || data.status !== "completed") return;
    if (hover) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hover, data.status]);

  useEffect(() => {
    if (!isRendering) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [isRendering]);

  useEffect(() => {
    if (!isRendering || data.status === "queued") return;
    const t = window.setInterval(
      () => setStageIdx((i) => (i + 1) % RENDER_STAGES.length),
      2200,
    );
    return () => window.clearInterval(t);
  }, [isRendering, data.status]);

  const toggleLike = async () => {
    const next = !data.liked;
    onChange({ ...data, liked: next });
    const { error } = await supabase
      .from("video_jobs")
      .update({ liked: next })
      .eq("id", data.jobId);
    if (error) {
      onChange({ ...data, liked: !next });
      toast.error("Couldn't update like");
    }
  };

  if (data.status === "failed") {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Render failed
        </div>
        {data.error && (
          <div className="mt-1 text-[12px] text-muted-foreground whitespace-pre-wrap">
            {data.error}
          </div>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground/70">
          {data.provider}
        </div>
      </div>
    );
  }

  if (data.status !== "completed" || !data.videoUrl) {
    const providerLabel = findVideoModel(data.provider)?.label || data.provider;
    const stageLabel =
      data.status === "queued" ? "Standing by" : RENDER_STAGES[stageIdx];
    return (
      <div className="rounded-2xl border border-primary/30 bg-card/40 overflow-hidden shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_20px_60px_-30px_hsl(var(--primary)/0.55)]">
        <div className="relative aspect-video bg-background overflow-hidden">
          {/* Layer 1 — drifting gradient backdrop */}
          <div
            className="absolute inset-0 renderbay-backdrop renderbay-anim"
            style={{ animation: "renderbay-drift 8s ease-in-out infinite" }}
          />
          {/* Scanlines */}
          <div className="absolute inset-0 renderbay-scanlines opacity-60" />

          {/* Layer 2 — filmstrip sprockets top + bottom */}
          <div
            className="absolute inset-x-0 top-0 h-3 renderbay-sprocket renderbay-anim"
            style={{ animation: "renderbay-sprocket 1.2s linear infinite" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-3 renderbay-sprocket renderbay-anim"
            style={{ animation: "renderbay-sprocket 1.2s linear infinite reverse" }}
          />

          {/* Layer 3 — light sweeps */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-y-0 -left-1/3 w-1/2 renderbay-anim"
              style={{
                background:
                  "linear-gradient(110deg, transparent 0%, hsl(var(--primary) / 0.22) 50%, transparent 100%)",
                animation: "renderbay-sweep 2.6s ease-in-out infinite",
              }}
            />
            <div
              className="absolute inset-y-0 -left-1/3 w-1/2 renderbay-anim"
              style={{
                background:
                  "linear-gradient(110deg, transparent 0%, hsl(var(--accent) / 0.16) 50%, transparent 100%)",
                animation: "renderbay-sweep 4.2s ease-in-out infinite",
                animationDelay: "1.3s",
              }}
            />
          </div>

          {/* Layer 4 — center HUD */}
          <div className="relative h-full flex flex-col items-center justify-center gap-3 px-6">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full renderbay-conic renderbay-anim"
                style={{ animation: "renderbay-spin 4s linear infinite" }}
              />
              <div className="absolute inset-[3px] rounded-full bg-background/90 backdrop-blur" />
              <Film className="relative w-5 h-5 text-primary" />
            </div>

            <div
              key={stageLabel}
              className="text-[13px] font-medium tracking-wide text-foreground renderbay-anim"
              style={{ animation: "renderbay-stage-in 420ms ease-out both" }}
            >
              {stageLabel}
              <span className="ml-0.5 inline-block w-1 animate-pulse text-primary">
                _
              </span>
            </div>

            <div className="w-40 h-[3px] rounded-full bg-foreground/10 overflow-hidden relative">
              <div
                className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-primary via-primary to-accent renderbay-anim"
                style={{ animation: "renderbay-progress 1.8s ease-in-out infinite" }}
              />
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
              {formatElapsed(elapsed)} · {providerLabel}
            </div>
          </div>
        </div>

        {/* Footer chip row */}
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border/30 bg-background/40">
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/80 truncate">
            <Film className="w-3 h-3 shrink-0 text-primary" />
            <span className="truncate font-medium">{providerLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-destructive renderbay-anim"
              style={{ animation: "renderbay-rec 1.2s ease-in-out infinite" }}
            />
            REC {formatElapsed(elapsed)}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={data.videoUrl}
          muted
          playsInline
          loop
          preload="metadata"
          controls={hover}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
          <Film className="w-3 h-3 shrink-0 text-primary" />
          <span className="truncate">{data.provider}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLike}
            className="h-7 px-2 text-xs"
          >
            <Heart className={cn("w-3.5 h-3.5", data.liked && "fill-current text-accent")} />
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-label="Download video">
            <a href={data.videoUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="w-3.5 h-3.5" />
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Link to="/library">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Library
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
