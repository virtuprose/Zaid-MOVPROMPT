import { supabase } from "@/integrations/supabase/client";

export type EditMode = "prompt" | "paint" | "swap" | "erase";

export type EditImageResult = {
  url: string;
  storage_path: string;
  edit: { mode: EditMode; prompt: string; parent_url: string };
};

/**
 * Calls the generate-reference-image edge function with op:"edit" to refine
 * an existing generated image — prompt-only, mask-based paint, subject swap,
 * or clean erase. Always returns a brand-new image; the original is untouched.
 */
export async function editImage(params: {
  sourceUrl: string;
  maskDataUrl?: string;
  mode: EditMode;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
}): Promise<EditImageResult> {
  const { data, error } = await supabase.functions.invoke("generate-reference-image", {
    body: {
      op: "edit",
      source_url: params.sourceUrl,
      mask_url: params.maskDataUrl || undefined,
      edit_mode: params.mode,
      prompt: params.prompt || "",
      aspect_ratio: params.aspectRatio,
    },
  });
  if (error) throw new Error(error.message || "Image edit failed");
  const img = (data as any)?.images?.[0];
  if (!img?.url) throw new Error((data as any)?.error || "No image returned");
  return {
    url: img.url,
    storage_path: img.storage_path,
    edit: (data as any).edit,
  };
}
