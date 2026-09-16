import type { Hono } from "hono";
import { ApiHttpError } from "./errors.js";
import type { ApiEnvironment } from "./request-context.js";

export interface TemplatePreviewStorage {
  previewsBucket: string | undefined;
  signDownload(input: { bucket: string; key: string }): Promise<{ url: string }>;
}

const DEMO_FILE = /^(luxury-product-reveal|whatsapp-sales-ad|food-beverage|salon-booking-offer|app-service)\.(mp4|jpg)$/;

export function registerTemplatePreviewRoutes(app: Hono<ApiEnvironment>, storage?: TemplatePreviewStorage): void {
  app.get("/api/v1/template-previews/:version/:file", async context => {
    const file = context.req.param("file");
    const version = context.req.param("version");
    // Public access is limited to approved demos. Never sign caller-supplied customer keys.
    if (!DEMO_FILE.test(file) || !(version === "v1" || (version === "v3" && /^(salon-booking-offer|app-service)\.(mp4|jpg)$/.test(file)))) return context.notFound();
    context.header("cache-control", "no-store");
    if (!storage?.previewsBucket) {
      throw new ApiHttpError({ code: "template_preview_unavailable", message: "Template previews are not configured yet.", status: 503, retryable: true });
    }
    const signed = await storage.signDownload({ bucket: storage.previewsBucket, key: `templates/${version}/${file}` });
    return context.redirect(signed.url, 302);
  });
}
