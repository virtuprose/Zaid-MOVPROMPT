import { useEffect, useRef, useState } from "react";
import { ImageIcon, Film, Play, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaItems, type MediaItem } from "./MediaRailContext";

type Filter = "all" | "images" | "videos";

export function MediaRailPanel() {
  const items = useMediaItems();
  const [filter, setFilter] = useState<Filter>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWide(w >= 360);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (items.length === 0) return null;

  const filtered = items.filter((it) =>
    filter === "all" ? true : filter === "images" ? it.kind === "image" : it.kind === "video",
  );

  return (
    <aside
      ref={containerRef}
      className="flex flex-col gap-2 h-full w-full min-w-0 bg-background/40"
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Media</h2>
          <span className="text-[10px] text-muted-foreground/70">({items.length})</span>
        </div>
      </div>

      <div className="mx-2 grid grid-cols-3 gap-1 p-1 rounded-lg border border-border/40 bg-muted/20 text-[11px]">
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

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className={cn("grid gap-2", wide ? "grid-cols-2" : "grid-cols-1")}>
          {filtered.map((it) => (
            <MediaCard key={it.id} item={it} />
          ))}
        </div>
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
