import {
  CreativeTemplateRecipeSchema,
  type CampaignTone,
  type CreativeTemplateRecipe,
  type DialectRegister,
  type LocalizedCopy,
  type StoryArc,
  type TemplateSceneRecipe,
} from "./types.js";

type Vertical = "salon" | "clinic" | "retail" | "ecommerce";
type Goal = "whatsapp_orders" | "bookings" | "launch" | "offer" | "demonstration" | "trust";

type TemplateSpec = {
  id: string;
  category: string;
  name: LocalizedCopy;
  description: LocalizedCopy;
  verticals: Vertical[];
  goals: Goal[];
  duration: number;
  arc: StoryArc;
  tone: CampaignTone;
  register?: DialectRegister;
  visual: string;
  sound?: string;
  hook: LocalizedCopy;
  proof: LocalizedCopy;
  cta: LocalizedCopy;
  requiredInputs?: string[];
  compliance?: string[];
  tags: string[];
};

const ALL_RATIOS = ["9:16", "1:1", "4:5", "16:9"] as const;
const ALL_LANGUAGES = ["ar", "en", "bilingual"] as const;

const PREMIUM_QUALITY = {
  tier: "premium" as const,
  acceptanceScore: 85,
  internalRetryLimit: 2,
  hardGates: [
    "valid_media",
    "product_or_business_identity",
    "confirmed_facts_only",
    "kuwaiti_dialect_when_arabic",
    "safe_content",
  ],
  scoredDimensions: [
    "technical",
    "product_identity",
    "prompt_adherence",
    "motion_realism",
    "visual_artifacts",
    "brand_safety",
    "dialect_fidelity",
    "speech_sync",
    "safe_zones",
    "compliance",
  ],
};

const ARC_STEPS: Record<StoryArc, Array<{ title: LocalizedCopy; purpose: LocalizedCopy; shot: string; camera: string }>> = {
  hero: [
    { title: { en: "Signature reveal", ar: "الظهور الأول" }, purpose: { en: "Stop the scroll", ar: "شد الانتباه" }, shot: "hero silhouette with controlled negative space", camera: "slow precision push-in" },
    { title: { en: "Material truth", ar: "تفاصيل الخامة" }, purpose: { en: "Build desire", ar: "إبراز الجودة" }, shot: "extreme macro material detail", camera: "short parallax slide" },
    { title: { en: "Context moment", ar: "المشهد الواقعي" }, purpose: { en: "Make it relevant", ar: "ربط المنتج بالحياة" }, shot: "medium lifestyle composition", camera: "restrained orbit or track" },
    { title: { en: "Brand close", ar: "الخاتمة" }, purpose: { en: "Drive action", ar: "توجيه الخطوة التالية" }, shot: "stable product or business lockup", camera: "locked frame with subtle living detail" },
  ],
  demo: [
    { title: { en: "Need", ar: "الحاجة" }, purpose: { en: "Create relevance", ar: "توضيح الحاجة" }, shot: "one legible real-world friction point", camera: "direct handheld-style settle" },
    { title: { en: "Introduce", ar: "التعريف" }, purpose: { en: "Present the solution", ar: "تقديم الحل" }, shot: "clean product or service introduction", camera: "controlled reveal" },
    { title: { en: "Use", ar: "طريقة الاستخدام" }, purpose: { en: "Show how it works", ar: "شرح الطريقة" }, shot: "clear hands-on or step-by-step proof", camera: "side track with stable subject" },
    { title: { en: "Benefit", ar: "الفايدة" }, purpose: { en: "Make value clear", ar: "توضيح القيمة" }, shot: "single confirmed benefit in context", camera: "gentle push toward result" },
    { title: { en: "Next step", ar: "الخطوة التالية" }, purpose: { en: "Convert", ar: "دعوة واضحة" }, shot: "clean end frame and safe zones", camera: "locked close" },
  ],
  offer: [
    { title: { en: "Offer first", ar: "العرض أولاً" }, purpose: { en: "Create urgency", ar: "توضيح العرض" }, shot: "subject and offer-safe negative space", camera: "fast controlled reveal" },
    { title: { en: "What you get", ar: "شنو تاخذ" }, purpose: { en: "Clarify value", ar: "توضيح القيمة" }, shot: "complete product or service inclusion", camera: "short lateral move" },
    { title: { en: "Reason to choose", ar: "ليش تختاره" }, purpose: { en: "Build confidence", ar: "بناء الثقة" }, shot: "one factual proof detail", camera: "macro or medium push" },
    { title: { en: "Act now", ar: "اطلب الحين" }, purpose: { en: "Convert", ar: "تشجيع الطلب" }, shot: "stable product, price and CTA safe zones", camera: "locked frame" },
  ],
  ugc: [
    { title: { en: "Personal hook", ar: "بداية شخصية" }, purpose: { en: "Earn attention", ar: "شد الانتباه" }, shot: "natural eye-line or hands-to-camera opening", camera: "subtle phone-camera movement" },
    { title: { en: "First impression", ar: "الانطباع الأول" }, purpose: { en: "Feel authentic", ar: "إحساس طبيعي" }, shot: "honest reaction with exact subject visible", camera: "stable handheld medium close-up" },
    { title: { en: "Real proof", ar: "التجربة" }, purpose: { en: "Show experience", ar: "عرض التجربة" }, shot: "hands-on or real-footage proof", camera: "simple follow movement" },
    { title: { en: "Recommendation", ar: "التوصية" }, purpose: { en: "Drive action", ar: "توجيه المشاهد" }, shot: "warm close and clean CTA area", camera: "gentle settle" },
  ],
  service: [
    { title: { en: "Local need", ar: "احتياجك" }, purpose: { en: "Create relevance", ar: "ربط الخدمة بالحاجة" }, shot: "recognisable Kuwait customer moment", camera: "calm establishing push" },
    { title: { en: "The place", ar: "المكان" }, purpose: { en: "Build familiarity", ar: "تعريف المكان" }, shot: "real environment and brand details", camera: "smooth walkthrough" },
    { title: { en: "The experience", ar: "التجربة" }, purpose: { en: "Explain the service", ar: "شرح الخدمة" }, shot: "factual process without invented outcomes", camera: "precise sequence of medium details" },
    { title: { en: "Trust point", ar: "نقطة الثقة" }, purpose: { en: "Reduce anxiety", ar: "بناء الثقة" }, shot: "confirmed people, facility or process proof", camera: "stable portrait or detail" },
    { title: { en: "Book", ar: "احجز" }, purpose: { en: "Convert", ar: "تسهيل الحجز" }, shot: "location, booking and WhatsApp safe zones", camera: "locked frame" },
  ],
  trust: [
    { title: { en: "Who we are", ar: "منو إحنا" }, purpose: { en: "Introduce identity", ar: "التعريف" }, shot: "real founder, practitioner or business environment", camera: "composed portrait push" },
    { title: { en: "What matters", ar: "شنو يهمنا" }, purpose: { en: "Show values", ar: "إظهار القيم" }, shot: "specific process or service detail", camera: "observational track" },
    { title: { en: "Evidence", ar: "الدليل" }, purpose: { en: "Build confidence", ar: "بناء الثقة" }, shot: "confirmed facility, product or consented testimonial proof", camera: "stable close details" },
    { title: { en: "Welcome", ar: "حياكم" }, purpose: { en: "Invite action", ar: "الدعوة" }, shot: "welcoming brand close", camera: "locked warm frame" },
  ],
  seasonal: [
    { title: { en: "Seasonal world", ar: "أجواء الموسم" }, purpose: { en: "Set the moment", ar: "بناء الأجواء" }, shot: "contemporary Kuwait seasonal setting", camera: "slow atmospheric reveal" },
    { title: { en: "The centrepiece", ar: "الاختيار" }, purpose: { en: "Show the offer", ar: "إظهار المنتج أو الخدمة" }, shot: "product or service within culturally respectful details", camera: "controlled orbit" },
    { title: { en: "Shared moment", ar: "لحظة تجمعنا" }, purpose: { en: "Create warmth", ar: "إحساس المشاركة" }, shot: "hospitality, gifting or family-safe context", camera: "gentle lateral drift" },
    { title: { en: "Seasonal close", ar: "الخاتمة الموسمية" }, purpose: { en: "Drive action", ar: "دعوة مناسبة" }, shot: "brand and CTA safe zones", camera: "stable warm close" },
  ],
  education: [
    { title: { en: "The question", ar: "السؤال" }, purpose: { en: "Create relevance", ar: "تحديد الموضوع" }, shot: "simple visual question without alarming imagery", camera: "direct composed opening" },
    { title: { en: "Clear answer", ar: "الجواب الواضح" }, purpose: { en: "Explain", ar: "الشرح" }, shot: "factual visual explanation", camera: "steady demonstrative movement" },
    { title: { en: "What to expect", ar: "شنو تتوقع" }, purpose: { en: "Reduce uncertainty", ar: "توضيح الخطوات" }, shot: "confirmed process or facility sequence", camera: "clean step-by-step coverage" },
    { title: { en: "Next step", ar: "خطوتك الجاية" }, purpose: { en: "Invite action", ar: "دعوة آمنة" }, shot: "contact or booking-safe end frame", camera: "locked close" },
  ],
  story: [
    { title: { en: "Origin", ar: "البداية" }, purpose: { en: "Create meaning", ar: "رواية البداية" }, shot: "authentic origin detail", camera: "slow documentary push" },
    { title: { en: "Craft", ar: "الشغل" }, purpose: { en: "Show care", ar: "إظهار الاهتمام" }, shot: "hands, process and real materials", camera: "observational macro track" },
    { title: { en: "Why it matters", ar: "ليش يفرق" }, purpose: { en: "Connect emotionally", ar: "ربط القصة بالمشاهد" }, shot: "human or customer context", camera: "natural medium movement" },
    { title: { en: "Continue the story", ar: "كمل القصة" }, purpose: { en: "Invite action", ar: "الدعوة" }, shot: "subject and brand close", camera: "stable final frame" },
  ],
  transformation: [
    { title: { en: "Real before", ar: "قبل الحقيقي" }, purpose: { en: "Establish context", ar: "توضيح البداية" }, shot: "user-supplied, consented before footage only", camera: "match source framing" },
    { title: { en: "The process", ar: "الخطوات" }, purpose: { en: "Show the work", ar: "عرض العملية" }, shot: "real process details without invented results", camera: "precise montage movement" },
    { title: { en: "Real after", ar: "بعد الحقيقي" }, purpose: { en: "Show evidence", ar: "عرض النتيجة الحقيقية" }, shot: "user-supplied, consented after footage only", camera: "match before framing" },
    { title: { en: "Book or shop", ar: "احجز أو اطلب" }, purpose: { en: "Convert", ar: "الدعوة" }, shot: "brand, location and CTA safe zones", camera: "locked close" },
  ],
};

