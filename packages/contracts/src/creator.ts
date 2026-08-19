import { z } from "zod";

import { IdempotencyKeySchema, RequestIdSchema } from "./api.js";
import { JsonValueSchema, RenderRunStatusSchema } from "./generation.js";

export const CreationModeSchema = z.enum(["template", "advanced"]);
export type CreationMode = z.infer<typeof CreationModeSchema>;

export const CampaignSourceKindSchema = z.enum([
  "product_url",
  "business_url",
  "product_upload",
  "service_manual",
  "real_footage",
]);
export type CampaignSourceKind = z.infer<typeof CampaignSourceKindSchema>;

export const BusinessVerticalSchema = z.enum(["salon", "clinic", "retail", "ecommerce"]);
export type BusinessVertical = z.infer<typeof BusinessVerticalSchema>;

export const CampaignGoalSchema = z.enum([
  "whatsapp_orders",
  "bookings",
  "launch",
  "offer",
  "demonstration",
  "trust",
]);
export type CampaignGoal = z.infer<typeof CampaignGoalSchema>;

export const PresenterModeSchema = z.enum([
  "none",
  "ai_ugc",
  "uploaded_spokesperson",
  "digital_twin",
]);
export type PresenterMode = z.infer<typeof PresenterModeSchema>;

export const CampaignLanguageSchema = z.enum(["ar", "en", "bilingual"]);
export type CampaignLanguage = z.infer<typeof CampaignLanguageSchema>;
export const CampaignRatioSchema = z.enum(["9:16", "1:1", "4:5", "16:9"]);
export const ProjectStatusSchema = z.enum([
  "draft",
  "ready",
  "generating",
  "review",
  "failed",
  "exporting",
  "completed",
  "trashed",
]);

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);

const LocalizedTextSchema = z
  .object({
    en: z.string().trim().min(1).max(240),
    ar: z.string().trim().min(1).max(240),
  })
  .strict();

export const PublicTemplateSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    versionId: z.uuid(),
    versionNumber: z.number().int().positive(),
    name: LocalizedTextSchema,
    description: LocalizedTextSchema,
    outcome: z.string().trim().min(1).max(240),
    verticals: z.array(BusinessVerticalSchema),
    goals: z.array(CampaignGoalSchema),
    durationSeconds: z.number().int().min(3).max(60),
    supportedLanguages: z.array(CampaignLanguageSchema),
    supportedRatios: z.array(CampaignRatioSchema),
    supportedMarkets: z.array(z.literal("KW")),
    requiredInputs: z.array(z.string().trim().min(1).max(80)),
    starterRenderEligible: z.boolean(),
    previewAvailable: z.boolean(),
    posterAvailable: z.boolean(),
    qualityStatus: z.enum(["development", "review", "approved"]),
    dialectPolicy: z
      .object({
        arabicDialect: z.literal("kuwaiti"),
        locale: z.literal("ar-KW"),
        register: z.enum(["polished", "conversational"]),
        crossDialectFallback: z.literal(false),
      })
      .strict(),
    qualityPolicy: z
      .object({
        tier: z.literal("premium"),
        acceptanceScore: z.number().int().min(1).max(100),
        internalRetryLimit: z.number().int().min(0).max(3),
        hardGates: z.array(z.string().trim().min(1)),
        scoredDimensions: z.array(z.string().trim().min(1)),
      })
      .strict(),
    capabilityPolicy: z.array(z.string().trim().min(1)),
    tags: z.array(z.string().trim().min(1)),
    scenes: z.array(
      z.object({
        id: z.string().trim().min(1).max(120),
        title: z.string().trim().min(1).max(160),
        purpose: z.string().trim().min(1).max(240),
        duration: z.number().int().min(1).max(60),
        headline: z.string().trim().max(240),
        direction: z.string().trim().min(1).max(2_000),
      }).strict(),
    ),
  })
  .strict();
export type PublicTemplate = z.infer<typeof PublicTemplateSchema>;

export const TemplateListQuerySchema = z
  .object({
    vertical: BusinessVerticalSchema.optional(),
    goal: CampaignGoalSchema.optional(),
    language: CampaignLanguageSchema.optional(),
  })
  .strict();

export const TemplateListResponseSchema = z
  .object({ templates: z.array(PublicTemplateSchema), requestId: RequestIdSchema })
  .strict();
export type TemplateListResponse = z.infer<typeof TemplateListResponseSchema>;

export const TemplateResponseSchema = z
  .object({ template: PublicTemplateSchema, requestId: RequestIdSchema })
  .strict();
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;

export const ProjectVersionSchema = z
  .object({
    id: z.uuid(),
    projectId: z.uuid(),
    parentVersionId: z.uuid().nullable(),
    templateVersionId: z.uuid().nullable(),
    mode: CreationModeSchema,
    versionNumber: z.number().int().positive(),
    configuration: JsonObjectSchema,
    productRecipe: JsonObjectSchema,
    campaignRecipe: JsonObjectSchema,
    changeReason: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();
export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;

export const CreatorProjectSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    mode: CreationModeSchema,
    status: ProjectStatusSchema,
    currentWorkingVersionId: z.uuid().nullable(),
    currentAcceptedVersionId: z.uuid().nullable(),
    latestRenderRunId: z.uuid().nullable(),
    latestRenderProjectVersionId: z.uuid().nullable(),
    latestRenderRunStatus: RenderRunStatusSchema.nullable(),
    deletedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    currentVersion: ProjectVersionSchema.nullable(),
    versionCount: z.number().int().nonnegative(),
    outputCount: z.number().int().nonnegative(),
  })
  .strict();
export type CreatorProjectRecord = z.infer<typeof CreatorProjectSchema>;

