import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TypographyVibe =
  | "modern-sans"
  | "editorial-serif"
  | "bold-display"
  | "handwritten"
  | "monospace";

export const TYPOGRAPHY_VIBES: { id: TypographyVibe; label: string; hint: string }[] = [
  { id: "modern-sans", label: "Modern sans", hint: "Clean, geometric, Inter-style" },
  { id: "editorial-serif", label: "Editorial serif", hint: "Refined, magazine-grade" },
  { id: "bold-display", label: "Bold display", hint: "Heavy, condensed, punchy" },
  { id: "handwritten", label: "Handwritten", hint: "Casual, organic, marker" },
  { id: "monospace", label: "Monospace", hint: "Technical, code-like" },
];

export type BrandIdentity = {
  id?: string;
  logo_path: string | null;
  logo_url?: string | null;
  primary_color: string | null;
  supporting_colors: string[] | null;
  avoid_colors: string[] | null;
  typography_vibe: TypographyVibe | null;
  font_hint: string | null;
  mood_notes: string | null;
  tagline: string | null;
};

export const EMPTY_BRAND_IDENTITY: BrandIdentity = {
  logo_path: null,
  logo_url: null,
  primary_color: null,
  supporting_colors: null,
  avoid_colors: null,
  typography_vibe: null,
  font_hint: null,
  mood_notes: null,
  tagline: null,
};

async function signLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function hasBrandIdentity(b: BrandIdentity | null | undefined): boolean {
  if (!b) return false;
  return !!(
    b.primary_color ||
    (b.supporting_colors && b.supporting_colors.length > 0) ||
    (b.avoid_colors && b.avoid_colors.length > 0) ||
    b.typography_vibe ||
    b.mood_notes ||
    b.tagline ||
    b.logo_path
  );
}

export function useBrandIdentity() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<BrandIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setIdentity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("brand_identities")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const row = data as any;
      const logo_url = await signLogo(row.logo_path);
      setIdentity({
        id: row.id,
        logo_path: row.logo_path,
        logo_url,
        primary_color: row.primary_color,
        supporting_colors: row.supporting_colors ?? null,
        avoid_colors: row.avoid_colors ?? null,
        typography_vibe: row.typography_vibe,
        font_hint: row.font_hint,
        mood_notes: row.mood_notes,
        tagline: row.tagline,
      });
    } else {
      setIdentity(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (next: BrandIdentity) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        user_id: user.id,
        logo_path: next.logo_path,
        primary_color: next.primary_color,
        supporting_colors: next.supporting_colors,
        avoid_colors: next.avoid_colors,
        typography_vibe: next.typography_vibe,
        font_hint: next.font_hint,
        mood_notes: next.mood_notes,
        tagline: next.tagline,
      };
      const { error } = await supabase
        .from("brand_identities")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      await reload();
    },
    [user, reload],
  );

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from("brand_identities").delete().eq("user_id", user.id);
    await reload();
  }, [user, reload]);

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "png";
      const path = `marketing/${user.id}/identity/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("director-uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    },
    [user],
  );

  return { identity, loading, save, clear, uploadLogo, reload };
}
