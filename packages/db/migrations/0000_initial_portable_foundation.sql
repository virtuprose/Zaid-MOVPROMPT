CREATE TYPE "public"."asset_kind" AS ENUM('product', 'logo', 'audio', 'reference', 'generated', 'export');--> statement-breakpoint
CREATE TYPE "public"."creation_mode" AS ENUM('template', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('available', 'reserved', 'consumed');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_kind" AS ENUM('purchase', 'grant', 'charge', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."notification_severity" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."payment_event_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_order_status" AS ENUM('created', 'pending', 'paid', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'ready', 'generating', 'review', 'failed', 'exporting', 'completed', 'trashed');--> statement-breakpoint
CREATE TYPE "public"."publishing_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('not_required', 'pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."render_status" AS ENUM('submitting', 'queued', 'processing', 'completed', 'failed', 'cancelling', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_account_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_project_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_kind" "asset_kind" NOT NULL,
	"storage_bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_assets_bucket_key_unique" UNIQUE("storage_bucket","object_key"),
	CONSTRAINT "creator_assets_size_nonnegative" CHECK ("creator_project_assets"."size_bytes" >= 0),
	CONSTRAINT "creator_assets_sha256_format" CHECK ("creator_project_assets"."checksum_sha256" IS NULL OR "creator_project_assets"."checksum_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "creator_project_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_version_id" uuid,
	"template_version_id" uuid,
	"mode" "creation_mode" NOT NULL,
	"version_number" integer NOT NULL,
	"configuration" jsonb NOT NULL,
	"product_recipe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"campaign_recipe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_versions_project_number_unique" UNIQUE("project_id","version_number"),
	CONSTRAINT "creator_versions_owner_tuple_unique" UNIQUE("id","project_id","user_id"),
	CONSTRAINT "creator_versions_positive_version" CHECK ("creator_project_versions"."version_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "creator_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled campaign' NOT NULL,
	"mode" "creation_mode" DEFAULT 'template' NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"current_accepted_version_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_projects_id_user_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_purchased" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "ledger_entry_kind" NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_ledger_delta_nonzero" CHECK ("credit_ledger"."delta" <> 0),
	CONSTRAINT "credit_ledger_balance_nonnegative" CHECK ("credit_ledger"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entitlement_type" text NOT NULL,
	"status" "entitlement_status" DEFAULT 'available' NOT NULL,
	"reserved_run_id" uuid,
	"reserved_operation_key" text,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_user_type_unique" UNIQUE("user_id","entitlement_type")
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_version_id" uuid NOT NULL,
	"render_run_id" uuid,
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"aspect_ratio" text NOT NULL,
	"resolution" text NOT NULL,
	"codec" text DEFAULT 'h264' NOT NULL,
	"preset" text NOT NULL,
	"status" "export_status" DEFAULT 'queued' NOT NULL,
	"output_bucket" text,
	"output_object_key" text,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "exports_user_idempotency_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "exports_artifact_unique" UNIQUE("project_version_id","aspect_ratio","resolution","preset"),
	CONSTRAINT "exports_aspect_ratio_allowed" CHECK ("exports"."aspect_ratio" IN ('9:16','1:1','4:5','16:9')),
	CONSTRAINT "exports_resolution_allowed" CHECK ("exports"."resolution" IN ('720p','1080p'))
);
--> statement-breakpoint
CREATE TABLE "generation_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"template_version_id" uuid,
	"capability_alias" text NOT NULL,
	"credits" integer NOT NULL,
	"entitlement_eligible" boolean DEFAULT false NOT NULL,
	"breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"configuration_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_quotes_credits_nonnegative" CHECK ("generation_quotes"."credits" >= 0),
	CONSTRAINT "generation_quotes_capability_nonempty" CHECK (length("generation_quotes"."capability_alias") > 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"severity" "notification_severity" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_jobs_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "outbox_attempts_nonnegative" CHECK ("outbox_jobs"."attempts" >= 0),
	CONSTRAINT "outbox_max_attempts_positive" CHECK ("outbox_jobs"."max_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"credits" integer NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_bundles_code_version_unique" UNIQUE("code","version"),
	CONSTRAINT "payment_bundles_version_positive" CHECK ("payment_bundles"."version" > 0),
	CONSTRAINT "payment_bundles_credits_positive" CHECK ("payment_bundles"."credits" > 0),
	CONSTRAINT "payment_bundles_amount_positive" CHECK ("payment_bundles"."amount_minor" > 0),
	CONSTRAINT "payment_bundles_currency_format" CHECK ("payment_bundles"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"status" "payment_event_status" DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payment_events_provider_event_unique" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bundle_id" uuid NOT NULL,
	"merchant_reference" text NOT NULL,
	"provider" text DEFAULT 'upayments' NOT NULL,
	"provider_payment_id" text,
	"status" "payment_order_status" DEFAULT 'created' NOT NULL,
	"credits_snapshot" integer NOT NULL,
	"amount_minor_snapshot" integer NOT NULL,
	"currency_snapshot" text NOT NULL,
	"pending_generation_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_orders_merchant_reference_unique" UNIQUE("merchant_reference"),
	CONSTRAINT "payment_orders_credits_positive" CHECK ("payment_orders"."credits_snapshot" > 0),
	CONSTRAINT "payment_orders_amount_positive" CHECK ("payment_orders"."amount_minor_snapshot" > 0)
);
--> statement-breakpoint
CREATE TABLE "render_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"capability_alias" text NOT NULL,
	"quote_id" uuid NOT NULL,
	"quoted_credits" integer NOT NULL,
	"charged_credits" integer DEFAULT 0 NOT NULL,
	"starter_entitlement_used" boolean DEFAULT false NOT NULL,
	"status" "render_status" DEFAULT 'submitting' NOT NULL,
	"provider" text,
	"provider_request_id" text,
	"output_bucket" text,
	"output_object_key" text,
	"error_code" text,
	"error_message" text,
	"refund_status" "refund_status" DEFAULT 'not_required' NOT NULL,
	"charged_at" timestamp with time zone,
	"provider_accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "render_runs_user_idempotency_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "render_runs_owner_tuple_unique" UNIQUE("id","project_id","project_version_id","user_id"),
	CONSTRAINT "render_runs_quoted_credits_nonnegative" CHECK ("render_runs"."quoted_credits" >= 0),
	CONSTRAINT "render_runs_charged_credits_nonnegative" CHECK ("render_runs"."charged_credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"legacy_supabase_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"localized_name" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"localized_description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recipe_json" jsonb NOT NULL,
	"input_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edit_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"supported_languages" text[] DEFAULT ARRAY['en']::text[] NOT NULL,
	"supported_ratios" text[] DEFAULT ARRAY['9:16']::text[] NOT NULL,
	"supported_markets" text[] DEFAULT ARRAY['KW','SA','AE','QA','BH','OM']::text[] NOT NULL,
	"duration_seconds" integer NOT NULL,
	"preview_object_key" text,
	"poster_object_key" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_versions_number_unique" UNIQUE("template_id","version_number"),
	CONSTRAINT "template_versions_id_template_unique" UNIQUE("id","template_id"),
	CONSTRAINT "template_versions_positive_version" CHECK ("video_template_versions"."version_number" > 0),
	CONSTRAINT "template_versions_duration_range" CHECK ("video_template_versions"."duration_seconds" BETWEEN 3 AND 60)
);
--> statement-breakpoint
CREATE TABLE "video_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"publishing_state" "publishing_state" DEFAULT 'draft' NOT NULL,
	"current_published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_project_assets" ADD CONSTRAINT "creator_assets_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."creator_projects"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_project_versions" ADD CONSTRAINT "creator_project_versions_template_version_id_video_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."video_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_project_versions" ADD CONSTRAINT "creator_versions_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."creator_projects"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_project_versions" ADD CONSTRAINT "creator_versions_parent_owner_fk" FOREIGN KEY ("parent_version_id","project_id","user_id") REFERENCES "public"."creator_project_versions"("id","project_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_projects" ADD CONSTRAINT "creator_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_reserved_run_id_render_runs_id_fk" FOREIGN KEY ("reserved_run_id") REFERENCES "public"."render_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."creator_projects"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_version_owner_fk" FOREIGN KEY ("project_version_id","project_id","user_id") REFERENCES "public"."creator_project_versions"("id","project_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_quotes" ADD CONSTRAINT "generation_quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_quotes" ADD CONSTRAINT "generation_quotes_template_version_id_video_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."video_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_bundle_id_payment_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."payment_bundles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_runs" ADD CONSTRAINT "render_runs_quote_id_generation_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."generation_quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_runs" ADD CONSTRAINT "render_runs_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."creator_projects"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_runs" ADD CONSTRAINT "render_runs_version_owner_fk" FOREIGN KEY ("project_version_id","project_id","user_id") REFERENCES "public"."creator_project_versions"("id","project_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_template_versions" ADD CONSTRAINT "video_template_versions_template_id_video_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."video_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "creator_assets_project_created_idx" ON "creator_project_assets" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "creator_versions_project_created_idx" ON "creator_project_versions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "creator_projects_user_updated_idx" ON "creator_projects" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_created_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "exports_project_created_idx" ON "exports" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_quotes_user_expiry_idx" ON "generation_quotes" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_claim_idx" ON "outbox_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "payment_events_order_idx" ON "payment_events" USING btree ("payment_order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_payment_unique" ON "payment_orders" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payment_orders_user_created_idx" ON "payment_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "render_runs_project_created_idx" ON "render_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "render_runs_reconcile_idx" ON "render_runs" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_legacy_supabase_id_unique" ON "users" USING btree ("legacy_supabase_user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verifications_expires_idx" ON "verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "video_templates_state_category_idx" ON "video_templates" USING btree ("publishing_state","category");