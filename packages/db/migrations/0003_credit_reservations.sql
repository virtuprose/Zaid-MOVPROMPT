CREATE TYPE "public"."credit_reservation_status" AS ENUM('reserved', 'charged', 'released', 'refunded');--> statement-breakpoint
CREATE TABLE "credit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"render_run_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" "credit_reservation_status" DEFAULT 'reserved' NOT NULL,
	"idempotency_key" text NOT NULL,
	"settlement_reason" text,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_reservations_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_reservations_run_user_unique" UNIQUE("render_run_id","user_id"),
	CONSTRAINT "credit_reservations_amount_positive" CHECK ("credit_reservations"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_run_owner_fk" FOREIGN KEY ("render_run_id","user_id") REFERENCES "public"."render_runs"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_reservations_user_status_idx" ON "credit_reservations" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "credit_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "credit_reservations_owner_policy" ON "credit_reservations"
  USING ("user_id" = nullif(current_setting('movprompt.user_id', true), '')::uuid);
