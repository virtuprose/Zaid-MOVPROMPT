import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, ImageIcon, Film, Play, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaRail } from "./MediaRailContext";

type MediaItem =
  | {
      id: string;
      kind: "image";
      url: string;
      label: string;
      aspect?: "1:1" | "16:9" | "9:16";
      order: number;
    }
  | {
      id: string;
      kind: "video";
      url?: string;
      label: string;
      status: "queued" | "processing" | "completed" | "failed";
      order: number;
    };

type Filter = "all" | "images" | "videos";

const LS_KEY = "vidoprompt.mediarail.collapsed";

function extractItems(bubbles: any[]): MediaItem[] {
  const items: MediaItem[] = [];
  let order = 0;
  for (const b of bubbles || []) {
    if (!b || typeof b !== "object") continue;
    order += 1;
    if (b.role === "generated_images" && b.data?.images?.length) {
      const mode = b.data.mode as string | undefined;
      b.data.images.forEach((img: any, i: number) => {
        if (!img?.url) return;
        const baseLabel =
          mode === "character_sheet"
            ? "Subject sheet"
            : mode === "storyboard_panels"
              ? `Panel ${img.shot_index ?? i + 1}`
              : "Key frame";
        items.push({
          id: `img-${order}-${i}-${img.storage_path || img.url}`,
          kind: "image",
          url: img.url,
          label: b.data.images.length > 1 ? baseLabel : baseLabel,
          aspect: b.data.aspectRatio,
          order,
        });
      });
    } else if (b.role === "video" && b.data) {
      items.push({
        id: `vid-${b.data.jobId || order}`,
        kind: "video",
        url: b.data.videoUrl,
        label: (b.data.prompt || "Video").slice(0, 40),
        status: b.data.status || "queued",
        order,
      });
    } else if (b.role === "story_render" && b.data?.stitchedVideoUrl) {
      items.push({
        id: `story-${order}`,
        kind: "video",
        url: b.data.stitchedVideoUrl,
        label: b.data.title || "Final cut",
        status: "completed",
        order,
      });
    }
  }
  // Dedupe by id and sort newest first
  const seen = new Set<string>();
  return items
    .filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)))
    .sort((a, b) => b.order - a.order);
}

export function MediaRailPanel() {
  const ctx = useMediaRail();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  const items = useMemo(() => extractItems(ctx?.bubbles || []), [ctx?.bubbles]);
  const filtered = useMemo(
    () =>
      items.filter((it) =>
        filter === "all" ? true : filter === "images" ? it.kind === "image" : it.kind === "video",
      ),
    [items, filter],
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="hidden xl:flex sticky top-4 self-start ml-auto items-center gap-1.5 rounded-l-lg border border-r-0 border-border/50 bg-background/90 backdrop-blur px-2 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        title="Show media"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <Film className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col gap-2 max-h-[calc(100vh-160px)] sticky top-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Media</h2>
          {items.length > 0 && (
            <span className="text-[10px] text-muted-foreground/70">({items.length})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title="Hide media"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-border/40 bg-muted/20 text-[11px]">
        {(["all", "images", "videos"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "py-1 rounded-md capitalize transition-colors",
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground/70 px-2 py-8 text-center leading-relaxed">
            Generated frames and videos for this brief will appear here.
          </div>
        ) : (
          filtered.map((it) => <MediaCard key={it.id} item={it} />)
        )}
      </div>
    </aside>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const ratioClass =
    item.kind === "image"
      ? item.aspect === "9:16"
        ? "aspect-[9/16]"
        : item.aspect === "1:1"
          ? "aspect-square"
          : "aspect-video"
      : "aspect-video";

  if (item.kind === "image") {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl overflow-hidden border border-border/40 bg-muted/20 hover:border-primary/40 hover:ring-1 hover:ring-primary/30 transition-all"
      >
        <div className={cn("relative w-full bg-black/40", ratioClass)}>
          <img
            src={item.url}
            alt={item.label}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur">
            IMG
          </span>
          <ExternalLink className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-white/0 group-hover:text-white/90 transition-colors" />
        </div>
        <div className="px-2 py-1.5 flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-foreground/80 truncate">{item.label}</span>
        </div>
      </a>
    );
  }

  const isReady = item.status === "completed" && item.url;
  return (
    <div className="group block rounded-xl overflow-hidden border border-border/40 bg-muted/20 hover:border-primary/40 hover:ring-1 hover:ring-primary/30 transition-all">
      <div className={cn("relative w-full bg-black/60", ratioClass)}>
        {isReady ? (
          <video
            src={item.url}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {item.status === "failed" ? "Failed" : "Rendering…"}
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-accent/90 text-accent-foreground backdrop-blur">
          MP4
        </span>
        {isReady && (
          <Play className="absolute inset-0 m-auto w-7 h-7 text-white/90 drop-shadow opacity-80 group-hover:opacity-0 transition-opacity" />
        )}
      </div>
      <div className="px-2 py-1.5 flex items-center gap-1.5">
        <Film className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-foreground/80 truncate flex-1">{item.label}</span>
        {isReady && (
          <a
            href={item.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
            title="Download"
          >
            <Download className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
