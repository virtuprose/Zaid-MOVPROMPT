import type { BusinessVertical, CampaignGoal, PresenterMode } from "@movprompt/contracts";

export type CreatorLanguage = "en" | "ar" | "bilingual";
export type CreatorMarket = "KW" | "SA" | "AE" | "QA" | "BH" | "OM";
export type CreatorAspectRatio = "9:16" | "1:1" | "4:5" | "16:9";
export type CreatorResolution = "480p" | "720p";

export function normalizeCreatorResolution(value: unknown): CreatorResolution {
  return value === "480p" ? "480p" : "720p";
}
export type CreatorProjectStatus =
  | "draft"
  | "ready"
  | "generating"
  | "review"
  | "failed"
  | "exporting"
  | "completed";

export type CreatorAsset = {
  id: string;
  name: string;
  url: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  assetKey?: string;
  checksum?: string;
  storagePath?: string;
  source: "upload" | "url" | "sample";
};

export type CreatorScene = {
  id: string;
  title: string;
  titleAr?: string;
  purpose: string;
  purposeAr?: string;
  duration: number;
  headline: string;
  headlineAr?: string;
  voiceover?: string;
  voiceoverAr?: string;
  direction: string;
  shot?: string;
  camera?: string;
  lighting?: string;
  continuityAnchor?: string;
  locked?: boolean;
};

export type CreatorTemplate = {
  id: string;
  name: string;
  nameAr: string;
  eyebrow: string;
  description: string;
  descriptionAr: string;
  bestFor: string;
  duration: number;
  previewVideo: string | null;
  poster: string;
  posterPosition: string;
  mediaCode: string;
  mediaTone: "warm" | "cool" | "soft" | "vivid" | "neutral";
  languages: CreatorLanguage[];
  aspectRatios: CreatorAspectRatio[];
  accent: string;
  tags: string[];
  verticals: BusinessVertical[];
  goals: CampaignGoal[];
  dialectRegister: "polished" | "conversational";
  qualityStatus: "development" | "review" | "approved";
  scenes: CreatorScene[];
};

export type CreatorProduct = {
  sourceType: "product_link" | "business_link" | "upload" | "sample" | null;
  sourceUrl: string;
  name: string;
  description: string;
  price: string;
  brand: string;
  images: CreatorAsset[];
};

export type CreatorProject = {
  id: string;
  versionId?: string;
  versionNumber?: number;
  title: string;
  templateId: string;
  status: CreatorProjectStatus;
  promotionKind: "product" | "business";
  vertical: BusinessVertical;
  goal: CampaignGoal;
  presenterMode: PresenterMode;
  location: string;
  bookingUrl: string;
  whatsapp: string;
  product: CreatorProduct;
  language: CreatorLanguage;
  arabicDialect: "kuwaiti";
  dialectRegister: "polished" | "conversational";
  market: CreatorMarket;
  offer: string;
  cta: string;
  brandColor: string;
  logoUrl: string;
  aspectRatio: CreatorAspectRatio;
  resolution: CreatorResolution;
  subtitles: boolean;
  audio: boolean;
  scenes: CreatorScene[];
  videoUrl: string | null;
  jobId: string | null;
  renderRunId?: string | null;
  lastError: string | null;
  pendingGenerationId?: string | null;
  pendingQuoteCredits?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorStep = "template" | "source" | "details" | "generating" | "editor";

export const MARKET_META: Record<CreatorMarket, { label: string; currency: string }> = {
  KW: { label: "Kuwait", currency: "KWD" },
  SA: { label: "Saudi Arabia", currency: "SAR" },
  AE: { label: "United Arab Emirates", currency: "AED" },
  QA: { label: "Qatar", currency: "QAR" },
  BH: { label: "Bahrain", currency: "BHD" },
  OM: { label: "Oman", currency: "OMR" },
};

export const CTA_OPTIONS = ["Shop now", "Order on WhatsApp", "Book now", "Learn more", "Visit store"];

export const CAMPAIGN_GOAL_OPTIONS: Array<{
  value: CampaignGoal;
  label: string;
  defaultCta: (typeof CTA_OPTIONS)[number];
}> = [
  { value: "whatsapp_orders", label: "Get WhatsApp orders", defaultCta: "Order on WhatsApp" },
  { value: "bookings", label: "Get bookings", defaultCta: "Book now" },
  { value: "launch", label: "Launch something new", defaultCta: "Shop now" },
  { value: "offer", label: "Promote an offer", defaultCta: "Shop now" },
  { value: "demonstration", label: "Explain how it works", defaultCta: "Learn more" },
  { value: "trust", label: "Build trust", defaultCta: "Learn more" },
];

export function getCampaignGoalOption(goal: CampaignGoal) {
  return CAMPAIGN_GOAL_OPTIONS.find((option) => option.value === goal) ?? CAMPAIGN_GOAL_OPTIONS[2]!;
}
