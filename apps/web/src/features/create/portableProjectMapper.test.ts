import { describe, expect, it } from "vitest";

import type { CreatorProject } from "./types";
import { projectFromCloud, stableProjectConfiguration } from "./portableProjectMapper";

const project: CreatorProject = {
  id: "11111111-1111-4111-8111-111111111111",
  versionId: "22222222-2222-4222-8222-222222222222",
  versionNumber: 1,
  title: "Northfield campaign",
  templateId: "luxury-product-reveal",
  status: "ready",
  product: {
    sourceType: "upload",
    sourceUrl: "",
    name: "Northfield No. 07",
    description: "Premium fragrance",
    price: "12.500",
    brand: "Northfield",
    images: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "bottle.jpg",
        url: "https://signed.example.test/private?expires=soon",
        storagePath: "users/owner/projects/project/assets/product/image/hash",
        source: "upload",
      },
    ],
  },
  language: "en",
  market: "KW",
  offer: "",
  cta: "Order on WhatsApp",
  brandColor: "#d49737",
  logoUrl: "",
  aspectRatio: "9:16",
  resolution: "1080p",
  subtitles: true,
  audio: true,
  scenes: [{ id: "scene-1", title: "Reveal", purpose: "Hook", duration: 3, headline: "New", direction: "Reveal the product." }],
  videoUrl: "https://signed.example.test/output.mp4",
  jobId: null,
  renderRunId: null,
  lastError: null,
  createdAt: "2026-08-12T08:00:00.000Z",
  updatedAt: "2026-08-12T08:10:00.000Z",
};

describe("portable project mapping", () => {
  it("never persists a short-lived asset or output URL", () => {
    const stable = stableProjectConfiguration(project);
    expect(stable.product.images[0].storagePath).toBe(project.product.images[0].storagePath);
    expect(stable.product.images[0].url).toBe("");
    expect(stable.videoUrl).toBeNull();
  });

  it("uses the server project and version IDs as canonical cloud identity", () => {
    const cloud = projectFromCloud({
      id: "44444444-4444-4444-8444-444444444444",
      title: "Cloud title",
      mode: "template",
      status: "review",
      currentAcceptedVersionId: "55555555-5555-4555-8555-555555555555",
      deletedAt: null,
      createdAt: "2026-08-12T09:00:00.000Z",
      updatedAt: "2026-08-12T09:10:00.000Z",
      currentVersion: {
        id: "55555555-5555-4555-8555-555555555555",
        projectId: "44444444-4444-4444-8444-444444444444",
        parentVersionId: null,
        templateVersionId: null,
        mode: "template",
        versionNumber: 3,
        configuration: { creatorProject: project },
        productRecipe: {},
        campaignRecipe: {},
        changeReason: null,
        createdAt: "2026-08-12T09:10:00.000Z",
      },
      versionCount: 3,
      outputCount: 1,
    });
    expect(cloud).toMatchObject({
      id: "44444444-4444-4444-8444-444444444444",
      versionId: "55555555-5555-4555-8555-555555555555",
      versionNumber: 3,
      title: "Cloud title",
      status: "review",
    });
  });
});
