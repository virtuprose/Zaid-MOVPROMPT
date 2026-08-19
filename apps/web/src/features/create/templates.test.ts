import { describe, expect, it } from "vitest";
import { CREATOR_TEMPLATES, createDraftProject, getCreatorTemplate } from "./templates";
import { getCampaignGoalOption, normalizeCreatorResolution } from "./types";

describe("beginner creator templates", () => {
  it("ships fifty Kuwait campaign recipes with editable scenes", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(50);
    for (const template of CREATOR_TEMPLATES) {
      expect(template.scenes.length).toBeGreaterThanOrEqual(3);
      expect(template.aspectRatios).toContain("9:16");
      expect(template.languages).toContain("ar");
      expect(template.languages).toContain("en");
      expect(template.qualityStatus).toBe("review");
    }
  });

  it("creates isolated draft scene data", () => {
    const first = createDraftProject("gcc-offer-launch");
    const second = createDraftProject("gcc-offer-launch");
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

  it("starts salon, clinic and service templates with a business source", () => {
    for (const templateId of ["salon-booking-offer", "clinic-service-explainer", "app-service"]) {
      expect(createDraftProject(templateId).promotionKind).toBe("business");
    }
  });

  it("migrates legacy 1080p creator drafts to the supported 720p setting", () => {
    expect(normalizeCreatorResolution("1080p")).toBe("720p");
    expect(normalizeCreatorResolution("720p")).toBe("720p");
    expect(normalizeCreatorResolution("480p")).toBe("480p");
  });
});
