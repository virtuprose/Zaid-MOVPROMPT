import { describe, expect, it } from "vitest";
import { projectToCreationDraft } from "../contracts";
import { createDraftProject, CREATOR_TEMPLATES } from "../templates";

describe("creator contracts", () => {
  it("publishes the twelve required GCC launch templates", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(12);
    expect(new Set(CREATOR_TEMPLATES.map((template) => template.id)).size).toBe(12);
    for (const template of CREATOR_TEMPLATES) {
      expect(template.languages).toEqual(expect.arrayContaining(["en", "ar", "bilingual"]));
      expect(template.aspectRatios).toEqual(expect.arrayContaining(["9:16", "1:1", "4:5", "16:9"]));
    }
  });

  it("preserves the pending generation intent in a seven-day guest draft", () => {
    const project = createDraftProject("gcc-offer-launch");
    project.pendingGenerationId = "stable-generation-intent";
    project.pendingQuoteCredits = 180;
    const draft = projectToCreationDraft(project, true, "auth_required");
    expect(draft.pendingGenerationId).toBe("stable-generation-intent");
    expect(draft.acceptedQuote).toBeUndefined();
    expect(new Date(draft.expiresAt).getTime() - new Date(draft.updatedAt).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
