// Lovable AI: turn a user's Format + Hook + Setting picks (plus optional
// product/avatar/location context) into a ready-to-shoot, 2–4 sentence
// scene description for the Marketing Studio describe box.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { chargeCredits, refundCredits, priceFor, InsufficientCreditsError, insufficientResponse } from "../_shared/credits.ts";

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

const SYSTEM_PROMPT = `You are a video ad director. Given a Format, Location and optional product/avatar context, write a single ready-to-shoot scene description for a 5-second 9:16 social video ad.

Rules:
- 2 to 4 sentences, present tense, plain prose. No lists, no headings, no emojis.
- Beat-by-beat: open with a strong attention grabber, deliver the Format style in the Location, end on a confident product hero frame.
- If a product is given, name it explicitly AND describe its visible parts in the hero frame. Treat the PRODUCT LOCK fields (category, visible parts, materials, packaging, hero colors) as ground truth — the hero beat must visibly show those exact parts/colors. Never invent ingredients, components or colors that aren't in the lock.
- If an avatar/character is given, refer to them by their name and treat them as the on-camera person.
- If multiple products or characters are provided, the first is the hero/lead; others are supporting and must share the frame without stealing focus from the hero/lead.
- Treat Format and Setting as LOCKED structure — never override their framing, category or core beat. If an "Additional direction" note is provided, treat it as an adaptation layer that adjusts tone, mood, palette or small details on top of the preset.
- Don't write marketing taglines. Write what the camera sees and what the person does.
- Stay under 90 words. Output only the scene text — no preamble, no quotes.`;

type BrandLite = {
  name?: string;
  description?: string;
  tagline?: string;
  audience?: string;
  category?: string | null;
  visual_parts?: string | null;
  materials?: string | null;
  hero_colors?: string[] | null;
  packaging?: string | null;
};
type CharLite = { name?: string; role?: string; description?: string };

type BrandIdentityLite = {
  primary_color?: string | null;
  supporting_colors?: string[] | null;
  avoid_colors?: string[] | null;
  typography_vibe?: string | null;
  font_hint?: string | null;
  mood_notes?: string | null;
  tagline?: string | null;
};

type Brief = {
  subject?: "product" | "app";
  format?: { label?: string; fragment?: string; custom?: string };
  setting?: { label?: string; fragment?: string; custom?: string };
  brand?: BrandLite | null;
  brands?: BrandLite[];
  character?: CharLite | null;
  characters?: CharLite[];
  location?: { place?: string; hasImage?: boolean } | null;
  userNote?: string;
  brandIdentity?: BrandIdentityLite | null;
};

function buildUserContent(b: Brief): string {
  const lines: string[] = [];
  lines.push(`Subject: ${b.subject === "app" ? "a mobile app (show its UI on a phone)" : "a physical product"}.`);
  if (b.format?.label || b.format?.custom) {
    lines.push(`Format: ${b.format.label || "Custom"} — ${b.format.fragment || b.format.custom || ""}`);
  }
  if (b.setting?.label || b.setting?.custom) {
    lines.push(`Setting: ${b.setting.label || "Custom"} — ${b.setting.fragment || b.setting.custom || ""}`);
  }
  const brands: BrandLite[] = b.brands && b.brands.length > 0 ? b.brands : b.brand ? [b.brand] : [];
  brands.forEach((br, i) => {
    if (!br?.name) return;
    const role = brands.length === 1 ? "Product/Brand" : i === 0 ? "Hero product" : "Supporting product (shares the frame)";
    const bits = [br.name];
    if (br.category) bits.push(`category: ${br.category}`);
    if (br.description) bits.push(br.description);
    if (br.tagline) bits.push(`tagline: "${br.tagline}"`);
    if (br.audience) bits.push(`audience: ${br.audience}`);
    lines.push(`${role}: ${bits.join(" — ")}`);
    const lock: string[] = [];
    if (br.visual_parts) lock.push(`visible parts: ${br.visual_parts}`);
    if (br.materials) lock.push(`materials/finish: ${br.materials}`);
    if (br.packaging) lock.push(`packaging: ${br.packaging}`);
    if (br.hero_colors && br.hero_colors.length > 0) lock.push(`hero colors: ${br.hero_colors.join(", ")}`);
    if (lock.length > 0) {
      lines.push(`PRODUCT LOCK for ${br.name} — ${lock.join("; ")}. The hero frame MUST visibly show these exact parts/colors. Do not invent other parts, ingredients or colors.`);
    }
  });
  const chars: CharLite[] = b.characters && b.characters.length > 0 ? b.characters : b.character ? [b.character] : [];
  chars.forEach((ch, i) => {
    if (!ch?.name) return;
    const role = chars.length === 1 ? "On-camera person" : i === 0 ? "Lead on-camera" : "Also on-camera (shares the frame, does not lead)";
    const bits = [ch.name];
    if (ch.role) bits.push(`role: ${ch.role}`);
    if (ch.description) bits.push(ch.description);
    lines.push(`${role}: ${bits.join(" — ")}`);
  });
  if (b.location?.place) {
    lines.push(`Real-world location: ${b.location.place} (match its architecture, light, culture).`);
  }
  if (b.location?.hasImage) {
    lines.push(`A reference image of the location is attached and will be passed to the video model — describe the scene so it matches the look, framing, lighting and palette of that reference.`);
  }
  const note = b.userNote?.trim();
  if (note) {
    lines.push(`Additional direction (adaptation layer — adjust tone/mood/details, but keep the Format and Setting structure locked): ${note.slice(0, 400)}`);
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
    const hasSetting = !!(body.setting?.label || body.setting?.custom || body.location?.place || body.location?.hasImage);
    if (!hasFormat || !hasSetting) {
      return new Response(JSON.stringify({ error: "format and location are required" }), {
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

    // Extract user from JWT
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: ud } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = ud?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const charge = await priceFor("write_ad_scene", 2);
    try {
      await chargeCredits({ userId: uid, amount: charge, reason: "write_ad_scene" });
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientResponse(corsHeaders);
      throw e;
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

    const refundForFailure = async (reason: string) => {
      await refundCredits({ userId: uid, amount: charge, reason: "write_ad_scene_refund", metadata: { reason } });
    };

    if (resp.status === 429) {
      await refundForFailure("rate_limited");
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      await refundForFailure("ai_credits_exhausted");
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error:", resp.status, text);
      await refundForFailure(`gateway_${resp.status}`);
      return new Response(JSON.stringify({ error: `AI gateway error (${resp.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const scene: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!scene) {
      await refundForFailure("empty_response");
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
