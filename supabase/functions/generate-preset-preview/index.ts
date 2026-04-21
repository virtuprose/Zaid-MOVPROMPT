import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "preset-previews";
const FAL_SUBMIT_URL =
  "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";

// Hand-tuned cinematic prompts for the 12 hero presets.
const PROMPTS: Record<string, string> = {
  "dolly-zoom":
    "Vertigo dolly zoom on a lone figure standing on a foggy cliff at sunset, background dramatically compresses while subject stays the same size, cinematic 35mm film, golden hour rim light, shallow depth of field",
  "bullet-time":
    "Camera orbits 180 degrees around a figure frozen mid-jump in a rainy alley at night, water droplets suspended in the air, neon reflections, Matrix-style time freeze, cinematic",
  "orbit-360":
    "Smooth 360 degree orbit around a vintage motorcycle parked in a desert at golden hour, dust particles in the air, cinematic camera move, anamorphic lens",
  "crash-zoom-in":
    "Aggressive crash zoom into the eye of a determined warrior, dramatic lighting, shallow focus rack to extreme close up, cinematic action film",
  "whip-pan-right":
    "Fast whip pan right across a bustling Tokyo street at night, neon signs streaking, motion blur, transitioning into a quiet alley, cinematic",
  "fpv-drone":
    "FPV drone shot diving down a mountain ski slope, weaving between pine trees, snow spraying, fast forward motion, GoPro style, cinematic",
  "levitation":
    "A figure in flowing robes slowly levitating off the ground in a misty forest at dawn, dust and leaves swirling upward, magical realism, cinematic",
  "explosion":
    "Slow motion explosion of a fireball in the desert at dusk, debris flying outward, shockwave rippling, anamorphic lens flare, cinematic Michael Bay style",
  "disintegration":
    "A figure slowly disintegrating into glowing particles that drift upward against a dark blue twilight sky, Marvel-style snap effect, cinematic",
  "glitch":
    "Cyberpunk portrait with heavy digital glitch artifacts, RGB channel splits, scan lines, datamoshing, neon magenta and cyan lighting, cinematic",
  "lightning":
    "Lightning strikes a stormy mountain peak at night, dramatic flashes illuminate the jagged rocks, heavy rain, slow motion, cinematic",
  "mix-bullet-slow":
    "Slow motion orbit around a figure firing a pistol, shell casing tumbling through air, smoke trail, golden hour backlight, cinematic action",
};

const ALLOWED_IDS = Object.keys(PROMPTS);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pollFal(statusUrl: string, responseUrl: string): Promise<any> {
  const deadline = Date.now() + 130_000; // 130s budget
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fal status check failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    if (data.status === "COMPLETED") {
      const finalRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!finalRes.ok) {
        throw new Error(`Fal response fetch failed (${finalRes.status})`);
      }
      return await finalRes.json();
    }
    if (data.status === "FAILED" || data.status === "ERROR") {
      throw new Error(`Fal job failed: ${JSON.stringify(data)}`);
    }
  }
  throw new Error("Fal job timed out after 130s");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FAL_KEY) {
      return json({ ok: false, error: "FAL_KEY not configured", code: "no_key" }, 500);
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized", code: "unauth" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ ok: false, error: "Unauthorized", code: "unauth" }, 401);
    }
    const userId = userData.user.id;

    // Admin check
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ ok: false, error: "Admin only", code: "forbidden" }, 403);
    }

    // Input
    const body = await req.json().catch(() => ({}));
    const presetId = String(body?.presetId ?? "");
    if (!ALLOWED_IDS.includes(presetId)) {
      return json(
        { ok: false, error: `Unknown presetId: ${presetId}`, code: "bad_input" },
        400,
      );
    }

    const prompt = PROMPTS[presetId];

    // Submit Fal job
    const submitRes = await fetch(FAL_SUBMIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        duration: "5",
        aspect_ratio: "16:9",
      }),
    });

    if (submitRes.status === 401) {
      return json({ ok: false, error: "Invalid FAL_KEY", code: "fal_unauth" }, 502);
    }
    if (submitRes.status === 402) {
      return json(
        { ok: false, error: "Fal.ai credits exhausted", code: "no_credits" },
        402,
      );
    }
    if (submitRes.status === 429) {
      return json(
        { ok: false, error: "Fal.ai rate limit hit", code: "rate_limit" },
        429,
      );
    }
    if (!submitRes.ok) {
      const text = await submitRes.text();
      return json(
        { ok: false, error: `Fal submit failed (${submitRes.status}): ${text}`, code: "fal_error" },
        502,
      );
    }

    const submit = await submitRes.json();
    const statusUrl = submit.status_url;
    const responseUrl = submit.response_url;
    if (!statusUrl || !responseUrl) {
      return json(
        { ok: false, error: "Fal response missing URLs", code: "fal_error" },
        502,
      );
    }

    // Poll
    let result: any;
    try {
      result = await pollFal(statusUrl, responseUrl);
    } catch (e) {
      return json(
        { ok: false, error: (e as Error).message, code: "fal_poll" },
        504,
      );
    }

    const videoUrl = result?.video?.url;
    if (!videoUrl) {
      return json(
        { ok: false, error: "Fal result missing video.url", code: "fal_error" },
        502,
      );
    }

    // Download video bytes
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return json(
        { ok: false, error: `Video download failed (${videoRes.status})`, code: "download" },
        502,
      );
    }
    const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

    // Upload to bucket
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const path = `${presetId}.mp4`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, videoBytes, {
      upsert: true,
      contentType: "video/mp4",
      cacheControl: "3600",
    });
    if (upErr) {
      return json(
        { ok: false, error: `Upload failed: ${upErr.message}`, code: "upload" },
        500,
      );
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);

    return json({
      ok: true,
      presetId,
      sizeBytes: videoBytes.byteLength,
      publicUrl: pub.publicUrl,
    });
  } catch (e) {
    console.error("generate-preset-preview error", e);
    return json(
      { ok: false, error: (e as Error).message, code: "internal" },
      500,
    );
  }
});
