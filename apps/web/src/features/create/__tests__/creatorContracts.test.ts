import { describe, expect, it } from "vitest";
import { projectToCreationDraft } from "../contracts";
import { createDraftProject, CREATOR_TEMPLATES } from "../templates";

describe("creator contracts", () => {
  it("keeps the twelve commerce concepts and the first service recipe available during development", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(13);
    expect(new Set(CREATOR_TEMPLATES.map((template) => template.id)).size).toBe(13);
    expect(CREATOR_TEMPLATES.some((template) => template.id === "salon-booking-offer")).toBe(true);
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
    expect(draft.campaign).toMatchObject({ vertical: "ecommerce", goal: "launch", presenterMode: "none" });
    expect(new Date(draft.expiresAt).getTime() - new Date(draft.updatedAt).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("preserves a Kuwait service campaign through the authentication handoff", () => {
    const project = createDraftProject("salon-booking-offer");
    project.location = "Salmiya";
    project.bookingUrl = "https://example.test/book";
    project.whatsapp = "+96550000000";
    const draft = projectToCreationDraft(project, true, "auth_required");
    expect(draft.product.sourceType).toBeNull();
    expect(draft.campaign).toMatchObject({
      vertical: "salon",
      goal: "bookings",
      presenterMode: "none",
      location: "Salmiya",
      bookingUrl: "https://example.test/book",
      whatsapp: "+96550000000",
    });
  });
});
