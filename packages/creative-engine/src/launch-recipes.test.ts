import { describe, expect, it } from "vitest";
import { LAUNCH_CREATIVE_TEMPLATE_CATALOG } from "./catalog.js";
import { compileCreativeDirection } from "./prompt-compiler.js";
import { ENGINE_VERSION } from "./types.js";

describe("image-first launch recipes", () => {
  it.each(LAUNCH_CREATIVE_TEMPLATE_CATALOG)("$id preserves entered offer and contact facts in its prompt", template => {
    const compiled = compileCreativeDirection({ rawPrompt: template.visualSystem, creativeBrief: {
      engineVersion: ENGINE_VERSION, templateId: template.id, market: "KW", language: "en", arabicDialect: null,
      dialectRegister: template.dialectRegister, tone: template.tone, vertical: template.verticals[0], goal: template.goals[0],
      product: { name: "Client product", callToAction: "Book now", offer: "20% off", whatsapp: "+96550000000", bookingUrl: "https://example.com/book" },
      scenes: template.scenes, qualityPolicy: template.qualityPolicy,
    } });
    expect(compiled.prompt).toContain("Confirmed booking link: https://example.com/book");
    expect(compiled.prompt).toContain("Confirmed offer: 20% off");
    expect(compiled.prompt).toContain("Confirmed WhatsApp destination: +96550000000");
    expect(compiled.prompt).toContain("Never display an empty optional field");
  });
  it.each(LAUNCH_CREATIVE_TEMPLATE_CATALOG)("$id needs no hidden brand input", template => {
    expect(template.requiredInputs).toEqual(["subject_name", "primary_reference", "call_to_action"]);
  });
  it.each(LAUNCH_CREATIVE_TEMPLATE_CATALOG)("$id has a reusable eight-second four-scene recipe", template => {
    expect(template.durationSeconds).toBe(8);
    expect(template.scenes).toHaveLength(4);
    const compiled = compileCreativeDirection({ rawPrompt: template.visualSystem, audioEnabled: false, creativeBrief: {
      engineVersion: ENGINE_VERSION, templateId: template.id, market: "KW", language: "en", arabicDialect: null,
      dialectRegister: template.dialectRegister, tone: template.tone, vertical: template.verticals[0], goal: template.goals[0],
      product: { name: "Client reference", brand: "", description: "", price: "", offer: "", callToAction: template.scenes.at(-1)!.headline.en, whatsapp: "", location: "" },
      scenes: template.scenes, qualityPolicy: template.qualityPolicy,
    } });
    for (const scene of template.scenes) expect(compiled.prompt).toContain(scene.direction);
    expect(compiled.prompt).not.toContain("not supplied");
    expect(compiled.prompt).toContain("NEGATIVE CONSTRAINTS");
  });
});
