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
//
// Debug mode (debug: true in body): every validation/auth/ownership/filter
// step is recorded in a `trace` array and returned to the caller. When debug
// is on we ALWAYS return 200 and we NEVER submit renders or mutate the plan
// — the orchestrator becomes a read-only inspector that reports the exact
// short-circuit reason (if any) plus the resolved render targets it would
// have submitted, so the UI can show why no credits were charged.

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

type TraceStep = {
  step: string;
  ok: boolean;
  detail?: string;
  data?: Record<string, unknown>;
  durationMs?: number;
};

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

  const startedAt = Date.now();
  const trace: TraceStep[] = [];
  let debug = false;
  const tick = () => Date.now() - startedAt;
  const record = (s: TraceStep) => {
    trace.push({ durationMs: tick(), ...s });
  };

  // Short-circuit helper: when debug=true the orchestrator never errors out —
  // it always returns 200 with the trace so the UI can show every step.
  const shortCircuit = (
    step: string,
    detail: string,
    status: number,
    extra: Record<string, unknown> = {},
  ) => {
    record({ step, ok: false, detail });
    if (debug) {
      return json(
        {
          dryRun: true,
          shortCircuitedAt: step,
          reason: detail,
          wouldReturnStatus: status,
          creditsCharged: 0,
          trace,
          ...extra,
        },
        200,
      );
    }
    return json({ error: detail, trace }, status);
  };

  // 1. Auth header present
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    record({ step: "auth.header", ok: false, detail: "Missing Bearer token" });
    return json({ error: "Unauthorized", trace }, 401);
  }
  record({ step: "auth.header", ok: true });

  // 2. JWT validation
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) {
    record({ step: "auth.jwt", ok: false, detail: claimsErr?.message ?? "Invalid token" });
    return json({ error: "Unauthorized", trace }, 401);
  }
  const uid = claims.claims.sub as string;
  record({ step: "auth.jwt", ok: true, data: { uid } });

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 3. Body parse
  let body: { sessionId?: string; shotIds?: string[]; debug?: boolean } = {};
  try {
    const txt = await req.text();
    body = txt ? JSON.parse(txt) : {};
  } catch (_e) {
    record({ step: "body.parse", ok: false, detail: "Invalid JSON" });
    return json({ error: "Invalid JSON", trace }, 400);
  }
  debug = body.debug === true;
  record({
    step: "body.parse",
    ok: true,
    data: { hasSessionId: !!body.sessionId, shotIds: body.shotIds ?? null, debug },
  });

  // 4. sessionId required
  const sessionId = body.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return shortCircuit("validate.sessionId", "sessionId required", 400);
  }
  record({ step: "validate.sessionId", ok: true, data: { sessionId } });

  // 5. Session exists
  const { data: session, error: sessErr } = await admin
    .from("director_sessions")
    .select("id, user_id, plan")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr || !session) {
    return shortCircuit(
      "session.lookup",
      sessErr?.message ?? "Session not found",
      404,
    );
  }
  record({ step: "session.lookup", ok: true, data: { sessionId: session.id } });

  // 6. Ownership
  if (session.user_id !== uid) {
    return shortCircuit("session.ownership", "Forbidden", 403, {
      data: { sessionOwner: session.user_id, caller: uid },
    });
  }
  record({ step: "session.ownership", ok: true });

  // 7. Plan has shots
  const plan: DirectorPlan = (session.plan as DirectorPlan | null) ?? { shots: [], globals: {} };
  if (!Array.isArray(plan.shots) || plan.shots.length === 0) {
    return shortCircuit("plan.hasShots", "Plan has no shots", 400, {
      data: { shotCount: 0 },
    });
  }
  record({
    step: "plan.hasShots",
    ok: true,
    data: {
      shotCount: plan.shots.length,
      byStatus: plan.shots.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {}),
    },
  });

  // 8. Resolve renderable targets and report why each shot was excluded.
  const filterIds = Array.isArray(body.shotIds) ? new Set(body.shotIds) : null;
  const excluded: Array<{ shotId: string; reason: string }> = [];
  const targets = plan.shots.filter((s) => {
    if (filterIds && !filterIds.has(s.id)) {
      excluded.push({ shotId: s.id, reason: "not in shotIds filter" });
      return false;
    }
    if (s.status === "rendering" || s.status === "done") {
      excluded.push({ shotId: s.id, reason: `status=${s.status}` });
      return false;
    }
    if (!s.prompt || !s.prompt.trim()) {
      excluded.push({ shotId: s.id, reason: "no prompt" });
      return false;
    }
    if (!s.locked.model) {
      excluded.push({ shotId: s.id, reason: "no locked model" });
      return false;
    }
    return true;
  });
  record({
    step: "filter.renderable",
    ok: targets.length > 0,
    data: {
      eligible: targets.length,
      excluded,
      targets: targets.map((t) => ({
        id: t.id,
        model: t.locked.model,
        durationSec: t.locked.duration_seconds,
      })),
    },
  });

  if (targets.length === 0) {
    return shortCircuit(
      "filter.renderable",
      "No renderable shots (need prompt + model, not already rendering/done)",
      400,
    );
  }

  // Debug mode stops here — we don't submit renders or mutate the plan.
  if (debug) {
    record({
      step: "debug.dryRun",
      ok: true,
      detail: "Would submit renders — stopping (debug mode)",
      data: { wouldSubmit: targets.length },
    });
    return json({
      dryRun: true,
      wouldSubmit: targets.length,
      creditsCharged: 0,
      targets: targets.map((t) => ({
        id: t.id,
        model: t.locked.model,
        durationSec: t.locked.duration_seconds,
      })),
      trace,
    });
  }

  // 9. Submit each shot via generate-video.
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
  record({
    step: "submit.renders",
    ok: results.some((r) => r.ok),
    data: {
      submitted: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
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
  record({ step: "plan.update", ok: !updErr, detail: updErr?.message });

  return json({
    submitted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    trace,
  });
});
