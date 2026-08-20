import { CREATIVE_TEMPLATE_CATALOG } from "@movprompt/creative-engine";

import { templateMediaFor } from "./templateMedia";
import { getCampaignGoalOption, type CreatorProject, type CreatorTemplate } from "./types";

const ACCENTS = ["#c99946", "#77a989", "#d49737", "#b78452", "#a68b69", "#d1763d", "#c08a86", "#8d796a", "#6f8fa8", "#7a88b5"] as const;

export const CREATOR_TEMPLATES: CreatorTemplate[] = CREATIVE_TEMPLATE_CATALOG.map((template, index) => {
  const primaryGoal = template.goals[0] ?? "launch";
  return {
    id: template.id,
    name: template.localizedName.en,
    nameAr: template.localizedName.ar,
    eyebrow: template.category.replace(/-/g, " "),
    description: template.localizedDescription.en,
    descriptionAr: template.localizedDescription.ar,
    bestFor: template.tags.join(", "),
    duration: template.durationSeconds,
    ...templateMediaFor(template.id, index, primaryGoal),
    languages: [...template.supportedLanguages],
    aspectRatios: [...template.supportedRatios],
    accent: ACCENTS[index % ACCENTS.length]!,
    tags: [...template.tags],
    verticals: [...template.verticals],
    goals: [...template.goals],
    requiredInputs: [...template.requiredInputs],
    dialectRegister: template.dialectRegister,
    qualityStatus: template.qualityStatus,
    scenes: template.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title.en,
      titleAr: scene.title.ar,
      purpose: scene.purpose.en,
      purposeAr: scene.purpose.ar,
      duration: scene.duration,
      headline: scene.headline.en,
      headlineAr: scene.headline.ar,
      voiceover: scene.voiceover.en,
      voiceoverAr: scene.voiceover.ar,
      direction: scene.direction,
      shot: scene.shot,
      camera: scene.camera,
      lighting: scene.lighting,
      continuityAnchor: scene.continuityAnchor,
    })),
  };
});

const REFERENCE_REQUIRED_INPUTS = new Set([
  "primary_reference",
  "product_image",
  "product_reference",
  "real_work_reference",
  "real_room_reference",
  "real_shade_reference",
  "real_dish_media",
  "real_facility_media",
  "all_box_item_references",
  "all_bundle_item_references",
  "consented_before_video",
  "consented_after_video",
  "consented_customer_video",
  "consented_founder_reference",
  "consented_person_reference",
]);

/** Keep the browser preflight aligned with the recipe rather than assuming every campaign needs a photo. */
export function templateRequiresSourceMedia(templateId: string | null | undefined) {
  return getCreatorTemplate(templateId).requiredInputs.some((input) => REFERENCE_REQUIRED_INPUTS.has(input));
}

export const SAMPLE_PRODUCT = {
  sourceType: "sample" as const,
  sourceUrl: "",
  name: "Kinza Cola",
  description: "A crisp cola presented as an ice-cold everyday refreshment.",
  price: "0.250",
  brand: "Kinza",
  images: [
    {
      id: "sample-product",
      name: "Kinza Cola",
      url: "/create/sample-kinza.jpg",
      source: "sample" as const,
    },
  ],
};

export function getCreatorTemplate(id: string | null | undefined) {
  return CREATOR_TEMPLATES.find((template) => template.id === id) ?? CREATOR_TEMPLATES[0]!;
}

export function createDraftProject(templateId = CREATOR_TEMPLATES[0]!.id): CreatorProject {
  const template = getCreatorTemplate(templateId);
  const now = new Date().toISOString();
  const vertical = template.verticals[0] ?? "ecommerce";
  const goal = template.goals[0] ?? "launch";
  const serviceTemplate = vertical === "salon" || vertical === "clinic" || template.id === "app-service";
  const arabicFirst = template.tags.some((tag) => /arabic|kuwait|ramadan|national/iu.test(tag));
  return {
    id: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    versionNumber: 1,
    title: "Untitled campaign",
    templateId: template.id,
    status: "draft",
    promotionKind: serviceTemplate ? "business" : "product",
    vertical,
    goal,
    presenterMode: "none",
    location: "",
    bookingUrl: "",
    whatsapp: "",
    product: { sourceType: null, sourceUrl: "", name: "", description: "", price: "", brand: "", images: [] },
    language: arabicFirst ? "ar" : "en",
    arabicDialect: "kuwaiti",
    dialectRegister: template.dialectRegister,
    market: "KW",
    offer: "",
    cta: getCampaignGoalOption(goal).defaultCta,
    brandColor: template.accent,
    logoUrl: "",
    aspectRatio: "9:16",
    resolution: "720p",
    subtitles: true,
    audio: true,
    scenes: template.scenes.map((scene) => ({ ...scene })),
    videoUrl: null,
    jobId: null,
    renderRunId: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
}
