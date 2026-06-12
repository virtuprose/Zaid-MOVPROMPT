import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Attachment } from "@/lib/director/ingest";

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

export type MediaFolder = { id: string; name: string };

export type MediaLabel = {
  name: string;
  media_key: string;
  kind: string;
  url: string;
  label?: string | null;
};

/** Validate a user-supplied stable reference name. */
export const RESERVED_REF_NAMES = new Set(["art", "ref", "me", "self"]);
export function isValidRefName(name: string): boolean {
  if (!name) return false;
  if (RESERVED_REF_NAMES.has(name)) return false;
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(name);
}
export function normalizeRefName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

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
  sessionId?: string;
  setSessionId: (id?: string) => void;

  hiddenKeys: Set<string>;
  favorites: Set<string>;
  folders: MediaFolder[];
  pendingAttachments: Attachment[];
  labels: MediaLabel[];
  labelByKey: Map<string, string>; // media_key -> name

  toggleFavorite: (item: MediaItem) => Promise<void>;
  hideItem: (item: MediaItem) => Promise<void>;
  unhideItem: (key: string) => Promise<void>;
  createFolder: (name: string) => Promise<MediaFolder | null>;
  addToFolder: (item: MediaItem, folderId: string) => Promise<void>;
  enqueueAttachment: (a: Attachment) => void;
  consumeAttachments: () => Attachment[];
  renameItem: (item: MediaItem, name: string) => Promise<{ ok: boolean; error?: string }>;
  unnameItem: (mediaKey: string) => Promise<void>;
};

const MediaRailCtx = createContext<Ctx | null>(null);

