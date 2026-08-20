import type { CampaignGoal } from "@movprompt/contracts";

import type { CreatorProject } from "./types";

export type CampaignSetupField =
  | "price"
  | "offer"
  | "cta"
  | "bookingUrl"
  | "whatsapp"
  | "language"
  | "aspectRatio"
  | "resolution"
  | "subtitles"
  | "audio";

export type CampaignSetupErrors = Partial<Record<"price" | "bookingUrl" | "whatsapp", string>>;

export const CTA_BY_GOAL: Record<CampaignGoal, string> = {
  whatsapp_orders: "Order on WhatsApp",
  bookings: "Book now",
  launch: "Shop now",
  offer: "Shop now",
  demonstration: "Learn more",
  education: "Learn more",
  announcement: "Learn more",
  trust: "Learn more",
  brand_story: "Visit store",
};

export function isBookingOutcome(goal: CampaignGoal): boolean {
  return goal === "bookings";
}

export function isWhatsappOutcome(goal: CampaignGoal): boolean {
  return goal === "whatsapp_orders";
}

export function normalizeKwdAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return value;
  return numeric.toFixed(3);
}

export function isValidKwdAmount(value: string): boolean {
  return value.trim() === "" || /^\d{1,9}(?:\.\d{3})?$/u.test(value.trim());
}

export function isValidKuwaitPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/gu, "");
  return /^(?:965)?[569]\d{7}$/u.test(digits);
}

export function isValidDestination(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Browser checks improve recovery; the server is still authoritative on claim and render. */
export function validateCampaignSetup(project: CreatorProject): CampaignSetupErrors {
  const errors: CampaignSetupErrors = {};
  if (!isValidKwdAmount(project.product.price)) {
    errors.price = "Enter a KWD amount with up to three decimal places.";
  }
  if (isBookingOutcome(project.goal) && !isValidDestination(project.bookingUrl)) {
    errors.bookingUrl = "Add a valid booking link to continue.";
  }
  if (isWhatsappOutcome(project.goal) && !isValidKuwaitPhone(project.whatsapp)) {
    errors.whatsapp = "Add a Kuwait WhatsApp number to continue.";
  }
  return errors;
}

export function deliveryFieldsFor(goal: CampaignGoal) {
  return {
    showBooking: isBookingOutcome(goal),
    showWhatsapp: isWhatsappOutcome(goal),
  };
}

export function isQuoteAffectingCampaignChange(field: CampaignSetupField): boolean {
  return ["price", "offer", "cta", "bookingUrl", "whatsapp", "language", "aspectRatio", "resolution", "subtitles", "audio"].includes(field);
}
