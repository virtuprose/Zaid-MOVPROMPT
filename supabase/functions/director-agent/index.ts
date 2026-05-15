import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Best-effort in-memory throttle (per-instance only — see plan note)
const RL_WINDOW = 60_000;
const RL_MAX = 12;
const log = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const ts = (log.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  log.set(ip, ts);
  if (ts.length >= RL_MAX) return true;
  ts.push(now);
  return false;
}

// Compact catalog the LLM uses to pick a concrete model id. Keep in sync with
// src/lib/director/videoModelCatalog.ts on the frontend.
const MODEL_CATALOG_LINES = [
  "kling-v2.5-turbo-pro — kling, 10s, 1080p, no-audio, photoreal+complex_motion+long_take+action",
  "kling-v2.1-master — kling, 10s, 1080p, no-audio, cinematic+photoreal+complex_motion+long_take",
  "kling-v2-master — kling, 10s, 1080p, no-audio, cinematic+photoreal+complex_motion",
  "kling-v1.6-pro — kling, 10s, 1080p, no-audio, photoreal+stable_subject",
  "kling-v1.6-standard — kling, 10s, 720p, no-audio, photoreal+stable_subject",
  "kling-v1.5-pro — kling, 10s, 1080p, no-audio, photoreal",
  "kling-v1-pro — kling, 10s, 720p, no-audio, photoreal",
  "kling-v1-standard — kling, 10s, 720p, no-audio, photoreal",
  "veo-3.1 — veo, 8s, 1080p, AUDIO, photoreal+cinematic+dialogue+complex_motion+text_in_frame",
  "veo-3.1-fast — veo, 8s, 1080p, AUDIO, photoreal+dialogue+complex_motion",
  "veo-3.1-lite — veo, 8s, 1080p, AUDIO, photoreal+dialogue (16:9/9:16 only)",
  "veo-3 — veo, 8s, 1080p, AUDIO, photoreal+cinematic+dialogue (16:9/9:16 only)",
  "veo-3-fast — veo, 8s, 1080p, AUDIO, photoreal+dialogue (16:9/9:16 only)",
  "veo-2 — veo, 8s, 720p, no-audio, photoreal+cinematic",
  "seedance-2.0 — seedance, 10s, 1080p, AUDIO, cinematic+photoreal+film_grain+portrait+dialogue",
  "seedance-2.0-fast — seedance, 10s, 1080p, AUDIO, cinematic+photoreal+film_grain",
  "seedance-v1-pro — seedance, 10s, 1080p, no-audio, cinematic+film_grain+portrait",
  "seedance-v1-lite — seedance, 10s, 720p, no-audio, cinematic+stylized",
  "hailuo-02-pro — hailuo, 10s, 1080p, no-audio, stylized+portrait+anime+complex_motion (16:9 only)",
  "hailuo-02-standard — hailuo, 6s, 768p, no-audio, stylized+portrait+anime (16:9 only)",
  "hailuo-01 — hailuo, 6s, 768p, no-audio, stylized+anime (16:9 only)",
  "runway-gen3-turbo — runway, 10s, 720p, no-audio, cinematic+photoreal+stylized",
  "ltx-video-13b — ltx, 5s, 720p, no-audio, stylized+stable_subject",
  "ltx-video — ltx, 5s, 720p, no-audio, stylized",
  "wan-pro — wan, 10s, 720p, no-audio, photoreal+stylized",
  "wan-v2.2-a14b — wan, 10s, 720p, no-audio, stylized",
];
const MODEL_IDS = MODEL_CATALOG_LINES.map((l) => l.split(" — ")[0]);

