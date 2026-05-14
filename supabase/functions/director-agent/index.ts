import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiter
const RL_WINDOW = 60_000;
const RL_MAX = 8;
const log = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const ts = (log.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  log.set(ip, ts);
  if (ts.length >= RL_MAX) return true;
  ts.push(now);
  return false;
}

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
- ALWAYS fill \`breakdown.model_recommendation\` with one of: Seedance Pro, Veo 3, Kling 2, plus a 4–8 word reason. Pick what genuinely fits the shot.
- ALWAYS fill \`breakdown.film_emulation\` if a film/look reference is implied (stock + grade), otherwise leave blank.
- Always be opinionated. If the brief is vague, MAKE strong creative choices and explain them in \`directors_note\`.

NEVER:
- Output the prompt as plain assistant text. Always use a tool.
- Invent details that contradict the user's references.
- Ask for information you can already infer from the references.`;

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
                description: "Film stock / color grading / aesthetic notes (e.g. '35mm Kodak Portra, teal-orange grade').",
              },
              negative_prompt: {
                type: "string",
                description: "Comma-separated negatives the model should avoid (e.g. 'blurry face, motion blur, watermark, text overlay').",
              },
              model_recommendation: {
                type: "string",
                description: "Single short line: which model fits best and why (e.g. 'Seedance Pro — best for portrait + film grain').",
              },
            },
            required: ["subject", "camera", "lighting", "mood", "negative_prompt", "model_recommendation"],
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
        "User explicitly asked to generate the actual video. Currently returns coming-soon — the seam exists for future integration.",
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
    const { messages, attachments } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      attachments?: Array<{
        kind: "image" | "video_keyframes" | "audio_transcript" | "document";
        name: string;
        url?: string; // public/signed URL for images/keyframes
        text?: string; // transcript / parsed doc text
      }>;
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

    // Build attachment context block
    let attachmentBlock = "";
    const imageUrls: string[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachmentBlock = "\n\n═══ ATTACHED REFERENCES ═══\n";
      for (const a of attachments.slice(0, 12)) {
        if (a.kind === "image" && a.url) {
          imageUrls.push(a.url);
          attachmentBlock += `- Image: ${a.name}\n`;
        } else if (a.kind === "video_keyframes" && a.url) {
          imageUrls.push(a.url);
          attachmentBlock += `- Video keyframe: ${a.name}\n`;
        } else if (a.kind === "audio_transcript" && a.text) {
          attachmentBlock += `- Voice brief transcript (${a.name}): "${a.text.slice(0, 1500)}"\n`;
        } else if (a.kind === "document" && a.text) {
          attachmentBlock += `- Document (${a.name}): """${a.text.slice(0, 4000)}"""\n`;
        }
      }
    }

    // Build multimodal last user message if we have images
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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: aiMessages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      if (fnName === "request_video_generation") {
        return new Response(
          JSON.stringify({
            kind: "video_request",
            status: "coming_soon",
            message:
              "Video generation arrives in a future update. Your prompt is ready to paste into Seedance, Veo, or Kling now.",
            args,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ kind: fnName, ...args }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback to plain text
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
