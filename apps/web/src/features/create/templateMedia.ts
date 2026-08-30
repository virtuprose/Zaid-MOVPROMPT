import type { CampaignGoal } from "@movprompt/contracts";

export type TemplateMediaTone = "warm" | "cool" | "soft" | "vivid" | "neutral";

export type TemplateMediaSpec = {
  poster: string;
  previewVideo: string | null;
  posterPosition: string;
  mediaCode: string;
  mediaTone: TemplateMediaTone;
};

/**
 * These are existing, local visual-direction assets. They are not represented
 * as generated customer results. Each template gets a semantically relevant
 * setting/product image, then a deterministic crop and factual goal overlay so
 * repeated source photography never masquerades as a unique finished render.
 */
export const TEMPLATE_POSTERS: Record<string, string> = {
  "luxury-product-reveal": "/template-previews/generated/luxury-product-reveal-seedance-v1.jpg",
  "hands-on-demo": "/homepage/hero-creator.png",
  "gcc-offer-launch": "/create/sample-kinza.jpg",
  "ugc-review": "/template-previews/ugc-review.jpg",
  unboxing: "/homepage/hero-product.png",
  "whatsapp-sales-ad": "/template-previews/generated/whatsapp-sales-ad-seedance-v1.jpg",
  "food-beverage": "/template-previews/generated/food-beverage-seedance-v1.jpg",
  "beauty-perfume": "/homepage/hero-lifestyle.png",
  fashion: "/template-previews/fashion.jpg",
  electronics: "/template-previews/electronics.jpg",
  "ramadan-eid": "/presets/hotel-suite.png",
  "app-service": "/template-previews/app-service.jpg",
  "salon-booking-offer": "/presets/studio.png",
  "salon-transformation-proof": "/presets/indoor-minimalist.png",
  "stylist-introduction": "/presets/workshop.png",
  "bridal-beauty-booking": "/presets/outdoor-sunlit.png",
  "haircare-service-story": "/presets/studio.png",
  "nail-art-showcase": "/presets/indoor-minimalist.png",
  "spa-wellness-escape": "/presets/resort.png",
  "barbershop-precision": "/presets/industrial-loft.png",
  "clinic-service-explainer": "/presets/office.png",
  "clinic-facility-tour": "/presets/indoor-minimalist.png",
  "practitioner-introduction": "/presets/office.png",
  "clinic-appointment-campaign": "/presets/office.png",
  "dental-hygiene-education": "/presets/indoor-minimalist.png",
  "skin-consultation-guide": "/presets/studio.png",
  "wellness-check-reminder": "/presets/gym.png",
  "perfume-launch-film": "/homepage/hero-product.png",
  "skincare-routine": "/presets/studio.png",
  "makeup-shade-showcase": "/presets/studio.png",
  "jewellery-sparkle-reveal": "/presets/penthouse.png",
  "watch-craftsmanship": "/presets/industrial-loft.png",
  "abaya-editorial": "/presets/city-night.png",
  "footwear-motion": "/template-previews/footwear-motion.jpg",
  "handbag-styling": "/presets/penthouse.png",
  "home-decor-refresh": "/presets/bedroom.png",
  "kitchen-tool-demo": "/presets/kitchen.png",
  "grocery-value-bundle": "/presets/kitchen.png",
  "coffee-ritual": "/presets/coffee-shop.png",
  "dessert-launch": "/template-previews/dessert-launch.jpg",
  "restaurant-signature-dish": "/template-previews/restaurant-signature-dish.jpg",
  "cloud-kitchen-delivery": "/presets/restaurant.png",
  "supplement-routine": "/presets/stadium.png",
  "baby-product-trust": "/presets/garden.png",
  "pet-product-demo": "/presets/nature.png",
  "curated-gift-box": "/presets/hotel-suite.png",
  "back-to-school-offer": "/template-previews/back-to-school-offer.jpg",
  "kuwait-national-day": "/presets/rooftop.png",
  "customer-testimonial": "/presets/office.png",
  "founder-story": "/template-previews/founder-story.jpg",
};

/**
 * Only clips whose inspected frames truthfully match a named template are
 * playable. The remaining local preset MP4s stay out of the public catalog.
 */
export const VERIFIED_TEMPLATE_VIDEOS: Partial<Record<string, string>> = {
  "luxury-product-reveal": "/template-previews/generated/luxury-product-reveal-seedance-v1.mp4",
  "ugc-review": "/presets/ugc.mp4",
  "whatsapp-sales-ad": "/template-previews/generated/whatsapp-sales-ad-seedance-v1.mp4",
  "food-beverage": "/template-previews/generated/food-beverage-seedance-v1.mp4",
  fashion: "/presets/cinematic-fashion.mp4",
  electronics: "/presets/before-after.mp4",
  "app-service": "/presets/lifestyle.mp4",
  "footwear-motion": "/presets/tactile-stopmotion.mp4",
  "dessert-launch": "/presets/elite.mp4",
  "restaurant-signature-dish": "/presets/cinematic-ai-director.mp4",
  "back-to-school-offer": "/presets/fashion-dream.mp4",
  "founder-story": "/presets/talking-avatar.mp4",
};

const toneByGoal: Record<CampaignGoal, TemplateMediaTone> = {
  whatsapp_orders: "warm",
  bookings: "soft",
  launch: "vivid",
  offer: "warm",
  demonstration: "cool",
  education: "cool",
  announcement: "vivid",
  trust: "neutral",
  brand_story: "soft",
};

const goalLabels: Record<CampaignGoal, { en: string; ar: string }> = {
  whatsapp_orders: { en: "WhatsApp orders", ar: "طلبات واتساب" },
  bookings: { en: "Bookings", ar: "حجوزات" },
  launch: { en: "Launch", ar: "إطلاق" },
  offer: { en: "Offer", ar: "عرض" },
  demonstration: { en: "Demo", ar: "شرح" },
  education: { en: "Education", ar: "معلومة" },
  announcement: { en: "Announcement", ar: "إعلان" },
  trust: { en: "Trust", ar: "ثقة" },
  brand_story: { en: "Brand story", ar: "قصة العلامة" },
};

export function templateGoalLabel(goal: CampaignGoal, locale: "en" | "ar") {
  return goalLabels[goal][locale];
}

export function templateMediaFor(templateId: string, index: number, primaryGoal: CampaignGoal): TemplateMediaSpec {
  const x = 35 + (index % 10) * 3;
  const y = 35 + Math.floor(index / 10) * 7;
  return {
    poster: TEMPLATE_POSTERS[templateId] ?? "/homepage/hero-product.png",
    previewVideo: VERIFIED_TEMPLATE_VIDEOS[templateId] ?? null,
    posterPosition: `${x}% ${y}%`,
    mediaCode: `T${String(index + 1).padStart(2, "0")}`,
    mediaTone: toneByGoal[primaryGoal],
  };
}
