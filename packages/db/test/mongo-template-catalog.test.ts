import { describe, expect, it } from "vitest";
import { LAUNCH_CREATIVE_TEMPLATE_CATALOG } from "@movprompt/creative-engine";
import { mongoTemplateCatalogDocuments } from "../src/mongo-template-catalog.js";

describe("MongoDB template catalog", () => {
  it("maps every creative template to one published template and immutable version", () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const first = mongoTemplateCatalogDocuments(LAUNCH_CREATIVE_TEMPLATE_CATALOG, now);
    const replay = mongoTemplateCatalogDocuments(LAUNCH_CREATIVE_TEMPLATE_CATALOG, now);

    expect(first.templates).toHaveLength(5);
    expect(first.versions).toHaveLength(5);
    expect(new Set(first.versions.map((version) => version.id)).size).toBe(5);
    expect(replay.versions.map((version) => version.id)).toEqual(first.versions.map((version) => version.id));
    expect(first.templates.every((template) => template.publishingState === "published")).toBe(true);
    expect(first.templates.every((template) => first.versions.some((version) => version.id === template.currentPublishedVersionId))).toBe(true);
    const foodTemplate = first.templates.find((template) => template.slug === "food-beverage")!;
    expect(first.versions.find((version) => version.templateId === foodTemplate.id)).toMatchObject({
      supportedMarkets: ["KW"],
      recipe: {
        goals: ["whatsapp_orders", "launch"],
        qualityStatus: "review",
        requiredInputs: expect.arrayContaining(["primary_reference"]),
      },
    });
  });
});
