import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { R2Storage, r2StorageConfigFromEnv } from "../../packages/storage/src/index.ts";
const config = r2StorageConfigFromEnv();
const storage = new R2Storage(config);
const manifest: Array<{ id: string; video: string; poster: string; version?: string }> = [
  { id: "luxury-product-reveal", video: "artifacts/gateway-smoke/single-funded-test-1789460045236.mp4", poster: "docs/template-demos/luxury-product-reveal-test.jpg" },
  ...["whatsapp-sales-ad", "food-beverage"].map(id => ({ id, video: `apps/web/public/template-previews/generated/${id}-seedance-v1.mp4`, poster: `apps/web/public/template-previews/generated/${id}-seedance-v1.jpg` })),
  ...["app-service", "salon-booking-offer"].map(id => ({ id, version: "v3", video: `docs/template-demos/${id}-v3.mp4`, poster: `docs/template-demos/${id}-v3.jpg` })),
];
// Read every source before writing anything, so missing demos never publish half a manifest.
const objects = await Promise.all(manifest.flatMap(item => [
  { path: item.video, key: `templates/${item.version ?? "v1"}/${item.id}.mp4`, mime: "video/mp4" },
  { path: item.poster, key: `templates/${item.version ?? "v1"}/${item.id}.jpg`, mime: "image/jpeg" },
]).map(async item => ({ ...item, body: await readFile(item.path) })));
await storage.checkBucket(storage.previewsBucket!);
for (const object of objects) {
  await storage.put({ bucket: storage.previewsBucket!, key: object.key, body: object.body, contentType: object.mime, metadata: { "sha256-hex": createHash("sha256").update(object.body).digest("hex") } });
  const signed = await storage.signDownload({ bucket: storage.previewsBucket!, key: object.key });
  const response = await fetch(signed.url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || createHash("sha256").update(new Uint8Array(await response.arrayBuffer())).digest("hex") !== createHash("sha256").update(object.body).digest("hex")) throw new Error(`Private R2 template verification failed: ${object.key}. Check bucket access.`);
  console.info(`Published and verified ${object.key}`);
}
