import type { BusinessVertical, CampaignGoal, GenerationConfiguration } from "@movprompt/contracts";

import type { CreatorAspectRatio, CreatorLanguage, CreatorTemplate } from "./types";

export type TemplateRecommendationInput = {
  goal: CampaignGoal;
  vertical: BusinessVertical;
  language: CreatorLanguage;
  aspectRatio: CreatorAspectRatio;
  hasSource: boolean;
};

export type TemplateRecommendation = {
  template: CreatorTemplate;
  whyThisFits: string;
  requiredInputs: string[];
};

const GOAL_EXPLANATIONS: Record<CampaignGoal, string> = {
  whatsapp_orders: "Built to turn interest into WhatsApp orders.",
  bookings: "Built to encourage a clear booking decision.",
  launch: "Built to make a new launch feel clear and memorable.",
  offer: "Built to make the offer easy to notice and act on.",
  demonstration: "Built to show how the product or service works.",
  education: "Built to explain one useful idea clearly.",
  announcement: "Built to share an important update clearly.",
  trust: "Built to help customers feel confident in your business.",
  brand_story: "Built to introduce the people and story behind your brand.",
};

function requiredInputsFor(template: CreatorTemplate, input: TemplateRecommendationInput): string[] {
  const required = [input.vertical === "salon" || input.vertical === "clinic" ? "Business or service details" : "Product details"];
  if (template.goals.includes("offer")) required.push("Offer details");
  if (template.goals.includes("bookings")) required.push("Booking destination");
  return required;
}

/**
 * Ranking is intentionally local and explainable: the server remains the
 * authority for the published template version and price. This only narrows a
 * catalog the server already made public; it never fabricates eligibility.
 */
export function recommendTemplates(
  templates: CreatorTemplate[],
  input: TemplateRecommendationInput,
): TemplateRecommendation[] {
  if (!input.hasSource) return [];

  return templates
    .filter((template) => template.verticals.includes(input.vertical))
    .filter((template) => template.goals.includes(input.goal))
    .filter((template) => template.languages.includes(input.language))
    .filter((template) => template.aspectRatios.includes(input.aspectRatio))
    .map((template) => ({
      template,
      whyThisFits: GOAL_EXPLANATIONS[input.goal],
      requiredInputs: requiredInputsFor(template, input),
      score: (template.goals[0] === input.goal ? 4 : 0)
        + (template.verticals[0] === input.vertical ? 2 : 0)
        + (template.aspectRatios[0] === input.aspectRatio ? 1 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.template.id.localeCompare(right.template.id))
    .slice(0, 3)
    .map(({ score: _score, ...recommendation }) => recommendation);
}

export type RecommendationSelection = {
  template: CreatorTemplate;
  quote: NonNullable<import("./templateQuoteState").TemplateQuoteState["quote"]>;
  configuration: GenerationConfiguration;
};
