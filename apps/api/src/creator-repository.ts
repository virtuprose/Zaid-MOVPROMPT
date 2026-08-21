import { createHash } from "node:crypto";

import { JsonObjectSchema, validateTemplateCampaignPayload } from "@movprompt/contracts";
import type {
  BusinessVertical,
  CampaignLanguage,
  CampaignGoal,
  ClaimDraftRequest,
  CreateProjectVersionRequest,
  CreatorProjectRecord,
  ProjectVersion,
  PresenterMode,
  PublicTemplate,
  ReplaceProjectSourceRequest,
} from "@movprompt/contracts";
import {
  canonicalizeGenerationConfiguration,
  schema,
  type UserScopedTransaction,
  withUserTransaction,
  type Database,
  type JsonObject,
} from "@movprompt/db";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

type QueryExecutor = Database | UserScopedTransaction;

type TemplateFilters = {
  vertical?: BusinessVertical;
  goal?: CampaignGoal;
  language?: CampaignLanguage;
};

type ProjectFilters = {
  status?: CreatorProjectRecord["status"];
  includeTrashed: boolean;
  search?: string;
};

export class CreatorRepositoryError extends Error {
  constructor(
    readonly code:
      | "project_not_found"
      | "template_not_found"
      | "parent_version_not_found"
      | "idempotency_conflict"
      | "invalid_campaign_configuration",
  ) {
    super(code);
    this.name = "CreatorRepositoryError";
  }
}

export interface CreatorRepository {
  listPublishedTemplates(filters: TemplateFilters): Promise<PublicTemplate[]>;
  findPublishedTemplate(slugOrId: string): Promise<PublicTemplate | null>;
  claimDraft(userId: string, input: ClaimDraftRequest): Promise<CreatorProjectRecord>;
  listProjects(userId: string, filters: ProjectFilters): Promise<CreatorProjectRecord[]>;
  findOwnedProject(userId: string, projectId: string): Promise<CreatorProjectRecord | null>;
  duplicateProject(userId: string, projectId: string, idempotencyKey: string): Promise<CreatorProjectRecord>;
  trashProject(userId: string, projectId: string): Promise<CreatorProjectRecord>;
  restoreProject(userId: string, projectId: string): Promise<CreatorProjectRecord>;
  createVersion(
    userId: string,
    projectId: string,
    input: CreateProjectVersionRequest,
    idempotencyKey: string,
  ): Promise<ProjectVersion>;
  replaceSource(input: {
    userId: string;
    projectId: string;
    parentVersionId: string;
    idempotencyKey: string;
    sourceFingerprint: string;
    sourceAssetIds: string[];
    input: Omit<ReplaceProjectSourceRequest, "source" | "parentVersionId"> & { parentVersionId: string };
  }): Promise<ProjectVersion>;
  listVersions(userId: string, projectId: string): Promise<ProjectVersion[]>;
  acceptVersion(userId: string, projectId: string, versionId: string): Promise<CreatorProjectRecord>;
  creditSummary(userId: string): Promise<{
    balance: number;
    reserved: number;
    available: number;
    starterRenderAvailable: boolean;
    ledger: Array<{
      id: string;
      kind: "purchase" | "grant" | "charge" | "refund" | "adjustment";
      delta: number;
      balanceAfter: number;
      reason: string;
      referenceType: string | null;
      referenceId: string | null;
      createdAt: string;
    }>;
  }>;
  findOwnedOutput(userId: string, projectId: string, runId: string): Promise<{
    bucket: string;
    objectKey: string;
  } | null>;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function templateScenes(value: unknown): PublicTemplate["scenes"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((scene) => {
    if (!scene || typeof scene !== "object" || Array.isArray(scene)) return [];
    const item = scene as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.purpose !== "string" ||
      typeof item.duration !== "number" ||
      typeof item.direction !== "string"
    ) return [];
    return [{
      id: item.id,
      title: item.title,
      purpose: item.purpose,
      duration: item.duration,
      headline: typeof item.headline === "string" ? item.headline : "",
      direction: item.direction,
    }];
  });
}

function localized(value: Record<string, string>, fallback: string): { en: string; ar: string } {
  const en = value.en?.trim() || fallback;
  const ar = value.ar?.trim() || en;
  return { en, ar };
}

