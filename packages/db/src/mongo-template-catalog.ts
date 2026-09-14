import { createHash } from "node:crypto";
import type { CreativeTemplateRecipe } from "@movprompt/creative-engine";
import type { MongoDatabase } from "./mongo-client.js";
import { COLLECTIONS } from "./mongo-client.js";

function stableObjectId(...parts: Array<string | number>): string {
  return createHash("sha256")
    .update(parts.join("\0"))
    .digest("hex")
    .slice(0, 24);
}

export function mongoTemplateCatalogDocuments(catalog: readonly CreativeTemplateRecipe[], now = new Date()) {
  const versions = catalog.map((template) => {
    const id = stableObjectId("movprompt-template-version", template.id, template.versionNumber);
    return {
      id,
      templateId: stableObjectId("movprompt-template", template.id),
      versionNumber: template.versionNumber,
      localizedName: template.localizedName,
      localizedDescription: template.localizedDescription,
      recipe: {
        outcome: template.outcome,
        verticals: template.verticals,
        goals: template.goals,
        requiredInputs: template.requiredInputs,
        presenterModes: template.capabilityPolicy.includes("presenter.ai_ugc") ? ["ai_ugc"] : ["none"],
        starterRenderEligible: template.starterRenderEligible,
        qualityStatus: template.qualityStatus,
        storyArc: template.storyArc,
        tone: template.tone,
        dialectPolicy: {
          arabicDialect: "kuwaiti",
          locale: "ar-KW",
          register: template.dialectRegister,
          crossDialectFallback: false,
        },
        visualSystem: template.visualSystem,
        soundDirection: template.soundDirection,
        capabilityPolicy: template.capabilityPolicy,
        protectedLayers: template.protectedLayers,
        complianceRules: template.complianceRules,
        qualityPolicy: template.qualityPolicy,
        tags: template.tags,
        scenes: template.scenes.map((scene) => ({
          id: scene.id,
          title: scene.title.en,
          purpose: scene.purpose.en,
          duration: scene.duration,
          headline: scene.headline.en,
          direction: scene.direction,
        })),
        sceneRecipe: template.scenes,
      },
      inputSchema: {
        type: "object",
        required: template.requiredInputs,
        properties: Object.fromEntries(template.requiredInputs.map((field) => [field, { type: "string" }])),
      },
      editSchema: {
        deterministic: ["headline", "price", "offer", "cta", "logo", "brand_color", "subtitles", "audio", "scene_order", "timing", "crop"],
        generative: ["visual_direction", "camera", "lighting", "motion", "setting"],
      },
      supportedLanguages: template.supportedLanguages,
      supportedRatios: template.supportedRatios,
      supportedMarkets: template.supportedMarkets,
      durationSeconds: template.durationSeconds,
      previewObjectKey: null,
      posterObjectKey: null,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  });
  const versionByTemplate = new Map(versions.map((version, index) => [catalog[index]!.id, version]));
  const templates = catalog.map((template) => ({
    id: stableObjectId("movprompt-template", template.id),
    slug: template.slug,
    category: template.category,
    publishingState: "published",
    currentPublishedVersionId: versionByTemplate.get(template.id)!.id,
    createdAt: now,
    updatedAt: now,
  }));
  return { templates, versions };
}

export async function ensureMongoTemplateCatalog(
  database: MongoDatabase,
  catalog: readonly CreativeTemplateRecipe[],
  options: { prune?: boolean } = {},
): Promise<void> {
  const documents = mongoTemplateCatalogDocuments(catalog);
  if (!documents.templates.length) return;
  await database.collection(COLLECTIONS.videoTemplateVersions).bulkWrite(
    documents.versions.map((version) => ({
      updateOne: {
        filter: { id: version.id },
        update: { $set: version },
        upsert: true,
      },
    })),
  );
  await database.collection(COLLECTIONS.videoTemplates).bulkWrite(
    documents.templates.map((template) => ({
      updateOne: {
        filter: { id: template.id },
        update: { $set: template },
        upsert: true,
      },
    })),
  );
  if (options.prune) {
    await database.collection(COLLECTIONS.videoTemplateVersions).deleteMany({
      id: { $nin: documents.versions.map((version) => version.id) },
    });
    await database.collection(COLLECTIONS.videoTemplates).deleteMany({
      id: { $nin: documents.templates.map((template) => template.id) },
    });
  }
}
