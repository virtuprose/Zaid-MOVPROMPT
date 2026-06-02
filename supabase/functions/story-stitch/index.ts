// story-stitch: concatenate completed act videos into a single MP4 via
// fal.ai's ffmpeg-api compose endpoint. Verifies caller owns the render and
// all 8 acts are completed before stitching.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fal } from "npm:@fal-ai/client";
import {
  chargeCredits,
  refundCredits,
  priceFor,
  InsufficientCreditsError,
  insufficientResponse,
} from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    auth.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

  const FAL_KEY = Deno.env.get("FAL_KEY");
  if (!FAL_KEY) {
    return new Response(JSON.stringify({ error: "Provider not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  fal.config({ credentials: FAL_KEY });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { story_render_id, title, session_id, job_ids, durations } =
      (await req.json()) as {
        story_render_id?: string;
        title?: string;
        session_id?: string;
        job_ids?: string[];
        durations?: number[];
      };

    // Two input modes:
    //   A) story_render_id — original story-render flow (4-act Seedance bundle)
    //   B) job_ids         — generic mode used by the Director orchestrator to
    //                        stitch N already-completed video_jobs into one MP4
    if (!story_render_id && (!Array.isArray(job_ids) || job_ids.length === 0)) {
      return new Response(
        JSON.stringify({ error: "story_render_id or job_ids required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let actRows: Array<{
      id: string;
      status: string | null;
      video_url: string | null;
      act_index: number | null;
      user_id: string;
      provider: string | null;
    }>;
    let perActDurations: number[];

    if (story_render_id) {
      const { data: acts, error: actsErr } = await admin
        .from("video_jobs")
        .select("id, status, video_url, act_index, user_id, provider")
        .eq("story_render_id", story_render_id)
        .eq("user_id", uid)
        .order("act_index", { ascending: true });
      if (actsErr || !acts || acts.length === 0) {
        return new Response(JSON.stringify({ error: "Story render not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actRows = acts.filter((a) => typeof a.act_index === "number");
      if (actRows.length === 0) {
        return new Response(JSON.stringify({ error: "No acts to stitch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      perActDurations = actRows.map(() => 15);
    } else {
      const ids = (job_ids as string[]).filter(
        (id) => typeof id === "string" && id.length > 0,
      );
      const { data: jobs, error: jobsErr } = await admin
        .from("video_jobs")
        .select("id, status, video_url, act_index, user_id, provider")
        .in("id", ids)
        .eq("user_id", uid);
      if (jobsErr || !jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ error: "No matching jobs" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Preserve client-supplied order.
      const byId = new Map(jobs.map((j) => [j.id, j]));
      actRows = ids
        .map((id) => byId.get(id))
        .filter((j): j is NonNullable<typeof j> => !!j);
      perActDurations = ids.map((_, i) => {
        const d = Array.isArray(durations) ? Number(durations[i]) : NaN;
        return Number.isFinite(d) && d > 0 ? Math.round(d) : 10;
      });
    }

    const incomplete = actRows.filter((a) => a.status !== "completed" || !a.video_url);
    if (incomplete.length > 0) {
      return new Response(JSON.stringify({ error: `Cannot stitch — ${incomplete.length} clip(s) not yet complete` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // If a stitched row already exists for this render, return it (idempotent).
    const { data: existing } = await admin
      .from("video_jobs")
      .select("id, video_url, status")
      .eq("story_render_id", story_render_id)
      .eq("user_id", uid)
      .is("act_index", null)
      .eq("provider", "stitch")
      .maybeSingle();
    if (existing?.video_url) {
      return new Response(JSON.stringify({ job_id: existing.id, video_url: existing.video_url, status: existing.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stitchCost = await priceFor("story_stitch", 10);
    try {
      await chargeCredits({
        userId: uid,
        amount: stitchCost,
        reason: "story_stitch",
        metadata: { story_render_id },
      });
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientResponse(corsHeaders);
      throw e;
    }

    // Insert stitched row up front so the client can see it as 'queued' immediately.
    const { data: stitchRow, error: stitchInsErr } = await admin
      .from("video_jobs")
      .insert({
        user_id: uid,
        session_id: session_id || null,
        provider: "stitch",
        prompt: title || "Stitched story",
        status: "processing",
        story_render_id,
      })
      .select("*")
      .single();
    if (stitchInsErr || !stitchRow) {
      await refundCredits({ userId: uid, amount: stitchCost, reason: "story_stitch_refund", metadata: { stage: "insert_failed" } });
      return new Response(JSON.stringify({ error: "Could not create stitch job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // fal-ai/ffmpeg-api/compose accepts a list of tracks with keyframes. For a
    // simple concat we feed each act as a video keyframe with cumulative timestamps.
    // The endpoint stitches them at native resolution and re-encodes one MP4.
    try {
      const sorted = [...actRows].sort((a, b) => (a.act_index ?? 0) - (b.act_index ?? 0));
      // Best-effort concat via fal's ffmpeg-api/compose. Each video occupies a
      // slot on a single video track; cumulative offsets keep the order.
      const PER_ACT_SEC = 15;
      const keyframes = sorted.map((a, i) => ({
        url: a.video_url!,
        timestamp: i * PER_ACT_SEC,
        duration: PER_ACT_SEC,
      }));
      const composeResp = (await fal.subscribe("fal-ai/ffmpeg-api/compose", {
        input: {
          tracks: [
            {
              id: "video-track",
              type: "video",
              keyframes,
            },
            {
              id: "audio-track",
              type: "audio",
              keyframes: sorted.map((a, i) => ({
                url: a.video_url!,
                timestamp: i * PER_ACT_SEC,
                duration: PER_ACT_SEC,
              })),
            },
          ],
        },
      })) as Record<string, any>;
      const stitchedUrl: string | undefined =
        composeResp?.video_url || composeResp?.video?.url || composeResp?.data?.video_url || composeResp?.data?.video?.url;
      if (!stitchedUrl) throw new Error("compose returned no video_url");
      await admin
        .from("video_jobs")
        .update({
          status: "completed",
          video_url: stitchedUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stitchRow.id);
      return new Response(JSON.stringify({ job_id: stitchRow.id, video_url: stitchedUrl, status: "completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      console.error("story-stitch ffmpeg error", e);
      await admin
        .from("video_jobs")
        .update({
          status: "failed",
          error: e?.message || "Stitch failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", stitchRow.id);
      await refundCredits({ userId: uid, amount: stitchCost, reason: "story_stitch_refund", refId: stitchRow.id, metadata: { stage: "compose_failed" } });
      return new Response(JSON.stringify({ error: e?.message || "Stitch failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("story-stitch error", e);
    return new Response(JSON.stringify({ error: e?.message || "Story stitch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
