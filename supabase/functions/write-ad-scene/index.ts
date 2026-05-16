// Lovable AI: turn a user's Format + Hook + Setting picks (plus optional
// product/avatar/location context) into a ready-to-shoot, 2–4 sentence
// scene description for the Marketing Studio describe box.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter (per-IP).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

const SYSTEM_PROMPT = `You are a video ad director. Given a Format, Hook, Setting and optional product/avatar/location context, write a single ready-to-shoot scene description for a 5-second 9:16 social video ad.

Rules:
- 2 to 4 sentences, present tense, plain prose. No lists, no headings, no emojis.
- Beat-by-beat: open on the Hook beat, deliver the Format style in the Setting, end on a confident product hero frame.
- If a product is given, name it explicitly. If an avatar/character is given, refer to them by their name and treat them as the on-camera person.
- Don't write marketing taglines. Write what the camera sees and what the person does.
- Stay under 90 words. Output only the scene text — no preamble, no quotes.`;

type Brief = {
  subject?: "product" | "app";
  format?: { label?: string; fragment?: string; custom?: string };
  hook?: { label?: string; fragment?: string };
  setting?: { label?: string; fragment?: string; custom?: string };
  brand?: { name?: string; description?: string; tagline?: string; audience?: string } | null;
  character?: { name?: string; role?: string; description?: string } | null;
  location?: { place?: string } | null;
};

function buildUserContent(b: Brief): string {
  const lines: string[] = [];
  lines.push(`Subject: ${b.subject === "app" ? "a mobile app (show its UI on a phone)" : "a physical product"}.`);
  if (b.format?.label || b.format?.custom) {
    lines.push(`Format: ${b.format.label || "Custom"} — ${b.format.fragment || b.format.custom || ""}`);
  }
  if (b.hook?.label) {
    lines.push(`Hook: ${b.hook.label} — ${b.hook.fragment || ""}`);
  }
  if (b.setting?.label || b.setting?.custom) {
    lines.push(`Setting: ${b.setting.label || "Custom"} — ${b.setting.fragment || b.setting.custom || ""}`);
  }
  if (b.brand?.name) {
    const bits = [b.brand.name];
    if (b.brand.description) bits.push(b.brand.description);
    if (b.brand.tagline) bits.push(`tagline: "${b.brand.tagline}"`);
    if (b.brand.audience) bits.push(`audience: ${b.brand.audience}`);
    lines.push(`Product/Brand: ${bits.join(" — ")}`);
  }
  if (b.character?.name) {
    const bits = [b.character.name];
    if (b.character.role) bits.push(`role: ${b.character.role}`);
    if (b.character.description) bits.push(b.character.description);
    lines.push(`On-camera person: ${bits.join(" — ")}`);
  }
  if (b.location?.place) {
    lines.push(`Real-world location: ${b.location.place} (match its architecture, light, culture).`);
  }
  lines.push("\nWrite the scene now.");
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => null)) as Brief | null;
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hasFormat = !!(body.format?.label || body.format?.custom);
    const hasHook = !!body.hook?.label;
    const hasSetting = !!(body.setting?.label || body.setting?.custom);
    if (!hasFormat || !hasHook || !hasSetting) {
      return new Response(JSON.stringify({ error: "format, hook and setting are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = buildUserContent(body);

    const callAi = (model: string) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      });

    const PRIMARY = "google/gemini-3-flash-preview";
    const FALLBACK = "google/gemini-2.5-flash";
    const shouldFallback = (s: number) => s === 429 || s === 402 || s >= 500;
    let resp = await callAi(PRIMARY);
    if (shouldFallback(resp.status)) {
      console.warn(`write-ad-scene: primary ${PRIMARY} -> ${resp.status}, falling back`);
      resp = await callAi(FALLBACK);
    }

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      return new Response(JSON.stringify({ error: `AI gateway error (${resp.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const scene: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!scene) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ scene }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("write-ad-scene error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
