// Director-driven image generation. Uses Lovable AI Gateway image model and uploads
// generated images to the private `director-uploads` bucket. Returns signed URLs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60 * 60;

type Mode = "character_sheet" | "storyboard_panels" | "single_panel";

type Body = {
  mode?: Mode;
  prompt?: string;
  reference_urls?: string[];
  count?: number;
  aspect_ratio?: "1:1" | "16:9" | "9:16";
  per_shot_prompts?: string[]; // when mode === "storyboard_panels", one per shot
  shot_index?: number; // when regenerating a single panel inside an existing 3x3 grid
};

const IDENTITY_LOCK =
  "Same character as the attached reference image. Maintain exact face, hair, skin tone, age, body proportions, and outfit. Do not redesign the character.";

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL");
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function generateOne(
  apiKey: string,
  prompt: string,
  referenceUrls: string[],
  aspectRatio: string,
): Promise<string> {
  const aspectLine = aspectRatio ? `\n\nAspect ratio: ${aspectRatio}.` : "";
  const userParts: any[] = [{ type: "text", text: prompt + aspectLine }];
  for (const u of referenceUrls.slice(0, 4)) {
    userParts.push({ type: "image_url", image_url: { url: u } });
  }
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: userParts }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    const err: any = new Error(`gateway_${resp.status}`);
    err.status = resp.status;
    err.detail = txt;
    throw err;
  }
  const data = await resp.json();
  const msg = data?.choices?.[0]?.message;
  const img =
    msg?.images?.[0]?.image_url?.url ||
    msg?.images?.[0]?.url ||
    null;
  if (!img) throw new Error("no_image_returned");
  return img as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser(
    auth.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Service misconfigured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Body;
    const mode: Mode = body.mode || "single_panel";
    const basePrompt = (body.prompt || "").trim();
    if (!basePrompt && !(body.per_shot_prompts?.length)) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referenceUrls = Array.isArray(body.reference_urls)
      ? body.reference_urls.filter((u) => typeof u === "string" && u.length > 0)
      : [];
    const aspect = body.aspect_ratio || (mode === "character_sheet" ? "1:1" : "16:9");

    const hasCharacterRef = referenceUrls.length > 0;
    const lockPrefix = hasCharacterRef ? `${IDENTITY_LOCK} ` : "";

    // shot_index lets the caller regenerate a single panel inside an existing
    // 3x3 grid without touching the other 8 cells. We still keep mode="storyboard_panels"
    // so the output rides the same role/shot_index pipeline downstream.
    const regenIndex =
      mode === "storyboard_panels" &&
      typeof body.shot_index === "number" &&
      body.shot_index >= 1 &&
      body.shot_index <= 9
        ? body.shot_index
        : null;

    let prompts: string[];
    let shotIndices: number[]; // per-prompt shot_index for storyboard_panels
    if (mode === "storyboard_panels") {
      const raw =
        Array.isArray(body.per_shot_prompts) && body.per_shot_prompts.length > 0
          ? body.per_shot_prompts.slice(0, 9)
          : Array.from(
              { length: Math.min(Math.max(body.count || 9, 1), 9) },
              () => basePrompt,
            );
      const total = regenIndex ? 9 : raw.length;
      prompts = raw.map((beat, i) => {
        const shotNum = regenIndex ?? i + 1;
        return `${lockPrefix}Shot ${shotNum} of ${total}: ${beat}`;
      });
      shotIndices = regenIndex
        ? prompts.map(() => regenIndex)
        : prompts.map((_, i) => i + 1);
    } else if (mode === "character_sheet") {
      prompts = [
        `Character sheet, full body reference. Three views in one image side by side: front view, three-quarter view, and side profile. Neutral expression, T-pose or relaxed stance, flat clean studio background, even soft lighting, no harsh shadows, no props. ${basePrompt}`,
      ];
      shotIndices = [];
    } else {
      const count = Math.min(Math.max(body.count || 1, 1), 9);
      prompts = Array.from({ length: count }, () => `${lockPrefix}${basePrompt}`);
      shotIndices = [];
    }

    const out: Array<{ url: string; storage_path: string; shot_index?: number }> = [];
    // Sequential to stay polite with gateway rate limits — and because per-image
    // calls preserve identity better than batched ones with this model.
    for (let i = 0; i < prompts.length; i++) {
      const dataUrl = await generateOne(LOVABLE_API_KEY, prompts[i], referenceUrls, aspect);
      const { blob, mime } = dataUrlToBlob(dataUrl);
      const ext = mime.split("/")[1] || "png";
      const safeName = `${mode}-${Date.now()}-${i + 1}.${ext}`;
      const path = `${userId}/gen-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("director-uploads")
        .upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("director-uploads")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("sign_failed");
      out.push({
        url: signed.signedUrl,
        storage_path: path,
        shot_index: mode === "storyboard_panels" ? shotIndices[i] : undefined,
      });
    }


    return new Response(
      JSON.stringify({ mode, images: out }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("generate-reference-image error", e);
    const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 502;
    const msg =
      status === 429
        ? "Image generation rate-limited. Try again shortly."
        : status === 402
          ? "AI credits exhausted. Add credits in Workspace → Usage."
          : e?.message || "Image generation failed";
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
