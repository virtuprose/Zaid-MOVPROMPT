import type { ClaimDraftRequest, CreatorProjectRecord } from "@movprompt/contracts";
import { ENGINE_VERSION, getCreativeTemplate, type CreativeBrief } from "@movprompt/creative-engine";

import { isFeatureEnabled } from "@/config/features";
import { PortableApiError, portableCreatorApi } from "@/lib/api/portableApiClient";
import { sanitizeCreatorProjectOutput } from "./creatorProjectOutput";
import { hydrateCloudProject, stableProjectConfiguration } from "./portableProjectMapper";
import { campaignFactValue, campaignSourceForProject } from "./sourceFacts";
import { normalizeCreatorResolution, type CreatorProject } from "./types";

const STORAGE_KEY = "movprompt.creator-projects.v2";
const CHANGE_EVENT = "movprompt:creator-projects-changed";

function storageKey(userId?: string | null) {
  return `${STORAGE_KEY}:${userId || "signed-out"}`;
}

function readLocal(userId?: string | null): CreatorProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(parsed)
      ? parsed.map((project) => sanitizeCreatorProjectOutput({ ...project, resolution: normalizeCreatorResolution(project?.resolution) }))
      : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: CreatorProject[], userId?: string | null) {
  // Signed output URLs are short-lived capabilities, not project data. Keep
  // them in the active React state only and refresh from the owned render when
  // a project is reopened.
  const cacheable = projects.slice(0, 24).map((project) => ({
    ...project,
    videoUrl: null,
    logoUrl: removeSignedUrl(project.logoUrl),
    product: {
      ...project.product,
      images: project.product.images.map((image) => ({
        ...image,
        // Asset identity and its stable object key are sufficient to request
        // a fresh preview. A signed URL is a short-lived bearer capability and
        // must not enter durable browser storage.
        url: removeSignedUrl(image.url),
      })),
    },
  }));
  localStorage.setItem(storageKey(userId), JSON.stringify(cacheable));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function removeSignedUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    if ([...url.searchParams.keys()].some((key) => /^(x-amz-|signature$|sig$|token$|expires$|se$|sp$|sv$)/i.test(key))) {
      return "";
    }
  } catch {
    // Blob URLs and ordinary display values are not durable credentials.
  }
  return value;
}

