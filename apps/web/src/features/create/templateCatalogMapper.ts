import type { PublicTemplate } from "@movprompt/contracts";

import { CREATOR_TEMPLATES } from "./templates";
import type { CreatorTemplate } from "./types";

export function creatorTemplateFromCatalog(template: PublicTemplate): CreatorTemplate {
  const local = CREATOR_TEMPLATES.find((item) => item.id === template.id) ?? CREATOR_TEMPLATES[0];
  return {
    ...local,
    id: template.id,
    name: template.name.en,
    eyebrow: template.category,
    description: template.description.en,
    bestFor: template.outcome,
    duration: template.durationSeconds,
    languages: template.supportedLanguages,
    aspectRatios: template.supportedRatios,
    scenes: template.scenes.length ? template.scenes : local.scenes,
  };
}
