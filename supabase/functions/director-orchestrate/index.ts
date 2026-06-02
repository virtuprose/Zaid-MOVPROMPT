// Stage 3: Director → Orchestrator executor loop.
//
// Given a director_sessions.id, walks the session's plan.shots and submits a
// video render for every shot that has a prompt and is in a renderable state.
// Renders are submitted in parallel with bounded concurrency, by delegating
// to the existing `generate-video` edge function (which already handles
// credits, FAL submission, and video_jobs persistence).
//
// The orchestrator does NOT poll for completion — clients reconcile finished
// video_jobs back into the plan via realtime/polling on video_jobs. This
// keeps the function call short and the per-shot status flow consistent
// with single-shot Director renders.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONCURRENCY = 2;

type ShotStatus = "draft" | "ready" | "rendering" | "done" | "failed";

interface PlannedShot {
  id: string;
  intent: string;
  hints?: string;
  status: ShotStatus;
  prompt?: string;
  outputUrl?: string;
  error?: string;
  locked: {
    duration_seconds?: number;
    aspect_ratio?: string;
    audio?: "on" | "off" | "music_only" | "sfx_only";
    model?: string;
    resolution?: string;
    model_user_override?: boolean;
  };
  metadata?: { video_job_id?: string } & Record<string, unknown>;
}

interface DirectorPlan {
  shots: PlannedShot[];
  globals: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
  const uid = claims.claims.sub as string;

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: { sessionId?: string; shotIds?: string[] } = {};
  try {
    const txt = await req.text();
    body = txt ? JSON.parse(txt) : {};
  } catch (_e) {
    return json({ error: "Invalid JSON" }, 400);
  }
  const sessionId = body.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return json({ error: "sessionId required" }, 400);
  }

  const { data: session, error: sessErr } = await admin
    .from("director_sessions")
    .select("id, user_id, plan")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr || !session) return json({ error: "Session not found" }, 404);
  if (session.user_id !== uid) return json({ error: "Forbidden" }, 403);

  const plan: DirectorPlan = (session.plan as DirectorPlan | null) ?? { shots: [], globals: {} };
  if (!Array.isArray(plan.shots) || plan.shots.length === 0) {
    return json({ error: "Plan has no shots" }, 400);
  }

  // Eligible: not already rendering or done, has a prompt and a routed model.
  const filterIds = Array.isArray(body.shotIds) ? new Set(body.shotIds) : null;
  const targets = plan.shots.filter((s) => {
    if (filterIds && !filterIds.has(s.id)) return false;
    if (s.status === "rendering" || s.status === "done") return false;
    if (!s.prompt || !s.prompt.trim()) return false;
    if (!s.locked.model) return false;
    return true;
  });

  if (targets.length === 0) {
    return json({ error: "No renderable shots (need prompt + model, not already rendering/done)" }, 400);
  }

  // Submit each shot via generate-video. We call it as an HTTP endpoint and
  // forward the user's Authorization so credits/RLS are scoped correctly.
  const genVideoUrl = `${SUPABASE_URL}/functions/v1/generate-video`;
  const results = await withConcurrency(targets, CONCURRENCY, async (shot) => {
    try {
      const resp = await fetch(genVideoUrl, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: shot.prompt,
          provider: shot.locked.model,
          session_id: sessionId,
          options: {
            aspect_ratio: shot.locked.aspect_ratio,
            duration: shot.locked.duration_seconds,
            resolution: shot.locked.resolution,
            audio: shot.locked.audio === "on",
          },
          metadata: { director_shot_id: shot.id, orchestrator: true },
        }),
      });
      const text = await resp.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_e) {
        data = null;
      }
      if (!resp.ok) {
        return {
          shotId: shot.id,
          ok: false as const,
          error:
            (data && typeof data.error === "string" ? data.error : null) ||
            `generate-video ${resp.status}`,
        };
      }
      const jobId = typeof data?.id === "string" ? (data!.id as string) : null;
      return { shotId: shot.id, ok: true as const, jobId };
    } catch (e) {
      return {
        shotId: shot.id,
        ok: false as const,
        error: e instanceof Error ? e.message : "submit failed",
      };
    }
  });

  // Patch the plan with rendering / failed status + linked job ids.
  const updatedShots = plan.shots.map((s) => {
    const r = results.find((x) => x.shotId === s.id);
    if (!r) return s;
    if (r.ok) {
      return {
        ...s,
        status: "rendering" as ShotStatus,
        error: undefined,
        metadata: { ...(s.metadata ?? {}), video_job_id: r.jobId ?? undefined },
      };
    }
    return { ...s, status: "failed" as ShotStatus, error: r.error };
  });

  const { error: updErr } = await admin
    .from("director_sessions")
    .update({ plan: { ...plan, shots: updatedShots }, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (updErr) console.error("director-orchestrate plan update failed", updErr);

  return json({
    submitted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
});