export const ProjectListQuerySchema = z
  .object({
    status: ProjectStatusSchema.optional(),
    includeTrashed: z.enum(["true", "false"]).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();

export const ProjectListResponseSchema = z
  .object({ projects: z.array(CreatorProjectSchema), requestId: RequestIdSchema })
  .strict();
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

export const ProjectResponseSchema = z
  .object({ project: CreatorProjectSchema, requestId: RequestIdSchema })
  .strict();
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export const ProjectVersionListResponseSchema = z
  .object({ versions: z.array(ProjectVersionSchema), requestId: RequestIdSchema })
  .strict();
export type ProjectVersionListResponse = z.infer<typeof ProjectVersionListResponseSchema>;

export const ProjectVersionResponseSchema = z
  .object({ version: ProjectVersionSchema, requestId: RequestIdSchema })
  .strict();
export type ProjectVersionResponse = z.infer<typeof ProjectVersionResponseSchema>;

const ProjectConfigurationInput = {
  title: z.string().trim().min(1).max(160),
  mode: CreationModeSchema,
  templateVersionId: z.uuid().optional(),
  configuration: JsonObjectSchema,
  productRecipe: JsonObjectSchema.default({}),
  campaignRecipe: JsonObjectSchema.default({}),
} as const;

export const ClaimDraftRequestSchema = z
  .object({
    draftId: z.uuid(),
    ...ProjectConfigurationInput,
  })
  .strict();
export type ClaimDraftRequest = z.infer<typeof ClaimDraftRequestSchema>;

export const CreateProjectVersionRequestSchema = z
  .object({
    parentVersionId: z.uuid().nullable().optional(),
    templateVersionId: z.uuid().optional(),
    mode: CreationModeSchema,
    configuration: JsonObjectSchema,
    productRecipe: JsonObjectSchema.default({}),
    campaignRecipe: JsonObjectSchema.default({}),
    changeReason: z.string().trim().min(1).max(240).optional(),
  })
  .strict();
export type CreateProjectVersionRequest = z.infer<typeof CreateProjectVersionRequestSchema>;

const SourceReplacementFactsSchema = z
  .object({
    type: z.enum(["product_link", "business_link", "upload"]),
    name: z.string().trim().max(240),
    description: z.string().trim().max(4_000),
    price: z.string().trim().max(120),
    brand: z.string().trim().max(240),
    assetIds: z.array(z.uuid()).min(1).max(5),
  })
  .strict();

/** A source replacement is distinct from an ordinary campaign edit: it invalidates current output. */
export const ReplaceProjectSourceRequestSchema = z
  .object({
    parentVersionId: z.uuid(),
    templateVersionId: z.uuid().optional(),
    mode: CreationModeSchema,
    configuration: JsonObjectSchema,
    productRecipe: JsonObjectSchema.default({}),
    campaignRecipe: JsonObjectSchema.default({}),
    source: SourceReplacementFactsSchema,
  })
  .strict();
export type ReplaceProjectSourceRequest = z.infer<typeof ReplaceProjectSourceRequestSchema>;

export const ReplaceProjectSourceResponseSchema = z
  .object({ version: ProjectVersionSchema, sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/), requestId: RequestIdSchema })
  .strict();
export type ReplaceProjectSourceResponse = z.infer<typeof ReplaceProjectSourceResponseSchema>;

export const AcceptProjectVersionRequestSchema = z
  .object({ versionId: z.uuid() })
  .strict();

export const ProjectRouteParametersSchema = z
  .object({ projectId: z.uuid(), versionId: z.uuid().optional(), runId: z.uuid().optional() })
  .strict();

export const EmptyMutationRequestSchema = z.object({}).strict();

export const CreditLedgerEntrySchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["purchase", "grant", "charge", "refund", "adjustment"]),
    delta: z.number().int(),
    balanceAfter: z.number().int().nonnegative(),
    reason: z.string(),
    referenceType: z.string().nullable(),
    referenceId: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const CreditSummaryResponseSchema = z
  .object({
    balance: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    starterRenderAvailable: z.boolean(),
    ledger: z.array(CreditLedgerEntrySchema),
    requestId: RequestIdSchema,
  })
  .strict();
export type CreditSummaryResponse = z.infer<typeof CreditSummaryResponseSchema>;

export const SourceScanRequestSchema = z
  .object({ url: z.url().max(2_048) })
  .strict();

export const ConfirmedFactSchema = z
  .object({
    field: z.enum([
      "name",
      "description",
      "price",
      "offer",
      "location",
      "booking_url",
      "whatsapp",
      "logo",
      "brand_color",
    ]),
    value: z.string().trim().min(1).max(2_000),
    provenance: z.enum(["imported", "user_confirmed", "manual"]),
  })
  .strict();

export const SourceScanResponseSchema = z
  .object({
    kind: z.enum(["product", "business"]),
    canonicalUrl: z.url(),
    facts: z.array(ConfirmedFactSchema),
    imageCandidates: z.array(z.url()).max(8),
    warnings: z.array(z.string()),
    scannedAt: z.iso.datetime(),
    requestId: RequestIdSchema,
  })
  .strict();
export type SourceScanResponse = z.infer<typeof SourceScanResponseSchema>;

export const OutputDownloadResponseSchema = z
  .object({
    runId: z.uuid(),
    projectId: z.uuid(),
    download: z
      .object({ method: z.literal("GET"), url: z.url(), expiresInSeconds: z.number().int().positive() })
      .strict(),
    requestId: RequestIdSchema,
  })
  .strict();
export type OutputDownloadResponse = z.infer<typeof OutputDownloadResponseSchema>;

// Keep the shared idempotency contract discoverable from the creator module.
export const CreatorIdempotencyKeySchema = IdempotencyKeySchema;
