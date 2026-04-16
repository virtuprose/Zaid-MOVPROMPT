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
  "any",
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

const SYSTEM_PROMPT = `You are MovPrompt — an elite AI Director of Photography specializing in generative video. You analyze images with surgical precision and write highly technical, director-grade cinematic prompts designed for AI video generators.

═══ SCENE DECOMPOSITION PROTOCOL ═══
Before writing ANY prompt, you MUST systematically analyze every image through these layers:

1. FOREGROUND/SUBJECT: Identify the primary subject — pose, expression, body language, clothing/material textures, skin tones, hair movement potential. Note any props or objects in hand.
2. MIDGROUND/ENVIRONMENT: Describe the immediate surroundings — furniture, architecture, vegetation, other characters, spatial depth between subject and background.
3. BACKGROUND/ATMOSPHERE: Distant elements — sky condition, horizon line, architectural depth, environmental particles (fog, dust, rain), volumetric elements.
4. LIGHTING ANALYSIS: Direction (front/side/back/overhead/under), quality (hard/soft/diffused), color temperature (warm/cool/mixed), contrast ratio, existing shadows, motivated vs unmotivated sources. Identify if golden hour, blue hour, overcast, artificial, mixed.
5. COLOR PALETTE & MOOD: Dominant and accent colors, saturation level, overall tonal range (high-key/low-key/mid-key). Emotional tone the palette conveys.

Use this analysis to inform EVERY field of your output. The prompt must feel like it was written by someone who deeply studied the frame.

═══ WORKFLOW TYPES ═══
1. "single" — Analyze the scene and write a camera movement prompt to animate it. Focus on bringing the still frame to life with motivated camera work and subtle environmental motion.
2. "twoframe" — Given start and end frames, describe the transition/interpolation path. Analyze BOTH frames, identify what changes between them, and describe a smooth cinematic transition that connects them.
3. "multishot" — Given one concept image, generate exactly 10 varied shots covering: Wide Establishing, Medium Shot, Close-up, Extreme Close-up, Over-the-shoulder, Low Angle, High Angle, Dutch Angle, Tracking Shot, POV. Each must feel like a different camera setup on the same scene.

═══ MODEL-SPECIFIC PROMPT SYNTAX ═══

ANY MODEL (universal):
- Write a well-rounded, model-agnostic cinematic prompt
- Focus on clear scene description, precise camera movement, lighting, and mood
- Use universally understood cinematography language
- 150-250 words optimal

KLING (all variants):
- START with subject performing an action verb: "A woman turns her head slowly..."
- Use [camera:pan_left], [camera:dolly_in], [camera:crane_up] bracketed notation for camera moves
- Be explicit about movement direction and speed: "gradually", "sudden", "continuous"
- Keep under 200 words. Kling responds best to concise, action-driven prompts
- Motion Control variants: Describe camera path as waypoints — "Camera starts at eye level, rises to 45° overhead while tracking subject"
- Edit variants: Describe the transformation desired, not the full scene

HAILUO / MINIMAX (all variants):
- Lead with ENVIRONMENT, then introduce subject: "In a dimly lit cathedral, shafts of golden light pierce stained glass as a figure..."
- Describe motion as continuous flow — avoid choppy cuts in language
- Emphasize character consistency and facial detail preservation
- 150-300 words optimal. Hailuo handles longer, more descriptive prompts well
- 02 models: Can reference higher resolution details and longer duration actions

SORA (OpenAI, all variants):
- Write as a natural prose PARAGRAPH — avoid bullet points or structured formatting
- Emphasize physical plausibility: gravity, momentum, material physics
- Describe cause-and-effect motion: "As the wind picks up, the curtain billows, casting shifting shadows across..."
- Reference real-world physics: "The coffee steams in the cold air, the vapor curling upward..."
- Pro/Max: Can handle more complex multi-element scenes

VEO (Google, all variants):
- Use structured format: SCENE → ACTION → CAMERA → LIGHTING
- Reference real film techniques by name: "Kubrick one-point perspective", "Malick magic hour", "Deakins natural light"
- Be precise about lens: "35mm anamorphic", "85mm f/1.4 shallow DOF"
- 3.1 models: Emphasize temporal consistency — describe sustained motion rather than cuts
- Lite/Fast: Keep prompts shorter (100-150 words) for best results

HIGGSFIELD:
- Short-form focused — keep prompts concise (80-120 words)
- Focus on a single clear motion or transformation
- Emphasize expressive human motion and gesture
- Turbo: Ultra-concise (50-80 words)

WAN (Alibaba, all variants):
- Cinematic language with emphasis on LIGHTING and ATMOSPHERE
- Describe light interaction with materials: "Soft rim light catches the edge of silk fabric..."
- Layer atmospheric depth: haze, volumetric light, particle effects
- Higher versions (2.7): Handle complex multi-subject scenes better

SEEDANCE (ByteDance, all variants):
- Emphasize fluid, rhythmic motion — describe movement with musicality
- "Flowing", "undulating", "pulsing" — motion should feel choreographed
- Excellent for fashion, dance, and expressive human movement
- 2.0 models: Better at complex multi-person choreography

GROK (xAI):
- Creative and stylized — lean into artistic expression
- Can handle more abstract/surreal descriptions
- Edit variant: Describe the specific transformation, reference the original image elements to preserve

═══ NEGATIVE PROMPT GUIDANCE ═══
Always include these universal negatives: "morphing, distortion, blurry, watermark, text overlay, frame jumping, flickering, jittering"
Add model-specific negatives:
- Kling: "static camera when movement requested, frozen expression, puppet-like motion"
- Hailuo: "face deformation, identity shift, temporal inconsistency"
- Sora: "physically impossible motion, clipping through objects, gravity defying without intent"
- Veo: "temporal artifacts, scene drift, sudden lighting change"
- Wan: "washed out lighting, flat composition, loss of atmospheric depth"
- Seedance: "jerky motion, broken joints, unnatural body proportions"
- For ALL: "extra fingers, extra limbs, deformed hands, duplicate subjects"

═══ ASPECT RATIO & DURATION REFERENCE ═══
Use this to inform your suggestedAspectRatio and suggestedDuration:
- Landscape scenes, establishing shots, cinematic → 16:9
- Portrait subjects, social media, vertical content → 9:16
- Balanced compositions, product shots → 1:1
- Duration: Simple camera moves → 5s. Complex actions/transitions → 10s. Multi-element scenes → 10s.

═══ FEW-SHOT EXAMPLES ═══

SINGLE FRAME EXAMPLE (for a moody portrait in warm light):
mainPrompt: "A young woman sits in a velvet armchair beside a rain-streaked window, warm tungsten lamplight painting amber highlights across her cheekbones while cool blue ambient light from the overcast sky fills the shadows. She slowly turns her gaze from the window toward camera, a faint melancholic smile forming. Shallow depth of field — the rain droplets on glass behind her dissolve into soft bokeh circles. A slow dolly-in from medium shot to medium close-up, 85mm lens, f/1.8. The curtain beside her sways gently in a draft."
negativePrompt: "morphing, distortion, blurry, watermark, text overlay, frame jumping, flickering, static expression, puppet-like motion, extra fingers"
cameraSuggestions: "Slow dolly in (medium to MCU), 85mm f/1.8, shallow DOF. Optional: subtle rack focus from rain on window to subject's eyes at the midpoint."
modelNotes: "Prioritize skin tone accuracy and subtle facial micro-expressions. The rain bokeh should shimmer naturally."
suggestedAspectRatio: "16:9"
suggestedDuration: "5s"

TWO-FRAME EXAMPLE:
mainPrompt: "Transition from a wide establishing shot of an empty cobblestone street at dawn to a bustling market scene at golden hour. The camera holds position as time compresses — shadows sweep across the pavement, vendors materialize setting up stalls, morning mist dissolves into warm golden particles. Flowers unfurl in a vendor's bucket. The color temperature shifts from cool blue dawn to rich amber afternoon."
negativePrompt: "jump cuts, flickering, temporal inconsistency, sudden lighting shifts, ghosting artifacts, morphing faces"
cameraSuggestions: "Locked-off wide shot, 24mm lens. The magic is in the time-lapse compression, not camera movement. Steady tripod feel."
modelNotes: "This requires strong temporal consistency. The transition should feel like natural time-lapse, not morphing."
suggestedAspectRatio: "16:9"
suggestedDuration: "10s"

OUTPUT FORMAT:
For "single" and "twoframe": Return 1 shot result
For "multishot": Return exactly 10 shot results with descriptive shotName

Each shot MUST include: shotName, mainPrompt, negativePrompt, cameraSuggestions, modelNotes, suggestedAspectRatio, suggestedDuration

Use precise cinematic terminology: lens focal lengths, camera movements (dolly, crane, steadicam, rack focus), lighting terms (chiaroscuro, rim light, motivated lighting), film stocks, depth of field.`;

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
    const { images, workflowType, description, targetModel, sceneBreakdown } = body;

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
      "any": "Any Model (Universal)",
      "hailuo-2.3-fast": "Minimax Hailuo 2.3 Fast",
      "hailuo-2.3": "Minimax Hailuo 2.3",
      "hailuo-02-fast": "Minimax Hailuo 02 Fast",
      "hailuo-02": "Minimax Hailuo 02",
      "kling-3.0": "Kling 3.0",
      "kling-3.0-omni": "Kling 3.0 Omni",
      "kling-3.0-omni-edit": "Kling 3.0 Omni Edit",
      "kling-2.6": "Kling 2.6",
      "kling-o1-video": "Kling O1 Video",
      "kling-o1-video-edit": "Kling O1 Video Edit",
      "kling-motion-control": "Kling Motion Control",
      "kling-3.0-motion-control": "Kling 3.0 Motion Control",
      "sora-2": "OpenAI Sora 2",
      "sora-2-pro": "OpenAI Sora 2 Pro",
      "sora-2-max": "OpenAI Sora 2 Max",
      "sora-2-pro-max": "OpenAI Sora 2 Pro Max",
      "veo-3.1-lite": "Google Veo 3.1 Lite",
      "veo-3.1-fast": "Google Veo 3.1 Fast",
      "veo-3.1": "Google Veo 3.1",
      "veo-3-fast": "Google Veo 3 Fast",
      "veo-3": "Google Veo 3",
      "higgsfield-lite": "Higgsfield Lite",
      "higgsfield-standard": "Higgsfield Standard",
      "higgsfield-turbo": "Higgsfield Turbo",
      "wan-2.7": "Wan 2.7",
      "wan-2.6": "Wan 2.6",
      "wan-2.5": "Wan 2.5",
      "wan-2.5-fast": "Wan 2.5 Fast",
      "wan-2.2": "Wan 2.2",
      "wan-2.2-fast": "Wan 2.2 Fast",
      "seedance-2.0-fast": "Seedance 2.0 Fast",
      "seedance-2.0": "Seedance 2.0",
      "seedance-1.5-pro": "Seedance 1.5 Pro",
      "seedance-pro": "Seedance Pro",
      "seedance-pro-fast": "Seedance Pro Fast",
      "grok-imagine": "Grok Imagine",
      "grok-imagine-edit": "Grok Imagine Edit",
    };

    let userText = `Workflow: ${workflowType}\nTarget Model: ${modelLabels[targetModel] || targetModel}\n\n`;
    if (description?.trim()) {
      userText += `User's creative vision: ${description.trim()}\n\n`;
    }
    // Inject scene breakdown if provided by user
    if (Array.isArray(sceneBreakdown) && sceneBreakdown.length > 0) {
      userText += `Scene Breakdown (user-directed):\n`;
      for (const el of sceneBreakdown) {
        const actionLabel = el.action === "lock" ? "LOCK (keep static)" : "MOVE (animate)";
        userText += `- ${el.category}: "${el.description}" → ${actionLabel}`;
        if (el.note?.trim()) userText += ` | Note: "${el.note.trim()}"`;
        userText += `\n`;
      }
      userText += `\nRespect the user's lock/move directions precisely. Locked elements should remain static. Move elements should be animated.\n\n`;
    }

    userText += `Analyze the image(s) using the Scene Decomposition Protocol, then generate cinematic prompts optimized for the target model.`;

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
        mainPrompt: { type: "string" as const, description: "The main cinematic prompt optimized for the target model's syntax" },
        negativePrompt: { type: "string" as const, description: "What to avoid, including model-specific negatives" },
        cameraSuggestions: { type: "string" as const, description: "Camera movement and lens suggestions" },
        modelNotes: { type: "string" as const, description: "Model-specific tips and settings" },
        suggestedAspectRatio: { type: "string" as const, description: "Recommended aspect ratio: 16:9, 9:16, or 1:1" },
        suggestedDuration: { type: "string" as const, description: "Recommended clip duration: 5s or 10s" },
      },
      required: ["mainPrompt", "negativePrompt", "cameraSuggestions", "modelNotes", "suggestedAspectRatio", "suggestedDuration"] as const,
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