export function listLocalCreatorProjects(userId?: string | null) {
  return readLocal(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalCreatorProject(id: string, userId?: string | null) {
  return readLocal(userId).find((project) => project.id === id) ?? null;
}

export function saveLocalCreatorProject(project: CreatorProject, userId?: string | null) {
  const next = sanitizeCreatorProjectOutput({ ...project, updatedAt: new Date().toISOString() });
  const projects = readLocal(userId).filter((item) => item.id !== next.id);
  writeLocal([next, ...projects], userId);
  return next;
}

export function deleteLocalCreatorProject(id: string, userId?: string | null) {
  writeLocal(readLocal(userId).filter((project) => project.id !== id), userId);
}

export function subscribeToCreatorProjects(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function buildPortableGenerationConfiguration(project: CreatorProject) {
  const campaignSource = campaignSourceForProject(project);
  const sourceName = campaignFactValue(campaignSource, campaignSource.subject === "service" ? "service_name" : "name") || "Confirmed business";
  const sourceDescription = campaignFactValue(campaignSource, "description");
  const sourceBrand = campaignFactValue(campaignSource, "brand");
  const sourcePrice = campaignFactValue(campaignSource, "price");
  const sourceOffer = campaignFactValue(campaignSource, "offer");
  const sourceWhatsapp = campaignFactValue(campaignSource, "whatsapp");
  const sourceLocation = campaignFactValue(campaignSource, "location");
  const template = getCreativeTemplate(project.templateId);
  const templateScenes = new Map(template.scenes.map((scene) => [scene.id, scene]));
  const scenes = project.scenes.map((scene, index) => {
    const source = templateScenes.get(scene.id) ?? template.scenes[index] ?? template.scenes[0]!;
    return {
      ...source,
      id: scene.id,
      duration: scene.duration,
      headline: {
        en: scene.headline || source.headline.en,
        ar: scene.headlineAr || source.headline.ar,
      },
      voiceover: {
        en: scene.voiceover || source.voiceover.en,
        ar: scene.voiceoverAr || source.voiceover.ar,
      },
      direction: scene.direction || source.direction,
    };
  });
  const creativeBrief: CreativeBrief = {
    engineVersion: ENGINE_VERSION,
    templateId: template.id,
    market: "KW",
    language: project.language,
    arabicDialect: project.language === "en" ? null : "kuwaiti",
    dialectRegister: project.dialectRegister,
    tone: template.tone,
    vertical: project.vertical,
    goal: project.goal,
    product: {
      name: sourceName,
      brand: sourceBrand,
      description: sourceDescription,
      price: sourcePrice,
      offer: sourceOffer,
      callToAction: project.cta,
      whatsapp: sourceWhatsapp,
      location: sourceLocation,
    },
    scenes,
    qualityPolicy: template.qualityPolicy,
  };
  return {
    prompt: [
      `Create a ${project.aspectRatio} campaign for ${sourceName}.`,
      sourceDescription,
      sourceOffer ? `Offer: ${sourceOffer}.` : "Do not invent an offer.",
      `Call to action: ${project.cta}.`,
      ...project.scenes.map((scene, index) => `${index + 1}. ${scene.direction} On-screen copy: ${scene.headline}.`),
    ]
      .filter(Boolean)
      .join("\n"),
    durationSeconds: project.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    aspectRatio: project.aspectRatio,
    resolution: project.resolution,
    audio: project.audio,
    templateQuoteContext: {
      market: project.market,
      language: project.language,
      goal: project.goal,
      presenterMode: project.presenterMode,
      bookingUrl: project.bookingUrl,
      subtitles: project.subtitles,
    },
    creativeBrief,
    references: project.product.images.flatMap((image) =>
      image.storagePath && image.mimeType
        ? [{ objectKey: image.storagePath, mimeType: image.mimeType }]
        : [],
    ),
  };
}

export function portableProductRecipe(project: CreatorProject): ClaimDraftRequest["productRecipe"] {
  const source = campaignSourceForProject(project);
  return {
    sourceType: source.kind,
    subject: source.subject,
    name: campaignFactValue(source, source.subject === "service" ? "service_name" : "name"),
    description: campaignFactValue(source, "description"),
    price: campaignFactValue(source, "price"),
    brand: campaignFactValue(source, "brand"),
    images: project.product.images.flatMap((image) =>
      image.storagePath
        ? [{
            assetId: image.id,
            name: image.name,
            objectKey: image.storagePath,
            ...(image.mimeType ? { mimeType: image.mimeType } : {}),
            ...(image.checksum ? { checksumSha256: image.checksum } : {}),
          }]
        : [],
    ),
  };
}

export function portableConfiguration(project: CreatorProject): ClaimDraftRequest["configuration"] {
  return {
    creatorProject: stableProjectConfiguration(project),
    generation: buildPortableGenerationConfiguration(project),
  };
}

export function portableCampaignRecipe(project: CreatorProject): ClaimDraftRequest["campaignRecipe"] {
  const source = campaignSourceForProject(project);
  return {
    promotionKind: project.promotionKind,
    vertical: project.vertical,
    goal: project.goal,
    presenterMode: project.presenterMode,
    market: project.market,
    language: project.language,
    arabicDialect: project.arabicDialect,
    dialectRegister: project.dialectRegister,
    location: campaignFactValue(source, "location"),
    bookingUrl: campaignFactValue(source, "booking_url"),
    whatsapp: campaignFactValue(source, "whatsapp"),
    offer: campaignFactValue(source, "offer"),
    cta: project.cta,
    aspectRatio: project.aspectRatio,
    resolution: project.resolution,
  };
}

export async function resolvePortableTemplateVersionId(templateId: string): Promise<string> {
  return (await portableCreatorApi.getTemplate(templateId)).versionId;
}

function portableCreatorEnabled() {
  return isFeatureEnabled("portableAuth");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function syncCreatorProject(project: CreatorProject, userId?: string | null) {
  if (!userId) return saveLocalCreatorProject(project, userId);
  if (!portableCreatorEnabled()) {
    // During the cutover, authenticated creator writes are intentionally not
    // mirrored to the legacy backend. The portable flag must be enabled only
    // with the API running.
    return saveLocalCreatorProject(project, userId);
  }

  let existing: CreatorProjectRecord | null = null;
  try {
    existing = await portableCreatorApi.getProject(project.id);
  } catch (error) {
    if (!(error instanceof PortableApiError) || error.status !== 404) throw error;
    existing = null;
  }
  if (!existing) {
    const templateVersionId = await resolvePortableTemplateVersionId(project.templateId);
    const claimed = await portableCreatorApi.claimDraft({
      draftId: project.id,
      title: project.title,
      mode: "template",
      templateVersionId,
      configuration: portableConfiguration(project),
      productRecipe: portableProductRecipe(project),
      campaignRecipe: portableCampaignRecipe(project),
    });
    const hydrated = await hydrateCloudProject(claimed);
    if (!hydrated) throw new Error("The claimed project did not include its saved campaign configuration.");
    return saveLocalCreatorProject(hydrated, userId);
  }

  const canonicalProject = existing.currentVersion ? (await hydrateCloudProject(existing)) ?? project : project;
  const projectForSave: CreatorProject = {
    ...project,
    id: existing.id,
    versionId: existing.currentVersion?.id ?? project.versionId,
    versionNumber: existing.currentVersion?.versionNumber ?? project.versionNumber,
    createdAt: existing.createdAt,
    // Preserve fresh UI changes over the last cloud snapshot.
    product: project.product,
    scenes: project.scenes,
    title: project.title,
  };

  const templateVersionId = await resolvePortableTemplateVersionId(projectForSave.templateId);
  const nextConfiguration = portableConfiguration(projectForSave);
  if (
    existing.currentVersion &&
    canonicalJson(existing.currentVersion.configuration) === canonicalJson(nextConfiguration)
  ) {
    return saveLocalCreatorProject(
      {
        ...canonicalProject,
        ...projectForSave,
        versionId: existing.currentVersion.id,
        versionNumber: existing.currentVersion.versionNumber,
      },
      userId,
    );
  }
  const operationKey = `project-save:${projectForSave.id}:${projectForSave.updatedAt.replace(/[^A-Za-z0-9]/g, "")}`;
  const version = await portableCreatorApi.createVersion(
    projectForSave.id,
    {
      parentVersionId: projectForSave.versionId ?? null,
      templateVersionId,
      mode: "template",
      configuration: nextConfiguration,
      productRecipe: portableProductRecipe(projectForSave),
      campaignRecipe: portableCampaignRecipe(projectForSave),
      changeReason: "Campaign draft updated",
    },
    operationKey,
  );
  return saveLocalCreatorProject(
    { ...canonicalProject, ...projectForSave, versionId: version.id, versionNumber: version.versionNumber },
    userId,
  );
}

/**
 * Source replacement has stricter truth rules than ordinary campaign edits:
 * the API creates a fingerprinted child version and removes stale output.
 */
export async function replaceCreatorProjectSource(project: CreatorProject, userId?: string | null) {
  if (!userId || !portableCreatorEnabled()) return saveLocalCreatorProject(project, userId);
  const sourceType = project.product.sourceType;
  if (sourceType !== "product_link" && sourceType !== "business_link" && sourceType !== "upload") {
    return syncCreatorProject(project, userId);
  }
  const existing = await portableCreatorApi.getProject(project.id);
  if (!existing.currentVersion) return syncCreatorProject(project, userId);
  const assetIds = project.product.images
    .filter((image) => Boolean(image.storagePath))
    .map((image) => image.id);
  if (!assetIds.length) return syncCreatorProject(project, userId);
  const templateVersionId = await resolvePortableTemplateVersionId(project.templateId);
  const result = await portableCreatorApi.replaceSource(project.id, {
    parentVersionId: existing.currentVersion.id,
    templateVersionId,
    mode: "template",
    configuration: portableConfiguration(project),
    productRecipe: portableProductRecipe(project),
    campaignRecipe: portableCampaignRecipe(project),
    source: {
      type: sourceType,
      name: project.product.name,
      description: project.product.description,
      price: project.product.price,
      brand: project.product.brand,
      assetIds,
    },
  }, `source-change:${project.id}:${existing.currentVersion.id}:${project.updatedAt.replace(/[^A-Za-z0-9]/g, "")}`);
  return saveLocalCreatorProject({
    ...project,
    versionId: result.version.id,
    versionNumber: result.version.versionNumber,
    sourceFingerprint: result.sourceFingerprint,
  }, userId);
}

export async function loadCreatorProjects(userId?: string | null) {
  if (!userId || !portableCreatorEnabled()) return listLocalCreatorProjects(userId);
  const rows = await portableCreatorApi.listProjects();
  const resolved = await Promise.all(rows.map(hydrateCloudProject));
  const cloud = resolved.filter((project): project is CreatorProject => Boolean(project));
  writeLocal(cloud, userId);
  return cloud;
}

export async function duplicateCreatorProject(projectId: string, userId?: string | null) {
  if (!userId || !portableCreatorEnabled()) {
    const source = getLocalCreatorProject(projectId, userId);
    if (!source) throw new Error("Project not found.");
    const now = new Date().toISOString();
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      versionId: undefined,
      versionNumber: 1,
      title: `${source.title} copy`,
      status: "draft" as const,
      videoUrl: null,
      jobId: null,
      renderRunId: null,
      createdAt: now,
      updatedAt: now,
    };
    return saveLocalCreatorProject(copy, userId);
  }
  const duplicated = await hydrateCloudProject(await portableCreatorApi.duplicateProject(projectId));
  if (!duplicated) throw new Error("The duplicated project could not be loaded.");
  return saveLocalCreatorProject(duplicated, userId);
}

export async function trashCreatorProject(projectId: string, userId?: string | null) {
  if (userId && portableCreatorEnabled()) await portableCreatorApi.trashProject(projectId);
  deleteLocalCreatorProject(projectId, userId);
}
