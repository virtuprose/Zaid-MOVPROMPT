CREATE TYPE "guest_claim_status" AS ENUM ('pending', 'securing', 'ready', 'failed');
--> statement-breakpoint
CREATE TYPE "guest_claim_asset_status" AS ENUM ('pending', 'securing', 'verified', 'failed');
--> statement-breakpoint

CREATE TABLE "guest_claim_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "draft_id" uuid NOT NULL,
  "pending_generation_id" text NOT NULL,
  "snapshot_digest" text NOT NULL,
  "snapshot_json" jsonb NOT NULL,
  "asset_manifest" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "project_id" uuid,
  "project_version_id" uuid,
  "status" "guest_claim_status" NOT NULL DEFAULT 'pending',
  "error_code" text,
  "error_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finalized_at" timestamp with time zone,
  CONSTRAINT "guest_claim_operations_id_user_unique" UNIQUE("id", "user_id"),
  CONSTRAINT "guest_claim_operations_draft_unique" UNIQUE("draft_id"),
  CONSTRAINT "guest_claim_operations_user_intent_unique" UNIQUE("user_id", "pending_generation_id"),
  CONSTRAINT "guest_claim_operations_digest_format" CHECK ("snapshot_digest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "guest_claim_operations_error_code_bounded" CHECK ("error_code" IS NULL OR length("error_code") <= 120),
  CONSTRAINT "guest_claim_operations_error_metadata_bounded" CHECK (octet_length("error_metadata"::text) <= 4096),
  CONSTRAINT "guest_claim_operations_ready_receipt" CHECK (
    "status" <> 'ready' OR ("project_id" IS NOT NULL AND "project_version_id" IS NOT NULL AND "finalized_at" IS NOT NULL)
  )
);
--> statement-breakpoint

ALTER TABLE "guest_claim_operations"
  ADD CONSTRAINT "guest_claim_operations_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "guest_claim_operations"
  ADD CONSTRAINT "guest_claim_operations_project_owner_fk"
  FOREIGN KEY ("project_id", "user_id") REFERENCES "creator_projects"("id", "user_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "guest_claim_operations"
  ADD CONSTRAINT "guest_claim_operations_version_owner_fk"
  FOREIGN KEY ("project_version_id", "project_id", "user_id") REFERENCES "creator_project_versions"("id", "project_id", "user_id") ON DELETE RESTRICT;
--> statement-breakpoint

CREATE TABLE "guest_claim_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "claim_operation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "local_asset_id" uuid NOT NULL,
  "ordinal" integer NOT NULL,
  "asset_kind" "asset_kind" NOT NULL,
  "status" "guest_claim_asset_status" NOT NULL DEFAULT 'pending',
  "storage_bucket" text,
  "object_key" text,
  "mime_type" text NOT NULL,
  "size_bytes" bigint NOT NULL,
  "checksum_sha256" text NOT NULL,
  "error_code" text,
  "error_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "verified_at" timestamp with time zone,
  "local_cleanup_eligible_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "guest_claim_assets_operation_ordinal_unique" UNIQUE("claim_operation_id", "ordinal"),
  CONSTRAINT "guest_claim_assets_operation_local_asset_unique" UNIQUE("claim_operation_id", "local_asset_id"),
  CONSTRAINT "guest_claim_assets_ordinal_range" CHECK ("ordinal" BETWEEN 0 AND 99),
  CONSTRAINT "guest_claim_assets_size_range" CHECK ("size_bytes" > 0 AND "size_bytes" <= 52428800),
  CONSTRAINT "guest_claim_assets_checksum_format" CHECK ("checksum_sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "guest_claim_assets_storage_pair" CHECK (("storage_bucket" IS NULL) = ("object_key" IS NULL)),
  CONSTRAINT "guest_claim_assets_verified_storage" CHECK (
    "status" <> 'verified' OR ("storage_bucket" IS NOT NULL AND "object_key" IS NOT NULL AND "verified_at" IS NOT NULL)
  ),
  CONSTRAINT "guest_claim_assets_error_code_bounded" CHECK ("error_code" IS NULL OR length("error_code") <= 120),
  CONSTRAINT "guest_claim_assets_error_metadata_bounded" CHECK (octet_length("error_metadata"::text) <= 4096)
);
--> statement-breakpoint

ALTER TABLE "guest_claim_assets"
  ADD CONSTRAINT "guest_claim_assets_operation_owner_fk"
  FOREIGN KEY ("claim_operation_id", "user_id") REFERENCES "guest_claim_operations"("id", "user_id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX "guest_claim_operations_user_updated_idx" ON "guest_claim_operations" ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "guest_claim_operations_status_updated_idx" ON "guest_claim_operations" ("status", "updated_at");
--> statement-breakpoint
CREATE INDEX "guest_claim_assets_operation_status_idx" ON "guest_claim_assets" ("claim_operation_id", "status", "ordinal");
--> statement-breakpoint
CREATE UNIQUE INDEX "guest_claim_assets_bucket_key_unique" ON "guest_claim_assets" ("storage_bucket", "object_key") WHERE "object_key" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "guest_claim_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guest_claim_operations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "guest_claim_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guest_claim_assets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "guest_claim_operations_owner_policy" ON "guest_claim_operations"
  USING ("user_id" = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK ("user_id" = nullif(current_setting('movprompt.user_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "guest_claim_assets_owner_policy" ON "guest_claim_assets"
  USING ("user_id" = nullif(current_setting('movprompt.user_id', true), '')::uuid)
  WITH CHECK ("user_id" = nullif(current_setting('movprompt.user_id', true), '')::uuid);
