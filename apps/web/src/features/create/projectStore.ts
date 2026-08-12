import type { ClaimDraftRequest, CreatorProjectRecord } from "@movprompt/contracts";

import { isFeatureEnabled } from "@/config/features";
import { PortableApiError, portableCreatorApi } from "@/lib/api/portableApiClient";
import { hydrateCloudProject, stableProjectConfiguration } from "./portableProjectMapper";
import type { CreatorProject } from "./types";

const STORAGE_KEY = "movprompt.creator-projects.v2";
const CHANGE_EVENT = "movprompt:creator-projects-changed";

function storageKey(userId?: string | null) {
  return `${STORAGE_KEY}:${userId || "signed-out"}`;
}

function readLocal(userId?: string | null): CreatorProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: CreatorProject[], userId?: string | null) {
  localStorage.setItem(storageKey(userId), JSON.stringify(projects.slice(0, 24)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listLocalCreatorProjects(userId?: string | null) {
  return readLocal(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalCreatorProject(id: string, userId?: string | null) {
  return readLocal(userId).find((project) => project.id === id) ?? null;
}

export function saveLocalCreatorProject(project: CreatorProject, userId?: string | null) {
  const next = { ...project, updatedAt: new Date().toISOString() };
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

function generationConfiguration(project: CreatorProject) {
  return {
    prompt: [
      `Create a ${project.aspectRatio} campaign for ${project.product.name || "the confirmed business"}.`,
      project.product.description,
      project.offer ? `Offer: ${project.offer}.` : "Do not invent an offer.",
      `Call to action: ${project.cta}.`,
      ...project.scenes.map((scene, index) => `${index + 1}. ${scene.direction} On-screen copy: ${scene.headline}.`),
    ]
      .filter(Boolean)
      .join("\n"),
    durationSeconds: project.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    aspectRatio: project.aspectRatio,
    references: project.product.images.flatMap((image) =>
      image.storagePath
        ? [{ objectKey: image.storagePath, mimeType: "image/jpeg" }]
        : [],
    ),
  };
}

function portableConfiguration(project: CreatorProject): ClaimDraftRequest["configuration"] {
  return {
    creatorProject: stableProjectConfiguration(project),
    generation: generationConfiguration(project),
  };
}

async function portableTemplateVersionId(templateId: string): Promise<string> {
  return (await portableCreatorApi.getTemplate(templateId)).versionId;
}

function portableCreatorEnabled() {
  return isFeatureEnabled("portableAuth");
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
    const templateVersionId = await portableTemplateVersionId(project.templateId);
    const claimed = await portableCreatorApi.claimDraft({
      draftId: project.id,
      title: project.title,
      mode: "template",
      templateVersionId,
      configuration: portableConfiguration(project),
      productRecipe: project.product,
      campaignRecipe: {
        promotionKind: project.promotionKind,
        vertical: project.vertical,
        goal: project.goal,
        presenterMode: project.presenterMode,
        market: project.market,
        language: project.language,
        location: project.location,
        bookingUrl: project.bookingUrl,
        whatsapp: project.whatsapp,
        offer: project.offer,
        cta: project.cta,
        aspectRatio: project.aspectRatio,
        resolution: project.resolution,
      },
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

  const templateVersionId = await portableTemplateVersionId(projectForSave.templateId);
  const operationKey = `project-save:${projectForSave.id}:${projectForSave.updatedAt.replace(/[^A-Za-z0-9]/g, "")}`;
  const version = await portableCreatorApi.createVersion(
    projectForSave.id,
    {
      parentVersionId: projectForSave.versionId ?? null,
      templateVersionId,
      mode: "template",
      configuration: portableConfiguration(projectForSave),
      productRecipe: projectForSave.product,
      campaignRecipe: {
        promotionKind: projectForSave.promotionKind,
        vertical: projectForSave.vertical,
        goal: projectForSave.goal,
        presenterMode: projectForSave.presenterMode,
        market: projectForSave.market,
        language: projectForSave.language,
        location: projectForSave.location,
        bookingUrl: projectForSave.bookingUrl,
        whatsapp: projectForSave.whatsapp,
        offer: projectForSave.offer,
        cta: projectForSave.cta,
        aspectRatio: projectForSave.aspectRatio,
        resolution: projectForSave.resolution,
      },
      changeReason: "Campaign draft updated",
    },
    operationKey,
  );
  return saveLocalCreatorProject(
    { ...canonicalProject, ...projectForSave, versionId: version.id, versionNumber: version.versionNumber },
    userId,
  );
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
