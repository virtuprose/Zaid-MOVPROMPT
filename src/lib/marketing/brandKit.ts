import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Subject } from "@/lib/marketingStudio";

export type BrandKit = {
  subject: Subject;
  name: string;
  description: string;
  url: string | null;
  tagline: string | null;
  audience: string | null;
  logo_path: string | null;
  /** Signed URL for previewing logo (not persisted). */
  logo_url?: string | null;
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

async function signLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function useBrandKit() {
  const { user } = useAuth();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setKit(null);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("brand_kits")
        .select("subject,name,description,url,tagline,audience,logo_path")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const logo_url = await signLogo(data.logo_path);
        if (cancelled) return;
        setKit({ ...(data as BrandKit), logo_url });
      } else {
        setKit(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (next: BrandKit) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("brand_kits").upsert({
        user_id: user.id,
        subject: next.subject,
        name: next.name,
        description: next.description,
        url: next.url,
        tagline: next.tagline,
        audience: next.audience,
        logo_path: next.logo_path,
      });
      if (error) throw error;
      const logo_url = await signLogo(next.logo_path);
      setKit({ ...next, logo_url });
    },
    [user],
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

  return { kit, loading, save, uploadLogo, uploadLocationImage };
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