function dialectPolicy(value: unknown): PublicTemplate["dialectPolicy"] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const policy = value as Record<string, unknown>;
    return {
      arabicDialect: "kuwaiti",
      locale: "ar-KW",
      register: policy.register === "polished" ? "polished" : "conversational",
      crossDialectFallback: false,
    };
  }
  return {
    arabicDialect: "kuwaiti",
    locale: "ar-KW",
    register: "conversational",
    crossDialectFallback: false,
  };
}

function qualityPolicy(value: unknown): PublicTemplate["qualityPolicy"] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const policy = value as Record<string, unknown>;
    return {
      tier: "premium",
      acceptanceScore:
        typeof policy.acceptanceScore === "number" ? policy.acceptanceScore : 85,
      internalRetryLimit:
        typeof policy.internalRetryLimit === "number" ? policy.internalRetryLimit : 2,
      hardGates: strings(policy.hardGates),
      scoredDimensions: strings(policy.scoredDimensions),
    };
  }
  return {
    tier: "premium",
    acceptanceScore: 85,
    internalRetryLimit: 2,
    hardGates: [],
    scoredDimensions: [],
  };
}

function templatePublic(row: {
  id: string;
  slug: string;
  category: string;
  versionId: string;
  versionNumber: number;
  localizedName: Record<string, string>;
  localizedDescription: Record<string, string>;
  recipe: JsonObject;
  supportedLanguages: string[];
  supportedRatios: string[];
  supportedMarkets: string[];
  durationSeconds: number;
  previewObjectKey: string | null;
  posterObjectKey: string | null;
}): PublicTemplate {
  const quality = row.recipe.qualityStatus;
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    versionId: row.versionId,
    versionNumber: row.versionNumber,
    name: localized(row.localizedName, row.slug),
    description: localized(row.localizedDescription, row.slug),
    outcome:
      typeof row.recipe.outcome === "string" && row.recipe.outcome.trim()
        ? row.recipe.outcome
        : "Create a clear campaign outcome",
    verticals: strings(row.recipe.verticals).filter((item): item is BusinessVertical =>
      ["salon", "clinic", "retail", "ecommerce"].includes(item),
    ),
    goals: strings(row.recipe.goals).filter((item): item is CampaignGoal =>
      ["whatsapp_orders", "bookings", "launch", "offer", "demonstration", "trust"].includes(item),
    ),
    durationSeconds: row.durationSeconds,
    supportedLanguages: row.supportedLanguages.filter(
      (item): item is "ar" | "en" | "bilingual" => ["ar", "en", "bilingual"].includes(item),
    ),
    supportedRatios: row.supportedRatios.filter(
      (item): item is "9:16" | "1:1" | "4:5" | "16:9" =>
        ["9:16", "1:1", "4:5", "16:9"].includes(item),
    ),
    supportedMarkets: row.supportedMarkets.filter((item): item is "KW" => item === "KW"),
    requiredInputs: strings(row.recipe.requiredInputs),
    presenterModes: strings(row.recipe.presenterModes).filter((item): item is PresenterMode =>
      ["none", "ai_ugc", "uploaded_spokesperson", "digital_twin"].includes(item),
    ),
    starterRenderEligible: row.recipe.starterRenderEligible === true,
    previewAvailable: Boolean(row.previewObjectKey),
    posterAvailable: Boolean(row.posterObjectKey),
    qualityStatus:
      quality === "approved" || quality === "review" || quality === "development"
        ? quality
        : "development",
    dialectPolicy: dialectPolicy(row.recipe.dialectPolicy),
    qualityPolicy: qualityPolicy(row.recipe.qualityPolicy),
    capabilityPolicy: strings(row.recipe.capabilityPolicy),
    tags: strings(row.recipe.tags),
    scenes: templateScenes(row.recipe.scenes),
  };
}

