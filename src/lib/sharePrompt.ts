import { supabase } from "@/integrations/supabase/client";

// 10-char URL-safe slug (~60 bits of entropy, plenty for sharing).
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateSlug(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

export interface CreateSharePayload {
  userId: string;
  workflowType: string;
  targetModel: string;
  agentName: string | null;
  results: unknown;
  title?: string;
}

export async function createSharedPrompt(payload: CreateSharePayload): Promise<{ slug: string; url: string }> {
  // Retry on the very rare slug collision (UNIQUE constraint).
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = generateSlug();
    const { error } = await supabase.from("shared_prompts").insert({
      slug,
      user_id: payload.userId,
      workflow_type: payload.workflowType,
      target_model: payload.targetModel,
      agent_name: payload.agentName,
      results: payload.results as any,
      title: payload.title?.trim() || null,
    });
    if (!error) {
      return { slug, url: buildShareUrl(slug) };
    }
    // 23505 = unique_violation
    if ((error as any).code !== "23505") throw error;
  }
  throw new Error("Could not allocate a unique share link, please try again.");
}

export function buildShareUrl(slug: string): string {
  return `${window.location.origin}/p/${slug}`;
}

export async function fetchSharedPrompt(slug: string) {
  const { data, error } = await supabase
    .from("shared_prompts")
    .select("slug,title,workflow_type,target_model,agent_name,results,view_count,created_at,expires_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function incrementShareViews(slug: string): Promise<void> {
  // Best-effort — don't break the page if it fails.
  try {
    await supabase.rpc("increment_shared_prompt_views", { _slug: slug });
  } catch (e) {
    console.warn("incrementShareViews failed", e);
  }
}
