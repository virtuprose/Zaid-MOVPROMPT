import { describe, expect, it, vi, afterEach } from "vitest";
import { CREATOR_TEMPLATES } from "./templates";
import { TEMPLATE_POSTERS, VERIFIED_TEMPLATE_VIDEOS } from "./templateMedia";

describe("R2-only template media", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it("maps five distinct demos and posters to the restricted API route", () => {
    expect(CREATOR_TEMPLATES).toHaveLength(5);
    expect(new Set(Object.values(VERIFIED_TEMPLATE_VIDEOS)).size).toBe(5);
    for (const template of CREATOR_TEMPLATES) {
      const version = ["app-service", "salon-booking-offer"].includes(template.id) ? "v3" : "v1";
      expect(TEMPLATE_POSTERS[template.id]).toMatch(new RegExp(`/api/v1/template-previews/${version}/${template.id}\\.jpg$`));
      expect(VERIFIED_TEMPLATE_VIDEOS[template.id]).toMatch(new RegExp(`/api/v1/template-previews/${version}/${template.id}\\.mp4$`));
    }
  });
  it("uses the configured API origin without exposing R2 or using bundled media", async () => {
    vi.stubEnv("VITE_API_ORIGIN", "https://api.example.test");
    vi.resetModules();
    const { templateMediaFor } = await import("./templateMedia");
    expect(templateMediaFor("salon-booking-offer", 4, "bookings")).toMatchObject({ poster: "https://api.example.test/api/v1/template-previews/v3/salon-booking-offer.jpg", previewVideo: "https://api.example.test/api/v1/template-previews/v3/salon-booking-offer.mp4" });
  });
});