function versionPublic(row: typeof schema.creatorProjectVersions.$inferSelect): ProjectVersion {
  return {
    id: row.id,
    projectId: row.projectId,
    parentVersionId: row.parentVersionId,
    templateVersionId: row.templateVersionId,
    mode: row.mode,
    versionNumber: row.versionNumber,
    configuration: JsonObjectSchema.parse(row.configuration),
    productRecipe: JsonObjectSchema.parse(row.productRecipe),
    campaignRecipe: JsonObjectSchema.parse(row.campaignRecipe),
    changeReason: row.changeReason,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadProject(
  db: QueryExecutor,
  userId: string,
  projectId: string,
): Promise<CreatorProjectRecord | null> {
  const [project] = await db
    .select()
    .from(schema.creatorProjects)
    .where(and(eq(schema.creatorProjects.id, projectId), eq(schema.creatorProjects.userId, userId)))
    .limit(1);
  if (!project) return null;

  const workingVersionId = project.currentWorkingVersionId ?? project.currentAcceptedVersionId;
  const [currentVersion] = workingVersionId
    ? await db
        .select()
        .from(schema.creatorProjectVersions)
        .where(
          and(
            eq(schema.creatorProjectVersions.id, workingVersionId),
            eq(schema.creatorProjectVersions.projectId, project.id),
            eq(schema.creatorProjectVersions.userId, userId),
          ),
        )
        .limit(1)
    : [undefined];
  const [latestRenderRun] = workingVersionId
    ? await db
        .select({
          id: schema.renderRuns.id,
          projectVersionId: schema.renderRuns.projectVersionId,
          status: schema.renderRuns.status,
        })
        .from(schema.renderRuns)
        .where(
          and(
            eq(schema.renderRuns.projectId, project.id),
            eq(schema.renderRuns.projectVersionId, workingVersionId),
            eq(schema.renderRuns.userId, userId),
          ),
        )
        .orderBy(desc(schema.renderRuns.createdAt), desc(schema.renderRuns.id))
        .limit(1)
    : [undefined];
  const [counts] = await db
    .select({
      versions: sql<number>`count(distinct ${schema.creatorProjectVersions.id})::integer`,
      outputs: sql<number>`count(distinct ${schema.exports.id}) filter (where ${schema.exports.status} = 'completed')::integer`,
    })
    .from(schema.creatorProjects)
    .leftJoin(
      schema.creatorProjectVersions,
      and(
        eq(schema.creatorProjectVersions.projectId, schema.creatorProjects.id),
        eq(schema.creatorProjectVersions.userId, schema.creatorProjects.userId),
      ),
    )
    .leftJoin(
      schema.exports,
      and(
        eq(schema.exports.projectId, schema.creatorProjects.id),
        eq(schema.exports.userId, schema.creatorProjects.userId),
      ),
    )
    .where(and(eq(schema.creatorProjects.id, project.id), eq(schema.creatorProjects.userId, userId)));

  return {
    id: project.id,
    title: project.title,
    mode: project.mode,
    status: project.status,
    currentWorkingVersionId: workingVersionId ?? null,
    currentAcceptedVersionId: project.currentAcceptedVersionId,
    latestRenderRunId: latestRenderRun?.id ?? null,
    latestRenderProjectVersionId: latestRenderRun?.projectVersionId ?? null,
    latestRenderRunStatus: latestRenderRun?.status ?? null,
    deletedAt: project.deletedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    currentVersion: currentVersion ? versionPublic(currentVersion) : null,
    versionCount: Number(counts?.versions ?? 0),
    outputCount: Number(counts?.outputs ?? 0),
  };
}

function claimFingerprint(input: ClaimDraftRequest): string {
  return canonicalizeGenerationConfiguration({
    title: input.title,
    mode: input.mode,
    templateVersionId: input.templateVersionId ?? null,
    configuration: input.configuration,
    productRecipe: input.productRecipe,
    campaignRecipe: input.campaignRecipe,
  });
}

function versionFingerprint(version: typeof schema.creatorProjectVersions.$inferSelect, title: string): string {
  return canonicalizeGenerationConfiguration({
    title,
    mode: version.mode,
    templateVersionId: version.templateVersionId,
    configuration: version.configuration,
    productRecipe: version.productRecipe,
    campaignRecipe: version.campaignRecipe,
  });
}

function deterministicUuid(...parts: string[]): string {
  const bytes = createHash("sha256").update(parts.join("\0")).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function databaseConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return null;
    const candidate = current as { constraint_name?: unknown; cause?: unknown };
    if (typeof candidate.constraint_name === "string") return candidate.constraint_name;
    current = candidate.cause;
  }
  return null;
}

/**
 * API parsing is the first line of defence, but repository callers include
 * migrations and internal services. Re-validate Template Mode here so no
 * generic JSON path can persist fields that would later affect a quote or
 * provider request. Existing rows remain readable; only new writes require
 * the Phase 3 canonical form.
 */
function assertPersistableCampaign(input: {
  mode: ClaimDraftRequest["mode"];
  templateVersionId?: string | null | undefined;
  configuration: unknown;
  productRecipe: unknown;
  campaignRecipe: unknown;
}): void {
  const result = validateTemplateCampaignPayload(input);
  if (!result || result.success) return;
  throw new CreatorRepositoryError("invalid_campaign_configuration");
}

export function createDrizzleCreatorRepository(db: Database): CreatorRepository {
  async function ensurePublishedTemplateVersion(templateVersionId: string | null | undefined) {
    if (!templateVersionId) return;
    const [template] = await db
      .select({ id: schema.videoTemplateVersions.id })
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
    if (!template) throw new CreatorRepositoryError("template_not_found");
  }

  const repository: CreatorRepository = {
    async listPublishedTemplates(filters) {
      const rows = await db
        .select({
          id: schema.videoTemplates.id,
          slug: schema.videoTemplates.slug,
          category: schema.videoTemplates.category,
          versionId: schema.videoTemplateVersions.id,
          versionNumber: schema.videoTemplateVersions.versionNumber,
          localizedName: schema.videoTemplateVersions.localizedName,
          localizedDescription: schema.videoTemplateVersions.localizedDescription,
          recipe: schema.videoTemplateVersions.recipe,
          supportedLanguages: schema.videoTemplateVersions.supportedLanguages,
          supportedRatios: schema.videoTemplateVersions.supportedRatios,
          supportedMarkets: schema.videoTemplateVersions.supportedMarkets,
          durationSeconds: schema.videoTemplateVersions.durationSeconds,
          previewObjectKey: schema.videoTemplateVersions.previewObjectKey,
          posterObjectKey: schema.videoTemplateVersions.posterObjectKey,
        })
        .from(schema.videoTemplates)
        .innerJoin(
          schema.videoTemplateVersions,
          eq(schema.videoTemplateVersions.id, schema.videoTemplates.currentPublishedVersionId),
        )
        .where(
          and(
            eq(schema.videoTemplates.publishingState, "published"),
            isNotNull(schema.videoTemplateVersions.publishedAt),
          ),
        )
        .orderBy(schema.videoTemplates.category, schema.videoTemplates.slug);
      return rows
        .map(templatePublic)
        .filter(
          (template) =>
            (!filters.vertical || template.verticals.includes(filters.vertical)) &&
            (!filters.goal || template.goals.includes(filters.goal)) &&
            (!filters.language || template.supportedLanguages.includes(filters.language)),
        );
    },

    async findPublishedTemplate(slugOrId) {
      const templates = await this.listPublishedTemplates({});
      return templates.find((template) => template.slug === slugOrId || template.id === slugOrId) ?? null;
    },

    async claimDraft(userId, input) {
      assertPersistableCampaign(input);
      let result: string;
      try {
        result = await withUserTransaction(db, userId, async (tx) => {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.draftId}, 0))`);

          const [existing] = await tx
            .select()
            .from(schema.creatorProjects)
            .where(
              and(
                eq(schema.creatorProjects.userId, userId),
                eq(schema.creatorProjects.clientDraftId, input.draftId),
              ),
            )
            .limit(1);
          if (existing) {
            const existingVersionId = existing.currentWorkingVersionId ?? existing.currentAcceptedVersionId;
            const [version] = existingVersionId
              ? await tx
                  .select()
                  .from(schema.creatorProjectVersions)
                  .where(
                    and(
                      eq(schema.creatorProjectVersions.id, existingVersionId),
                      eq(schema.creatorProjectVersions.projectId, existing.id),
                      eq(schema.creatorProjectVersions.userId, userId),
                    ),
                  )
                  .limit(1)
              : [undefined];
            if (!version || claimFingerprint(input) !== versionFingerprint(version, existing.title)) {
              throw new CreatorRepositoryError("idempotency_conflict");
            }
            return existing.id;
          }

          if (input.templateVersionId) {
            const [template] = await tx
              .select({ id: schema.videoTemplateVersions.id })
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
                  eq(schema.videoTemplateVersions.id, input.templateVersionId),
                  isNotNull(schema.videoTemplateVersions.publishedAt),
                ),
              )
              .limit(1);
            if (!template) throw new CreatorRepositoryError("template_not_found");
          }

          const [project] = await tx
            .insert(schema.creatorProjects)
            .values({
              userId,
              title: input.title,
              mode: input.mode,
              status: "ready",
              clientDraftId: input.draftId,
            })
            .returning();
          if (!project) throw new Error("project_insert_failed");

          const [version] = await tx
            .insert(schema.creatorProjectVersions)
            .values({
              projectId: project.id,
              userId,
              mode: input.mode,
              versionNumber: 1,
              ...(input.templateVersionId ? { templateVersionId: input.templateVersionId } : {}),
              configuration: input.configuration,
              productRecipe: input.productRecipe,
              campaignRecipe: input.campaignRecipe,
              changeReason: "Guest draft claimed after authentication",
            })
            .returning();
          if (!version) throw new Error("project_version_insert_failed");

          await tx
            .update(schema.creatorProjects)
            .set({ currentWorkingVersionId: version.id, updatedAt: new Date() })
            .where(and(eq(schema.creatorProjects.id, project.id), eq(schema.creatorProjects.userId, userId)));

          return project.id;
        });
      } catch (error) {
        if (databaseConstraint(error) === "creator_projects_client_draft_unique") {
          throw new CreatorRepositoryError("idempotency_conflict");
        }
        throw error;
      }
      const project = await withUserTransaction(db, userId, (tx) => loadProject(tx, userId, result));
      if (!project) throw new Error("claimed_project_not_found");
      return project;
    },

    async listProjects(userId, filters) {
      return withUserTransaction(db, userId, async (tx) => {
        const conditions = [eq(schema.creatorProjects.userId, userId)];
        if (!filters.includeTrashed) conditions.push(isNull(schema.creatorProjects.deletedAt));
        if (filters.status) conditions.push(eq(schema.creatorProjects.status, filters.status));
        if (filters.search) conditions.push(ilike(schema.creatorProjects.title, `%${filters.search}%`));
        const rows = await tx
          .select({ id: schema.creatorProjects.id })
          .from(schema.creatorProjects)
          .where(and(...conditions))
          .orderBy(desc(schema.creatorProjects.updatedAt));
        const projects = await Promise.all(rows.map((row) => loadProject(tx, userId, row.id)));
        return projects.filter((project): project is CreatorProjectRecord => Boolean(project));
      });
    },

    findOwnedProject(userId, projectId) {
      return withUserTransaction(db, userId, (tx) => loadProject(tx, userId, projectId));
    },

    async duplicateProject(userId, projectId, idempotencyKey) {
      const draftId = deterministicUuid("movprompt-project-duplicate-v1", userId, projectId, idempotencyKey);
      const original = await this.findOwnedProject(userId, projectId);
      if (!original?.currentVersion || original.deletedAt) throw new CreatorRepositoryError("project_not_found");
      return this.claimDraft(userId, {
        draftId,
        title: `${original.title} copy`,
        mode: original.mode,
        ...(original.currentVersion.templateVersionId
          ? { templateVersionId: original.currentVersion.templateVersionId }
          : {}),
        configuration: {
          ...original.currentVersion.configuration,
          duplicateOfProjectId: projectId,
          duplicateOperationKey: idempotencyKey,
        },
        productRecipe: original.currentVersion.productRecipe,
        campaignRecipe: original.currentVersion.campaignRecipe,
      });
    },

    async trashProject(userId, projectId) {
      const existing = await this.findOwnedProject(userId, projectId);
      if (existing?.deletedAt) return existing;
      const [updated] = await withUserTransaction(db, userId, (tx) => tx
        .update(schema.creatorProjects)
        .set({ status: "trashed", deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(schema.creatorProjects.id, projectId),
            eq(schema.creatorProjects.userId, userId),
            isNull(schema.creatorProjects.deletedAt),
          ),
        )
        .returning({ id: schema.creatorProjects.id }));
      if (!updated) throw new CreatorRepositoryError("project_not_found");
      return (await this.findOwnedProject(userId, projectId))!;
    },

    async restoreProject(userId, projectId) {
      const existing = await this.findOwnedProject(userId, projectId);
      if (existing && !existing.deletedAt) return existing;
      const [updated] = await withUserTransaction(db, userId, (tx) => tx
        .update(schema.creatorProjects)
        .set({ status: "draft", deletedAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(schema.creatorProjects.id, projectId),
            eq(schema.creatorProjects.userId, userId),
            isNotNull(schema.creatorProjects.deletedAt),
          ),
        )
        .returning({ id: schema.creatorProjects.id }));
      if (!updated) throw new CreatorRepositoryError("project_not_found");
      return (await this.findOwnedProject(userId, projectId))!;
    },

    async createVersion(userId, projectId, input, idempotencyKey) {
      assertPersistableCampaign(input);
      await ensurePublishedTemplateVersion(input.templateVersionId);
      return withUserTransaction(db, userId, async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${projectId}:version`}, 0))`);
        const [project] = await tx
          .select()
          .from(schema.creatorProjects)
          .where(
            and(
              eq(schema.creatorProjects.id, projectId),
              eq(schema.creatorProjects.userId, userId),
              isNull(schema.creatorProjects.deletedAt),
            ),
          )
          .limit(1);
        if (!project) throw new CreatorRepositoryError("project_not_found");
        const [existingVersion] = await tx
          .select()
          .from(schema.creatorProjectVersions)
          .where(
            and(
              eq(schema.creatorProjectVersions.userId, userId),
              eq(schema.creatorProjectVersions.projectId, projectId),
              eq(schema.creatorProjectVersions.operationKey, idempotencyKey),
            ),
          )
          .limit(1);
        if (existingVersion) {
          const requested = canonicalizeGenerationConfiguration({
            parentVersionId: input.parentVersionId ?? null,
            templateVersionId: input.templateVersionId ?? null,
            mode: input.mode,
            configuration: input.configuration,
            productRecipe: input.productRecipe,
            campaignRecipe: input.campaignRecipe,
            changeReason: input.changeReason ?? null,
          });
          const persisted = canonicalizeGenerationConfiguration({
            parentVersionId: existingVersion.parentVersionId,
            templateVersionId: existingVersion.templateVersionId,
            mode: existingVersion.mode,
            configuration: existingVersion.configuration,
            productRecipe: existingVersion.productRecipe,
            campaignRecipe: existingVersion.campaignRecipe,
            changeReason: existingVersion.changeReason,
          });
          if (requested !== persisted) throw new CreatorRepositoryError("idempotency_conflict");
          return versionPublic(existingVersion);
        }
        if (input.parentVersionId) {
          const [parent] = await tx
            .select({ id: schema.creatorProjectVersions.id })
            .from(schema.creatorProjectVersions)
            .where(
              and(
                eq(schema.creatorProjectVersions.id, input.parentVersionId),
                eq(schema.creatorProjectVersions.projectId, projectId),
                eq(schema.creatorProjectVersions.userId, userId),
              ),
            )
            .limit(1);
          if (!parent) throw new CreatorRepositoryError("parent_version_not_found");
        }
        const [last] = await tx
          .select({ versionNumber: schema.creatorProjectVersions.versionNumber })
          .from(schema.creatorProjectVersions)
          .where(
            and(
              eq(schema.creatorProjectVersions.projectId, projectId),
              eq(schema.creatorProjectVersions.userId, userId),
            ),
          )
          .orderBy(desc(schema.creatorProjectVersions.versionNumber))
          .limit(1);
        const [version] = await tx
          .insert(schema.creatorProjectVersions)
          .values({
            projectId,
            userId,
            mode: input.mode,
            versionNumber: (last?.versionNumber ?? 0) + 1,
            ...(input.parentVersionId ? { parentVersionId: input.parentVersionId } : {}),
            ...(input.templateVersionId ? { templateVersionId: input.templateVersionId } : {}),
            configuration: input.configuration,
            productRecipe: input.productRecipe,
            campaignRecipe: input.campaignRecipe,
            ...(input.changeReason ? { changeReason: input.changeReason } : {}),
            operationKey: idempotencyKey,
          })
          .returning();
        if (!version) throw new Error("project_version_insert_failed");
        await tx
          .update(schema.creatorProjects)
          .set({
            mode: input.mode,
            status: "ready",
            currentWorkingVersionId: version.id,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.creatorProjects.id, projectId), eq(schema.creatorProjects.userId, userId)));
        return versionPublic(version);
      });
    },

    async replaceSource({ userId, projectId, parentVersionId, idempotencyKey, sourceFingerprint, sourceAssetIds, input }) {
      assertPersistableCampaign(input);
      await ensurePublishedTemplateVersion(input.templateVersionId);
      return withUserTransaction(db, userId, async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${projectId}:version`}, 0))`);
        const [project] = await tx
          .select({ id: schema.creatorProjects.id })
          .from(schema.creatorProjects)
          .where(and(eq(schema.creatorProjects.id, projectId), eq(schema.creatorProjects.userId, userId), isNull(schema.creatorProjects.deletedAt)))
          .limit(1);
        if (!project) throw new CreatorRepositoryError("project_not_found");

        const [existingVersion] = await tx
          .select()
          .from(schema.creatorProjectVersions)
          .where(and(
            eq(schema.creatorProjectVersions.userId, userId),
            eq(schema.creatorProjectVersions.projectId, projectId),
            eq(schema.creatorProjectVersions.operationKey, idempotencyKey),
          ))
          .limit(1);
        if (existingVersion) {
          const requested = canonicalizeGenerationConfiguration({
            parentVersionId,
            templateVersionId: input.templateVersionId ?? null,
            mode: input.mode,
            configuration: input.configuration,
            productRecipe: input.productRecipe,
            campaignRecipe: input.campaignRecipe,
            changeReason: "Source replaced",
          });
          const persisted = canonicalizeGenerationConfiguration({
            parentVersionId: existingVersion.parentVersionId,
            templateVersionId: existingVersion.templateVersionId,
            mode: existingVersion.mode,
            configuration: existingVersion.configuration,
            productRecipe: existingVersion.productRecipe,
            campaignRecipe: existingVersion.campaignRecipe,
            changeReason: existingVersion.changeReason,
          });
          if (requested !== persisted) throw new CreatorRepositoryError("idempotency_conflict");
          return versionPublic(existingVersion);
        }

        const [parent] = await tx
          .select({ id: schema.creatorProjectVersions.id })
          .from(schema.creatorProjectVersions)
          .where(and(
            eq(schema.creatorProjectVersions.id, parentVersionId),
            eq(schema.creatorProjectVersions.projectId, projectId),
            eq(schema.creatorProjectVersions.userId, userId),
          ))
          .limit(1);
        if (!parent) throw new CreatorRepositoryError("parent_version_not_found");

        const uniqueAssetIds = [...new Set(sourceAssetIds)];
        const ownedAssets = await tx
          .select({ id: schema.creatorProjectAssets.id })
          .from(schema.creatorProjectAssets)
          .where(and(
            eq(schema.creatorProjectAssets.projectId, projectId),
            eq(schema.creatorProjectAssets.userId, userId),
            inArray(schema.creatorProjectAssets.id, uniqueAssetIds),
          ));
        // Treat missing, stale, and cross-owner asset references identically.
        if (ownedAssets.length !== uniqueAssetIds.length) throw new CreatorRepositoryError("project_not_found");

        const [last] = await tx
          .select({ versionNumber: schema.creatorProjectVersions.versionNumber })
          .from(schema.creatorProjectVersions)
          .where(and(eq(schema.creatorProjectVersions.projectId, projectId), eq(schema.creatorProjectVersions.userId, userId)))
          .orderBy(desc(schema.creatorProjectVersions.versionNumber))
          .limit(1);
        const [version] = await tx
          .insert(schema.creatorProjectVersions)
          .values({
            projectId,
            userId,
            parentVersionId,
            mode: input.mode,
            versionNumber: (last?.versionNumber ?? 0) + 1,
            ...(input.templateVersionId ? { templateVersionId: input.templateVersionId } : {}),
            configuration: input.configuration,
            productRecipe: input.productRecipe,
            campaignRecipe: input.campaignRecipe,
            changeReason: "Source replaced",
            operationKey: idempotencyKey,
          })
          .returning();
        if (!version) throw new Error("project_version_insert_failed");
        if (String((version.configuration as Record<string, unknown>).sourceFingerprint) !== sourceFingerprint) {
          throw new Error("source_fingerprint_persistence_failed");
        }
        await tx
          .update(schema.creatorProjects)
          .set({ mode: input.mode, status: "ready", currentWorkingVersionId: version.id, updatedAt: new Date() })
          .where(and(eq(schema.creatorProjects.id, projectId), eq(schema.creatorProjects.userId, userId)));
        return versionPublic(version);
      });
    },

    async listVersions(userId, projectId) {
      return withUserTransaction(db, userId, async (tx) => {
        const project = await loadProject(tx, userId, projectId);
        if (!project || project.deletedAt) throw new CreatorRepositoryError("project_not_found");
        const versions = await tx
          .select()
          .from(schema.creatorProjectVersions)
          .where(
            and(
              eq(schema.creatorProjectVersions.projectId, projectId),
              eq(schema.creatorProjectVersions.userId, userId),
            ),
          )
          .orderBy(desc(schema.creatorProjectVersions.versionNumber));
        return versions.map(versionPublic);
      });
    },

    async acceptVersion(userId, projectId, versionId) {
      return withUserTransaction(db, userId, async (tx) => {
        const [version] = await tx
          .select({ id: schema.renderRuns.projectVersionId })
          .from(schema.renderRuns)
          .where(
            and(
              eq(schema.renderRuns.projectVersionId, versionId),
              eq(schema.renderRuns.projectId, projectId),
              eq(schema.renderRuns.userId, userId),
              eq(schema.renderRuns.status, "completed"),
            ),
          )
          .orderBy(desc(schema.renderRuns.completedAt), desc(schema.renderRuns.createdAt))
          .limit(1);
        if (!version) throw new CreatorRepositoryError("project_not_found");
        const [updated] = await tx
          .update(schema.creatorProjects)
          .set({
            currentWorkingVersionId: versionId,
            currentAcceptedVersionId: versionId,
            status: "completed",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.creatorProjects.id, projectId),
              eq(schema.creatorProjects.userId, userId),
              isNull(schema.creatorProjects.deletedAt),
            ),
          )
          .returning({ id: schema.creatorProjects.id });
        if (!updated) throw new CreatorRepositoryError("project_not_found");
        return (await loadProject(tx, userId, projectId))!;
      });
    },

    async creditSummary(userId) {
      return withUserTransaction(db, userId, async (tx) => {
      const [account] = await tx
        .select({ balance: schema.creditAccounts.balance })
        .from(schema.creditAccounts)
        .where(eq(schema.creditAccounts.userId, userId))
        .limit(1);
      const [holds] = await tx
        .select({ amount: sql<number>`coalesce(sum(${schema.creditReservations.amount}), 0)::integer` })
        .from(schema.creditReservations)
        .where(
          and(
            eq(schema.creditReservations.userId, userId),
            eq(schema.creditReservations.status, "reserved"),
          ),
        );
      const [entitlement] = await tx
        .select({ id: schema.entitlements.id })
        .from(schema.entitlements)
        .where(
          and(
            eq(schema.entitlements.userId, userId),
            eq(schema.entitlements.type, "starter_template_render"),
            eq(schema.entitlements.status, "available"),
          ),
        )
        .limit(1);
      const ledger = await tx
        .select({
          id: schema.creditLedger.id,
          kind: schema.creditLedger.kind,
          delta: schema.creditLedger.delta,
          balanceAfter: schema.creditLedger.balanceAfter,
          reason: schema.creditLedger.reason,
          referenceType: schema.creditLedger.referenceType,
          referenceId: schema.creditLedger.referenceId,
          createdAt: schema.creditLedger.createdAt,
        })
        .from(schema.creditLedger)
        .where(eq(schema.creditLedger.userId, userId))
        .orderBy(desc(schema.creditLedger.createdAt))
        .limit(50);
      const balance = account?.balance ?? 0;
      const reserved = Number(holds?.amount ?? 0);
      return {
        balance,
        reserved,
        available: Math.max(0, balance - reserved),
        starterRenderAvailable: Boolean(entitlement),
        ledger: ledger.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
      };
      });
    },

    async findOwnedOutput(userId, projectId, runId) {
      return withUserTransaction(db, userId, async (tx) => {
      const [run] = await tx
        .select({ bucket: schema.renderRuns.outputBucket, objectKey: schema.renderRuns.outputObjectKey })
        .from(schema.renderRuns)
        .where(
          and(
            eq(schema.renderRuns.id, runId),
            eq(schema.renderRuns.projectId, projectId),
            eq(schema.renderRuns.userId, userId),
            eq(schema.renderRuns.status, "completed"),
            isNotNull(schema.renderRuns.outputBucket),
            isNotNull(schema.renderRuns.outputObjectKey),
          ),
        )
        .limit(1);
      return run?.bucket && run.objectKey ? { bucket: run.bucket, objectKey: run.objectKey } : null;
      });
    },
  };

  return repository;
}
