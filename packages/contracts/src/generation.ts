import { z } from "zod";

import { CapabilityAliasSchema } from "./capabilities.js";
import { RequestIdSchema } from "./api.js";

const JsonPrimitiveSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

export type JsonValue =
  | z.infer<typeof JsonPrimitiveSchema>
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonPrimitiveSchema, z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema)]),
);

export const GenerationConfigurationSchema = z
  .object({
    prompt: z.string().trim().min(1).max(8_000),
    durationSeconds: z.number().int().min(1).max(60).optional(),
    aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]).optional(),
    references: z
      .array(
        z
          .object({
            objectKey: z.string().trim().min(1).max(1_024),
            mimeType: z.string().trim().min(1).max(255),
          })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .catchall(JsonValueSchema);

export type GenerationConfiguration = z.infer<typeof GenerationConfigurationSchema>;

export const CreateGenerationQuoteRequestSchema = z
  .object({
    capability: CapabilityAliasSchema,
    templateVersionId: z.uuid().optional(),
    projectVersionId: z.uuid().optional(),
    configuration: GenerationConfigurationSchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const authoritativeProjectQuote = input.projectVersionId !== undefined;
    const guestConfigurationQuote = input.configuration !== undefined;
    if (authoritativeProjectQuote === guestConfigurationQuote) {
      context.addIssue({
        code: "custom",
        message: "Provide either projectVersionId or configuration, but not both.",
        path: ["projectVersionId"],
      });
    }
    if (authoritativeProjectQuote && input.templateVersionId !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Template version is resolved from the owned project version.",
        path: ["templateVersionId"],
      });
    }
  });

export type CreateGenerationQuoteRequest = z.infer<typeof CreateGenerationQuoteRequestSchema>;

export const GenerationQuoteBreakdownItemSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    credits: z.number().int().nonnegative(),
  })
  .strict();

export const GenerationQuoteSchema = z
  .object({
    quoteId: z.uuid().nullable(),
    capability: CapabilityAliasSchema,
    credits: z.number().int().nonnegative(),
    entitlementEligible: z.boolean(),
    configurationHash: z.string().regex(/^[0-9a-f]{64}$/),
    pricingVersion: z.string().trim().min(1).max(100),
    expiresAt: z.iso.datetime(),
    breakdown: z.array(GenerationQuoteBreakdownItemSchema).min(1),
    estimateOnly: z.boolean(),
  })
  .strict();

export const GenerationQuoteResponseSchema = z
  .object({
    quote: GenerationQuoteSchema,
    requestId: RequestIdSchema,
  })
  .strict();

export type GenerationQuoteResponse = z.infer<typeof GenerationQuoteResponseSchema>;

export const StartRenderRunRequestSchema = z
  .object({
    projectId: z.uuid(),
    projectVersionId: z.uuid(),
    quoteId: z.uuid(),
    rightsAttested: z.literal(true),
  })
  .strict();

export type StartRenderRunRequest = z.infer<typeof StartRenderRunRequestSchema>;

export const RenderRunParametersSchema = z.object({ id: z.uuid() }).strict();

export const CancelRenderRunRequestSchema = z.object({}).strict();

export const RenderRunStatusSchema = z.enum([
  "submitting",
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelling",
  "cancelled",
]);

export const PublicRenderRunSchema = z
  .object({
    id: z.uuid(),
    projectId: z.uuid(),
    projectVersionId: z.uuid(),
    capability: CapabilityAliasSchema,
    quoteId: z.uuid(),
    quotedCredits: z.number().int().nonnegative(),
    chargedCredits: z.number().int().nonnegative(),
    starterEntitlementUsed: z.boolean(),
    status: RenderRunStatusSchema,
    outputAvailable: z.boolean(),
    error: z
      .object({
        code: z.string().trim().min(1),
        message: z.string().trim().min(1).optional(),
      })
      .strict()
      .nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
  })
  .strict();

export type PublicRenderRun = z.infer<typeof PublicRenderRunSchema>;

export const RenderRunResponseSchema = z
  .object({
    run: PublicRenderRunSchema,
    requestId: RequestIdSchema,
  })
  .strict();

export type RenderRunResponse = z.infer<typeof RenderRunResponseSchema>;
