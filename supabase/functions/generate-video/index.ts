import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stable model ids ↔ fal.ai endpoints. Keep in sync with
// src/lib/director/videoModels.ts on the frontend.
const FAL_MODELS: Record<string, string> = {
  // Kling v3
  "kling-v3-pro": "fal-ai/kling-video/v3/pro/text-to-video",
  "kling-v3-standard": "fal-ai/kling-video/v3/standard/text-to-video",
  "kling-v3-4k": "fal-ai/kling-video/v3/4k/text-to-video",
  // Kling 3.0 Omni (o3 family)
  "kling-omni": "fal-ai/kling-video/o3/pro/text-to-video",
  "kling-omni-edit": "fal-ai/kling-video/o3/standard/video-to-video/edit",
  "kling-motion-control": "fal-ai/kling-video/v3/standard/motion-control",
  // Kling (legacy)
  "kling-v2.5-turbo-pro": "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
  "kling-v2.1-master": "fal-ai/kling-video/v2.1/master/text-to-video",
  "kling-v2-master": "fal-ai/kling-video/v2/master/text-to-video",
  "kling-v1.6-pro": "fal-ai/kling-video/v1.6/pro/text-to-video",
  "kling-v1.6-standard": "fal-ai/kling-video/v1.6/standard/text-to-video",
  "kling-v1.5-pro": "fal-ai/kling-video/v1.5/pro/text-to-video",
  "kling-v1-pro": "fal-ai/kling-video/v1/pro/text-to-video",
  "kling-v1-standard": "fal-ai/kling-video/v1/standard/text-to-video",
  // Veo
  "veo-3.1": "fal-ai/veo3.1",
  "veo-3.1-fast": "fal-ai/veo3.1/fast",
  "veo-3.1-lite": "fal-ai/veo3.1/lite",
  "veo-3": "fal-ai/veo3",
  "veo-3-fast": "fal-ai/veo3/fast",
  "veo-2": "fal-ai/veo2",
  // Seedance
  "seedance-2.0": "fal-ai/bytedance/seedance-2.0/text-to-video",
  "seedance-2.0-fast": "fal-ai/bytedance/seedance-2.0/fast/text-to-video",
  "seedance-2.0-ref": "fal-ai/bytedance/seedance/v1/pro/reference-to-video",
  "seedance-v1-pro": "fal-ai/bytedance/seedance/v1/pro/text-to-video",
  "seedance-v1-pro-ref": "fal-ai/bytedance/seedance/v1/pro/reference-to-video",
  "seedance-v1-lite": "fal-ai/bytedance/seedance/v1/lite/text-to-video",
  // Hailuo / MiniMax
  "hailuo-02-pro": "fal-ai/minimax/hailuo-02/pro/text-to-video",
  "hailuo-02-standard": "fal-ai/minimax/hailuo-02/standard/text-to-video",
  "hailuo-01": "fal-ai/minimax/video-01",
  // Runway
  "runway-gen3-turbo": "fal-ai/runway-gen3/turbo/text-to-video",
  // LTX
  "ltx-video-13b": "fal-ai/ltx-video-13b-distilled",
  "ltx-video": "fal-ai/ltx-video",
  // Wan
  "wan-pro": "fal-ai/wan-pro/text-to-video",
  "wan-v2.2-a14b": "fal-ai/wan/v2.2-a14b/text-to-video",
  // Legacy aliases (kept so older saved jobs / clients still resolve)
  seedance: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
  veo: "fal-ai/veo3/fast",
  kling: "fal-ai/kling-video/v2/master/text-to-video",
};

// (Pre-flight content moderation moved to the `moderate-image` function,
// which runs at upload time on the reference image itself.)

async function readJsonResponse(resp: Response) {
  const text = await resp.text();
  if (!text.trim()) {
    return { text, data: null as Record<string, any> | null };
  }

  try {
    return { text, data: JSON.parse(text) as Record<string, any> };
  } catch {
    return { text, data: null as Record<string, any> | null };
  }
}

function getLegacyFalUrls(provider: string, model: string, requestId: string) {
  const base = provider.startsWith("kling")
    ? "fal-ai/kling-video"
    : model;

  return {
    statusUrl: `https://queue.fal.run/${base}/requests/${requestId}/status`,
    responseUrl: `https://queue.fal.run/${base}/requests/${requestId}/response`,
  };
}

type VideoOptions = {
  aspect_ratio?: string;
  duration?: number | "auto";
  resolution?: string;
  audio?: boolean;
  cfg_scale?: number;
  prompt_optimizer?: boolean;
};