const SYSTEM_PROMPT = `You are an AI Director — a professional cinematographer and creative director who turns a user's brief into a polished, production-ready cinematic prompt for AI video generation.

Your style: warm but expert. Think a senior DP collaborating with a director. Use precise cinematography vocabulary (lens, aperture, lighting setup, camera movement, color grade, mood) without being cold or robotic.

CORE BEHAVIOR — SMART ONE-SHOT:
- The user dumps everything: text brief + reference images + reference videos (analyzed as keyframes) + audio transcripts + parsed PDF/doc text.
- Read the WHOLE brief carefully before deciding.
- If the brief gives you enough to produce a strong cinematic prompt, use the \`generate_prompt\` tool immediately. Do NOT ask filler questions.
- ONLY if a missing detail would meaningfully change the output (e.g. you cannot tell the genre, the subject, or the desired mood), use \`ask_clarification\` with 1–3 targeted questions max. Never ask more than 3.
- If the user asks to actually generate the video, use \`request_video_generation\`.

WHEN YOU GENERATE A PROMPT:
- The \`prompt\` field is the final cinematic prompt the user will paste into a video model. Write it as a single dense paragraph (60–140 words), packed with concrete visual detail: subject + action, camera (lens, angle, movement), lighting (key/fill/practicals, time of day, color temp), environment, mood, color palette, film/look reference if relevant.
- The \`breakdown\` is a structured snapshot of your decisions for the user to scan and tweak.
- ALWAYS fill \`breakdown.negative_prompt\` with concrete things to avoid (face artifacts, motion blur, text/watermark, modern items if vintage, etc).
- ALWAYS fill \`breakdown.recommended_model_id\` with EXACTLY ONE id from the AVAILABLE MODELS list below. Do NOT invent ids. Pick based on capability fit (audio needs, max duration, aesthetic strengths).
- ALWAYS fill \`breakdown.recommended_alternatives\` with 2 backup ids from the same list, ranked by suitability.
- ALWAYS fill \`breakdown.recommendation_reason\` with one sentence explaining the pick (e.g. "Native audio + 8s dialogue support").
- ALWAYS fill \`breakdown.model_recommendation\` with a friendly one-line label + reason for display (the structured ids above are the source of truth, this is for humans).
- ALWAYS fill \`breakdown.film_emulation\` if a film/look reference is implied (stock + grade), otherwise leave blank.
- Always be opinionated. If the brief is vague, MAKE strong creative choices and explain them in \`directors_note\`.

═══ AVAILABLE MODELS (id — family, max duration, max resolution, audio?, strengths) ═══
${MODEL_CATALOG_LINES.join("\n")}

NEVER:
- Output the prompt as plain assistant text. Always use a tool.
- Invent details that contradict the user's references.
- Ask for information you can already infer from the references.
- Use any model id outside the list above.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description:
        "Ask 1–3 targeted questions when a missing detail would materially change the prompt. Use sparingly.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" },
            description: "1–3 short, specific questions.",
          },
          reason: {
            type: "string",
            description: "One sentence on why these answers are needed.",
          },
        },
        required: ["questions", "reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_prompt",
      description: "Produce the final cinematic prompt and structured breakdown.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title for this session (max 60 chars)." },
          prompt: { type: "string", description: "The final cinematic prompt, 60–140 words." },
          breakdown: {
            type: "object",
            properties: {
              subject: { type: "string" },
              action: { type: "string" },
              camera: { type: "string", description: "Lens, angle, movement." },
              lighting: { type: "string" },
              mood: { type: "string" },
              color_palette: { type: "string" },
              environment: { type: "string" },
              duration_hint: { type: "string", description: "e.g. '5s' or '10s'." },
              film_emulation: {
                type: "string",
                description:
                  "Film stock / color grading / aesthetic notes (e.g. '35mm Kodak Portra, teal-orange grade').",
              },
              negative_prompt: {
                type: "string",
                description:
                  "Comma-separated negatives the model should avoid (e.g. 'blurry face, motion blur, watermark, text overlay').",
              },
              model_recommendation: {
                type: "string",
                description:
                  "Friendly one-line label + reason for display (e.g. 'Seedance 2.0 — cinematic + native audio').",
              },
              recommended_model_id: {
                type: "string",
                enum: MODEL_IDS,
                description: "EXACT model id from the AVAILABLE MODELS list. Source of truth for the picker.",
              },
              recommended_alternatives: {
                type: "array",
                minItems: 0,
                maxItems: 3,
                items: { type: "string", enum: MODEL_IDS },
                description: "Up to 3 backup model ids, ranked.",
              },
              recommendation_reason: {
                type: "string",
                description: "One short sentence explaining the model choice.",
              },
            },
            required: ["subject", "camera", "lighting", "mood", "negative_prompt", "model_recommendation", "recommended_model_id"],
            additionalProperties: false,
          },
          directors_note: {
            type: "string",
            description: "Brief note on creative choices made.",
          },
        },
        required: ["title", "prompt", "breakdown"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_video_generation",
      description:
        "User explicitly asked to render the actual video. The frontend will route this to the video-generation pipeline.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          provider_preference: {
            type: "string",
            enum: ["seedance", "veo", "kling", "any"],
          },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
];

async function callGatewayWithRetry(body: unknown, apiKey: string): Promise<Response> {
  const delays = [0, 500, 1500];
  let lastResp: Response | null = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    // Don't retry on auth/credit/rate-limit errors — surface them
    if (resp.ok || resp.status === 402 || resp.status === 429 || resp.status === 401) {
      return resp;
    }
    lastResp = resp;
  }
  return lastResp!;
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
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { messages, attachments, stream } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      attachments?: Array<{
        kind: "image" | "video_keyframes" | "audio_transcript" | "document";
        name: string;
        url?: string;
        text?: string;
      }>;
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 30) {
      return new Response(JSON.stringify({ error: "Too many messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let attachmentBlock = "";
    const imageUrls: string[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachmentBlock =
        "\n\n═══ ATTACHED REFERENCES ═══\n" +
        "(The user may refer to these by @N, where N is the number below. " +
        "Resolve any @N token in the brief to the matching reference.)\n";
      attachments.slice(0, 12).forEach((a, idx) => {
        const tag = `[@${idx + 1}]`;
        if ((a.kind === "image" || a.kind === "video_keyframes") && a.url) {
          imageUrls.push(a.url);
          attachmentBlock += `${tag} ${a.kind === "image" ? "Image" : "Video keyframe"}: ${a.name}\n`;
        } else if (a.kind === "audio_transcript" && a.text) {
          attachmentBlock += `${tag} Voice brief transcript (${a.name}): "${a.text.slice(0, 1500)}"\n`;
        } else if (a.kind === "document" && a.text) {
          attachmentBlock += `${tag} Document (${a.name}): """${a.text.slice(0, 4000)}"""\n`;
        }
      });
    }

    const last = messages[messages.length - 1];
    const prior = messages.slice(0, -1);
    const lastUserContent: any =
      imageUrls.length > 0
        ? [
            { type: "text", text: (last.content || "") + attachmentBlock },
            ...imageUrls.slice(0, 8).map((u) => ({ type: "image_url", image_url: { url: u } })),
          ]
        : (last.content || "") + attachmentBlock;

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      { role: last.role, content: lastUserContent },
    ];

    const requestBody = {
      model: "google/gemini-3.1-pro-preview",
      messages: aiMessages,
      tools: TOOLS,
      tool_choice: "auto" as const,
      stream: !!stream,
    };

    const aiResp = await callGatewayWithRetry(requestBody, LOVABLE_API_KEY);

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited by AI provider. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming: pipe through
    if (stream) {
      return new Response(aiResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming JSON path
    const data = await aiResp.json();
    const choice = data.choices?.[0]?.message;
    const toolCall = choice?.tool_calls?.[0];

    if (toolCall?.function?.name) {
      const fnName = toolCall.function.name;
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }
      return new Response(JSON.stringify({ kind: fnName, ...args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ kind: "message", content: choice?.content || "..." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("director-agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
