import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, Film, ExternalLink, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || data.status !== "completed") return;
    if (hover) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hover, data.status]);

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
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="relative aspect-video bg-gradient-to-br from-primary/10 via-muted/20 to-accent/10 flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,hsl(var(--primary)/0.08)_50%,transparent_70%)] bg-[length:200%_100%]" />
          <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs uppercase tracking-wider">
              {data.status === "queued" ? "Queued" : "Rendering"}
            </span>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Film className="w-3 h-3 shrink-0" />
            <span className="truncate">{data.provider}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
            It'll appear here when ready
          </span>
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
