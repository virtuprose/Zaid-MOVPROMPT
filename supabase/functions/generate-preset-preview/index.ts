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

// Hand-tuned hero prompts (kept verbatim).
const HERO_PROMPTS: Record<string, string> = {
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

const SCENE_HINTS: Record<string, string> = {
  basic: "a lone figure walking down a city street at dusk",
  epic: "a vast canyon at golden hour with sweeping vistas",
  effects: "a dancer in a dark studio with a single key light",
  pulse: "a sports car drifting on a wet street at night",
  mix: "a rain-soaked alley with neon signs and reflective puddles",
};

const CAMERA_GROUPS = new Set(["basic", "epic"]);

function buildDynamicPrompt(opts: {
  label: string;
  description: string;
  bestFor: string;
  groupId: string;
}): string {
  const effectKind = CAMERA_GROUPS.has(opts.groupId) ? "camera move" : "visual effect";
  const sceneHint = SCENE_HINTS[opts.groupId] ?? "a cinematic environment with dramatic lighting";
  return `Cinematic 5-second video that clearly demonstrates a "${opts.label}" ${effectKind}.
The ${effectKind} must be the visible focus of the shot.

Effect description: ${opts.description}
Best used for: ${opts.bestFor}

Scene: ${sceneHint}

Style: 35mm anamorphic, dramatic lighting, shallow depth of field, photoreal, high detail. Subject and framing chosen to make the "${opts.label}" ${effectKind} unmistakable from the first frame.`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ ok: false, error: "Unauthorized", code: "unauth" }, 401) };
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return { error: json({ ok: false, error: "Unauthorized", code: "unauth" }, 401) };
  }
  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdmin) {
    return { error: json({ ok: false, error: "Admin only", code: "forbidden" }, 403) };
  }
  return { userId: userData.user.id };
}

const SLUG_RE = /^[a-z0-9-]+$/;

async function resolvePrompt(
  presetId: string,
  body: Record<string, unknown>,
): Promise<{ prompt: string } | { error: string }> {
  if (HERO_PROMPTS[presetId]) {
    return { prompt: HERO_PROMPTS[presetId] };
  }

  const clientLabel = typeof body.label === "string" ? body.label.trim() : "";
  const clientDesc = typeof body.description === "string" ? body.description.trim() : "";
  const clientBest = typeof body.bestFor === "string" ? body.bestFor.trim() : "";
  const clientGroup = typeof body.groupId === "string" ? body.groupId.trim() : "";

  if (clientLabel && clientDesc) {
    return {
      prompt: buildDynamicPrompt({
        label: clientLabel,
        description: clientDesc,
        bestFor: clientBest || clientLabel,
        groupId: clientGroup || "effects",
      }),
    };
  }

  // DB fallback for custom presets
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from("custom_presets")
    .select("label, description, best_for, group_id")
    .eq("id", presetId)
    .maybeSingle();
  if (error) return { error: `DB lookup failed: ${error.message}` };
  if (!data) return { error: `Unknown presetId: ${presetId}` };
  if (!data.label || !data.description) {
    return { error: `Preset "${presetId}" missing label/description` };
  }
  return {
    prompt: buildDynamicPrompt({
      label: data.label,
      description: data.description,
      bestFor: data.best_for || data.label,
      groupId: data.group_id || "effects",
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FAL_KEY) {
      return json({ ok: false, error: "FAL_KEY not configured", code: "no_key" }, 500);
    }

    const auth = await authAdmin(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "submit");

    // === SUBMIT ===
    if (action === "submit") {
      const presetId = String(body?.presetId ?? "");
      if (!SLUG_RE.test(presetId)) {
        return json({ ok: false, error: `Invalid presetId: ${presetId}`, code: "bad_input" }, 400);
      }

      const resolved = await resolvePrompt(presetId, body);
      if ("error" in resolved) {
        return json({ ok: false, error: resolved.error, code: "bad_input" }, 400);
      }

      const submitRes = await fetch(FAL_SUBMIT_URL, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: resolved.prompt,
          duration: "5",
          aspect_ratio: "16:9",
        }),
      });
      if (submitRes.status === 401) {
        return json({ ok: false, error: "Invalid FAL_KEY", code: "fal_unauth" }, 502);
      }
      if (submitRes.status === 402) {
        return json({ ok: false, error: "Fal.ai credits exhausted", code: "no_credits" }, 402);
      }
      if (submitRes.status === 429) {
        return json({ ok: false, error: "Fal.ai rate limit hit", code: "rate_limit" }, 429);
      }
      if (!submitRes.ok) {
        const text = await submitRes.text();
        return json({ ok: false, error: `Fal submit failed (${submitRes.status}): ${text}`, code: "fal_error" }, 502);
      }
      const submit = await submitRes.json();
      return json({
        ok: true,
        requestId: submit.request_id,
        statusUrl: submit.status_url,
        responseUrl: submit.response_url,
      });
    }

    // === POLL ===
    if (action === "poll") {
      const presetId = String(body?.presetId ?? "");
      const statusUrl = String(body?.statusUrl ?? "");
      const responseUrl = String(body?.responseUrl ?? "");
      if (!SLUG_RE.test(presetId) || !statusUrl || !responseUrl) {
        return json({ ok: false, error: "Missing fields", code: "bad_input" }, 400);
      }

      const statusRes = await fetch(statusUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!statusRes.ok) {
        const text = await statusRes.text();
        return json({ ok: false, error: `Status check failed (${statusRes.status}): ${text}`, code: "fal_error" }, 502);
      }
      const statusData = await statusRes.json();

      if (statusData.status === "FAILED" || statusData.status === "ERROR") {
        return json({ ok: false, error: `Fal job failed: ${JSON.stringify(statusData)}`, code: "fal_error" }, 502);
      }
      if (statusData.status !== "COMPLETED") {
        return json({ ok: true, status: "pending", falStatus: statusData.status });
      }

      const finalRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!finalRes.ok) {
        return json({ ok: false, error: `Result fetch failed (${finalRes.status})`, code: "fal_error" }, 502);
      }
      const result = await finalRes.json();
      const videoUrl = result?.video?.url;
      if (!videoUrl) {
        return json({ ok: false, error: "Fal result missing video.url", code: "fal_error" }, 502);
      }

      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        return json({ ok: false, error: `Video download failed (${videoRes.status})`, code: "download" }, 502);
      }
      const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const path = `${presetId}.mp4`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, videoBytes, {
        upsert: true,
        contentType: "video/mp4",
        cacheControl: "3600",
      });
      if (upErr) {
        return json({ ok: false, error: `Upload failed: ${upErr.message}`, code: "upload" }, 500);
      }
      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
      return json({
        ok: true,
        status: "done",
        presetId,
        sizeBytes: videoBytes.byteLength,
        publicUrl: pub.publicUrl,
      });
    }

    return json({ ok: false, error: `Unknown action: ${action}`, code: "bad_input" }, 400);
  } catch (e) {
    console.error("generate-preset-preview error", e);
    return json({ ok: false, error: (e as Error).message, code: "internal" }, 500);
  }
});
