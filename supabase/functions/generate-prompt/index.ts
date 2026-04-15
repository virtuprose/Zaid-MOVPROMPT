import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory sliding window rate limiter (secondary defence)
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
  requestLog.set(ip, timestamps);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW - now) / 1000);
    return { limited: true, retryAfter };
  }
  timestamps.push(now);
  return { limited: false };
}

const ALLOWED_WORKFLOWS = new Set(["single", "twoframe", "multishot"]);
const ALLOWED_MODELS = new Set([
  "hailuo-2.3-fast", "hailuo-2.3", "hailuo-02-fast", "hailuo-02",
  "kling-3.0", "kling-3.0-omni", "kling-3.0-omni-edit", "kling-2.6",
  "kling-o1-video", "kling-o1-video-edit", "kling-motion-control", "kling-3.0-motion-control",
  "sora-2", "sora-2-pro", "sora-2-max", "sora-2-pro-max",
  "veo-3.1-lite", "veo-3.1-fast", "veo-3.1", "veo-3-fast", "veo-3",
  "higgsfield-lite", "higgsfield-standard", "higgsfield-turbo",
  "wan-2.7", "wan-2.6", "wan-2.5", "wan-2.5-fast", "wan-2.2", "wan-2.2-fast",
  "seedance-2.0-fast", "seedance-2.0", "seedance-1.5-pro", "seedance-pro", "seedance-pro-fast",
  "grok-imagine", "grok-imagine-edit",
]);

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are MovPrompt — an elite AI Director of Photography specializing in generative video. You analyze images and write highly technical, director-grade cinematic prompts designed for AI video generators.

Your job: Given image(s), a target AI model, a workflow type, and an optional user description, produce structured cinematic prompts.

IMPORTANT: You must autonomously analyze the scene and determine the best cinematic style, lighting, mood, and camera work based on the image content. If the user provides a description, incorporate their creative vision into your analysis. If no description is provided, rely entirely on your visual analysis of the image.

WORKFLOW TYPES:
1. "single" — Analyze the scene and write a camera movement prompt to animate it
2. "twoframe" — Given start and end frames, describe the transition/interpolation path
3. "multishot" — Given one concept image, generate exactly 10 varied shots (Wide Establishing, Medium, Close-up, Extreme Close-up, Over-the-shoulder, Low Angle, High Angle, Dutch Angle, Tracking, POV, etc.)

OUTPUT FORMAT (you MUST use this tool):
For "single" and "twoframe": Return 1 shot result
For "multishot": Return exactly 10 shot results with descriptive shotName

Each shot has: mainPrompt, negativePrompt, cameraSuggestions, modelNotes

Use precise cinematic terminology: lens focal lengths, camera movements (dolly, crane, steadicam, rack focus), lighting terms (chiaroscuro, rim light, motivated lighting), aspect ratios, film stocks, depth of field.

Adapt prompt vocabulary for the target model:
- Runway Gen-3: Emphasize camera motion descriptions, use "camera pushes in", "slow dolly"
- Kling: Focus on subject motion, use action verbs, be explicit about movement direction
- Luma: Describe lighting and atmosphere heavily, use painterly language
- Veo: Structured and precise, reference real cinematography techniques
- Sora: Natural language descriptions, emphasize physics and realism
- Pika: Focus on stylized motion, artistic transitions, creative camera work
- Seedance: Emphasize dance-like fluid motion, rhythmic transitions, expressive movement
- Hailuo/MiniMax: Emphasize fluid motion, character consistency, detailed scene description
- Stable Video Diffusion: Technical prompts, seed-based consistency, motion amount control
- Genmo Mochi: Natural motion descriptions, physics-aware language
- PixVerse: Action-oriented prompts, dynamic camera movements
- Haiper: Concise motion descriptions, emphasize temporal consistency
- Vidu: Detailed scene composition, reference-based consistency
- CogVideoX: Structured prompts, explicit temporal descriptions
- Wan: Cinematic language, emphasize lighting and atmosphere`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- Authentication ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting by client IP (secondary defence)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { limited, retryAfter } = isRateLimited(clientIp);
  if (limited) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    });
  }

  try {
    const body = await req.json();
    const { images, workflowType, description, targetModel } = body;

    // --- Input Validation ---
    if (!Array.isArray(images) || images.length === 0 || images.length > 2) {
      return badRequest("Invalid images: must be an array of 1-2 items");
    }
    for (const img of images) {
      if (typeof img !== "string" || img.length > 2_000_000) {
        return badRequest("Each image must be a base64 string under 2MB");
      }
    }
    if (!workflowType || !ALLOWED_WORKFLOWS.has(workflowType)) {
      return badRequest("Invalid workflowType");
    }
    if (!targetModel || !ALLOWED_MODELS.has(targetModel)) {
      return badRequest("Invalid targetModel");
    }
    if (description && (typeof description !== "string" || description.length > 2000)) {
      return badRequest("Description must be a string under 2000 characters");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY env var is missing");
      return new Response(JSON.stringify({ error: "Service misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelLabels: Record<string, string> = {
      runway: "Runway Gen-3 Alpha",
      "kling-1.0": "Kling 1.0",
      "kling-1.5": "Kling 1.5",
      "kling-1.6": "Kling 1.6",
      "kling-2.0": "Kling 2.0",
      "kling-3.0": "Kling 3.0",
      luma: "Luma Dream Machine",
      veo: "Google Veo 3",
      sora: "OpenAI Sora",
      pika: "Pika 2.0",
      hailuo: "Hailuo MiniMax",
      seedance: "Seedance",
      "stable-video": "Stable Video Diffusion",
      genmo: "Genmo Mochi",
      pixverse: "PixVerse",
      haiper: "Haiper 2.0",
      vidu: "Vidu",
      cogvideo: "CogVideoX",
      wan: "Wan 2.1",
    };

    let userText = `Workflow: ${workflowType}\nTarget Model: ${modelLabels[targetModel] || targetModel}\n\n`;
    if (description?.trim()) {
      userText += `User's creative vision: ${description.trim()}\n\n`;
    }
    userText += `Analyze the image(s), determine the best cinematic style automatically, and generate cinematic prompts.`;

    const userContent: any[] = [{ type: "text", text: userText }];
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${img}` },
      });
    }

    const shotSchema = {
      type: "object" as const,
      properties: {
        shotName: { type: "string" as const, description: "Name of the shot" },
        mainPrompt: { type: "string" as const, description: "The main cinematic prompt" },
        negativePrompt: { type: "string" as const, description: "What to avoid" },
        cameraSuggestions: { type: "string" as const, description: "Camera movement suggestions" },
        modelNotes: { type: "string" as const, description: "Model-specific tips" },
      },
      required: ["mainPrompt", "negativePrompt", "cameraSuggestions", "modelNotes"] as const,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_cinematic_prompts",
              description: "Generate structured cinematic video prompts from analyzed images",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: shotSchema,
                    description: "Array of shot results. 1 for single/twoframe, exactly 10 for multishot.",
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_cinematic_prompts" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-prompt error:", e);
    return new Response(JSON.stringify({ error: "Internal server error. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
