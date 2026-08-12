import { schema, type Database, type JsonObject } from "@movprompt/db";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

const STARTER_ENTITLEMENT_TYPE = "starter_template_render";
const STARTER_RECIPE_FLAG = "starterRenderEligible";

export type OwnedProjectVersion = {
  id: string;
  projectId: string;
  templateVersionId: string | null;
  configuration: JsonObject;
};

export type PublishedTemplateVersion = {
  id: string;
  durationSeconds: number;
  starterRenderEligible: boolean;
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
  findPublishedTemplateVersion(templateVersionId: string): Promise<PublishedTemplateVersion | null>;
  hasAvailableStarterEntitlement(userId: string): Promise<boolean>;
  findOwnedQuote(userId: string, quoteId: string): Promise<OwnedGenerationQuote | null>;
  findOwnedRun(userId: string, runId: string): Promise<OwnedRenderRun | null>;
  requestProviderCancellation(userId: string, runId: string, now: Date): Promise<OwnedRenderRun | null>;
}

function starterEligible(recipe: JsonObject): boolean {
  return recipe[STARTER_RECIPE_FLAG] === true;
}

export function createDrizzleGenerationRepository(db: Database): GenerationRepository {
  return {
    async findOwnedProjectVersion(userId, projectVersionId) {
      const [version] = await db
        .select({
          id: schema.creatorProjectVersions.id,
          projectId: schema.creatorProjectVersions.projectId,
          templateVersionId: schema.creatorProjectVersions.templateVersionId,
          configuration: schema.creatorProjectVersions.configuration,
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
        .limit(1);
      return version ?? null;
    },

    async findPublishedTemplateVersion(templateVersionId) {
      const [version] = await db
        .select({
          id: schema.videoTemplateVersions.id,
          durationSeconds: schema.videoTemplateVersions.durationSeconds,
          recipe: schema.videoTemplateVersions.recipe,
        })
        .from(schema.videoTemplateVersions)
        .innerJoin(
          schema.videoTemplates,
          and(
            eq(schema.videoTemplates.id, schema.videoTemplateVersions.templateId),
            eq(schema.videoTemplates.currentPublishedVersionId, schema.videoTemplateVersions.id),
          ),
        )
        .where(
          and(
            eq(schema.videoTemplateVersions.id, templateVersionId),
            eq(schema.videoTemplates.publishingState, "published"),
            isNotNull(schema.videoTemplateVersions.publishedAt),
          ),
        )
        .limit(1);
      return version
        ? {
            id: version.id,
            durationSeconds: version.durationSeconds,
            starterRenderEligible: starterEligible(version.recipe),
          }
        : null;
    },

    async hasAvailableStarterEntitlement(userId) {
      const [entitlement] = await db
        .select({ id: schema.entitlements.id })
        .from(schema.entitlements)
        .where(
          and(
            eq(schema.entitlements.userId, userId),
            eq(schema.entitlements.type, STARTER_ENTITLEMENT_TYPE),
            eq(schema.entitlements.status, "available"),
          ),
        )
        .limit(1);
      return Boolean(entitlement);
    },

    async findOwnedQuote(userId, quoteId) {
      const [quote] = await db
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
        .limit(1);
      return quote ?? null;
    },

    async findOwnedRun(userId, runId) {
      const [run] = await db
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
        .limit(1);
      return run ?? null;
    },

    async requestProviderCancellation(userId, runId, now) {
      const [updated] = await db
        .update(schema.renderRuns)
        .set({ status: "cancelling", updatedAt: now })
        .where(
          and(
            eq(schema.renderRuns.id, runId),
            eq(schema.renderRuns.userId, userId),
            inArray(schema.renderRuns.status, ["queued", "processing"]),
            isNotNull(schema.renderRuns.providerRequestId),
            isNotNull(schema.renderRuns.chargedAt),
          ),
        )
        .returning({ id: schema.renderRuns.id });
      return updated ? this.findOwnedRun(userId, updated.id) : null;
    },
  };
}
