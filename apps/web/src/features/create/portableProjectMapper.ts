import type { CreatorProjectRecord } from "@movprompt/contracts";

import { portableCreatorApi } from "@/lib/api/portableApiClient";
import type { CreatorProject } from "./types";

export function stableProjectConfiguration(project: CreatorProject): CreatorProject {
  return {
    ...project,
    product: {
      ...project.product,
      images: project.product.images.map((image) => ({
        ...image,
        url: image.storagePath ? "" : image.source === "url" ? image.url : "",
      })),
    },
    videoUrl: null,
  };
}

export function projectFromCloud(input: CreatorProjectRecord): CreatorProject | null {
  const configured = input.currentVersion?.configuration.creatorProject;
  if (!configured || typeof configured !== "object" || Array.isArray(configured)) return null;
  const candidate = configured as unknown as CreatorProject;
  if (!candidate.product || !Array.isArray(candidate.scenes)) return null;
  return {
    ...candidate,
    id: input.id,
    versionId: input.currentVersion?.id,
    versionNumber: input.currentVersion?.versionNumber,
    title: input.title,
    status: input.status === "trashed" ? "draft" : input.status,
    promotionKind: candidate.promotionKind ?? "product",
    vertical: candidate.vertical ?? "ecommerce",
    goal: candidate.goal ?? "launch",
    presenterMode: candidate.presenterMode ?? "none",
    location: candidate.location ?? "",
    bookingUrl: candidate.bookingUrl ?? "",
    whatsapp: candidate.whatsapp ?? "",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
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
