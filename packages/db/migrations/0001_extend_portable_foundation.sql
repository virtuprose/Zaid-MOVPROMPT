CREATE TYPE "public"."payment_attempt_status" AS ENUM('created', 'pending', 'succeeded', 'failed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_refund_status" AS ENUM('requested', 'processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"provider" text DEFAULT 'upayments' NOT NULL,
	"provider_session_id" text,
	"idempotency_key" text NOT NULL,
	"status" "payment_attempt_status" DEFAULT 'created' NOT NULL,
	"expires_at" timestamp with time zone,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_attempts_order_number_unique" UNIQUE("payment_order_id","attempt_number"),
	CONSTRAINT "payment_attempts_number_positive" CHECK ("payment_attempts"."attempt_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'upayments' NOT NULL,
	"provider_refund_id" text,
	"idempotency_key" text NOT NULL,
	"status" "payment_refund_status" DEFAULT 'requested' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"credits_reversed" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "payment_refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_refunds_amount_positive" CHECK ("payment_refunds"."amount_minor" > 0),
	CONSTRAINT "payment_refunds_credits_nonnegative" CHECK ("payment_refunds"."credits_reversed" >= 0)
);
--> statement-breakpoint
ALTER TABLE "generation_quotes" ADD CONSTRAINT "generation_quotes_owner_tuple_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_id_user_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "render_runs" ADD CONSTRAINT "render_runs_id_user_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_order_owner_fk" FOREIGN KEY ("payment_order_id","user_id") REFERENCES "public"."payment_orders"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_session_unique" ON "payment_attempts" USING btree ("provider","provider_session_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_created_idx" ON "payment_attempts" USING btree ("payment_order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_refunds_provider_id_unique" ON "payment_refunds" USING btree ("provider","provider_refund_id");--> statement-breakpoint
CREATE INDEX "payment_refunds_order_created_idx" ON "payment_refunds" USING btree ("payment_order_id","created_at");--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_reserved_run_owner_fk" FOREIGN KEY ("reserved_run_id","user_id") REFERENCES "public"."render_runs"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_render_owner_fk" FOREIGN KEY ("render_run_id","project_id","project_version_id","user_id") REFERENCES "public"."render_runs"("id","project_id","project_version_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_runs" ADD CONSTRAINT "render_runs_quote_owner_fk" FOREIGN KEY ("quote_id","user_id") REFERENCES "public"."generation_quotes"("id","user_id") ON DELETE restrict ON UPDATE no action;
