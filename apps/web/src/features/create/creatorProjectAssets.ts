import { mirrorProductImages } from "./creatorAssets";
import { syncCreatorProject } from "./projectStore";
import type { CreatorProject } from "./types";

export function hasUnclaimedCreatorAssets(project: CreatorProject): boolean {
  return project.product.images.some((image) =>
    !image.storagePath && Boolean(image.assetKey || image.source === "sample" || image.source === "url"),
  );
}

export function mergeClaimedCreatorProject(
  localProject: CreatorProject,
  cloudProject: CreatorProject,
  images: CreatorProject["product"]["images"],
): CreatorProject {
  return {
    ...localProject,
    id: cloudProject.id,
    versionId: cloudProject.versionId,
    versionNumber: cloudProject.versionNumber,
    createdAt: cloudProject.createdAt,
    product: { ...localProject.product, images },
  };
}

/**
 * Persists an authenticated project without ever placing remote image URLs in
 * the cloud recipe, then mirrors those images into the project's private
 * object-storage namespace and saves the resulting stable object keys.
 *
 * Guest drafts intentionally do not use this path. Their remote URLs remain
 * in IndexedDB until the authenticated claim flow runs.
 */
export async function syncCreatorProjectWithOwnedRemoteImages(
  project: CreatorProject,
  userId: string,
): Promise<CreatorProject> {
  const cloudProject = await syncCreatorProject(project, userId);
  const hasUnownedRemoteImages = project.product.images.some(
    (image) => image.source === "url" && !image.storagePath,
  );
  if (!hasUnownedRemoteImages) return cloudProject;

  const images = await mirrorProductImages(cloudProject.id, project.product.images);
  return syncCreatorProject(
    {
      ...project,
      id: cloudProject.id,
      versionId: cloudProject.versionId,
      versionNumber: cloudProject.versionNumber,
      createdAt: cloudProject.createdAt,
      product: { ...project.product, images },
    },
    userId,
  );
}
