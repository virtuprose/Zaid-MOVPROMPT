export type CreatorLanguage = "en" | "ar" | "bilingual";
export type CreatorMarket = "KW" | "SA" | "AE" | "QA" | "BH" | "OM";
export type CreatorAspectRatio = "9:16" | "1:1" | "4:5" | "16:9";
export type CreatorResolution = "720p" | "1080p";
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
  assetKey?: string;
  checksum?: string;
  storagePath?: string;
  source: "upload" | "url" | "sample";
};

export type CreatorScene = {
  id: string;
  title: string;
  purpose: string;
  duration: number;
  headline: string;
  direction: string;
  locked?: boolean;
};

export type CreatorTemplate = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  bestFor: string;
  duration: number;
  previewVideo: string;
  poster: string;
  languages: CreatorLanguage[];
  aspectRatios: CreatorAspectRatio[];
  accent: string;
  tags: string[];
  scenes: CreatorScene[];
};

export type CreatorProduct = {
  sourceType: "link" | "upload" | "sample" | null;
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
  product: CreatorProduct;
  language: CreatorLanguage;
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

export const CTA_OPTIONS = ["Shop now", "Order on WhatsApp", "Learn more", "Visit store"];
