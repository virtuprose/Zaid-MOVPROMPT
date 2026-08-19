import { beforeEach, describe, expect, it } from "vitest";

import { createDraftProject } from "./templates";
import {
  buildPortableGenerationConfiguration,
  listLocalCreatorProjects,
  portableProductRecipe,
  saveLocalCreatorProject,
} from "./projectStore";

describe("creator project local cache", () => {
  beforeEach(() => localStorage.clear());

  it("never persists a signed render URL", () => {
    const project = createDraftProject();
    const active = saveLocalCreatorProject({
      ...project,
      status: "review",
      renderRunId: "44444444-4444-4444-8444-444444444444",
      jobId: "44444444-4444-4444-8444-444444444444",
      videoUrl: "http://127.0.0.1:9000/creator-outputs/signed.mp4?expires=soon",
    }, "user-one");

    expect(active.videoUrl).toContain("signed.mp4");
    expect(listLocalCreatorProjects("user-one")[0]).toMatchObject({
      renderRunId: "44444444-4444-4444-8444-444444444444",
      videoUrl: null,
    });
  });

  it("uses the authoritative image MIME and keeps transient URLs out of the product recipe", () => {
    const project = createDraftProject();
    project.product.sourceUrl = "https://shop.example.test/product?token=private";
    project.product.images = [{
      id: "33333333-3333-4333-8333-333333333333",
      name: "product.webp",
      url: "http://127.0.0.1:9000/private?signature=short-lived",
      storagePath: `users/${"11111111-1111-4111-8111-111111111111"}/projects/${project.id}/assets/product/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}`,
      mimeType: "image/webp",
      checksum: "a".repeat(64),
      source: "upload",
    }];

    expect(buildPortableGenerationConfiguration(project).references).toEqual([{
      objectKey: project.product.images[0]!.storagePath,
      mimeType: "image/webp",
    }]);
    const recipe = portableProductRecipe(project);
    expect(JSON.stringify(recipe)).not.toContain("http");
    expect(JSON.stringify(recipe)).not.toContain("signature");
    expect(recipe.images).toEqual([expect.objectContaining({
      objectKey: project.product.images[0]!.storagePath,
      mimeType: "image/webp",
    })]);
  });
});
