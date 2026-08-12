import { supabase } from "@/integrations/supabase/client";
import type { CreatorAsset } from "./types";

async function sha256(blob: Blob) {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function claimGuestImage(input: { userId: string; projectId: string; assetId: string; name: string; blob: Blob; contentType: string; }) {
  const checksum = await sha256(input.blob);
  const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.userId}/${input.projectId}/${input.assetId}/${safeName}`;
  const { error } = await supabase.storage.from("creator-assets").upload(path, input.blob, { contentType: input.contentType || "image/jpeg", upsert: false });
  if (error && !/already exists/i.test(error.message)) throw error;
  const { data: signed, error: signError } = await supabase.storage.from("creator-assets").createSignedUrl(path, 60 * 60);
  if (signError || !signed?.signedUrl) throw signError || new Error("Could not verify the uploaded image.");
  const verification = await fetch(signed.signedUrl);
  if (!verification.ok) throw new Error("Could not verify the uploaded image.");
  const verifiedBlob = await verification.blob();
  if (await sha256(verifiedBlob) !== checksum) throw new Error("The uploaded image did not pass integrity verification.");
  return { storagePath: path, url: signed.signedUrl, checksum };
}

export async function mirrorProductImages(projectId: string, assets: CreatorAsset[]) {
  if (!assets.length) return assets;
  const [hero, ...angles] = assets;
  const { data, error } = await supabase.functions.invoke("scrape-product-url", {
    body: { action: "mirror", hero_url: hero.url, angle_urls: angles.map((asset) => asset.url), referer: hero.url },
  });
  if (error || !data?.logo_url) throw error || new Error("Could not save the imported product images.");
  return [
    { ...hero, url: data.logo_url as string, storagePath: data.logo_path as string },
    ...(Array.isArray(data.angles) ? data.angles.map((item: { url: string; path: string }, index: number) => ({ ...angles[index], url: item.url, storagePath: item.path })).filter((asset: CreatorAsset | undefined): asset is CreatorAsset => Boolean(asset)) : []),
  ];
}
