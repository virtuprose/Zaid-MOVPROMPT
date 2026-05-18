import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Subject } from "@/lib/marketingStudio";

export type BrandKit = {
  id?: string;
  subject: Subject;
  name: string;
  description: string;
  url: string | null;
  tagline: string | null;
  audience: string | null;
  logo_path: string | null;
  /** Signed URL for previewing logo (not persisted). */
  logo_url?: string | null;
  updated_at?: string;
};

export const EMPTY_BRAND_KIT: BrandKit = {
  subject: "product",
  name: "",
  description: "",
  url: null,
  tagline: null,
  audience: null,
  logo_path: null,
  logo_url: null,
};

export const MAX_BRANDS = 2;

async function signLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function useBrandKit() {
  const { user } = useAuth();
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [activeIds, setActiveIdsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setKits([]);
      setActiveIdsState([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: rows }, { data: sel }] = await Promise.all([
      supabase
        .from("brand_kits")
        .select("id,subject,name,description,url,tagline,audience,logo_path,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("brand_kit_selections")
        .select("brand_kit_id,position")
        .eq("user_id", user.id)
        .order("position", { ascending: true }),
    ]);
    const list = (rows ?? []) as BrandKit[];
    const signed = await Promise.all(
      list.map(async (k) => ({ ...k, logo_url: await signLogo(k.logo_path) })),
    );
    setKits(signed);
    const ids = (sel ?? [])
      .map((r) => r.brand_kit_id as string | null)
      .filter((id): id is string => !!id && signed.some((k) => k.id === id))
      .slice(0, MAX_BRANDS);
    setActiveIdsState(ids);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeKits = activeIds
    .map((id) => kits.find((k) => k.id === id))
    .filter((k): k is BrandKit => !!k);
  const activeKit = activeKits[0] ?? null;
  const activeId = activeIds[0] ?? null;

  const persistSelections = useCallback(
    async (ids: string[]) => {
      if (!user) return;
      await supabase.from("brand_kit_selections").delete().eq("user_id", user.id);
      if (ids.length > 0) {
        await supabase.from("brand_kit_selections").insert(
          ids.map((id, i) => ({
            user_id: user.id,
            brand_kit_id: id,
            position: i,
            updated_at: new Date().toISOString(),
          })),
        );
      }
    },
    [user],
  );

  const setActiveIds = useCallback(
    async (ids: string[]) => {
      const capped = ids.slice(0, MAX_BRANDS);
      setActiveIdsState(capped);
      await persistSelections(capped);
    },
    [persistSelections],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const next = activeIds.includes(id)
        ? activeIds.filter((x) => x !== id)
        : activeIds.length >= MAX_BRANDS
          ? activeIds
          : [...activeIds, id];
      await setActiveIds(next);
    },
    [activeIds, setActiveIds],
  );

  const setActive = useCallback(
    async (id: string | null) => {
      await setActiveIds(id ? [id] : []);
    },
    [setActiveIds],
  );

  const saveKit = useCallback(
    async (next: BrandKit): Promise<BrandKit> => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        user_id: user.id,
        subject: next.subject,
        name: next.name,
        description: next.description,
        url: next.url,
        tagline: next.tagline,
        audience: next.audience,
        logo_path: next.logo_path,
      };
      let saved: BrandKit;
      if (next.id) {
        const { data, error } = await supabase
          .from("brand_kits")
          .update(payload)
          .eq("id", next.id)
          .select("id,subject,name,description,url,tagline,audience,logo_path,updated_at")
          .single();
        if (error) throw error;
        saved = data as BrandKit;
      } else {
        const { data, error } = await supabase
          .from("brand_kits")
          .insert(payload)
          .select("id,subject,name,description,url,tagline,audience,logo_path,updated_at")
          .single();
        if (error) throw error;
        saved = data as BrandKit;
      }
      saved.logo_url = await signLogo(saved.logo_path);
      await reload();
      if (saved.id && !activeIds.includes(saved.id)) {
        const nextIds = [...activeIds, saved.id].slice(0, MAX_BRANDS);
        await setActiveIds(nextIds);
      }
      return saved;
    },
    [user, reload, activeIds, setActiveIds],
  );

  const deleteKit = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("brand_kits").delete().eq("id", id);
      if (error) throw error;
      if (activeIds.includes(id)) {
        await setActiveIds(activeIds.filter((x) => x !== id));
      }
      await reload();
    },
    [user, activeIds, reload, setActiveIds],
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "png";
      const path = `marketing/${user.id}/brand/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("director-uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    },
    [user],
  );

  const uploadLocationImage = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "png";
      const path = `marketing/${user.id}/location/img-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("director-uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("director-uploads")
        .createSignedUrl(path, 60 * 60);
      return { path, url: data?.signedUrl ?? null };
    },
    [user],
  );

  return {
    kits,
    activeKit,
    activeKits,
    activeId,
    activeIds,
    loading,
    setActive,
    setActiveIds,
    toggleActive,
    saveKit,
    deleteKit,
    uploadLogo,
    uploadLocationImage,
    reload,
  };
}

export type BrandImageAnalysis = {
  name: string | null;
  description: string | null;
  tagline: string | null;
};

export async function analyzeBrandImage(input: {
  imagePath?: string | null;
  imageUrl?: string | null;
  subject: Subject;
}): Promise<BrandImageAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-brand-image", {
    body: input,
  });
  if (error) throw error;
  return data as BrandImageAnalysis;
}

export type LocationInput = {
  place: string;
  imagePath: string | null;
  imageUrl: string | null;
};

export const EMPTY_LOCATION: LocationInput = {
  place: "",
  imagePath: null,
  imageUrl: null,
};
