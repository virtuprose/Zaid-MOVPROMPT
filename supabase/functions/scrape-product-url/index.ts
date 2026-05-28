// Scrape a product page URL for its hero image + basic metadata so the
// Marketing Studio "Image URL" field can accept Amazon/Shopify/etc. links.
// Returns { image_url, name, description, url } — the client then hands the
// image_url back to analyze-brand-image as usual.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function abs(base: string, maybe: string | null | undefined): string | null {
  if (!maybe) return null;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return null;
  }
}

function pickMeta(html: string, names: string[]): string | null {
  for (const n of names) {
    // property="og:image" content="..."  OR  name="..." content="..."
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${n}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
    // content first
    const re2 = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]+(?:property|name)\\s*=\\s*["']${n}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pickTitle(html: string): string | null {
  const og = pickMeta(html, ["og:title", "twitter:title"]);
  if (og) return og;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.trim().slice(0, 200) ?? null;
}

function pickDescription(html: string): string | null {
  return pickMeta(html, ["og:description", "twitter:description", "description"]);
}

function pickHeroImage(html: string, base: string): string | null {
  // 1) Open Graph / Twitter image
  const meta = pickMeta(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  if (meta) {
    const a = abs(base, meta);
    if (a) return a;
  }
  // 2) Amazon hero (landingImage) JSON blob
  const landing = html.match(/"hiRes"\s*:\s*"([^"]+\.(?:jpe?g|png|webp))"/i);
  if (landing?.[1]) return decodeEntities(landing[1]);
  const landing2 = html.match(/"large"\s*:\s*"([^"]+\.(?:jpe?g|png|webp))"/i);
  if (landing2?.[1]) return decodeEntities(landing2[1]);
  // 3) link rel="image_src"
  const linkImg = html.match(
    /<link[^>]+rel\s*=\s*["']image_src["'][^>]*href\s*=\s*["']([^"']+)["']/i,
  );
  if (linkImg?.[1]) {
    const a = abs(base, decodeEntities(linkImg[1]));
    if (a) return a;
  }
  // 4) First <img> with a real src that looks like jpg/png/webp
  const imgs = html.matchAll(
    /<img[^>]+(?:src|data-src|data-old-hires|data-a-hires)\s*=\s*["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi,
  );
  for (const m of imgs) {
    const a = abs(base, decodeEntities(m[1]));
    if (a) return a;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawUrl: string = (body?.url ?? "").toString().trim();
    if (!/^https?:\/\/\S+$/i.test(rawUrl)) {
      return json({ error: "invalid_url" }, 400);
    }

    let pageRes: Response;
    try {
      pageRes = await fetch(rawUrl, {
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
    } catch (e) {
      console.warn("scrape-product-url: fetch failed", e);
      return json({ error: "fetch_failed" }, 502);
    }

    if (!pageRes.ok) {
      return json({ error: "page_fetch_failed", status: pageRes.status }, 502);
    }

    const finalUrl = pageRes.url || rawUrl;
    const contentType = pageRes.headers.get("content-type") || "";

    // Direct image link → just return it.
    if (contentType.startsWith("image/")) {
      return json({ image_url: finalUrl, name: null, description: null, url: finalUrl });
    }
    if (!contentType.includes("html")) {
      return json({ error: "not_html", contentType }, 415);
    }

    const html = (await pageRes.text()).slice(0, 600_000); // cap to ~600KB

    const image_url = pickHeroImage(html, finalUrl);
    if (!image_url) {
      return json({ error: "no_image_found" }, 404);
    }

    const rawName = pickTitle(html);
    // Amazon titles are absurdly long; trim to first hyphen/pipe chunk.
    const name = rawName
      ? rawName.split(/[|–—]/)[0].trim().slice(0, 120)
      : null;
    const description = pickDescription(html)?.slice(0, 240) ?? null;

    return json({ image_url, name, description, url: finalUrl });
  } catch (err) {
    console.error("scrape-product-url error", err);
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
