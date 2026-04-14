import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are MovPrompt — an elite AI Director of Photography specializing in generative video. You analyze images and write highly technical, director-grade cinematic prompts designed for AI video generators.

Your job: Given image(s), a cinematic style, a target AI model, and a workflow type, produce structured cinematic prompts.

WORKFLOW TYPES:
1. "single" — Analyze the scene and write a camera movement prompt to animate it
2. "twoframe" — Given start and end frames, describe the transition/interpolation path
3. "multishot" — Given one concept image, generate 3-5 varied shots (Wide, Medium, Close-up, etc.)

OUTPUT FORMAT (you MUST use this tool):
For "single" and "twoframe": Return 1 shot result
For "multishot": Return 3-5 shot results with descriptive shotName

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

  try {
    const { images, workflowType, style, targetModel } = await req.json();

    if (!images?.length || !workflowType || !style || !targetModel) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const modelLabels: Record<string, string> = {
      runway: "Runway Gen-3 Alpha",
      kling: "Kling 1.5",
      luma: "Luma Dream Machine",
      veo: "Google Veo 2",
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

    const userContent: any[] = [
      {
        type: "text",
        text: `Workflow: ${workflowType}\nCinematic Style: ${style}\nTarget Model: ${modelLabels[targetModel] || targetModel}\n\nAnalyze the image(s) and generate cinematic prompts.`,
      },
    ];

    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${img}` },
      });
    }

    const shotSchema = {
      type: "object" as const,
      properties: {
        shotName: { type: "string" as const, description: "Name of the shot, e.g. 'Wide Establishing Shot'" },
        mainPrompt: { type: "string" as const, description: "The main cinematic prompt for AI video generation" },
        negativePrompt: { type: "string" as const, description: "What to avoid in the generation" },
        cameraSuggestions: { type: "string" as const, description: "Camera movement, lens, angle suggestions" },
        modelNotes: { type: "string" as const, description: "Model-specific tips and settings" },
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
        model: "google/gemini-2.5-flash",
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
                    description: "Array of shot results. 1 for single/twoframe, 3-5 for multishot.",
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
