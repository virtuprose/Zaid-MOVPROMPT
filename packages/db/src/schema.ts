import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type JsonObject = Record<string, unknown>;

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const publishingState = pgEnum("publishing_state", ["draft", "published", "archived"]);
export const creationMode = pgEnum("creation_mode", ["template", "advanced"]);
export const projectStatus = pgEnum("project_status", [
  "draft",
  "ready",
  "generating",
  "review",
  "failed",
  "exporting",
  "completed",
  "trashed",
]);
export const assetKind = pgEnum("asset_kind", [
  "product",
  "logo",
  "audio",
  "reference",
  "generated",
  "export",
]);
export const entitlementStatus = pgEnum("entitlement_status", ["available", "reserved", "consumed"]);
export const renderStatus = pgEnum("render_status", [
  "submitting",
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelling",
  "cancelled",
]);
export const refundStatus = pgEnum("refund_status", ["not_required", "pending", "refunded"]);
export const exportStatus = pgEnum("export_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export const ledgerEntryKind = pgEnum("ledger_entry_kind", [
  "purchase",
  "grant",
  "charge",
  "refund",
  "adjustment",
]);
export const creditReservationStatus = pgEnum("credit_reservation_status", [
  "reserved",
  "charged",
  "released",
  "refunded",
]);
export const paymentOrderStatus = pgEnum("payment_order_status", [
  "created",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);
export const paymentEventStatus = pgEnum("payment_event_status", ["received", "processed", "ignored", "failed"]);
export const paymentAttemptStatus = pgEnum("payment_attempt_status", [
  "created",
  "pending",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
]);
export const paymentRefundStatus = pgEnum("payment_refund_status", [
  "requested",
  "processing",
  "succeeded",
  "failed",
]);
export const notificationSeverity = pgEnum("notification_severity", ["info", "success", "warning", "error"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "processing", "completed", "failed", "dead"]);

/** Better Auth core user table. Existing Supabase UUIDs can be inserted unchanged. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRole("role").notNull().default("user"),
    locale: text("locale").notNull().default("en"),
    legacySupabaseUserId: uuid("legacy_supabase_user_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
    uniqueIndex("users_legacy_supabase_id_unique").on(table.legacySupabaseUserId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expires_idx").on(table.expiresAt)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("accounts_provider_account_unique").on(table.providerId, table.accountId),
    index("accounts_user_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier), index("verifications_expires_idx").on(table.expiresAt)],
);

export const videoTemplates = pgTable(
  "video_templates",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    publishingState: publishingState("publishing_state").notNull().default("draft"),
    currentPublishedVersionId: uuid("current_published_version_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("video_templates_state_category_idx").on(table.publishingState, table.category)],
);

export const videoTemplateVersions = pgTable(
  "video_template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: text("template_id")
      .notNull()
      .references(() => videoTemplates.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    localizedName: jsonb("localized_name").$type<Record<string, string>>().notNull().default({}),
    localizedDescription: jsonb("localized_description").$type<Record<string, string>>().notNull().default({}),
    recipe: jsonb("recipe_json").$type<JsonObject>().notNull(),
    inputSchema: jsonb("input_schema").$type<JsonObject>().notNull().default({}),
    editSchema: jsonb("edit_schema").$type<JsonObject>().notNull().default({}),
    supportedLanguages: text("supported_languages").array().notNull().default(sql`ARRAY['en']::text[]`),
    supportedRatios: text("supported_ratios").array().notNull().default(sql`ARRAY['9:16']::text[]`),
    supportedMarkets: text("supported_markets")
      .array()
      .notNull()
      .default(sql`ARRAY['KW','SA','AE','QA','BH','OM']::text[]`),
    durationSeconds: integer("duration_seconds").notNull(),
    previewObjectKey: text("preview_object_key"),
    posterObjectKey: text("poster_object_key"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("template_versions_number_unique").on(table.templateId, table.versionNumber),
    unique("template_versions_id_template_unique").on(table.id, table.templateId),
    check("template_versions_positive_version", sql`${table.versionNumber} > 0`),
    check("template_versions_duration_range", sql`${table.durationSeconds} BETWEEN 3 AND 60`),
  ],
);

export const creatorProjects = pgTable(
  "creator_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled campaign"),
    mode: creationMode("mode").notNull().default("template"),
    status: projectStatus("status").notNull().default("draft"),
    currentAcceptedVersionId: uuid("current_accepted_version_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("creator_projects_id_user_unique").on(table.id, table.userId),
    index("creator_projects_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const creatorProjectVersions = pgTable(
  "creator_project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    parentVersionId: uuid("parent_version_id"),
    templateVersionId: uuid("template_version_id").references(() => videoTemplateVersions.id, { onDelete: "restrict" }),
    mode: creationMode("mode").notNull(),
    versionNumber: integer("version_number").notNull(),
    configuration: jsonb("configuration").$type<JsonObject>().notNull(),
    productRecipe: jsonb("product_recipe").$type<JsonObject>().notNull().default({}),
    campaignRecipe: jsonb("campaign_recipe").$type<JsonObject>().notNull().default({}),
    changeReason: text("change_reason"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("creator_versions_project_number_unique").on(table.projectId, table.versionNumber),
    unique("creator_versions_owner_tuple_unique").on(table.id, table.projectId, table.userId),
    foreignKey({
      name: "creator_versions_project_owner_fk",
      columns: [table.projectId, table.userId],
      foreignColumns: [creatorProjects.id, creatorProjects.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "creator_versions_parent_owner_fk",
      columns: [table.parentVersionId, table.projectId, table.userId],
      foreignColumns: [table.id, table.projectId, table.userId],
    }).onDelete("restrict"),
    check("creator_versions_positive_version", sql`${table.versionNumber} > 0`),
    index("creator_versions_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const creatorProjectAssets = pgTable(
  "creator_project_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    kind: assetKind("asset_kind").notNull(),
    bucket: text("storage_bucket").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256"),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    sourceMetadata: jsonb("source_metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    unique("creator_assets_bucket_key_unique").on(table.bucket, table.objectKey),
    foreignKey({
      name: "creator_assets_project_owner_fk",
      columns: [table.projectId, table.userId],
      foreignColumns: [creatorProjects.id, creatorProjects.userId],
    }).onDelete("cascade"),
    check("creator_assets_size_nonnegative", sql`${table.sizeBytes} >= 0`),
    check(
      "creator_assets_sha256_format",
      sql`${table.checksumSha256} IS NULL OR ${table.checksumSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    index("creator_assets_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const generationQuotes = pgTable(
  "generation_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    templateVersionId: uuid("template_version_id").references(() => videoTemplateVersions.id, { onDelete: "restrict" }),
    capabilityAlias: text("capability_alias").notNull(),
    credits: integer("credits").notNull(),
    entitlementEligible: boolean("entitlement_eligible").notNull().default(false),
    breakdown: jsonb("breakdown").$type<Array<{ label: string; credits: number }>>().notNull().default([]),
    configurationHash: text("configuration_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("generation_quotes_owner_tuple_unique").on(table.id, table.userId),
    check("generation_quotes_credits_nonnegative", sql`${table.credits} >= 0`),
    check("generation_quotes_capability_nonempty", sql`length(${table.capabilityAlias}) > 0`),
    index("generation_quotes_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export const renderRuns = pgTable(
  "render_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    projectVersionId: uuid("project_version_id").notNull(),
    userId: uuid("user_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    capabilityAlias: text("capability_alias").notNull(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => generationQuotes.id, { onDelete: "restrict" }),
    quotedCredits: integer("quoted_credits").notNull(),
    chargedCredits: integer("charged_credits").notNull().default(0),
    starterEntitlementUsed: boolean("starter_entitlement_used").notNull().default(false),
    status: renderStatus("status").notNull().default("submitting"),
    provider: text("provider"),
    providerRequestId: text("provider_request_id"),
    outputBucket: text("output_bucket"),
    outputObjectKey: text("output_object_key"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    refundStatus: refundStatus("refund_status").notNull().default("not_required"),
    chargedAt: timestamp("charged_at", { withTimezone: true }),
    providerAcceptedAt: timestamp("provider_accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("render_runs_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    unique("render_runs_owner_tuple_unique").on(table.id, table.projectId, table.projectVersionId, table.userId),
    unique("render_runs_id_user_unique").on(table.id, table.userId),
    foreignKey({
      name: "render_runs_project_owner_fk",
      columns: [table.projectId, table.userId],
      foreignColumns: [creatorProjects.id, creatorProjects.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "render_runs_version_owner_fk",
      columns: [table.projectVersionId, table.projectId, table.userId],
      foreignColumns: [creatorProjectVersions.id, creatorProjectVersions.projectId, creatorProjectVersions.userId],
    }).onDelete("restrict"),
    foreignKey({
      name: "render_runs_quote_owner_fk",
      columns: [table.quoteId, table.userId],
      foreignColumns: [generationQuotes.id, generationQuotes.userId],
    }).onDelete("restrict"),
    check("render_runs_quoted_credits_nonnegative", sql`${table.quotedCredits} >= 0`),
    check("render_runs_charged_credits_nonnegative", sql`${table.chargedCredits} >= 0`),
    index("render_runs_project_created_idx").on(table.projectId, table.createdAt),
    index("render_runs_reconcile_idx").on(table.status, table.updatedAt),
  ],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("entitlement_type").notNull(),
    status: entitlementStatus("status").notNull().default("available"),
    reservedRunId: uuid("reserved_run_id").references(() => renderRuns.id, { onDelete: "set null" }),
    reservedOperationKey: text("reserved_operation_key"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("entitlements_user_type_unique").on(table.userId, table.type),
    foreignKey({
      name: "entitlements_reserved_run_owner_fk",
      columns: [table.reservedRunId, table.userId],
      foreignColumns: [renderRuns.id, renderRuns.userId],
    }),
  ],
);

export const creditAccounts = pgTable("credit_accounts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lifetimePurchased: integer("lifetime_purchased").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  updatedAt: updatedAt(),
});

/**
 * A hold against a user's credit balance. The account balance is not debited
 * until the provider accepts the render, but active holds are included when
 * calculating available credit so concurrent renders cannot overspend it.
 */
export const creditReservations = pgTable(
  "credit_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    renderRunId: uuid("render_run_id").notNull(),
    amount: integer("amount").notNull(),
    status: creditReservationStatus("status").notNull().default("reserved"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    settlementReason: text("settlement_reason"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("credit_reservations_run_user_unique").on(table.renderRunId, table.userId),
    foreignKey({
      name: "credit_reservations_run_owner_fk",
      columns: [table.renderRunId, table.userId],
      foreignColumns: [renderRuns.id, renderRuns.userId],
    }).onDelete("cascade"),
    check("credit_reservations_amount_positive", sql`${table.amount} > 0`),
    index("credit_reservations_user_status_idx").on(table.userId, table.status),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: ledgerEntryKind("kind").notNull(),
    delta: integer("delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    check("credit_ledger_delta_nonzero", sql`${table.delta} <> 0`),
    check("credit_ledger_balance_nonnegative", sql`${table.balanceAfter} >= 0`),
    index("credit_ledger_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    projectVersionId: uuid("project_version_id").notNull(),
    renderRunId: uuid("render_run_id"),
    userId: uuid("user_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    codec: text("codec").notNull().default("h264"),
    preset: text("preset").notNull(),
    status: exportStatus("status").notNull().default("queued"),
    outputBucket: text("output_bucket"),
    outputObjectKey: text("output_object_key"),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    unique("exports_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    unique("exports_artifact_unique").on(
      table.projectVersionId,
      table.aspectRatio,
      table.resolution,
      table.preset,
    ),
    foreignKey({
      name: "exports_project_owner_fk",
      columns: [table.projectId, table.userId],
      foreignColumns: [creatorProjects.id, creatorProjects.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "exports_version_owner_fk",
      columns: [table.projectVersionId, table.projectId, table.userId],
      foreignColumns: [creatorProjectVersions.id, creatorProjectVersions.projectId, creatorProjectVersions.userId],
    }).onDelete("restrict"),
    foreignKey({
      name: "exports_render_owner_fk",
      columns: [table.renderRunId, table.projectId, table.projectVersionId, table.userId],
      foreignColumns: [renderRuns.id, renderRuns.projectId, renderRuns.projectVersionId, renderRuns.userId],
    }).onDelete("restrict"),
    check("exports_aspect_ratio_allowed", sql`${table.aspectRatio} IN ('9:16','1:1','4:5','16:9')`),
    check("exports_resolution_allowed", sql`${table.resolution} IN ('720p','1080p')`),
    index("exports_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const paymentBundles = pgTable(
  "payment_bundles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    credits: integer("credits").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    active: boolean("active").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("payment_bundles_code_version_unique").on(table.code, table.version),
    check("payment_bundles_version_positive", sql`${table.version} > 0`),
    check("payment_bundles_credits_positive", sql`${table.credits} > 0`),
    check("payment_bundles_amount_positive", sql`${table.amountMinor} > 0`),
    check("payment_bundles_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => paymentBundles.id, { onDelete: "restrict" }),
    merchantReference: text("merchant_reference").notNull().unique(),
    provider: text("provider").notNull().default("upayments"),
    providerPaymentId: text("provider_payment_id"),
    status: paymentOrderStatus("status").notNull().default("created"),
    creditsSnapshot: integer("credits_snapshot").notNull(),
    amountMinorSnapshot: integer("amount_minor_snapshot").notNull(),
    currencySnapshot: text("currency_snapshot").notNull(),
    pendingGenerationId: text("pending_generation_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("payment_orders_provider_payment_unique").on(table.provider, table.providerPaymentId),
    unique("payment_orders_id_user_unique").on(table.id, table.userId),
    check("payment_orders_credits_positive", sql`${table.creditsSnapshot} > 0`),
    check("payment_orders_amount_positive", sql`${table.amountMinorSnapshot} > 0`),
    index("payment_orders_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentOrderId: uuid("payment_order_id")
      .notNull()
      .references(() => paymentOrders.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    provider: text("provider").notNull().default("upayments"),
    providerSessionId: text("provider_session_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: paymentAttemptStatus("status").notNull().default("created"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("payment_attempts_order_number_unique").on(table.paymentOrderId, table.attemptNumber),
    uniqueIndex("payment_attempts_provider_session_unique").on(table.provider, table.providerSessionId),
    check("payment_attempts_number_positive", sql`${table.attemptNumber} > 0`),
    index("payment_attempts_order_created_idx").on(table.paymentOrderId, table.createdAt),
  ],
);

export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentOrderId: uuid("payment_order_id").notNull(),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull().default("upayments"),
    providerRefundId: text("provider_refund_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: paymentRefundStatus("status").notNull().default("requested"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    creditsReversed: integer("credits_reversed").notNull().default(0),
    reason: text("reason").notNull(),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_refunds_provider_id_unique").on(table.provider, table.providerRefundId),
    foreignKey({
      name: "payment_refunds_order_owner_fk",
      columns: [table.paymentOrderId, table.userId],
      foreignColumns: [paymentOrders.id, paymentOrders.userId],
    }).onDelete("restrict"),
    check("payment_refunds_amount_positive", sql`${table.amountMinor} > 0`),
    check("payment_refunds_credits_nonnegative", sql`${table.creditsReversed} >= 0`),
    index("payment_refunds_order_created_idx").on(table.paymentOrderId, table.createdAt),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentOrderId: uuid("payment_order_id").references(() => paymentOrders.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    status: paymentEventStatus("status").notNull().default("received"),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    errorMessage: text("error_message"),
    receivedAt: createdAt(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    unique("payment_events_provider_event_unique").on(table.provider, table.providerEventId),
    index("payment_events_order_idx").on(table.paymentOrderId, table.receivedAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: notificationSeverity("severity").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    requestId: text("request_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    before: jsonb("before_state").$type<JsonObject>(),
    after: jsonb("after_state").$type<JsonObject>(),
    metadata: jsonb("metadata").$type<JsonObject>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("audit_logs_target_idx").on(table.targetType, table.targetId, table.createdAt),
  ],
);

/** Transactional outbox used by durable generation, export and notification workers. */
export const outboxJobs = pgTable(
  "outbox_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: text("topic").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("outbox_attempts_nonnegative", sql`${table.attempts} >= 0`),
    check("outbox_max_attempts_positive", sql`${table.maxAttempts} > 0`),
    index("outbox_claim_idx").on(table.status, table.availableAt),
  ],
);

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  videoTemplates,
  videoTemplateVersions,
  creatorProjects,
  creatorProjectVersions,
  creatorProjectAssets,
  generationQuotes,
  renderRuns,
  entitlements,
  creditAccounts,
  creditReservations,
  creditLedger,
  exports,
  paymentBundles,
  paymentOrders,
  paymentAttempts,
  paymentRefunds,
  paymentEvents,
  notifications,
  auditLogs,
  outboxJobs,
};

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CreatorProject = typeof creatorProjects.$inferSelect;
export type CreatorProjectVersion = typeof creatorProjectVersions.$inferSelect;
export type RenderRun = typeof renderRuns.$inferSelect;
export type CreditReservation = typeof creditReservations.$inferSelect;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
