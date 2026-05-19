// Director-driven image generation. Uses Lovable AI Gateway image model and uploads
// generated images to the private `director-uploads` bucket. Returns signed URLs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { chargeCredits, refundCredits, priceFor, InsufficientCreditsError, insufficientResponse } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60 * 60;

type Mode = "character_sheet" | "storyboard_panels" | "single_panel";
type LockMode = "character" | "scene" | "auto";

type Body = {
  mode?: Mode;
  prompt?: string;
  reference_urls?: string[];
  count?: number;
  aspect_ratio?: "1:1" | "16:9" | "9:16";
  per_shot_prompts?: string[]; // when mode === "storyboard_panels", one per shot
  shot_index?: number; // when regenerating a single panel inside an existing 3x3 grid
  lock_mode?: LockMode; // "character" | "scene" (key-frame extension) | "auto" (default)
  subject_kind?: "character" | "product"; // shapes the character_sheet layout copy
};

const IDENTITY_LOCK =
  "Same character as the attached reference image. Maintain exact face, hair, skin tone, age, body proportions, and outfit. Do not redesign the character.";

const SCENE_LOCK =
  "Same scene as the attached key frame. Maintain the exact location, lighting setup, color grade, lens, depth of field, camera height, and composition language. Keep subject, props, wardrobe, time of day, and background continuous. Only the action and framing change between frames.";