function buildFalPayload(provider: string, prompt: string, opts: VideoOptions = {}, referenceImages: string[] = []) {
  const payload: Record<string, unknown> = { prompt };
  const family = provider.split("-")[0]; // kling | veo | seedance | hailuo | runway | ltx | wan
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null) payload[k] = v;
  };

  switch (family) {
    case "veo":
      set("aspect_ratio", opts.aspect_ratio);
      if (opts.duration !== undefined) set("duration", `${opts.duration}s`);
      set("resolution", opts.resolution);
      if (opts.audio !== undefined) set("generate_audio", opts.audio);
      break;
    case "kling":
      set("aspect_ratio", opts.aspect_ratio);
      if (opts.duration !== undefined) set("duration", String(opts.duration));
      set("cfg_scale", opts.cfg_scale);
      // Kling v3 + Omni (o3) support native audio via `generate_audio`. Legacy Kling silently ignores it.
      if (
        (provider.startsWith("kling-v3") || provider.startsWith("kling-omni")) &&
        opts.audio !== undefined
      ) {
        set("generate_audio", opts.audio);
      }
      break;
    case "seedance":
      set("aspect_ratio", opts.aspect_ratio);
      // Seedance accepts the string enum "auto" or a numeric second value (sent as string).
      if (opts.duration !== undefined) set("duration", String(opts.duration));
      set("resolution", opts.resolution);
      if (opts.audio !== undefined) set("generate_audio", opts.audio);
      break;
    case "hailuo":
      if (opts.duration !== undefined) set("duration", String(opts.duration));
      set("resolution", opts.resolution);
      if (opts.prompt_optimizer !== undefined) set("prompt_optimizer", opts.prompt_optimizer);
      break;
    case "runway":
      set("aspect_ratio", opts.aspect_ratio);
      if (opts.duration !== undefined) set("duration", String(opts.duration));
      break;
    case "ltx":
      set("aspect_ratio", opts.aspect_ratio);
      break;
    case "wan":
      set("aspect_ratio", opts.aspect_ratio);
      set("resolution", opts.resolution);
      if (typeof opts.duration === "number") set("num_frames", opts.duration === 10 ? 161 : 81);
      break;
  }
  return payload;
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

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const uid = claims.claims.sub as string;

  const FAL_KEY = Deno.env.get("FAL_KEY");
  if (!FAL_KEY) {
    return new Response(JSON.stringify({ error: "Video provider not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (_e) {
      body = {};
    }
    const action = url.searchParams.get("action") || body.action || "submit";

    if (action === "status") {
      const jobId = url.searchParams.get("job_id") || body.job_id;
      if (!jobId) {
        return new Response(JSON.stringify({ error: "job_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: job, error } = await admin
        .from("video_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", uid)
        .maybeSingle();
      if (error || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Already finished — return as-is
      if (job.status === "completed" || job.status === "failed") {
        return new Response(JSON.stringify(job), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Poll fal
      const model = FAL_MODELS[job.provider];
      if (!model || !job.fal_request_id) {
        return new Response(JSON.stringify(job), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const legacyUrls = getLegacyFalUrls(job.provider, model, job.fal_request_id);
      const statusUrl =
        (job as { fal_status_url?: string | null }).fal_status_url ||
        legacyUrls.statusUrl;
      const responseUrl =
        (job as { fal_response_url?: string | null }).fal_response_url ||
        legacyUrls.responseUrl;
      const statusResp = await fetch(
        statusUrl,
        { headers: { Authorization: `Key ${FAL_KEY}` } },
      );
      const statusPayload = await readJsonResponse(statusResp);
      const statusData = statusPayload.data;
      if (!statusResp.ok || !statusData) {
        console.warn("fal status response unreadable", statusResp.status, statusPayload.text);
        return new Response(JSON.stringify({ ...job, status: "processing" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusData.status === "COMPLETED") {
        const resultResp = await fetch(
          responseUrl,
          { headers: { Authorization: `Key ${FAL_KEY}` } },
        );
        const resultPayload = await readJsonResponse(resultResp);
        const result = resultPayload.data;
        if (!resultResp.ok || !result) {
          console.warn("fal result response unreadable", resultResp.status, resultPayload.text);
          return new Response(JSON.stringify({ ...job, status: "processing" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const videoUrl = result.video?.url || result.output?.[0] || result.video_url;
        await admin
          .from("video_jobs")
          .update({
            status: "completed",
            video_url: videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        return new Response(
          JSON.stringify({ ...job, status: "completed", video_url: videoUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (statusData.status === "FAILED" || statusData.status === "ERROR") {
        await admin
          .from("video_jobs")
          .update({
            status: "failed",
            error: statusData.error || "Provider error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        return new Response(
          JSON.stringify({ ...job, status: "failed", error: statusData.error }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ...job, status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Submit new job
    let { prompt, provider = "seedance-v1-pro", session_id, options } = body as {
      prompt?: string;
      provider?: string;
      session_id?: string;
      options?: VideoOptions;
    };

    if ((!prompt || !prompt.trim()) && session_id) {
      const { data: session } = await admin
        .from("director_sessions")
        .select("final_prompt")
        .eq("id", session_id)
        .eq("user_id", uid)
        .maybeSingle();
      prompt = typeof session?.final_prompt === "string" ? session.final_prompt : prompt;
    }

    const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";

    if (!normalizedPrompt || normalizedPrompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Valid prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const model = FAL_MODELS[provider];
    if (!model) {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Create job row
    const { data: job, error: insErr } = await admin
      .from("video_jobs")
      .insert({
        user_id: uid,
        session_id: session_id || null,
        provider,
        prompt: normalizedPrompt,
        status: "queued",
      })
      .select("*")
      .single();
    if (insErr || !job) {
      console.error("insert video_job failed", insErr);
      return new Response(JSON.stringify({ error: "Could not create job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Submit to fal queue
    const submitResp = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFalPayload(provider, normalizedPrompt, options)),
    });
    if (!submitResp.ok) {
      const t = await submitResp.text();
      console.error("fal submit error", submitResp.status, t);
      await admin
        .from("video_jobs")
        .update({ status: "failed", error: `Provider error ${submitResp.status}` })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Provider rejected request" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const submitPayload = await readJsonResponse(submitResp);
    const submitData = submitPayload.data;
    if (!submitData?.request_id) {
      console.error("fal submit response unreadable", submitResp.status, submitPayload.text);
      await admin
        .from("video_jobs")
        .update({ status: "failed", error: "Provider returned an invalid submission response" })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Provider rejected request" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin
      .from("video_jobs")
      .update({
        fal_request_id: submitData.request_id,
        fal_status_url: submitData.status_url ?? null,
        fal_response_url: submitData.response_url ?? null,
        status: "processing",
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({
        ...job,
        fal_request_id: submitData.request_id,
        fal_status_url: submitData.status_url ?? null,
        fal_response_url: submitData.response_url ?? null,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-video error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
