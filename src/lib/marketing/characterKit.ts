import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CharacterKit = {
  id?: string;
  name: string;
  description: string;
  role: string | null;
  reference_path: string | null;
  /** Signed URL for previewing reference image (not persisted). */
  reference_url?: string | null;
  updated_at?: string;
};

export const EMPTY_CHARACTER_KIT: CharacterKit = {
  name: "",
  description: "",
  role: null,
  reference_path: null,
  reference_url: null,
};

async function signRef(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function useCharacterKit() {
  const { user } = useAuth();
  const [kits, setKits] = useState<CharacterKit[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setKits([]);
      setActiveIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: rows }, { data: sel }] = await Promise.all([
      supabase
        .from("character_kits")
        .select("id,name,description,role,reference_path,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("character_kit_selection")
        .select("character_kit_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const list = (rows ?? []) as CharacterKit[];
    const signed = await Promise.all(
      list.map(async (k) => ({ ...k, reference_url: await signRef(k.reference_path) })),
    );
    setKits(signed);
    const sid = sel?.character_kit_id ?? null;
    setActiveIdState(sid);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeKit = kits.find((k) => k.id === activeId) ?? null;

  const setActive = useCallback(
    async (id: string | null) => {
      setActiveIdState(id);
      if (!user) return;
      await supabase.from("character_kit_selection").upsert({
        user_id: user.id,
        character_kit_id: id,
        updated_at: new Date().toISOString(),
      });
    },
    [user],
  );

  const saveKit = useCallback(
    async (next: CharacterKit): Promise<CharacterKit> => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        user_id: user.id,
        name: next.name,
        description: next.description,
        role: next.role,
        reference_path: next.reference_path,
      };
      let saved: CharacterKit;
      if (next.id) {
        const { data, error } = await supabase
          .from("character_kits")
          .update(payload)
          .eq("id", next.id)
          .select("id,name,description,role,reference_path,updated_at")
          .single();
        if (error) throw error;
        saved = data as CharacterKit;
      } else {
        const { data, error } = await supabase
          .from("character_kits")
          .insert(payload)
          .select("id,name,description,role,reference_path,updated_at")
          .single();
        if (error) throw error;
        saved = data as CharacterKit;
      }
      saved.reference_url = await signRef(saved.reference_path);
      await reload();
      if (saved.id) await setActive(saved.id);
      return saved;
    },
    [user, reload, setActive],
  );

  const deleteKit = useCallback(
    async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("character_kits").delete().eq("id", id);
      if (error) throw error;
      if (activeId === id) await setActive(null);
      await reload();
    },
    [user, activeId, reload, setActive],
  );

  const uploadReference = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "png";
      const path = `marketing/${user.id}/character/ref-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("director-uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    },
    [user],
  );

  return {
    kits,
    activeKit,
    activeId,
    loading,
    setActive,
    saveKit,
    deleteKit,
    uploadReference,
    reload,
  };
}
