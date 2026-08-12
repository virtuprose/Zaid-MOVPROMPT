import { describe, expect, it } from "vitest";
import { CREATOR_TEMPLATES, createDraftProject, getCreatorTemplate } from "./templates";

describe("beginner creator templates", () => {
  it("ships the GCC launch catalog with editable scenes", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(12);
    for (const template of CREATOR_TEMPLATES) {
      expect(template.scenes.length).toBeGreaterThanOrEqual(3);
      expect(template.aspectRatios).toContain("9:16");
      expect(template.languages).toContain("ar");
      expect(template.languages).toContain("en");
    }
  });

  it("creates isolated draft scene data", () => {
    const first = createDraftProject("gcc-offer-launch");
    const second = createDraftProject("gcc-offer-launch");
    first.scenes[0].headline = "Changed";

    expect(first.id).not.toBe(second.id);
    expect(second.scenes[0].headline).not.toBe("Changed");
    expect(first.language).toBe("ar");
  });

  it("falls back to the primary template", () => {
    expect(getCreatorTemplate("missing").id).toBe(CREATOR_TEMPLATES[0].id);
  });
});
