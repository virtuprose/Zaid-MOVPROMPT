import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CREATOR_TEMPLATES } from "./templates";
import { TEMPLATE_POSTERS, VERIFIED_TEMPLATE_VIDEOS } from "./templateMedia";

describe("truthful template media catalog", () => {
  it("covers every template with an explicit local poster mapping", () => {
    for (const template of CREATOR_TEMPLATES) {
      expect(TEMPLATE_POSTERS).toHaveProperty(template.id);
      expect(existsSync(resolve("public", template.poster.slice(1))), template.poster).toBe(true);
    }
  });

  it("does not reuse static screenshots that contain baked-in play controls", () => {
    const misleadingPosters = new Set([
      "/homepage/template-creator-proof.png",
      "/homepage/template-in-motion.png",
      "/homepage/template-launch-story.png",
      "/homepage/template-product-reveal.png",
      "/homepage/template-texture-study.png",
    ]);
    expect(Object.values(TEMPLATE_POSTERS).some((poster) => misleadingPosters.has(poster))).toBe(false);
  });

  it("offers motion only for inspected, unique, template-specific clips", () => {
    const playable = CREATOR_TEMPLATES.filter((template) => template.previewVideo);
    expect(playable).toHaveLength(4);
    expect(new Set(playable.map((template) => template.previewVideo)).size).toBe(playable.length);
    expect(playable.map((template) => template.id).sort()).toEqual([
      "app-service",
      "food-beverage",
      "luxury-product-reveal",
      "whatsapp-sales-ad",
    ]);
    for (const template of playable) {
      expect(template.poster).toMatch(/^\/template-previews\/(?:generated\/)?[^/]+\.jpg$/);
      expect(existsSync(resolve("public", template.previewVideo!.slice(1))), template.previewVideo!).toBe(true);
    }
  });

  it("uses the three paid Seedance v1 template proofs and their matching poster frames", () => {
    const selectedTemplateIds = [
      "food-beverage",
      "whatsapp-sales-ad",
      "luxury-product-reveal",
    ] as const;

    for (const templateId of selectedTemplateIds) {
      expect(VERIFIED_TEMPLATE_VIDEOS[templateId]).toBe(
        `/template-previews/generated/${templateId}-seedance-v1.mp4`,
      );
      expect(TEMPLATE_POSTERS[templateId]).toBe(
        `/template-previews/generated/${templateId}-seedance-v1.jpg`,
      );
      expect(existsSync(resolve("public", VERIFIED_TEMPLATE_VIDEOS[templateId]!.slice(1)))).toBe(true);
      expect(existsSync(resolve("public", TEMPLATE_POSTERS[templateId]!.slice(1)))).toBe(true);
    }
  });

  it("gives all five launch cards a unique factual code and crop treatment", () => {
    expect(new Set(CREATOR_TEMPLATES.map((template) => template.mediaCode)).size).toBe(5);
    expect(new Set(CREATOR_TEMPLATES.map((template) => template.posterPosition)).size).toBe(5);
    for (const [index, template] of CREATOR_TEMPLATES.entries()) {
      expect(template.mediaCode).toBe(`T${String(index + 1).padStart(2, "0")}`);
      expect(template.poster).toMatch(/^\/(?:create|homepage|presets|template-previews)\//);
    }
  });
});
