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
  // Kling
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
  "seedance-v1-pro": "fal-ai/bytedance/seedance/v1/pro/text-to-video",
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
      const statusUrl =
        (job as { fal_status_url?: string | null }).fal_status_url ||
        `https://queue.fal.run/${model}/requests/${job.fal_request_id}/status`;
      const responseUrl =
        (job as { fal_response_url?: string | null }).fal_response_url ||
        `https://queue.fal.run/${model}/requests/${job.fal_request_id}/response`;
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
    let { prompt, provider = "seedance-v1-pro", session_id } = body as {
      prompt?: string;
      provider?: string;
      session_id?: string;
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
      body: JSON.stringify({ prompt: normalizedPrompt }),
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
