import { CampaignPresenterSchema, type CreatorProjectRecord } from "@movprompt/contracts";

import { portableCreatorApi } from "@/lib/api/portableApiClient";
import { sanitizeCreatorProjectOutput } from "./creatorProjectOutput";
import { projectWithCampaignSource } from "./sourceFacts";
import { normalizeCreatorResolution, type CreatorProject } from "./types";

function recoveredProjectStatus(input: CreatorProjectRecord): CreatorProject["status"] {
  if (input.status === "trashed") return "draft";
  if (input.latestRenderProjectVersionId !== input.currentWorkingVersionId) return input.status;
  if (["submitting", "queued", "processing", "cancelling"].includes(input.latestRenderRunStatus ?? "")) {
    return "generating";
  }
  if (input.latestRenderRunStatus === "completed") return "completed";
  if (input.latestRenderRunStatus === "failed" || input.latestRenderRunStatus === "cancelled") return "failed";
  return input.status;
}

export function stableProjectConfiguration(project: CreatorProject): CreatorProject {
  const source = campaignSourceForProject(project);
  const persistedSource = {
    ...source,
    // A cloud configuration may only contain verified private object keys.
    // Guest-local IndexedDB IDs are claim transport metadata, not durable facts.
    assetKeys: project.product.images.flatMap((image) => image.storagePath ? [image.storagePath] : []),
  };
  return {
    ...projectWithCampaignSource({ ...project, source: persistedSource }),
    versionId: undefined,
    versionNumber: undefined,
    status: "ready",
    logoUrl: "",
    product: {
      ...project.product,
      sourceUrl: "",
      images: project.product.images.map((image) => ({
        ...image,
        url: "",
        assetKey: undefined,
      })),
    },
    videoUrl: null,
    jobId: null,
    renderRunId: null,
    lastError: null,
    pendingGenerationId: null,
    pendingQuoteCredits: null,
    updatedAt: project.createdAt,
  };
}

export function projectFromCloud(input: CreatorProjectRecord): CreatorProject | null {
  const configured = input.currentVersion?.configuration.creatorProject;
  if (!configured || typeof configured !== "object" || Array.isArray(configured)) return null;
  const candidate = configured as unknown as CreatorProject;
  if (!candidate.product || !Array.isArray(candidate.scenes)) return null;
  const currentRenderRunId = input.latestRenderProjectVersionId === input.currentWorkingVersionId
    ? input.latestRenderRunId
    : null;
  const presenter = CampaignPresenterSchema.safeParse(candidate.presenter).success
    ? CampaignPresenterSchema.parse(candidate.presenter)
    : candidate.presenterMode === "ai_ugc" ? { mode: "ai_ugc" as const } : { mode: "none" as const };
  return sanitizeCreatorProjectOutput(projectWithCampaignSource({
    ...candidate,
    id: input.id,
    versionId: input.currentVersion?.id,
    versionNumber: input.currentVersion?.versionNumber,
    title: input.title,
    status: recoveredProjectStatus(input),
    renderRunId: currentRenderRunId,
    jobId: currentRenderRunId,
    resolution: normalizeCreatorResolution((candidate as CreatorProject & { resolution?: unknown }).resolution),
    promotionKind: candidate.promotionKind ?? "product",
    vertical: candidate.vertical ?? "ecommerce",
    goal: candidate.goal ?? "launch",
    presenterMode: presenter.mode,
    presenter,
    arabicDialect: "kuwaiti",
    dialectRegister: candidate.dialectRegister ?? "conversational",
    location: candidate.location ?? "",
    bookingUrl: candidate.bookingUrl ?? "",
    whatsapp: candidate.whatsapp ?? "",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }));
}

export async function hydrateCloudProject(input: CreatorProjectRecord): Promise<CreatorProject | null> {
  const project = projectFromCloud(input);
  if (!project) return null;
  const images = await Promise.all(project.product.images.map(async (image) => {
    if (!image.storagePath || !image.id) return image;
    try {
      return { ...image, url: await portableCreatorApi.assetDownload(project.id, image.id) };
    } catch {
      return image;
    }
  }));
  return { ...project, product: { ...project.product, images } };
}
