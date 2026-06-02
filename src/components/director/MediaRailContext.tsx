import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type RailBubble = any;

export type MediaItem =
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

export function extractMediaItems(bubbles: any[]): MediaItem[] {
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
          label: baseLabel,
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
  const seen = new Set<string>();
  return items
    .filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)))
    .sort((a, b) => b.order - a.order);
}

type Ctx = {
  bubbles: RailBubble[];
  setBubbles: (b: RailBubble[]) => void;
};

const MediaRailCtx = createContext<Ctx | null>(null);

export function MediaRailProvider({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<RailBubble[]>([]);
  const value = useMemo(() => ({ bubbles, setBubbles }), [bubbles]);
  return <MediaRailCtx.Provider value={value}>{children}</MediaRailCtx.Provider>;
}

export function useMediaRail() {
  return useContext(MediaRailCtx);
}

export function useMediaItems(): MediaItem[] {
  const ctx = useContext(MediaRailCtx);
  return useMemo(() => extractMediaItems(ctx?.bubbles || []), [ctx?.bubbles]);
}