function durations(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function buildScenes(spec: TemplateSpec): TemplateSceneRecipe[] {
  const steps = ARC_STEPS[spec.arc];
  const allocated = durations(spec.duration, steps.length);
  return steps.map((step, index) => {
    const last = index === steps.length - 1;
    const middle = index > 0 && !last;
    const headline = last ? spec.cta : index === 0 ? spec.hook : spec.proof;
    const voiceover = last
      ? spec.cta
      : index === 0
        ? spec.hook
        : middle
          ? spec.proof
          : headline;
    return {
      id: `${spec.id}-${index + 1}`,
      title: step.title,
      purpose: step.purpose,
      duration: allocated[index] ?? 1,
      headline,
      voiceover,
      direction: `${spec.visual}. ${step.shot}. Keep the confirmed subject visually dominant and leave intentional overlay-safe negative space.`,
      shot: step.shot,
      camera: step.camera,
      lighting: spec.tone === "clinical"
        ? "bright, clean, neutral-white motivated light with accurate skin and material colour"
        : spec.tone === "premium"
          ? "controlled key, soft fill, precise rim separation and rich but natural contrast"
          : "natural motivated light with clean exposure and locally believable colour",
      continuityAnchor: "Preserve the exact subject identity, environment geography, wardrobe, props, light direction and colour grade from the previous shot.",
    };
  });
}

function recipe(spec: TemplateSpec): CreativeTemplateRecipe {
  const clinicRules = spec.verticals.includes("clinic")
    ? [
        "Use only user-confirmed clinic identity, qualifications, prices and services",
        "Do not invent medical benefits, guaranteed outcomes or treatment claims",
        "Do not generate deceptive before/after transformations or identifiable patient-health information",
      ]
    : [];
  const transformationRules = spec.arc === "transformation"
    ? ["Before and after evidence must use real, consented user footage; generative transformation is prohibited"]
    : [];
  return CreativeTemplateRecipeSchema.parse({
    id: spec.id,
    slug: spec.id,
    versionNumber: ["luxury-product-reveal", "salon-booking-offer"].includes(spec.id) ? 2 : 1,
    category: spec.category,
    localizedName: spec.name,
    localizedDescription: spec.description,
    outcome: spec.goals[0] === "bookings" ? "Turn local attention into a confirmed booking" : spec.goals[0] === "whatsapp_orders" ? "Turn interest into a WhatsApp order" : "Create a conversion-ready Kuwait campaign",
    verticals: spec.verticals,
    goals: spec.goals,
    durationSeconds: spec.duration,
    supportedLanguages: [...ALL_LANGUAGES],
    supportedRatios: [...ALL_RATIOS],
    supportedMarkets: ["KW"],
    requiredInputs: spec.requiredInputs ?? ["subject_name", "primary_reference", "logo_or_brand_name", "call_to_action"],
    starterRenderEligible: true,
    qualityStatus: "review",
    storyArc: spec.arc,
    tone: spec.tone,
    dialectRegister: spec.register ?? (spec.tone === "clinical" ? "polished" : "conversational"),
    visualSystem: spec.visual,
    soundDirection: spec.sound ?? "Premium commercial sound bed, clean transitions, natural sync details and no overpowering music under speech.",
    capabilityPolicy: spec.arc === "ugc"
      ? ["video.product_fidelity", "presenter.ai_ugc", "speech.generate", "speech.lip_sync"]
      : ["video.product_fidelity", "video.cinematic", "speech.generate"],
    protectedLayers: ["subject_identity", "logo", "price", "offer", "cta", "arabic_copy", "subtitles"],
    complianceRules: ["Never invent business facts", "Render price, offer, logo, CTA and subtitles as deterministic layers", ...clinicRules, ...transformationRules, ...(spec.compliance ?? [])],
    qualityPolicy: PREMIUM_QUALITY,
    tags: spec.tags,
    scenes: buildScenes(spec),
  });
}

const SPECS: TemplateSpec[] = [
  { id: "luxury-product-reveal", category: "premium-retail", name: { en: "Luxury product reveal", ar: "إطلاق منتج فاخر" }, description: { en: "A high-contrast product film built around exact identity and premium material detail.", ar: "فيلم منتج فاخر يحافظ على الهوية ويبرز أدق التفاصيل." }, verticals: ["retail", "ecommerce"], goals: ["launch", "trust"], duration: 8, arc: "hero", tone: "premium", visual: "Black-stone studio, fine condensation, restrained gold highlights and luxury negative space", hook: { en: "Made to be noticed", ar: "حضور ما ينوّت" }, proof: { en: "Every detail matters", ar: "كل تفصيلة تفرق" }, cta: { en: "Discover it now", ar: "اكتشفه الحين" }, tags: ["luxury", "product", "hero"] },
  { id: "hands-on-demo", category: "product-demo", name: { en: "Hands-on product demo", ar: "تجربة المنتج" }, description: { en: "A clear tactile demonstration for products that need proof, not hype.", ar: "تجربة واضحة تبين شلون المنتج يشتغل من غير مبالغة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "trust"], duration: 12, arc: "demo", tone: "friendly", visual: "Bright Kuwait home environment, natural hands, clean surfaces and readable product handling", hook: { en: "Here is the simple way", ar: "خلّها أسهل" }, proof: { en: "See how it works", ar: "شوف شلون يشتغل" }, cta: { en: "Try it today", ar: "جرّبه الحين" }, tags: ["demo", "proof", "hands-on"] },
  { id: "gcc-offer-launch", category: "direct-response", name: { en: "Kuwait offer launch", ar: "إطلاق عرض الكويت" }, description: { en: "An Arabic-first offer film with price and WhatsApp conversion zones.", ar: "إعلان عرض كويتي واضح للسعر والطلب على الواتساب." }, verticals: ["retail", "ecommerce"], goals: ["offer", "whatsapp_orders"], duration: 10, arc: "offer", tone: "energetic", visual: "Fast premium retail cuts, exact product hero and strong amber offer-safe graphic space", hook: { en: "Limited Kuwait offer", ar: "عرض ما يطوف" }, proof: { en: "More value, clearly shown", ar: "قيمة واضحة من أول نظرة" }, cta: { en: "Order on WhatsApp", ar: "راسلنا على الواتساب" }, tags: ["offer", "Kuwait", "Arabic-first"] },
  { id: "ugc-review", category: "ugc-review", name: { en: "Kuwaiti UGC review", ar: "تجربة كويتية" }, description: { en: "A native Kuwait creator-style review with factual, consent-safe proof.", ar: "تجربة طبيعية باللهجة الكويتية وبمعلومات مؤكدة." }, verticals: ["retail", "ecommerce"], goals: ["trust", "demonstration"], duration: 12, arc: "ugc", tone: "friendly", visual: "Authentic phone-camera energy in a contemporary Kuwait home with stable skin tone and product identity", hook: { en: "I had to show you this", ar: "لازم أوريكم هذا" }, proof: { en: "This is what stood out", ar: "هذا أكثر شي عجبني" }, cta: { en: "See it for yourself", ar: "شوفه بنفسك" }, compliance: ["Presenter identity and voice require valid consent"], tags: ["UGC", "Kuwaiti", "trust"] },
  { id: "unboxing", category: "unboxing", name: { en: "Premium unboxing", ar: "فتح الصندوق" }, description: { en: "A precise packaging-to-product discovery sequence.", ar: "تجربة فتح مرتبة تبرز التغليف والمنتج خطوة بخطوة." }, verticals: ["retail", "ecommerce"], goals: ["launch", "demonstration"], duration: 10, arc: "hero", tone: "premium", visual: "Tactile table-top unboxing, crisp paper and packaging sounds, exact box geometry and deliberate reveal pacing", hook: { en: "It has arrived", ar: "وصل الحين" }, proof: { en: "Made for the moment", ar: "التفاصيل تقول كل شي" }, cta: { en: "Open yours", ar: "اطلبه وافتح تجربتك" }, tags: ["unboxing", "packaging", "gift"] },
  { id: "whatsapp-sales-ad", category: "whatsapp-commerce", name: { en: "WhatsApp sales ad", ar: "إعلان طلب واتساب" }, description: { en: "A compact direct-response format for Kuwait social commerce.", ar: "إعلان سريع يحول المشاهدة إلى طلب على الواتساب." }, verticals: ["retail", "ecommerce"], goals: ["whatsapp_orders", "offer"], duration: 8, arc: "offer", tone: "energetic", visual: "Fast subject-first sequence with deterministic offer, KWD price and WhatsApp CTA safe areas", hook: { en: "Today only", ar: "عرض اليوم" }, proof: { en: "Everything you need", ar: "كل اللي تحتاجه" }, cta: { en: "Message to order", ar: "راسلنا وطلبك علينا" }, tags: ["WhatsApp", "direct-response", "KWD"] },
  { id: "food-beverage", category: "food-beverage", name: { en: "Food and beverage craving", ar: "لقطة تشهّي" }, description: { en: "A sensory food or drink spot driven by freshness and real serving detail.", ar: "إعلان يشهّي يركز على الطزاجة والتقديم الحقيقي." }, verticals: ["retail", "ecommerce"], goals: ["whatsapp_orders", "launch"], duration: 8, arc: "hero", tone: "energetic", visual: "Macro steam, fizz, pour, crisp texture and appetising natural colour with exact packaging", hook: { en: "Fresh from the first look", ar: "من أول نظرة يشهّي" }, proof: { en: "Made fresh", ar: "طازج ويستاهل" }, cta: { en: "Order now", ar: "اطلبه الحين" }, tags: ["food", "beverage", "sensory"] },
  { id: "beauty-perfume", category: "beauty", name: { en: "Beauty and perfume ritual", ar: "طقس الجمال والعطر" }, description: { en: "A sensorial ritual balancing application, atmosphere and product fidelity.", ar: "قصة حسية تجمع الاستخدام والأجواء وهوية المنتج." }, verticals: ["retail", "ecommerce"], goals: ["launch", "trust"], duration: 8, arc: "hero", tone: "premium", visual: "Soft skin-safe beauty lighting, elegant application detail, fine mist and refined material reflections", hook: { en: "Your signature moment", ar: "لحظتك الخاصة" }, proof: { en: "A detail you feel", ar: "تفاصيل تحس فيها" }, cta: { en: "Make it yours", ar: "خلّه اختيارك" }, tags: ["beauty", "perfume", "ritual"] },
  { id: "fashion", category: "fashion", name: { en: "Fashion drop", ar: "نزول التشكيلة" }, description: { en: "An editorial social launch built around fit, fabric and movement.", ar: "إطلاق فاشن يبرز القصة والخامة والحركة." }, verticals: ["retail", "ecommerce"], goals: ["launch", "whatsapp_orders"], duration: 10, arc: "hero", tone: "premium", visual: "Contemporary Kuwait editorial architecture, fabric movement, clean styling and confident runway pacing", hook: { en: "The new edit", ar: "التشكيلة اليديدة" }, proof: { en: "Designed in every detail", ar: "كل تفصيلة محسوبة" }, cta: { en: "Shop the drop", ar: "اطلب التشكيلة الحين" }, tags: ["fashion", "collection", "editorial"] },
  { id: "electronics", category: "electronics", name: { en: "Electronics feature demo", ar: "عرض ميزة تقنية" }, description: { en: "One technical feature translated into a clear everyday benefit.", ar: "ميزة تقنية وحدة تنعرض بطريقة بسيطة وواضحة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "launch"], duration: 10, arc: "demo", tone: "informative", visual: "Clean technical studio, exact ports and proportions, restrained UI callouts and physically accurate reflections", hook: { en: "Built to do more", ar: "مصمم يسوي أكثر" }, proof: { en: "Fast, simple, reliable", ar: "سريع وبسيط ويعتمد عليه" }, cta: { en: "Upgrade today", ar: "طوّر تجربتك الحين" }, tags: ["electronics", "feature", "demo"] },
  { id: "ramadan-eid", category: "seasonal", name: { en: "Ramadan and Eid campaign", ar: "حملة رمضان والعيد" }, description: { en: "A respectful Kuwait seasonal campaign for gifting, hospitality and offers.", ar: "حملة كويتية راقية للهدايا والضيافة وعروض الموسم." }, verticals: ["retail", "ecommerce"], goals: ["launch", "offer"], duration: 10, arc: "seasonal", tone: "warm", visual: "Contemporary Kuwait hospitality, subtle crescent geometry, warm lantern light and premium gifting details", hook: { en: "A season that brings us together", ar: "رمضان يجمعنا" }, proof: { en: "Made for sharing", ar: "شي يستاهل المشاركة" }, cta: { en: "Share the moment", ar: "خلّ الفرحة تكمل" }, tags: ["Ramadan", "Eid", "seasonal"] },
  { id: "app-service", category: "digital-service", name: { en: "App and service promotion", ar: "تعريف تطبيق أو خدمة" }, description: { en: "A benefit-first story with legible UI and one simple next step.", ar: "قصة واضحة تبين فايدة التطبيق أو الخدمة بخطوات بسيطة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "launch"], duration: 12, arc: "demo", tone: "informative", visual: "Natural phone-in-hand context, perfectly legible interface captures and clean kinetic transitions", hook: { en: "There is an easier way", ar: "في طريقة أسهل" }, proof: { en: "Done in a few taps", ar: "تخلصها بجم ضغطة" }, cta: { en: "Get started", ar: "ابدأ الحين" }, tags: ["app", "service", "UI"] },
  { id: "salon-booking-offer", category: "salon-booking", name: { en: "Salon booking offer", ar: "عرض حجز صالون" }, description: { en: "A fact-safe local offer designed to turn attention into appointments.", ar: "عرض صالون واضح يحول المشاهدة إلى حجز." }, verticals: ["salon"], goals: ["bookings", "offer"], duration: 12, arc: "service", tone: "friendly", visual: "Real salon environment, clean beauty light, calm process details and Kuwait booking-safe composition", hook: { en: "Your next appointment", ar: "موعدك الجاي علينا" }, proof: { en: "Care in every detail", ar: "اهتمام بكل تفصيلة" }, cta: { en: "Book on WhatsApp", ar: "احجز على الواتساب" }, tags: ["salon", "booking", "Kuwait"] },
  { id: "salon-transformation-proof", category: "salon-proof", name: { en: "Real salon transformation", ar: "نتيجة صالون حقيقية" }, description: { en: "A consented real-footage before/process/after story with no generated result.", ar: "قصة قبل وبعد من تصوير حقيقي وموافقة واضحة، من غير نتيجة مولدة." }, verticals: ["salon"], goals: ["trust", "bookings"], duration: 12, arc: "transformation", tone: "friendly", visual: "Matched real-footage framing, honest colour and process-led editing", hook: { en: "A real client story", ar: "تجربة عميلة حقيقية" }, proof: { en: "The process matters", ar: "الخطوات هي اللي تفرق" }, cta: { en: "Book your consultation", ar: "احجز استشارتك الحين" }, requiredInputs: ["consented_before_video", "consented_after_video", "service_name", "booking_destination"], tags: ["salon", "real-footage", "consent"] },
  { id: "stylist-introduction", category: "salon-trust", name: { en: "Stylist introduction", ar: "تعريف خبيرة التجميل" }, description: { en: "A warm professional introduction built on real expertise and personality.", ar: "تعريف طبيعي يبرز الخبرة والشخصية من غير مبالغة." }, verticals: ["salon"], goals: ["trust", "bookings"], duration: 12, arc: "trust", tone: "friendly", visual: "Consented stylist portrait, real workplace details and editorial beauty lighting", hook: { en: "Meet your stylist", ar: "تعرفوا على خبيرة التجميل" }, proof: { en: "Care, craft and detail", ar: "خبرة واهتمام بالتفاصيل" }, cta: { en: "Book with us", ar: "احجز موعدك ويانا" }, requiredInputs: ["consented_person_reference", "confirmed_role", "salon_location", "booking_destination"], tags: ["stylist", "trust", "booking"] },
  { id: "bridal-beauty-booking", category: "salon-bridal", name: { en: "Bridal beauty booking", ar: "حجز تجهيز العروس" }, description: { en: "An elegant bridal-service campaign with calm planning and clear booking.", ar: "حملة راقية لتجهيز العروس بخطوات وحجز واضح." }, verticals: ["salon"], goals: ["bookings", "trust"], duration: 15, arc: "service", tone: "premium", visual: "Soft bridal preparation details, pearl neutrals, fabric texture and respectful close framing", hook: { en: "Your day, thoughtfully prepared", ar: "يومج يستاهل كل الاهتمام" }, proof: { en: "Every detail, planned", ar: "كل تفصيلة مرتبة" }, cta: { en: "Reserve your date", ar: "احجزي تاريخج الحين" }, tags: ["bridal", "salon", "booking"] },
  { id: "haircare-service-story", category: "salon-hair", name: { en: "Haircare service story", ar: "قصة عناية بالشعر" }, description: { en: "A process-first service story without invented treatment outcomes.", ar: "قصة خدمة تركز على الخطوات من غير وعود أو نتائج مخترعة." }, verticals: ["salon"], goals: ["demonstration", "bookings"], duration: 12, arc: "service", tone: "friendly", visual: "Real wash, sectioning and styling details with natural hair texture and clean salon light", hook: { en: "Care starts with the right process", ar: "العناية تبدأ من الخطوات الصح" }, proof: { en: "A routine made for you", ar: "عناية تناسبج" }, cta: { en: "Book your visit", ar: "احجزي زيارتج" }, tags: ["haircare", "process", "salon"] },
  { id: "nail-art-showcase", category: "salon-nails", name: { en: "Nail art showcase", ar: "عرض فن الأظافر" }, description: { en: "A macro-led design showcase with real work and booking intent.", ar: "عرض ماكرو لشغل حقيقي وتصاميم دقيقة مع حجز مباشر." }, verticals: ["salon"], goals: ["bookings", "launch"], duration: 10, arc: "hero", tone: "energetic", visual: "Precision macro nail detail, true polish colour, fine sparkle and clean hand posing", hook: { en: "Your next set", ar: "تصميمج الياي" }, proof: { en: "Detail you can see", ar: "دقة تبين من أول نظرة" }, cta: { en: "Choose your design", ar: "اختاري تصميمج واحجزي" }, requiredInputs: ["real_work_reference", "service_name", "booking_destination"], tags: ["nails", "macro", "booking"] },
  { id: "spa-wellness-escape", category: "salon-spa", name: { en: "Spa wellness escape", ar: "تجربة سبا هادئة" }, description: { en: "A calm sensory introduction to a confirmed spa experience.", ar: "تعريف هادي بتجربة السبا والخدمات المؤكدة." }, verticals: ["salon"], goals: ["bookings", "trust"], duration: 12, arc: "service", tone: "warm", visual: "Warm stone, clean towels, gentle steam, natural botanicals and slow calming movement", hook: { en: "A moment to reset", ar: "لحظة ترتاح فيها" }, proof: { en: "Calm in every detail", ar: "راحة بكل تفصيلة" }, cta: { en: "Book your escape", ar: "احجز وقتك الحين" }, tags: ["spa", "wellness", "calm"] },
  { id: "barbershop-precision", category: "salon-barber", name: { en: "Barbershop precision", ar: "دقة الحلاقة" }, description: { en: "A sharp craft-led booking film for a real barber and shop.", ar: "فيلم حجز يبرز دقة الحلاق والمكان الحقيقي." }, verticals: ["salon"], goals: ["bookings", "trust"], duration: 10, arc: "service", tone: "premium", visual: "Crisp clipper detail, clean lines, leather and metal textures with controlled masculine contrast", hook: { en: "Precision starts here", ar: "الدقة تبدأ هني" }, proof: { en: "Every line, considered", ar: "كل خط محسوب" }, cta: { en: "Book your chair", ar: "احجز كرسيك الحين" }, tags: ["barber", "craft", "booking"] },
  { id: "clinic-service-explainer", category: "clinic-education", name: { en: "Clinic service explainer", ar: "شرح خدمة العيادة" }, description: { en: "A factual, non-diagnostic explanation of a confirmed clinic service.", ar: "شرح واضح لخدمة معتمدة من غير تشخيص أو وعود." }, verticals: ["clinic"], goals: ["demonstration", "trust"], duration: 15, arc: "education", tone: "clinical", visual: "Real licensed facility, accurate equipment, calm neutral colour and clear process framing", hook: { en: "Understand the service clearly", ar: "خلّ الصورة تكون واضحة" }, proof: { en: "Facts, steps and expectations", ar: "معلومات وخطوات من غير مبالغة" }, cta: { en: "Book a consultation", ar: "احجز استشارتك" }, requiredInputs: ["verified_clinic_identity", "confirmed_service", "approved_claims", "booking_destination"], tags: ["clinic", "education", "fact-safe"] },
  { id: "clinic-facility-tour", category: "clinic-trust", name: { en: "Clinic facility tour", ar: "جولة في العيادة" }, description: { en: "A real-location trust film showing the approved facility and patient journey.", ar: "جولة بالمكان الحقيقي تبين العيادة وخطوات الزيارة." }, verticals: ["clinic"], goals: ["trust", "bookings"], duration: 15, arc: "trust", tone: "clinical", visual: "Verified clinic exterior, reception and treatment spaces with privacy-safe clean architectural movement", hook: { en: "Know the place before you visit", ar: "تعرف على المكان قبل الزيارة" }, proof: { en: "A clear, professional environment", ar: "بيئة مرتبة وواضحة" }, cta: { en: "Plan your visit", ar: "رتّب زيارتك" }, requiredInputs: ["verified_clinic_identity", "real_facility_media", "location", "booking_destination"], tags: ["clinic", "facility", "trust"] },
  { id: "practitioner-introduction", category: "clinic-practitioner", name: { en: "Practitioner introduction", ar: "تعريف الممارس" }, description: { en: "A consented professional profile using only verified qualifications.", ar: "تعريف مهني بموافقة واضحة ومؤهلات مؤكدة فقط." }, verticals: ["clinic"], goals: ["trust", "bookings"], duration: 12, arc: "trust", tone: "clinical", visual: "Consented practitioner portrait in verified clinic context with calm professional framing", hook: { en: "Meet your practitioner", ar: "تعرف على الممارس" }, proof: { en: "Verified experience, clearly presented", ar: "خبرة مؤكدة ومعلومات واضحة" }, cta: { en: "Book a consultation", ar: "احجز استشارتك" }, requiredInputs: ["consented_person_reference", "verified_qualification", "verified_clinic_identity", "booking_destination"], tags: ["clinic", "practitioner", "verified"] },
  { id: "clinic-appointment-campaign", category: "clinic-booking", name: { en: "Clinic appointment campaign", ar: "حملة حجز موعد" }, description: { en: "A direct but compliant appointment campaign with verified service and price.", ar: "حملة حجز واضحة بخدمة وسعر مؤكدين ومن غير ادعاءات." }, verticals: ["clinic"], goals: ["bookings", "offer"], duration: 10, arc: "service", tone: "clinical", visual: "Clean service context, verified price safe zone and calm booking close", hook: { en: "Ready to ask the right questions?", ar: "جاهز تستفسر بشكل واضح؟" }, proof: { en: "Confirmed service information", ar: "معلومات الخدمة مثل ما هي" }, cta: { en: "Request an appointment", ar: "اطلب موعدك" }, requiredInputs: ["verified_clinic_identity", "confirmed_service", "approved_price", "booking_destination"], tags: ["clinic", "appointment", "compliant"] },
  { id: "dental-hygiene-education", category: "clinic-dental", name: { en: "Dental hygiene education", ar: "توعية العناية بالأسنان" }, description: { en: "General preventive education without diagnosis or guaranteed results.", ar: "توعية عامة للعناية من غير تشخيص أو نتيجة مضمونة." }, verticals: ["clinic"], goals: ["demonstration", "trust"], duration: 15, arc: "education", tone: "clinical", visual: "Friendly dental environment, clean model demonstrations and non-graphic preventive care visuals", hook: { en: "Small habits matter", ar: "العادات الصغيرة تفرق" }, proof: { en: "Clear everyday guidance", ar: "نصايح يومية واضحة" }, cta: { en: "Ask your dental professional", ar: "اسأل المختص" }, tags: ["dental", "education", "preventive"] },
  { id: "skin-consultation-guide", category: "clinic-skin", name: { en: "Skin consultation guide", ar: "دليل استشارة البشرة" }, description: { en: "A safe explanation of what happens during a consultation, not a treatment promise.", ar: "شرح آمن للاستشارة من غير وعد بعلاج أو نتيجة." }, verticals: ["clinic"], goals: ["demonstration", "bookings"], duration: 15, arc: "education", tone: "clinical", visual: "Neutral consultation room, respectful non-diagnostic skin discussion and clean process details", hook: { en: "Start with a proper consultation", ar: "ابدأ باستشارة واضحة" }, proof: { en: "Questions, assessment and options", ar: "أسئلة وتقييم وخيارات" }, cta: { en: "Book your consultation", ar: "احجز استشارتك" }, tags: ["skin", "consultation", "clinic"] },
  { id: "wellness-check-reminder", category: "clinic-reminder", name: { en: "Wellness check reminder", ar: "تذكير فحص عام" }, description: { en: "A calm preventive reminder that avoids fear, diagnosis and medical promises.", ar: "تذكير هادي للفحص من غير تخويف أو تشخيص أو وعود." }, verticals: ["clinic"], goals: ["bookings", "trust"], duration: 10, arc: "education", tone: "clinical", visual: "Calm everyday wellbeing moments, real clinic contact and reassuring neutral motion", hook: { en: "Make time for your health", ar: "خل لصحتك وقت" }, proof: { en: "A simple check-in starts with a conversation", ar: "البداية تكون باستفسار واضح" }, cta: { en: "Request an appointment", ar: "اطلب موعدك" }, tags: ["wellness", "reminder", "clinic"] },
  { id: "perfume-launch-film", category: "perfume", name: { en: "Perfume launch film", ar: "إطلاق عطر" }, description: { en: "A cinematic fragrance world that keeps the bottle and label exact.", ar: "عالم سينمائي للعطر مع الحفاظ على شكل العبوة والاسم." }, verticals: ["retail", "ecommerce"], goals: ["launch", "trust"], duration: 12, arc: "hero", tone: "premium", visual: "Dark velvet atmosphere, controlled mist, ingredient abstractions and exact glass bottle caustics", hook: { en: "A new signature", ar: "بصمتك اليديدة" }, proof: { en: "A presence that stays", ar: "حضور يبقى" }, cta: { en: "Discover the fragrance", ar: "اكتشف العطر الحين" }, tags: ["perfume", "cinematic", "launch"] },
  { id: "skincare-routine", category: "skincare", name: { en: "Skincare routine", ar: "روتين العناية" }, description: { en: "A texture-and-use routine with no invented skin outcome.", ar: "روتين يبين القوام والاستخدام من غير نتيجة مخترعة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "trust"], duration: 12, arc: "demo", tone: "friendly", visual: "Clean bathroom vanity, true product texture, hygienic application and soft natural skin light", hook: { en: "Make the routine simple", ar: "خل روتينك أبسط" }, proof: { en: "One clear step at a time", ar: "خطوة واضحة كل مرة" }, cta: { en: "Build your routine", ar: "ابدأ روتينك الحين" }, compliance: ["Do not generate or claim skin transformation"], tags: ["skincare", "routine", "demo"] },
  { id: "makeup-shade-showcase", category: "makeup", name: { en: "Makeup shade showcase", ar: "عرض درجات المكياج" }, description: { en: "A colour-accurate shade and texture showcase using real references.", ar: "عرض دقيق للدرجات والقوام باستخدام مراجع حقيقية." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "launch"], duration: 10, arc: "demo", tone: "energetic", visual: "Colour-calibrated swatches, macro texture, inclusive real skin references and clean beauty light", hook: { en: "Find your shade", ar: "لقي درجتج" }, proof: { en: "True colour, clearly shown", ar: "اللون واضح مثل ما هو" }, cta: { en: "Choose yours", ar: "اختاري درجتج" }, requiredInputs: ["product_reference", "real_shade_reference", "confirmed_shade_names", "call_to_action"], tags: ["makeup", "shade", "colour"] },
  { id: "jewellery-sparkle-reveal", category: "jewellery", name: { en: "Jewellery sparkle reveal", ar: "إظهار المجوهرات" }, description: { en: "A macro luxury film with accurate stone, metal and setting geometry.", ar: "فيلم فاخر بدقة عالية للحجر والمعدن والتصميم." }, verticals: ["retail", "ecommerce"], goals: ["launch", "trust"], duration: 10, arc: "hero", tone: "premium", visual: "Precision macro jewellery light, controlled sparkle, black mirror surface and accurate metal colour", hook: { en: "A detail worth keeping", ar: "تفصيلة تستاهل" }, proof: { en: "Crafted to be seen", ar: "شغل يبين من أول نظرة" }, cta: { en: "View the piece", ar: "شوف القطعة الحين" }, tags: ["jewellery", "macro", "luxury"] },
  { id: "watch-craftsmanship", category: "watches", name: { en: "Watch craftsmanship", ar: "حرفية الساعة" }, description: { en: "A mechanical-detail story with exact dial and case fidelity.", ar: "قصة تبرز تفاصيل الساعة مع الحفاظ على المينا والهيكل." }, verticals: ["retail", "ecommerce"], goals: ["trust", "launch"], duration: 12, arc: "story", tone: "premium", visual: "Macro dial, crown and bracelet detail, precise moving reflections and horology-inspired pacing", hook: { en: "Time, considered", ar: "كل ثانية محسوبة" }, proof: { en: "Craft in every detail", ar: "حرفية بكل تفصيلة" }, cta: { en: "Make it yours", ar: "خلّها ساعتك" }, tags: ["watch", "craft", "luxury"] },
  { id: "abaya-editorial", category: "fashion-abaya", name: { en: "Abaya editorial", ar: "إطلالة عباية" }, description: { en: "A Kuwait-aware editorial built around fabric, drape and modest movement.", ar: "إعلان كويتي راقي يبرز القماش والقصة والحركة المحتشمة." }, verticals: ["retail", "ecommerce"], goals: ["launch", "whatsapp_orders"], duration: 12, arc: "hero", tone: "premium", visual: "Modern Kuwait architecture, modest editorial movement, rich black fabric detail and elegant natural wind", hook: { en: "A new kind of presence", ar: "حضور بشكل يديد" }, proof: { en: "Drape, detail and confidence", ar: "قصة وتفاصيل وثقة" }, cta: { en: "Shop the collection", ar: "اطلبي التشكيلة الحين" }, tags: ["abaya", "fashion", "Kuwait"] },
  { id: "footwear-motion", category: "fashion-footwear", name: { en: "Footwear in motion", ar: "الحذاء بالحركة" }, description: { en: "A movement-led product film showing fit, sole and everyday use.", ar: "فيلم حركة يبين القصة والنعل والاستخدام اليومي." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "launch"], duration: 10, arc: "demo", tone: "energetic", visual: "Low-angle tracking, accurate shoe silhouette, grounded foot contact and clean urban Kuwait textures", hook: { en: "Made for every step", ar: "لكل خطوة" }, proof: { en: "See the fit in motion", ar: "شوف القصة بالحركة" }, cta: { en: "Find your pair", ar: "خذ زوجك الحين" }, tags: ["footwear", "motion", "fashion"] },
  { id: "handbag-styling", category: "fashion-accessories", name: { en: "Handbag styling", ar: "تنسيق الشنطة" }, description: { en: "Three polished styling moments built around one exact bag.", ar: "ثلاث تنسيقات راقية حول شنطة وحدة بهويتها الأصلية." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "launch"], duration: 12, arc: "hero", tone: "premium", visual: "Editorial wardrobe changes, accurate bag proportions, hardware detail and clean match cuts", hook: { en: "One piece, three moods", ar: "قطعة وحدة، ثلاث إطلالات" }, proof: { en: "Styled your way", ar: "نسّقيها بطريقتج" }, cta: { en: "Choose your colour", ar: "اختاري لونج" }, tags: ["handbag", "styling", "accessory"] },
  { id: "home-decor-refresh", category: "home-decor", name: { en: "Home decor refresh", ar: "تجديد ديكور البيت" }, description: { en: "A room-detail story using real space references and deterministic products.", ar: "قصة تجديد تستخدم صور المكان الحقيقي والمنتجات المؤكدة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "whatsapp_orders"], duration: 12, arc: "demo", tone: "warm", visual: "Contemporary Kuwait interior, natural daylight, accurate furniture scale and clean styled details", hook: { en: "Refresh the room", ar: "جدّد جو البيت" }, proof: { en: "Small details, clear difference", ar: "تفاصيل بسيطة تفرق" }, cta: { en: "Shop the look", ar: "اطلب اللوك الحين" }, requiredInputs: ["product_reference", "real_room_reference", "dimensions_if_relevant", "call_to_action"], tags: ["home", "decor", "interior"] },
  { id: "kitchen-tool-demo", category: "home-kitchen", name: { en: "Kitchen tool demo", ar: "تجربة أداة المطبخ" }, description: { en: "A clean food-safe demonstration focused on one confirmed function.", ar: "تجربة نظيفة تشرح وظيفة وحدة مؤكدة بطريقة واضحة." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "whatsapp_orders"], duration: 12, arc: "demo", tone: "informative", visual: "Bright food-safe kitchen, exact tool geometry, legible hands and physically correct food motion", hook: { en: "Make prep easier", ar: "خل التحضير أسهل" }, proof: { en: "One tool, one clear job", ar: "أداة وحدة وشغل واضح" }, cta: { en: "Order yours", ar: "اطلبها الحين" }, tags: ["kitchen", "tool", "demo"] },
  { id: "grocery-value-bundle", category: "grocery", name: { en: "Grocery value bundle", ar: "باقة توفير" }, description: { en: "A fast bundle breakdown with exact quantities and KWD value.", ar: "عرض سريع للباقة بالكميات والسعر الكويتي مثل ما هو." }, verticals: ["retail", "ecommerce"], goals: ["offer", "whatsapp_orders"], duration: 10, arc: "offer", tone: "energetic", visual: "Clean overhead grocery layout, accurate pack count, crisp colour and fast organised reveals", hook: { en: "More in one bundle", ar: "أكثر بباقة وحدة" }, proof: { en: "Every item, clearly shown", ar: "كل شي واضح قدامك" }, cta: { en: "Order the bundle", ar: "اطلب الباقة الحين" }, requiredInputs: ["all_bundle_item_references", "confirmed_quantities", "confirmed_price", "whatsapp"], tags: ["grocery", "bundle", "value"] },
  { id: "coffee-ritual", category: "coffee", name: { en: "Coffee ritual", ar: "طقس القهوة" }, description: { en: "A sensory roast-to-cup film for cafés and packaged coffee.", ar: "فيلم حسي من التحميص إلى الفنجان للمقاهي والقهوة المعبأة." }, verticals: ["retail", "ecommerce"], goals: ["launch", "whatsapp_orders"], duration: 10, arc: "story", tone: "warm", visual: "Macro beans, grinding, crema, Arabic coffee hospitality and rich natural steam", hook: { en: "Your next cup starts here", ar: "فنجانك الياي يبدأ هني" }, proof: { en: "Roasted with care", ar: "تحميص باهتمام" }, cta: { en: "Order your coffee", ar: "اطلب قهوتك الحين" }, tags: ["coffee", "cafe", "ritual"] },
  { id: "dessert-launch", category: "dessert", name: { en: "Dessert launch", ar: "إطلاق حلو" }, description: { en: "A texture-rich launch built around the real dessert and serving size.", ar: "إطلاق يشهّي يبرز الحلو الحقيقي وحجم التقديم." }, verticals: ["retail", "ecommerce"], goals: ["launch", "whatsapp_orders"], duration: 8, arc: "hero", tone: "energetic", visual: "Macro cut, sauce pull, crumb texture and premium takeaway packaging with accurate portion size", hook: { en: "Save room for this", ar: "خل مكان للحلو" }, proof: { en: "Made fresh for the moment", ar: "طازج للحظة الحلوة" }, cta: { en: "Order a box", ar: "اطلب بوكسك الحين" }, tags: ["dessert", "food", "launch"] },
  { id: "restaurant-signature-dish", category: "restaurant", name: { en: "Signature dish spotlight", ar: "طبق المطعم المميز" }, description: { en: "A kitchen-to-table story for one real signature dish.", ar: "قصة من المطبخ للطاولة لطبق حقيقي مميز." }, verticals: ["retail", "ecommerce"], goals: ["whatsapp_orders", "trust"], duration: 12, arc: "story", tone: "warm", visual: "Real kitchen craft, ingredient detail, honest plating and lively Kuwait dining atmosphere", hook: { en: "The dish people come back for", ar: "الطبق اللي ترجع له" }, proof: { en: "Prepared, plated, served", ar: "يتحضّر وينقدم باهتمام" }, cta: { en: "Reserve or order", ar: "احجز أو اطلب الحين" }, requiredInputs: ["real_dish_media", "restaurant_identity", "confirmed_price", "order_or_booking_destination"], tags: ["restaurant", "signature", "food"] },
  { id: "cloud-kitchen-delivery", category: "food-delivery", name: { en: "Cloud kitchen delivery", ar: "طلب مطبخ توصيل" }, description: { en: "A fast order-to-door campaign with clear menu, packaging and delivery facts.", ar: "حملة سريعة من الطلب للباب بمنيو وتغليف ومعلومات مؤكدة." }, verticals: ["retail", "ecommerce"], goals: ["whatsapp_orders", "offer"], duration: 10, arc: "demo", tone: "energetic", visual: "Fast order flow, real packaging, clean food hero and believable Kuwait doorstep delivery", hook: { en: "Craving solved", ar: "خاطرك بشي؟" }, proof: { en: "Packed fresh, delivered clearly", ar: "يتجهز ويوصل مرتب" }, cta: { en: "Order now", ar: "اطلب الحين" }, tags: ["delivery", "cloud-kitchen", "food"] },
  { id: "supplement-routine", category: "wellness-retail", name: { en: "Supplement routine", ar: "روتين المكمل" }, description: { en: "A compliant routine film that avoids health and treatment claims.", ar: "فيلم روتين ملتزم من غير ادعاءات صحية أو علاجية." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "trust"], duration: 12, arc: "demo", tone: "informative", visual: "Clean daily routine, exact label, serving instruction visibility and neutral wellness context", hook: { en: "Keep the routine clear", ar: "خل روتينك واضح" }, proof: { en: "Follow the confirmed label", ar: "اتبع التعليمات الموجودة" }, cta: { en: "Learn more", ar: "اقرأ التفاصيل" }, compliance: ["Do not invent health benefits, treatment outcomes or dosage", "Preserve and defer to the confirmed product label and required disclaimer"], tags: ["supplement", "compliance", "routine"] },
  { id: "baby-product-trust", category: "baby-care", name: { en: "Baby product trust", ar: "ثقة منتجات الطفل" }, description: { en: "A gentle fact-led product story with parent-safe handling.", ar: "قصة هادية تركز على المعلومات المؤكدة والاستخدام الآمن." }, verticals: ["retail", "ecommerce"], goals: ["trust", "demonstration"], duration: 12, arc: "trust", tone: "warm", visual: "Soft daylight, clean materials, safe adult handling and no identifiable child without consent", hook: { en: "Chosen with care", ar: "اختيار باهتمام" }, proof: { en: "Every fact, clearly shown", ar: "كل معلومة واضحة" }, cta: { en: "See the details", ar: "شوف التفاصيل" }, compliance: ["Do not show an identifiable minor without verified guardian consent", "Do not invent safety, medical or developmental claims"], tags: ["baby", "trust", "care"] },
  { id: "pet-product-demo", category: "pet-care", name: { en: "Pet product demo", ar: "تجربة منتج للحيوان" }, description: { en: "A real-use product demonstration with safe, natural animal behaviour.", ar: "تجربة استخدام حقيقية بحركة طبيعية وآمنة للحيوان." }, verticals: ["retail", "ecommerce"], goals: ["demonstration", "whatsapp_orders"], duration: 10, arc: "demo", tone: "friendly", visual: "Natural pet movement, owner-guided use, exact product and clean home environment", hook: { en: "Made for everyday care", ar: "للعناية كل يوم" }, proof: { en: "Simple to use", ar: "استخدامه بسيط" }, cta: { en: "Order for your pet", ar: "اطلبه لحيوانك" }, compliance: ["Do not depict distress, unsafe restraint or invented veterinary claims"], tags: ["pet", "demo", "care"] },
  { id: "curated-gift-box", category: "gifting", name: { en: "Curated gift box", ar: "بوكس هدية" }, description: { en: "A premium contents reveal for gifting businesses and seasonal bundles.", ar: "كشف راقي لمحتويات بوكس الهدية والباقات الموسمية." }, verticals: ["retail", "ecommerce"], goals: ["whatsapp_orders", "launch"], duration: 10, arc: "hero", tone: "premium", visual: "Ribbon, tissue, exact item count, elegant top-down arrangement and warm gifting light", hook: { en: "A gift, thoughtfully chosen", ar: "هدية مختارة بذوق" }, proof: { en: "Every piece, beautifully placed", ar: "كل قطعة بمكانها" }, cta: { en: "Send a gift", ar: "اطلب هديتك الحين" }, requiredInputs: ["all_box_item_references", "confirmed_contents", "confirmed_price", "delivery_destination"], tags: ["gift", "box", "seasonal"] },
  { id: "back-to-school-offer", category: "seasonal-retail", name: { en: "Back-to-school offer", ar: "عرض العودة للمدارس" }, description: { en: "A practical family retail campaign with exact bundle and KWD pricing.", ar: "حملة عائلية عملية بباقة وسعر كويتي واضحين." }, verticals: ["retail", "ecommerce"], goals: ["offer", "whatsapp_orders"], duration: 10, arc: "offer", tone: "energetic", visual: "Organised school essentials, bright colour, clean pack counts and fast family-safe rhythm", hook: { en: "Ready for the first day", ar: "جاهزين لأول يوم" }, proof: { en: "Everything in one place", ar: "كل اللي تحتاجه بمكان واحد" }, cta: { en: "Order the school bundle", ar: "اطلب باقة المدرسة" }, tags: ["school", "offer", "family"] },
  { id: "kuwait-national-day", category: "seasonal-kuwait", name: { en: "Kuwait National Day campaign", ar: "حملة الأعياد الوطنية" }, description: { en: "A respectful national celebration with Kuwait colour and local pride.", ar: "حملة وطنية راقية بألوان الكويت وروح محلية." }, verticals: ["retail", "ecommerce", "salon"], goals: ["launch", "offer"], duration: 12, arc: "seasonal", tone: "warm", visual: "Contemporary Kuwait skyline and neighbourhood details, tasteful flag colours and celebratory light without political impersonation", hook: { en: "Kuwait brings us together", ar: "الكويت تجمعنا" }, proof: { en: "Made for the celebration", ar: "للفرحة الكويتية" }, cta: { en: "Celebrate with us", ar: "احتفلوا ويانا" }, tags: ["Kuwait", "national-day", "seasonal"] },
  { id: "customer-testimonial", category: "customer-testimonial", name: { en: "Real customer testimonial", ar: "تجربة عميل حقيقية" }, description: { en: "A consented testimonial format that preserves the speaker's exact words.", ar: "قالب شهادة حقيقية بموافقة واضحة وكلام العميل مثل ما هو." }, verticals: ["retail", "ecommerce", "salon", "clinic"], goals: ["trust"], duration: 15, arc: "ugc", tone: "friendly", visual: "Real consented speaker, clean interview light, truthful supporting B-roll and exact transcript preservation", hook: { en: "Hear it from a real customer", ar: "اسمعها من عميل حقيقي" }, proof: { en: "Their words, unchanged", ar: "كلامه مثل ما قاله" }, cta: { en: "See what fits you", ar: "شوف شنو يناسبك" }, requiredInputs: ["consented_customer_video", "approved_transcript", "business_identity", "call_to_action"], compliance: ["Do not rewrite or fabricate the testimonial", "Clinic testimonials cannot imply guaranteed medical results or expose patient-health information"], tags: ["testimonial", "consent", "trust"] },
  { id: "founder-story", category: "brand-story", name: { en: "Founder story", ar: "قصة المؤسس" }, description: { en: "A human origin story connecting real purpose, craft and customer value.", ar: "قصة إنسانية تربط البداية والشغل والقيمة للعميل." }, verticals: ["retail", "ecommerce", "salon", "clinic"], goals: ["trust", "launch"], duration: 15, arc: "story", tone: "warm", visual: "Consented founder portrait, real archive or workspace details and premium documentary pacing", hook: { en: "Why we started", ar: "ليش بدينا" }, proof: { en: "Built with a clear purpose", ar: "بدينا بهدف واضح" }, cta: { en: "Be part of the story", ar: "كونوا جزء من القصة" }, requiredInputs: ["consented_founder_reference", "confirmed_origin_facts", "business_identity", "call_to_action"], tags: ["founder", "story", "brand"] },
];

export const CREATIVE_TEMPLATE_CATALOG: readonly CreativeTemplateRecipe[] = Object.freeze(SPECS.map(recipe));

if (CREATIVE_TEMPLATE_CATALOG.length !== 50) {
  throw new Error(`creative_template_catalog_must_contain_50:${CREATIVE_TEMPLATE_CATALOG.length}`);
}
if (new Set(CREATIVE_TEMPLATE_CATALOG.map((template) => template.id)).size !== 50) {
  throw new Error("creative_template_catalog_ids_must_be_unique");
}

export function getCreativeTemplate(templateId: string): CreativeTemplateRecipe {
  return CREATIVE_TEMPLATE_CATALOG.find((template) => template.id === templateId) ?? CREATIVE_TEMPLATE_CATALOG[0]!;
}

export function findCreativeTemplate(templateId: string): CreativeTemplateRecipe | undefined {
  return CREATIVE_TEMPLATE_CATALOG.find((template) => template.id === templateId);
}

export function templateRequiresSynchronizedSpeech(templateId: string): boolean {
  return findCreativeTemplate(templateId)?.capabilityPolicy.includes("speech.lip_sync") ?? false;
}

export const CREATIVE_TEMPLATE_CATEGORIES = Object.freeze(
  [...new Set(CREATIVE_TEMPLATE_CATALOG.map((template) => template.category))].sort(),
);