export function MediaRailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bubbles, setBubbles] = useState<RailBubble[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [labels, setLabels] = useState<MediaLabel[]>([]);

  // Load favorites + folders + labels once per user
  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      setFolders([]);
      setLabels([]);
      return;
    }
    let alive = true;
    (async () => {
      const [fav, fld, lbl] = await Promise.all([
        supabase.from("media_favorites").select("media_key").eq("user_id", user.id),
        supabase
          .from("media_folders")
          .select("id, name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("media_labels")
          .select("name, media_key, kind, url, label")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      ]);
      if (!alive) return;
      if (fav.data) setFavorites(new Set(fav.data.map((r: any) => r.media_key)));
      if (fld.data) setFolders(fld.data as MediaFolder[]);
      if (lbl.data) setLabels(lbl.data as MediaLabel[]);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Hidden items scoped per session (so a delete on one task doesn't leak).
  useEffect(() => {
    if (!user || !sessionId) {
      setHiddenKeys(new Set());
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("media_hidden")
        .select("media_key")
        .eq("user_id", user.id)
        .eq("session_id", sessionId);
      if (!alive) return;
      setHiddenKeys(new Set((data || []).map((r: any) => r.media_key)));
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, sessionId]);

  const toggleFavorite = useCallback(
    async (item: MediaItem) => {
      if (!user) return;
      const key = item.id;
      const isFav = favorites.has(key);
      const next = new Set(favorites);
      if (isFav) next.delete(key);
      else next.add(key);
      setFavorites(next);
      if (isFav) {
        await supabase
          .from("media_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("media_key", key);
      } else {
        await supabase.from("media_favorites").insert({
          user_id: user.id,
          media_key: key,
          kind: item.kind,
          url: item.url || "",
          label: item.label,
          session_id: sessionId ?? null,
        });
      }
    },
    [user, favorites, sessionId],
  );

  const hideItem = useCallback(
    async (item: MediaItem) => {
      if (!user) return;
      const key = item.id;
      setHiddenKeys((prev) => new Set(prev).add(key));
      await supabase.from("media_hidden").upsert(
        {
          user_id: user.id,
          media_key: key,
          session_id: sessionId ?? null,
        },
        { onConflict: "user_id,media_key" },
      );
    },
    [user, sessionId],
  );

  const unhideItem = useCallback(
    async (key: string) => {
      if (!user) return;
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      await supabase
        .from("media_hidden")
        .delete()
        .eq("user_id", user.id)
        .eq("media_key", key);
    },
    [user],
  );

  const createFolder = useCallback(
    async (name: string) => {
      if (!user || !name.trim()) return null;
      const { data, error } = await supabase
        .from("media_folders")
        .insert({ user_id: user.id, name: name.trim().slice(0, 80) })
        .select("id, name")
        .single();
      if (error || !data) return null;
      const folder = data as MediaFolder;
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    [user],
  );

  const addToFolder = useCallback(
    async (item: MediaItem, folderId: string) => {
      if (!user) return;
      await supabase
        .from("media_folder_items")
        .upsert(
          {
            folder_id: folderId,
            user_id: user.id,
            media_key: item.id,
            kind: item.kind,
            url: item.url || "",
            label: item.label,
            session_id: sessionId ?? null,
          },
          { onConflict: "folder_id,media_key" },
        );
    },
    [user, sessionId],
  );

  const enqueueAttachment = useCallback((a: Attachment) => {
    setPendingAttachments((prev) => [...prev, a]);
  }, []);

  const consumeAttachments = useCallback(() => {
    const drained = pendingAttachments;
    setPendingAttachments([]);
    return drained;
  }, [pendingAttachments]);

  const labelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of labels) m.set(l.media_key, l.name);
    return m;
  }, [labels]);

  const renameItem = useCallback(
    async (item: MediaItem, rawName: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Not signed in" };
      const name = normalizeRefName(rawName);
      if (!isValidRefName(name)) {
        return { ok: false, error: "Use lowercase letters, numbers and dashes (max 32)." };
      }
      // Optimistic: drop any previous label for this media_key OR this name, then add the new one.
      setLabels((prev) => {
        const filtered = prev.filter(
          (l) => l.media_key !== item.id && l.name !== name,
        );
        return [
          ...filtered,
          { name, media_key: item.id, kind: item.kind, url: item.url || "", label: item.label },
        ].sort((a, b) => a.name.localeCompare(b.name));
      });
      // Remove any prior label on this same media_key
      await supabase
        .from("media_labels")
        .delete()
        .eq("user_id", user.id)
        .eq("media_key", item.id);
      // Upsert by (user_id, name) so renaming a different item to the same name replaces it
      const { error } = await supabase
        .from("media_labels")
        .upsert(
          {
            user_id: user.id,
            name,
            media_key: item.id,
            kind: item.kind,
            url: item.url || "",
            label: item.label,
            session_id: sessionId ?? null,
          },
          { onConflict: "user_id,name" },
        );
      if (error) {
        // Roll back by reloading
        const { data } = await supabase
          .from("media_labels")
          .select("name, media_key, kind, url, label")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        setLabels((data as MediaLabel[]) || []);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    },
    [user, sessionId],
  );

  const unnameItem = useCallback(
    async (mediaKey: string) => {
      if (!user) return;
      setLabels((prev) => prev.filter((l) => l.media_key !== mediaKey));
      await supabase
        .from("media_labels")
        .delete()
        .eq("user_id", user.id)
        .eq("media_key", mediaKey);
    },
    [user],
  );

  const value = useMemo<Ctx>(
    () => ({
      bubbles,
      setBubbles,
      sessionId,
      setSessionId,
      hiddenKeys,
      favorites,
      folders,
      pendingAttachments,
      labels,
      labelByKey,
      toggleFavorite,
      hideItem,
      unhideItem,
      createFolder,
      addToFolder,
      enqueueAttachment,
      consumeAttachments,
      renameItem,
      unnameItem,
    }),
    [
      bubbles,
      sessionId,
      hiddenKeys,
      favorites,
      folders,
      pendingAttachments,
      labels,
      labelByKey,
      toggleFavorite,
      hideItem,
      unhideItem,
      createFolder,
      addToFolder,
      enqueueAttachment,
      consumeAttachments,
      renameItem,
      unnameItem,
    ],
  );

  return <MediaRailCtx.Provider value={value}>{children}</MediaRailCtx.Provider>;
}

export function useMediaRail() {
  return useContext(MediaRailCtx);
}

export function useMediaItems(): MediaItem[] {
  const ctx = useContext(MediaRailCtx);
  return useMemo(() => {
    const items = extractMediaItems(ctx?.bubbles || []);
    const hidden = ctx?.hiddenKeys;
    if (!hidden || hidden.size === 0) return items;
    return items.filter((it) => !hidden.has(it.id));
  }, [ctx?.bubbles, ctx?.hiddenKeys]);
}
