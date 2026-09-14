import { describe, expect, it } from "vitest";
import { CREATOR_TEMPLATES, createDraftProject, getCreatorTemplate, hasCreatorImageReference } from "./templates";
import { getCampaignGoalOption, normalizeCreatorResolution } from "./types";
import { buildTemplatePrompt } from "./templateGenerationPrompt";

describe("beginner creator templates", () => {
  it("ships five launch categories with editable scenes and required client references", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(5);
    expect(new Set(CREATOR_TEMPLATES.map((template) => template.eyebrow))).toHaveLength(5);
    for (const template of CREATOR_TEMPLATES) {
      expect(template.scenes.length).toBeGreaterThanOrEqual(3);
      expect(template.aspectRatios).toContain("9:16");
      expect(template.languages).toContain("ar");
      expect(template.languages).toContain("en");
      expect(template.qualityStatus).toBe("review");
      expect(template.requiredInputs).toContain("primary_reference");
    }
  });

  it("creates isolated draft scene data", () => {
    const first = createDraftProject("salon-booking-offer");
    const second = createDraftProject("salon-booking-offer");
    first.scenes[0].headline = "Changed";

    expect(first.id).not.toBe(second.id);
    expect(second.scenes[0].headline).not.toBe("Changed");
    expect(first.language).toBe("ar");
    expect(first.arabicDialect).toBe("kuwaiti");
  });

  it("falls back to the primary template", () => {
    expect(getCreatorTemplate("missing").id).toBe(CREATOR_TEMPLATES[0].id);
  });

  it("uses each template's first campaign goal and matching call to action", () => {
    for (const template of CREATOR_TEMPLATES) {
      const project = createDraftProject(template.id);
      expect(project.goal).toBe(template.goals[0]);
      expect(project.cta).toBe(getCampaignGoalOption(project.goal).defaultCta);
    }
  });

  it("binds every launch prompt to the client image and the selected template recipe", () => {
    for (const template of CREATOR_TEMPLATES) {
      const project = createDraftProject(template.id);
      project.product = {
        ...project.product,
        name: "Client subject",
        images: [{ id: "client-image", name: "client.webp", url: "blob:client", source: "upload", mimeType: "image/webp" }],
      };
      const prompt = buildTemplatePrompt(project);
      expect(prompt).toContain(`using ${template.name}`);
      expect(prompt).toContain("Use @Image1 as the authoritative client reference in every scene");
      expect(prompt).toContain("the uploaded client image controls the subject identity");
      expect(prompt).toContain("Scene recipe:");
    }
  });

  it("starts salon and digital-service templates with a business source", () => {
    for (const templateId of ["salon-booking-offer", "app-service"]) {
      expect(createDraftProject(templateId).promotionKind).toBe("business");
    }
  });

  it("migrates legacy 1080p creator drafts to the supported 720p setting", () => {
    expect(normalizeCreatorResolution("1080p")).toBe("720p");
    expect(normalizeCreatorResolution("720p")).toBe("720p");
    expect(normalizeCreatorResolution("480p")).toBe("480p");
  });

  it("does not treat MIME-less uploaded or sample assets as image references", () => {
    expect(hasCreatorImageReference([
      { id: "legacy-upload", name: "unknown.mov", url: "blob:legacy", source: "upload" },
      { id: "legacy-sample", name: "unknown", url: "/create/legacy", source: "sample" },
    ])).toBe(false);
    expect(hasCreatorImageReference([
      { id: "known-image", name: "product.webp", url: "blob:image", source: "upload", mimeType: "image/webp" },
    ])).toBe(true);
  });
});
