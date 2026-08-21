import { createHash } from "node:crypto";
import {
  PresenterModeSchema,
  type CreationMode,
  TemplateQuoteEligibilitySchema,
  type PresenterMode,
  type TemplateQuoteEligibility,
} from "@movprompt/contracts";
import {
  hashGenerationConfiguration,
  schema,
  withUserTransaction,
  type Database,
  type JsonObject,
} from "@movprompt/db";
import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";

const STARTER_ENTITLEMENT_TYPE = "starter_template_render";
const STARTER_RECIPE_FLAG = "starterRenderEligible";

export type OwnedProjectVersion = {
  id: string;
  projectId: string;
  mode: CreationMode;
  templateVersionId: string | null;
  configuration: JsonObject;
  productRecipe?: JsonObject;
  campaignRecipe?: JsonObject;
};

export type PublishedTemplateVersion = {
  id: string;
  durationSeconds: number;
  starterRenderEligible: boolean;
  eligibility: TemplateQuoteEligibility | null;
  supportedLanguages: string[];
  presenterModes: PresenterMode[];
};

export type OwnedPresenterFootageAsset = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  durationMs: number | null;
};

export type OwnedGenerationQuote = {
  id: string;
  templateVersionId: string | null;
  capabilityAlias: string;
  credits: number;
  entitlementEligible: boolean;
  configurationHash: string;
  expiresAt: Date;
};

