import type { PublicTemplate } from "@movprompt/contracts";

import { CREATOR_TEMPLATES } from "./templates";
import type { CreatorTemplate } from "./types";

export function creatorTemplateFromCatalog(template: PublicTemplate): CreatorTemplate {
  const local = CREATOR_TEMPLATES.find((item) => item.id === template.id) ?? CREATOR_TEMPLATES[0]!;
  return {
    ...local,
    id: template.id,
    name: template.name.en,
    nameAr: template.name.ar,
    eyebrow: template.category,
    description: template.description.en,
    descriptionAr: template.description.ar,
    bestFor: template.outcome,
    duration: template.durationSeconds,
    languages: template.supportedLanguages,
    aspectRatios: template.supportedRatios,
    tags: template.tags,
    verticals: template.verticals,
    goals: template.goals,
    dialectRegister: template.dialectPolicy.register,
    qualityStatus: template.qualityStatus,
    scenes: template.scenes.length
      ? template.scenes.map((scene, index) => ({
          ...(local.scenes.find((item) => item.id === scene.id) ?? local.scenes[index] ?? local.scenes[0]!),
          ...scene,
        }))
      : local.scenes,
  };
}
