import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const subject: "product" | "app" = body.subject === "app" ? "app" : "product";
    let imageUrl: string | null = body.imageUrl ?? null;

    if (!imageUrl && body.imagePath) {
      const { data } = await supabase.storage
        .from("director-uploads")
        .createSignedUrl(body.imagePath, 60 * 10);
      imageUrl = data?.signedUrl ?? null;
    }
    if (!imageUrl) return json({ error: "image required" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "missing api key" }, 500);

    const sys =
      subject === "app"
        ? "You are a brand strategist. The image is a mobile app icon or screenshot. Infer the brand name (visible text or best guess), a one-line description (≤120 chars) of what the app does, and a punchy tagline (≤60 chars). If you cannot confidently infer a field, set it to null."
        : "You are a brand strategist. The image is a product photo or logo. Infer the brand name (visible text or best guess), a one-line description (≤120 chars) of the product, and a punchy tagline (≤60 chars). If you cannot confidently infer a field, set it to null.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and return brand fields." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_brand",
              description: "Return inferred brand fields.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: ["string", "null"] },
                  description: { type: ["string", "null"] },
                  tagline: { type: ["string", "null"] },
                },
                required: ["name", "description", "tagline"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_brand" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: "ai_error", status: aiRes.status, detail: txt }, aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500);
    }

    const data = await aiRes.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    const parsed = JSON.parse(args);

    return json({
      name: clamp(parsed.name, 80),
      description: clamp(parsed.description, 120),
      tagline: clamp(parsed.tagline, 60),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function clamp(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