export type OwnedReferenceAsset = {
  objectKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type OwnedRenderRun = {
  id: string;
  projectId: string;
  projectVersionId: string;
  capabilityAlias: string;
  quoteId: string;
  quotedCredits: number;
  chargedCredits: number;
  starterEntitlementUsed: boolean;
  status: "submitting" | "queued" | "processing" | "completed" | "failed" | "cancelling" | "cancelled";
  processingStage: "preparing" | "rendering" | "securing_output" | "quality_review" | "ready" | "cancelling" | "failed" | "cancelled";
  provider: string | null;
  providerRequestId: string | null;
  outputBucket: string | null;
  outputObjectKey: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  chargedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface GenerationRepository {
  findOwnedProjectVersion(userId: string, projectVersionId: string): Promise<OwnedProjectVersion | null>;
  findOwnedReferenceAssets(
    userId: string,
    projectId: string,
    objectKeys: string[],
  ): Promise<OwnedReferenceAsset[]>;
  findOwnedPresenterFootageAsset(
    userId: string,
    projectId: string,
    assetId: string,
  ): Promise<OwnedPresenterFootageAsset | null>;
  findPublishedTemplateVersion(templateVersionId: string): Promise<PublishedTemplateVersion | null>;
  hasAvailableStarterEntitlement(userId: string): Promise<boolean>;
  findOwnedQuote(userId: string, quoteId: string): Promise<OwnedGenerationQuote | null>;
  findOwnedRun(userId: string, runId: string): Promise<OwnedRenderRun | null>;
  listOwnedRuns(userId: string, projectId: string | undefined, limit: number): Promise<OwnedRenderRun[]>;
  requestOutputRecovery(
    userId: string,
    runId: string,
    idempotencyKey: string,
    now: Date,
  ): Promise<OwnedRenderRun | null>;
  requestProviderCancellation(userId: string, runId: string, now: Date): Promise<OwnedRenderRun | null>;
}

function starterEligible(recipe: JsonObject): boolean {
  return recipe[STARTER_RECIPE_FLAG] === true;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function presenterModes(recipe: JsonObject, inputSchema: JsonObject): PresenterMode[] {
  const candidates = [...strings(recipe.presenterModes), ...strings(inputSchema.presenterModes)];
  return [...new Set(candidates)]
    .map((candidate) => PresenterModeSchema.safeParse(candidate))
    .flatMap((candidate) => candidate.success ? [candidate.data] : []);
}

function quoteEligibility(input: {
  recipe: JsonObject;
  supportedLanguages: string[];
  supportedRatios: string[];
  supportedMarkets: string[];
}): TemplateQuoteEligibility | null {
  const parsed = TemplateQuoteEligibilitySchema.safeParse({
    goals: strings(input.recipe.goals),
    supportedLanguages: input.supportedLanguages,
    supportedRatios: input.supportedRatios,
    supportedMarkets: input.supportedMarkets,
    requiredInputs: strings(input.recipe.requiredInputs),
    capabilityPolicy: strings(input.recipe.capabilityPolicy),
  });
  return parsed.success ? parsed.data : null;
}

export function createDrizzleGenerationRepository(db: Database): GenerationRepository {
  return {
    async findOwnedProjectVersion(userId, projectVersionId) {
      const [version] = await withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.creatorProjectVersions.id,
          projectId: schema.creatorProjectVersions.projectId,
          mode: schema.creatorProjectVersions.mode,
          templateVersionId: schema.creatorProjectVersions.templateVersionId,
          configuration: schema.creatorProjectVersions.configuration,
          productRecipe: schema.creatorProjectVersions.productRecipe,
          campaignRecipe: schema.creatorProjectVersions.campaignRecipe,
        })
        .from(schema.creatorProjectVersions)
        .innerJoin(
          schema.creatorProjects,
          and(
            eq(schema.creatorProjects.id, schema.creatorProjectVersions.projectId),
            eq(schema.creatorProjects.userId, schema.creatorProjectVersions.userId),
          ),
        )
        .where(
          and(
            eq(schema.creatorProjectVersions.id, projectVersionId),
            eq(schema.creatorProjectVersions.userId, userId),
            ne(schema.creatorProjects.status, "trashed"),
          ),
        )
        .limit(1));
      return version ?? null;
    },

    async findOwnedReferenceAssets(userId, projectId, objectKeys) {
      if (!objectKeys.length) return [];
      const rows = await withUserTransaction(db, userId, (tx) => tx
        .select({
          objectKey: schema.creatorProjectAssets.objectKey,
          bucket: schema.creatorProjectAssets.bucket,
          mimeType: schema.creatorProjectAssets.mimeType,
          sizeBytes: schema.creatorProjectAssets.sizeBytes,
          checksumSha256: schema.creatorProjectAssets.checksumSha256,
        })
        .from(schema.creatorProjectAssets)
        .innerJoin(
          schema.creatorProjects,
          and(
            eq(schema.creatorProjects.id, schema.creatorProjectAssets.projectId),
            eq(schema.creatorProjects.userId, schema.creatorProjectAssets.userId),
          ),
        )
        .where(
          and(
            eq(schema.creatorProjectAssets.projectId, projectId),
            eq(schema.creatorProjectAssets.userId, userId),
            inArray(schema.creatorProjectAssets.objectKey, objectKeys),
            inArray(schema.creatorProjectAssets.kind, ["product", "reference"]),
            ne(schema.creatorProjects.status, "trashed"),
          ),
        ));
      return rows.flatMap((row) => row.checksumSha256
        ? [{ ...row, checksumSha256: row.checksumSha256 }]
        : []);
    },

    async findOwnedPresenterFootageAsset(userId, projectId, assetId) {
      const [asset] = await withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.creatorProjectAssets.id,
          mimeType: schema.creatorProjectAssets.mimeType,
          sizeBytes: schema.creatorProjectAssets.sizeBytes,
          checksumSha256: schema.creatorProjectAssets.checksumSha256,
          durationMs: schema.creatorProjectAssets.durationMs,
        })
        .from(schema.creatorProjectAssets)
        .innerJoin(
          schema.creatorProjects,
          and(
            eq(schema.creatorProjects.id, schema.creatorProjectAssets.projectId),
            eq(schema.creatorProjects.userId, schema.creatorProjectAssets.userId),
          ),
        )
        .where(and(
          eq(schema.creatorProjectAssets.id, assetId),
          eq(schema.creatorProjectAssets.projectId, projectId),
          eq(schema.creatorProjectAssets.userId, userId),
          eq(schema.creatorProjectAssets.kind, "footage"),
          ne(schema.creatorProjects.status, "trashed"),
        ))
        .limit(1));
      return asset ?? null;
    },

    async findPublishedTemplateVersion(templateVersionId) {
      const [version] = await db
        .select({
          id: schema.videoTemplateVersions.id,
          durationSeconds: schema.videoTemplateVersions.durationSeconds,
          recipe: schema.videoTemplateVersions.recipe,
          inputSchema: schema.videoTemplateVersions.inputSchema,
          supportedLanguages: schema.videoTemplateVersions.supportedLanguages,
          supportedRatios: schema.videoTemplateVersions.supportedRatios,
          supportedMarkets: schema.videoTemplateVersions.supportedMarkets,
        })
        .from(schema.videoTemplateVersions)
        .innerJoin(
          schema.videoTemplates,
          and(
            eq(schema.videoTemplates.id, schema.videoTemplateVersions.templateId),
            eq(schema.videoTemplates.publishingState, "published"),
          ),
        )
        .where(
          and(
            eq(schema.videoTemplateVersions.id, templateVersionId),
            isNotNull(schema.videoTemplateVersions.publishedAt),
          ),
        )
        .limit(1);
      return version
        ? {
            id: version.id,
            durationSeconds: version.durationSeconds,
            starterRenderEligible: starterEligible(version.recipe),
            eligibility: quoteEligibility(version),
            supportedLanguages: version.supportedLanguages,
            presenterModes: presenterModes(version.recipe, version.inputSchema),
          }
        : null;
    },

    async hasAvailableStarterEntitlement(userId) {
      const [entitlement] = await withUserTransaction(db, userId, (tx) => tx
        .select({ id: schema.entitlements.id })
        .from(schema.entitlements)
        .where(
          and(
            eq(schema.entitlements.userId, userId),
            eq(schema.entitlements.type, STARTER_ENTITLEMENT_TYPE),
            eq(schema.entitlements.status, "available"),
          ),
        )
        .limit(1));
      return Boolean(entitlement);
    },

    async findOwnedQuote(userId, quoteId) {
      const [quote] = await withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.generationQuotes.id,
          templateVersionId: schema.generationQuotes.templateVersionId,
          capabilityAlias: schema.generationQuotes.capabilityAlias,
          credits: schema.generationQuotes.credits,
          entitlementEligible: schema.generationQuotes.entitlementEligible,
          configurationHash: schema.generationQuotes.configurationHash,
          expiresAt: schema.generationQuotes.expiresAt,
        })
        .from(schema.generationQuotes)
        .where(
          and(
            eq(schema.generationQuotes.id, quoteId),
            eq(schema.generationQuotes.userId, userId),
          ),
        )
        .limit(1));
      return quote ?? null;
    },

    async findOwnedRun(userId, runId) {
      const [run] = await withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.renderRuns.id,
          projectId: schema.renderRuns.projectId,
          projectVersionId: schema.renderRuns.projectVersionId,
          capabilityAlias: schema.renderRuns.capabilityAlias,
          quoteId: schema.renderRuns.quoteId,
          quotedCredits: schema.renderRuns.quotedCredits,
          chargedCredits: schema.renderRuns.chargedCredits,
          starterEntitlementUsed: schema.renderRuns.starterEntitlementUsed,
          status: schema.renderRuns.status,
          processingStage: schema.renderRuns.processingStage,
          provider: schema.renderRuns.provider,
          providerRequestId: schema.renderRuns.providerRequestId,
          outputBucket: schema.renderRuns.outputBucket,
          outputObjectKey: schema.renderRuns.outputObjectKey,
          errorCode: schema.renderRuns.errorCode,
          errorMessage: schema.renderRuns.errorMessage,
          chargedAt: schema.renderRuns.chargedAt,
          completedAt: schema.renderRuns.completedAt,
          createdAt: schema.renderRuns.createdAt,
          updatedAt: schema.renderRuns.updatedAt,
        })
        .from(schema.renderRuns)
        .where(and(eq(schema.renderRuns.id, runId), eq(schema.renderRuns.userId, userId)))
        .limit(1));
      return run ?? null;
    },

    async listOwnedRuns(userId, projectId, limit) {
      return withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.renderRuns.id,
          projectId: schema.renderRuns.projectId,
          projectVersionId: schema.renderRuns.projectVersionId,
          capabilityAlias: schema.renderRuns.capabilityAlias,
          quoteId: schema.renderRuns.quoteId,
          quotedCredits: schema.renderRuns.quotedCredits,
          chargedCredits: schema.renderRuns.chargedCredits,
          starterEntitlementUsed: schema.renderRuns.starterEntitlementUsed,
          status: schema.renderRuns.status,
          processingStage: schema.renderRuns.processingStage,
          provider: schema.renderRuns.provider,
          providerRequestId: schema.renderRuns.providerRequestId,
          outputBucket: schema.renderRuns.outputBucket,
          outputObjectKey: schema.renderRuns.outputObjectKey,
          errorCode: schema.renderRuns.errorCode,
          errorMessage: schema.renderRuns.errorMessage,
          chargedAt: schema.renderRuns.chargedAt,
          completedAt: schema.renderRuns.completedAt,
          createdAt: schema.renderRuns.createdAt,
          updatedAt: schema.renderRuns.updatedAt,
        })
        .from(schema.renderRuns)
        .innerJoin(
          schema.creatorProjects,
          and(
            eq(schema.creatorProjects.id, schema.renderRuns.projectId),
            eq(schema.creatorProjects.userId, schema.renderRuns.userId),
          ),
        )
        .where(and(
          eq(schema.renderRuns.userId, userId),
          ...(projectId ? [eq(schema.renderRuns.projectId, projectId)] : []),
          ne(schema.creatorProjects.status, "trashed"),
        ))
        .orderBy(desc(schema.renderRuns.createdAt), desc(schema.renderRuns.id))
        .limit(limit));
    },

    async requestOutputRecovery(userId, runId, idempotencyKey, now) {
      const recoveryKey = `render.output_recovery:${runId}:${createHash("sha256")
        .update(idempotencyKey)
        .digest("hex")
        .slice(0, 16)}`;
      const recovered = await withUserTransaction(db, userId, async (tx) => {
        const [row] = await tx
          .select({
            run: schema.renderRuns,
            configuration: schema.creatorProjectVersions.configuration,
          })
          .from(schema.renderRuns)
          .innerJoin(
            schema.creatorProjectVersions,
            and(
              eq(schema.creatorProjectVersions.id, schema.renderRuns.projectVersionId),
              eq(schema.creatorProjectVersions.projectId, schema.renderRuns.projectId),
              eq(schema.creatorProjectVersions.userId, schema.renderRuns.userId),
            ),
          )
          .where(and(eq(schema.renderRuns.id, runId), eq(schema.renderRuns.userId, userId)))
          .for("update")
          .limit(1);
        if (!row) return null;

        await tx
          .update(schema.renderRuns)
          .set({
            status: "processing",
            processingStage: "securing_output",
            errorCode: null,
            errorMessage: null,
            updatedAt: now,
          })
          .where(and(eq(schema.renderRuns.id, runId), eq(schema.renderRuns.userId, userId)));
        await tx
          .update(schema.renderAttempts)
          .set({ status: "processing", updatedAt: now })
          .where(and(
            eq(schema.renderAttempts.renderRunId, runId),
            eq(schema.renderAttempts.userId, userId),
            eq(schema.renderAttempts.attemptNumber, row.run.qualityAttempt),
          ));
        await tx
          .update(schema.creatorProjects)
          .set({ status: "generating", updatedAt: now })
          .where(and(
            eq(schema.creatorProjects.id, row.run.projectId),
            eq(schema.creatorProjects.userId, userId),
            eq(schema.creatorProjects.currentWorkingVersionId, row.run.projectVersionId),
          ));
        await tx
          .insert(schema.outboxJobs)
          .values({
            topic: "render.start",
            idempotencyKey: recoveryKey,
            payload: {
              runId: row.run.id,
              userId: row.run.userId,
              projectId: row.run.projectId,
              projectVersionId: row.run.projectVersionId,
              quoteId: row.run.quoteId,
              capabilityAlias: row.run.capabilityAlias,
              configurationHash: hashGenerationConfiguration(row.configuration),
              qualityAttempt: row.run.qualityAttempt,
            },
            status: "pending",
            availableAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: schema.outboxJobs.idempotencyKey });
        return row.run.id;
      });
      return recovered ? this.findOwnedRun(userId, recovered) : null;
    },

    async requestProviderCancellation(userId, runId, now) {
      const [updated] = await withUserTransaction(db, userId, (tx) => tx
        .update(schema.renderRuns)
        .set({ status: "cancelling", processingStage: "cancelling", updatedAt: now })
        .where(
          and(
            eq(schema.renderRuns.id, runId),
            eq(schema.renderRuns.userId, userId),
            inArray(schema.renderRuns.status, ["queued", "processing"]),
            isNotNull(schema.renderRuns.providerRequestId),
            isNotNull(schema.renderRuns.chargedAt),
          ),
        )
        .returning({ id: schema.renderRuns.id }));
      return updated ? this.findOwnedRun(userId, updated.id) : null;
    },
  };
}