const HERO_FRAME_SUFFIX =
  " Single polished hero frame: cinematic composition, intentional depth of field, controlled lighting, clean negative space. No text, no captions, no watermark, no UI overlays.";


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
  const validRefs = referenceUrls.filter((u) => /^(https?:|data:)/i.test(u));
  for (const u of validRefs.slice(0, 4)) {
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

    const hasReference = referenceUrls.length > 0;
    const lockMode: LockMode = body.lock_mode || "auto";
    const effectiveLock: "character" | "scene" | "none" = !hasReference
      ? "none"
      : lockMode === "scene"
        ? "scene"
        : lockMode === "character"
          ? "character"
          : "character"; // auto with ref defaults to character (backwards compatible)
    const lockPhrase =
      effectiveLock === "character" ? IDENTITY_LOCK : effectiveLock === "scene" ? SCENE_LOCK : "";
    const lockPrefix = lockPhrase ? `${lockPhrase} ` : "";

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
    const isChain = mode === "storyboard_panels" && !regenIndex;
    if (mode === "storyboard_panels") {
      const raw =
        Array.isArray(body.per_shot_prompts) && body.per_shot_prompts.length > 0
          ? body.per_shot_prompts.slice(0, 9)
          : Array.from(
              { length: Math.min(Math.max(body.count || 9, 1), 9) },
              () => basePrompt,
            );
      const total = regenIndex ? 9 : raw.length;
      const continuityClause = isChain
        ? " Same character, wardrobe, hair, face, and props as the attached previous panel — only the action and framing change."
        : "";
      const subjectClause = referenceUrls.length >= 2
        ? " Match the subject (character or product) shown in the first attached reference sheet — keep face, wardrobe, hair, branding, and proportions exact."
        : "";
      prompts = raw.map((beat, i) => {
        const shotNum = regenIndex ?? i + 1;
        return `${lockPrefix}Shot ${shotNum} of ${total}: ${beat}${continuityClause}${subjectClause}`;
      });
      shotIndices = regenIndex
        ? prompts.map(() => regenIndex)
        : prompts.map((_, i) => i + 1);
    } else if (mode === "character_sheet") {
      const subjectKind = body.subject_kind === "product" ? "product" : "character";
      const sheetTemplate =
        subjectKind === "product"
          ? `Product / object reference sheet, single image, split composition. Left half: a large, left-aligned detailed closeup of the item showing material, texture, and craftsmanship. Right half: a multi-angle view of the same item showing four angles in this order — front, right side, left side, and back (or top if the item is rotationally symmetrical). All views on a seamless pure white background, even soft studio lighting, no hands, no people, no props, no shadows beneath the item. Absolutely no text, no labels, no captions, no annotations, no measurements, no watermarks, no logos overlay, no borders, no soft gradients, no color swatches. Photorealistic. ${basePrompt}`
          : `Character reference sheet, single image, split composition. Left half: a large, left-aligned closeup portrait of the character (head and shoulders, outfit visible at the top, neutral expression, looking at camera). Right half: a full-body multi-angle view of the same character showing four poses in this order — front view, right side profile, left side profile, and back view. Consistent identity, wardrobe, hair, and proportions across every view. All views on a seamless pure white background, even soft studio lighting, no harsh shadows under the feet, no extra props beyond what the character wears. Absolutely no text, no labels, no captions, no annotations, no watermarks, no borders, no soft gradients, no color swatches. Photorealistic. ${basePrompt}`;
      prompts = [sheetTemplate];
      shotIndices = [];
    } else {
      const count = Math.min(Math.max(body.count || 1, 1), 9);
      // Without a reference image, treat single_panel as a hero/key frame and
      // append a polish suffix so the model treats it as a finished still
      // rather than a draft.
      const suffix = !hasReference ? HERO_FRAME_SUFFIX : "";
      prompts = Array.from({ length: count }, () => `${lockPrefix}${basePrompt}${suffix}`);
      shotIndices = [];
    }


    const perImage = await priceFor("image_generation", 5);
    const totalCharge = perImage * prompts.length;
    try {
      await chargeCredits({ userId, amount: totalCharge, reason: "image_generation", metadata: { count: prompts.length, mode } });
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientResponse(corsHeaders);
      throw e;
    }

    const runOne = async (p: string, i: number, refs: string[]) => {
      const dataUrl = await generateOne(LOVABLE_API_KEY, p, refs, aspect);
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
      return {
        url: signed.signedUrl,
        storage_path: path,
        shot_index: mode === "storyboard_panels" ? shotIndices[i] : undefined,
      };
    };

    type Settled<T> = { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };


    if (isChain && prompts.length > 1) {
      // Stream NDJSON so the client can show panels as they finish.
      // referenceUrls convention: [subjectSheet?, sceneAnchor, ...extras].
      // If the caller only sent one ref it acts as both sticky + anchor.
      const sticky = referenceUrls[0];
      const sceneAnchor = referenceUrls[1] ?? sticky;
      const extras = referenceUrls.slice(2, 3);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          send({ type: "start", mode, total: prompts.length });
          let prevPanelUrl: string | null = null;
          let okCount = 0;
          for (let i = 0; i < prompts.length; i++) {
            const raw = [
              ...(sticky ? [sticky] : []),
              ...(sceneAnchor && sceneAnchor !== sticky ? [sceneAnchor] : []),
              ...(prevPanelUrl ? [prevPanelUrl] : []),
              ...extras,
            ];
            const refs = Array.from(new Set(raw)).slice(0, 4);
            try {
              const value = await runOne(prompts[i], i, refs);
              okCount++;
              prevPanelUrl = value.url;
              send({ type: "panel", index: i + 1, value });
            } catch (reason: any) {
              console.error("panel error", i + 1, reason);
              send({ type: "panel_error", index: i + 1, error: String(reason?.message || reason) });
            }
          }
          const missing = prompts.length - okCount;
          if (missing > 0) {
            try {
              await refundCredits({ userId, amount: perImage * missing, reason: "image_generation_refund", metadata: { missing } });
            } catch (e) {
              console.error("refund failed", e);
            }
          }
          send({ type: "done", mode, missing });
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "application/x-ndjson" },
      });
    }

    const results: Settled<{ url: string; storage_path: string; shot_index?: number }>[] =
      await Promise.allSettled(prompts.map((p, i) => runOne(p, i, referenceUrls)));

    const out: Array<{ url: string; storage_path: string; shot_index?: number }> = [];
    let firstError: unknown = null;
    for (const r of results) {
      if (r.status === "fulfilled") out.push(r.value);
      else if (!firstError) firstError = r.reason;
    }
    const missing = prompts.length - out.length;
    if (missing > 0) {
      await refundCredits({ userId, amount: perImage * missing, reason: "image_generation_refund", metadata: { missing } });
    }
    if (out.length === 0 && firstError) throw firstError;

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
