import type { CreatorProject, CreatorTemplate } from "./types";

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: "luxury-product-reveal",
    name: "Luxury product reveal",
    eyebrow: "Product hero",
    description: "A refined, high-contrast reveal that makes one product feel unmistakably premium.",
    bestFor: "Perfume, beauty, jewellery and premium retail",
    duration: 8,
    previewVideo: "/presets/hero-shot.mp4",
    poster: "/homepage/template-product-reveal.png",
    languages: ["en", "ar", "bilingual"],
    aspectRatios: ["9:16", "1:1", "4:5", "16:9"],
    accent: "#c99946",
    tags: ["Luxury", "Product", "Best seller"],
    scenes: [
      { id: "reveal-1", title: "The reveal", purpose: "Stop the scroll", duration: 2, headline: "Made to be noticed", direction: "Product emerges from shadow with a slow, precise push-in." },
      { id: "reveal-2", title: "Material detail", purpose: "Build desire", duration: 2, headline: "Every detail matters", direction: "Macro texture and material detail, clean specular highlights." },
      { id: "reveal-3", title: "Hero moment", purpose: "Make it memorable", duration: 2, headline: "Your new essential", direction: "Full product hero with controlled orbit and premium negative space." },
      { id: "reveal-4", title: "Brand close", purpose: "Drive action", duration: 2, headline: "Shop now", direction: "Still, confident product lockup with logo and direct CTA." },
    ],
  },
  {
    id: "hands-on-demo",
    name: "Hands-on product demo",
    eyebrow: "Product proof",
    description: "A natural, tactile demonstration that explains the product without feeling like an instruction manual.",
    bestFor: "Skincare, electronics, accessories and home products",
    duration: 12,
    previewVideo: "/presets/ugc.mp4",
    poster: "/homepage/template-creator-proof.png",
    languages: ["en", "ar", "bilingual"],
    aspectRatios: ["9:16", "1:1", "4:5", "16:9"],
    accent: "#77a989",
    tags: ["Demo", "Trust", "Voiceover"],
    scenes: [
      { id: "demo-1", title: "The problem", purpose: "Create relevance", duration: 2, headline: "Still dealing with this?", direction: "A relatable problem shown quickly in a clean real-world setting." },
      { id: "demo-2", title: "Meet the product", purpose: "Introduce solution", duration: 2, headline: "Meet the simple fix", direction: "Hands bring the product naturally into frame." },
      { id: "demo-3", title: "How it works", purpose: "Show proof", duration: 3, headline: "Simple by design", direction: "Clear hands-on usage with product identity preserved." },
      { id: "demo-4", title: "The benefit", purpose: "Resolve concern", duration: 3, headline: "Made for everyday use", direction: "Show the outcome in one visually legible moment." },
      { id: "demo-5", title: "Next step", purpose: "Drive action", duration: 2, headline: "Try it today", direction: "Product, offer and CTA settle into a clean end card." },
    ],
  },
  {
    id: "gcc-offer-launch",
    name: "GCC offer launch",
    eyebrow: "Arabic-first offer",
    description: "A fast retail format built for bilingual pricing, WhatsApp orders and Gulf social feeds.",
    bestFor: "Ecommerce offers, retail launches and seasonal promotions",
    duration: 10,
    previewVideo: "/presets/speed-reveal.mp4",
    poster: "/homepage/template-launch-story.png",
    languages: ["ar", "bilingual", "en"],
    aspectRatios: ["9:16", "1:1", "4:5", "16:9"],
    accent: "#d49737",
    tags: ["GCC", "Offer", "Arabic-first"],
    scenes: [
      { id: "offer-1", title: "Offer first", purpose: "Create urgency", duration: 2, headline: "عرض لفترة محدودة", direction: "Offer appears immediately inside a vertical-safe composition." },
      { id: "offer-2", title: "Product hero", purpose: "Show what is included", duration: 2, headline: "اختيار يستحق", direction: "Product takes centre stage with energetic but controlled movement." },
      { id: "offer-3", title: "Price moment", purpose: "Make value clear", duration: 2, headline: "سعر خاص اليوم", direction: "Price and currency stay highly readable without covering the product." },
      { id: "offer-4", title: "Reason to buy", purpose: "Build confidence", duration: 2, headline: "جودة تلاحظها", direction: "Close-up proof moment with one concise supporting claim." },
      { id: "offer-5", title: "WhatsApp close", purpose: "Drive action", duration: 2, headline: "اطلب الآن عبر واتساب", direction: "Clear bilingual CTA, logo and product lockup." },
    ],
  },
  {
    id: "ugc-review", name: "UGC review", eyebrow: "Creator trust", description: "A credible first-person review paced for Reels, TikTok and Snapchat.", bestFor: "Beauty, food, fashion and everyday products", duration: 12, previewVideo: "/presets/talking-avatar.mp4", poster: "/homepage/hero-creator.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#b78452", tags: ["UGC","Review","Trust"], scenes: [
      { id: "ugc-r-1", title: "Personal hook", purpose: "Earn attention", duration: 3, headline: "I had to try this", direction: "Creator introduces the product naturally in a real GCC home setting." },
      { id: "ugc-r-2", title: "Proof", purpose: "Show experience", duration: 5, headline: "Here’s what stood out", direction: "Hands-on use with legible product identity and one honest benefit." },
      { id: "ugc-r-3", title: "Recommendation", purpose: "Drive action", duration: 4, headline: "Worth adding to your routine", direction: "Warm creator close with product, brand and CTA." },
    ],
  },
  {
    id: "unboxing", name: "Premium unboxing", eyebrow: "Discovery", description: "A clean unboxing sequence that turns packaging and first use into a story.", bestFor: "Electronics, fragrance, accessories and gifting", duration: 10, previewVideo: "/presets/tactile-stopmotion.mp4", poster: "/homepage/template-texture-study.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#a68b69", tags: ["Unboxing","Product","Gift"], scenes: [
      { id: "unbox-1", title: "Sealed arrival", purpose: "Build curiosity", duration: 3, headline: "It’s here", direction: "Untouched package on a precise, uncluttered surface." },
      { id: "unbox-2", title: "The reveal", purpose: "Create delight", duration: 4, headline: "Made for the moment", direction: "Hands open packaging and reveal the exact product progressively." },
      { id: "unbox-3", title: "First look", purpose: "Close with desire", duration: 3, headline: "See it for yourself", direction: "Product and packaging settle into a premium hero frame." },
    ],
  },
  {
    id: "whatsapp-sales-ad", name: "WhatsApp sales ad", eyebrow: "Direct response", description: "An offer-led bilingual ad designed to turn interest into a WhatsApp order.", bestFor: "Local retail, home businesses and fast-moving offers", duration: 8, previewVideo: "/presets/speed-reveal.mp4", poster: "/homepage/template-launch-story.png", languages: ["ar","bilingual","en"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#d49737", tags: ["WhatsApp","Offer","Arabic-first"], scenes: [
      { id: "wa-1", title: "Offer hook", purpose: "Stop the scroll", duration: 2, headline: "عرض اليوم", direction: "Immediate offer and product inside bilingual safe zones." },
      { id: "wa-2", title: "Value proof", purpose: "Make choice easy", duration: 3, headline: "كل ما تحتاجه", direction: "Product benefit and price remain clearly readable." },
      { id: "wa-3", title: "Message now", purpose: "Convert", duration: 3, headline: "اطلب عبر واتساب", direction: "WhatsApp CTA, number, logo and product lockup." },
    ],
  },
  {
    id: "food-beverage", name: "Food & beverage craving", eyebrow: "Sensory product", description: "A texture-rich food or drink spot built around freshness, serving and appetite.", bestFor: "Restaurants, cafés, packaged food and beverages", duration: 8, previewVideo: "/presets/lifestyle.mp4", poster: "/homepage/template-in-motion.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#d1763d", tags: ["Food","Beverage","Sensory"], scenes: [
      { id: "food-1", title: "Fresh hook", purpose: "Create appetite", duration: 2, headline: "Made fresh", direction: "Macro steam, pour, crack or fizz with exact packaging visible." },
      { id: "food-2", title: "Serve", purpose: "Show experience", duration: 3, headline: "Your next favourite", direction: "Natural serving moment with rich texture and controlled motion." },
      { id: "food-3", title: "Order", purpose: "Drive action", duration: 3, headline: "Order today", direction: "Dish or product hero, price and delivery CTA." },
    ],
  },
  {
    id: "beauty-perfume", name: "Beauty & perfume ritual", eyebrow: "Luxury ritual", description: "A sensorial beauty story balancing product detail, application and refined atmosphere.", bestFor: "Perfume, skincare, makeup and personal care", duration: 8, previewVideo: "/presets/elite.mp4", poster: "/homepage/template-product-reveal.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#c08a86", tags: ["Beauty","Perfume","Luxury"], scenes: [
      { id: "beauty-1", title: "Signature mood", purpose: "Create emotion", duration: 2, headline: "Your signature", direction: "Atmospheric opening with product silhouette and ingredient cues." },
      { id: "beauty-2", title: "Ritual", purpose: "Show usage", duration: 3, headline: "A moment for you", direction: "Elegant application or spray with product details preserved." },
      { id: "beauty-3", title: "Lasting impression", purpose: "Build desire", duration: 3, headline: "Discover it today", direction: "Premium hero close with logo and restrained CTA." },
    ],
  },
  {
    id: "fashion", name: "Fashion drop", eyebrow: "New collection", description: "A fast editorial launch with fabric, fit and movement designed for social discovery.", bestFor: "Abayas, streetwear, accessories and seasonal drops", duration: 10, previewVideo: "/presets/cinematic-fashion.mp4", poster: "/homepage/hero-lifestyle.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#8d796a", tags: ["Fashion","Collection","Editorial"], scenes: [
      { id: "fashion-1", title: "Drop reveal", purpose: "Signal newness", duration: 3, headline: "The new edit", direction: "Editorial entrance with garment silhouette and confident motion." },
      { id: "fashion-2", title: "Fit & detail", purpose: "Show quality", duration: 4, headline: "Designed in every detail", direction: "Fabric, stitching and fit across clean movement shots." },
      { id: "fashion-3", title: "Shop the drop", purpose: "Convert", duration: 3, headline: "Available now", direction: "Collection lockup, logo and direct shopping CTA." },
    ],
  },
  {
    id: "electronics", name: "Electronics feature demo", eyebrow: "Feature proof", description: "A precise technology demo that turns one key feature into an immediate benefit.", bestFor: "Phones, audio, gaming, smart home and accessories", duration: 10, previewVideo: "/presets/realistic-3d.mp4", poster: "/homepage/template-clean-demo.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#6f8fa8", tags: ["Electronics","Demo","Feature"], scenes: [
      { id: "tech-1", title: "Feature hook", purpose: "Create relevance", duration: 3, headline: "Built to do more", direction: "Device enters a clean technical environment with exact ports and proportions." },
      { id: "tech-2", title: "How it helps", purpose: "Prove benefit", duration: 4, headline: "Simple. Fast. Reliable.", direction: "One feature shown in real use with restrained UI callouts." },
      { id: "tech-3", title: "Product close", purpose: "Drive purchase", duration: 3, headline: "Upgrade today", direction: "Device hero, price and retailer CTA." },
    ],
  },
  {
    id: "ramadan-eid", name: "Ramadan & Eid campaign", eyebrow: "Seasonal GCC", description: "A respectful bilingual seasonal story with gifting, hospitality and offer-safe layouts.", bestFor: "Retail, gifting, food, beauty and hospitality", duration: 10, previewVideo: "/presets/fashion-dream.mp4", poster: "/homepage/hero-product.png", languages: ["ar","bilingual","en"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#bd984c", tags: ["Ramadan","Eid","Seasonal"], scenes: [
      { id: "season-1", title: "Seasonal welcome", purpose: "Set the moment", duration: 3, headline: "رمضان يجمعنا", direction: "Warm contemporary GCC setting with subtle seasonal geometry." },
      { id: "season-2", title: "Gift or offer", purpose: "Show value", duration: 4, headline: "هدية تستحق المشاركة", direction: "Product or service presented as part of gifting or hospitality." },
      { id: "season-3", title: "Warm close", purpose: "Drive action", duration: 3, headline: "كل عام وأنتم بخير", direction: "Bilingual greeting, brand and gentle CTA." },
    ],
  },
  {
    id: "app-service", name: "App & service promotion", eyebrow: "Digital product", description: "A benefit-first app or service story using clear UI moments and a simple next step.", bestFor: "Apps, delivery, booking, fintech and local services", duration: 12, previewVideo: "/presets/cinematic-ai-director.mp4", poster: "/homepage/template-clean-demo.png", languages: ["en","ar","bilingual"], aspectRatios: ["9:16","1:1","4:5","16:9"], accent: "#7a88b5", tags: ["App","Service","Demo"], scenes: [
      { id: "app-1", title: "Everyday problem", purpose: "Create relevance", duration: 3, headline: "There’s an easier way", direction: "A simple real-world friction point, shown without exaggerated claims." },
      { id: "app-2", title: "Three-step demo", purpose: "Explain", duration: 5, headline: "Done in a few taps", direction: "Legible phone UI flow with focus on the core task." },
      { id: "app-3", title: "Start now", purpose: "Convert", duration: 4, headline: "Download and get started", direction: "Service result, app mark and store or signup CTA." },
    ],
  },
];

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
  return CREATOR_TEMPLATES.find((template) => template.id === id) ?? CREATOR_TEMPLATES[0];
}

export function createDraftProject(templateId = CREATOR_TEMPLATES[0].id): CreatorProject {
  const template = getCreatorTemplate(templateId);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    versionNumber: 1,
    title: "Untitled campaign",
    templateId: template.id,
    status: "draft",
    product: { sourceType: null, sourceUrl: "", name: "", description: "", price: "", brand: "", images: [] },
    language: template.id === "gcc-offer-launch" ? "ar" : "en",
    market: "KW",
    offer: "",
    cta: template.id === "gcc-offer-launch" ? "Order on WhatsApp" : "Shop now",
    brandColor: template.accent,
    logoUrl: "",
    aspectRatio: "9:16",
    resolution: "1080p",
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
