CREATE TABLE "request_rate_limits" (
  "subject_hash" text NOT NULL,
  "action" text NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "request_count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "request_rate_limits_subject_hash_format" CHECK ("subject_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "request_rate_limits_action_bounded" CHECK (length("action") BETWEEN 1 AND 80),
  CONSTRAINT "request_rate_limits_count_nonnegative" CHECK ("request_count" >= 0),
  CONSTRAINT "request_rate_limits_expiry_after_window" CHECK ("expires_at" > "window_started_at"),
  CONSTRAINT "request_rate_limits_subject_action_window_unique" UNIQUE("subject_hash", "action", "window_started_at")
);
--> statement-breakpoint

CREATE INDEX "request_rate_limits_expiry_idx" ON "request_rate_limits" ("expires_at");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "consume_request_rate_limit"(
  "p_subject_hash" text,
  "p_action" text,
  "p_window_seconds" integer,
  "p_max_requests" integer
)
RETURNS TABLE ("allowed" boolean, "retry_after_seconds" integer)
LANGUAGE plpgsql
AS $$
DECLARE
  "v_now" timestamp with time zone := clock_timestamp();
  "v_window_started_at" timestamp with time zone;
  "v_window_ends_at" timestamp with time zone;
BEGIN
  IF "p_subject_hash" !~ '^[0-9a-f]{64}$' OR length("p_action") NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'invalid rate-limit subject or action';
  END IF;
  IF "p_window_seconds" < 1 OR "p_window_seconds" > 86400 OR "p_max_requests" < 1 OR "p_max_requests" > 100000 THEN
    RAISE EXCEPTION 'invalid rate-limit window or maximum';
  END IF;

  "v_window_started_at" := to_timestamp(
    floor(extract(epoch FROM "v_now") / "p_window_seconds") * "p_window_seconds"
  );
  "v_window_ends_at" := "v_window_started_at" + make_interval(secs => "p_window_seconds");

  RETURN QUERY
  WITH consumed AS (
    INSERT INTO "request_rate_limits" (
      "subject_hash",
      "action",
      "window_started_at",
      "request_count",
      "expires_at"
    )
    VALUES (
      "p_subject_hash",
      "p_action",
      "v_window_started_at",
      1,
      "v_window_ends_at"
    )
    ON CONFLICT ("subject_hash", "action", "window_started_at")
    DO UPDATE SET "request_count" = "request_rate_limits"."request_count" + 1
      WHERE "request_rate_limits"."request_count" < "p_max_requests"
    RETURNING 1
  )
  SELECT
    EXISTS (SELECT 1 FROM consumed),
    GREATEST(1, CEIL(extract(epoch FROM ("v_window_ends_at" - clock_timestamp())))::integer);
END;
$$;
