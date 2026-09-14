import { getCreatorTemplate } from "./templates";
import { MARKET_META, type CreatorProject } from "./types";

/** Builds a deterministic template prompt whose subject identity comes only from the client reference. */
export function buildTemplatePrompt(project: CreatorProject): string {
  const template = getCreatorTemplate(project.templateId);
  const refs = project.product.images.map((_, index) => `@Image${index + 1}`).join(", ");
  const language = project.language === "ar"
    ? "native Kuwaiti Arabic (ar-KW)"
    : project.language === "bilingual"
      ? "native Kuwaiti Arabic (ar-KW) and English"
      : "English";
  return [
    `Create a ${template.duration}-second ${project.aspectRatio} ${project.promotionKind === "business" ? "service" : "product"} campaign using ${template.name}.`,
    "Follow this template's scene order, pacing and visual direction consistently. The template controls the presentation; the uploaded client image controls the subject identity.",
    "Use @Image1 as the authoritative client reference in every scene. Do not replace, redesign, relabel or reinterpret the referenced product, person, business or service.",
    `The supplied references are ${refs}. ${project.promotionKind === "business" ? "Keep the business environment, people and branding faithful to the references. Do not invent service results, qualifications or claims." : "Preserve the exact product shape, package, label, colours and logo across every shot."}`,
    `${project.promotionKind === "business" ? "Business or service" : "Product"} facts: ${project.product.name}. ${project.product.description}. Brand: ${project.product.brand || "not supplied"}.`,
    ...(project.promotionKind === "business" ? [`Location: ${project.location || "not supplied"}. Booking destination: ${project.bookingUrl || "not supplied"}. WhatsApp: ${project.whatsapp || "not supplied"}.`] : []),
    `Market: ${MARKET_META[project.market].label}. Spoken and campaign language: ${language}. ${project.language !== "en" ? "Use natural Kuwait dialect—not Egyptian, Levantine, Emirati, Saudi, or generic Modern Standard Arabic—and compose deterministic RTL overlays with correct punctuation." : ""}`,
    project.offer ? `Offer: ${project.offer}.` : "Do not invent an offer or discount.",
    `CTA: ${project.cta}. Brand colour: ${project.brandColor}.`,
    "Scene recipe:",
    ...project.scenes.map((scene, index) => `${index + 1}. ${scene.duration}s — ${scene.title}. ${scene.direction} On-screen text: “${scene.headline}”.`),
    "Keep important text inside social safe zones. Premium, photoreal product advertising. No altered spelling, extra products, invented claims, watermarks or unreadable typography.",
  ].join("\n");
}
