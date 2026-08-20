ALTER TYPE "asset_kind" ADD VALUE IF NOT EXISTS 'footage';
--> statement-breakpoint

ALTER TABLE "creator_project_assets"
  ADD CONSTRAINT "creator_assets_footage_metadata" CHECK (
    "asset_kind" <> 'footage' OR (
      "mime_type" IN ('video/mp4', 'video/quicktime', 'video/webm')
      AND "size_bytes" > 0
      AND "duration_ms" > 0
      AND "duration_ms" <= 600000
      AND "checksum_sha256" IS NOT NULL
    )
  );
--> statement-breakpoint

ALTER TABLE "guest_claim_assets"
  ADD COLUMN "duration_ms" integer;
--> statement-breakpoint

ALTER TABLE "guest_claim_assets"
  ADD CONSTRAINT "guest_claim_assets_footage_metadata" CHECK (
    "asset_kind" <> 'footage' OR (
      "mime_type" IN ('video/mp4', 'video/quicktime', 'video/webm')
      AND "duration_ms" > 0
      AND "duration_ms" <= 600000
    )
  );
