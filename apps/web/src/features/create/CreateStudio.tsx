import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileImage,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { GuestClaimAssetManifest, RenderProcessingStage } from "@movprompt/contracts";
import { Seo } from "@/components/Seo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { isFeatureEnabled } from "@/config/features";
import { PortableApiError, portableCreatorApi } from "@/lib/api/portableApiClient";
import { cancelCreatorGeneration, cancelVideoJob, pollCreatorGeneration, pollVideoJob, startCreatorGeneration } from "@/lib/director/api";
import { cn } from "@/lib/utils";
import { CreatorShell } from "./CreatorShell";
import { AuthGateDialog } from "./AuthGateDialog";
import { TemplateGrid } from "./TemplateGrid";
import { SAMPLE_PRODUCT, createDraftProject, getCreatorTemplate } from "./templates";
import {
  completeLocalProductPreview,
  hasRealCreatorVideo,
  invalidateCreatorProjectOutput,
  isBundledDemoVideoUrl,
  sanitizeCreatorProjectOutput,
} from "./creatorProjectOutput";
import {
  getGuestClaimRecoveryCopy,
  persistBeforeVerifiedDraftCleanup,
  selectGuestClaimRecovery,
  type CanonicalClaimReceipt,
  type TypedGuestClaimRecovery,
} from "./guestClaimRecovery";
import {
  buildPortableGenerationConfiguration,
  getLocalCreatorProject,
  loadCreatorProjects,
  portableCampaignRecipe,
  portableConfiguration,
  portableProductRecipe,
  resolvePortableTemplateVersionId,
  syncCreatorProject,
} from "./projectStore";
import { hydrateCloudProject } from "./portableProjectMapper";
import { projectToCreationDraft, type CreationDraft, type GenerationQuote } from "./contracts";
import { automaticQuoteRetryDelay } from "./quoteRecovery";
import { cleanupExpiredGuestDrafts, getGuestAsset, getGuestDraft, loadGuestDraft, markClaimCheckpoint, putGuestAsset, saveGuestDraft } from "./guestDraftStore";
import { claimGuestAssets, GuestClaimAssetFailure, type GuestClaimProgress as GuestClaimProgressState } from "./creatorAssets";
import { GuestClaimProgress } from "./GuestClaimProgress";
import { CreatorProgress } from "./CreatorProgress";
import { buildGuestClaimSnapshot } from "./guestClaimSnapshot";
import {
  hasUnclaimedCreatorAssets,
  mergeClaimedCreatorProject,
  persistGuestClaimedCreatorProject,
  syncCreatorProjectWithOwnedRemoteImages,
} from "./creatorProjectAssets";
import { SaveStatusIndicator, type SaveLifecycleState } from "./SaveStatusIndicator";
import {
  CAMPAIGN_GOAL_OPTIONS,
  CTA_OPTIONS,
  MARKET_META,
  getCampaignGoalOption,
  normalizeCreatorResolution,
  type CreatorAspectRatio,
  type CreatorLanguage,
  type CreatorResolution,
  type CreatorProject,
  type CreatorScene,
  type CreatorStep,
} from "./types";

const STEPS: Array<{ id: CreatorStep; label: string }> = [
  { id: "template", label: "Template" },
  { id: "source", label: "Source" },
  { id: "details", label: "Campaign" },
  { id: "generating", label: "Create" },
  { id: "editor", label: "Review" },
];

const ARABIC_STEP_LABELS: Record<CreatorStep, string> = {
  template: "القالب",
  source: "المصدر",
  details: "الحملة",
  generating: "الإنشاء",
  editor: "المراجعة",
};

const ARABIC_GOAL_LABELS: Record<CreatorProject["goal"], string> = {
  whatsapp_orders: "طلبات واتساب",
  bookings: "الحجوزات",
  launch: "إطلاق جديد",
  offer: "ترويج عرض",
  demonstration: "شرح المنتج أو الخدمة",
  trust: "بناء الثقة",
};

const ARABIC_CTA_LABELS: Record<string, string> = {
  "Shop now": "تسوق الآن",
  "Order on WhatsApp": "اطلب عبر واتساب",
  "Book now": "احجز الآن",
  "Learn more": "اعرف أكثر",
  "Visit store": "زر المتجر",
};

const GENERATION_STATES = [
  "Preparing your product",
  "Building your campaign",
  "Creating the scenes",
  "Adding your brand and copy",
  "Preparing your preview",
];

const GENERATION_STAGE_POSITION: Record<RenderProcessingStage, number> = {
  preparing: 1,
  rendering: 2,
  securing_output: 3,
  quality_review: 4,
  ready: 5,
  cancelling: 4,
  failed: 4,
  cancelled: 4,
};

const EXPORT_PRESETS: Array<{ ratio: CreatorAspectRatio; title: string; titleAr: string; detail: string; detailAr: string }> = [
  { ratio: "9:16", title: "TikTok, Reels & Snapchat", titleAr: "تيك توك وريلز وسناب شات", detail: "Vertical · Social safe zones", detailAr: "عمودي · مساحات اجتماعية آمنة" },
  { ratio: "1:1", title: "Instagram feed", titleAr: "منشور إنستغرام", detail: "Square · Feed safe zones", detailAr: "مربع · مساحات منشور آمنة" },
  { ratio: "4:5", title: "Instagram portrait", titleAr: "إنستغرام عمودي", detail: "Portrait · Platform safe zones", detailAr: "عمودي · مساحات آمنة للمنصة" },
  { ratio: "16:9", title: "YouTube & website", titleAr: "يوتيوب والموقع", detail: "Landscape · Website safe zones", detailAr: "أفقي · مساحات موقع آمنة" },
];

function readHomepageHandoff() {
  try {
    const storedTemplateId = localStorage.getItem("movprompt.home.templateId");
    const templateName = localStorage.getItem("movprompt.home.template") || "";
    const sourceUrl = localStorage.getItem("movprompt.home.productUrl") || "";
    const templateId = /creator|ugc/i.test(templateName)
      ? "hands-on-demo"
      : /launch|offer|food/i.test(templateName)
        ? "gcc-offer-launch"
        : templateName || sourceUrl
          ? "luxury-product-reveal"
          : null;
    localStorage.removeItem("movprompt.home.templateId");
    localStorage.removeItem("movprompt.home.template");
    localStorage.removeItem("movprompt.home.productUrl");
    return { templateId: storedTemplateId || templateId, sourceUrl };
  } catch {
    return { templateId: null, sourceUrl: "" };
  }
}

function buildTemplatePrompt(project: CreatorProject) {
  const template = getCreatorTemplate(project.templateId);
  const refs = project.product.images.map((_, index) => `@Image${index + 1}`).join(", ");
  const language = project.language === "ar" ? "native Kuwaiti Arabic (ar-KW)" : project.language === "bilingual" ? "native Kuwaiti Arabic (ar-KW) and English" : "English";
  return [
    `Create a ${template.duration}-second ${project.aspectRatio} ${project.promotionKind === "business" ? "service" : "product"} campaign using ${template.name}.`,
    `The supplied references are ${refs}. ${project.promotionKind === "business" ? "Keep the business environment, people and branding faithful to the references. Do not invent service results, qualifications or claims." : "Preserve the exact product shape, package, label, colours and logo across every shot."}`,
    `${project.promotionKind === "business" ? "Business or service" : "Product"} facts: ${project.product.name}. ${project.product.description}. Brand: ${project.product.brand || "not supplied"}. Price: ${project.product.price || "not supplied"} ${MARKET_META[project.market].currency}.`,
    ...(project.promotionKind === "business" ? [`Location: ${project.location || "not supplied"}. Booking destination: ${project.bookingUrl || "not supplied"}. WhatsApp: ${project.whatsapp || "not supplied"}.`] : []),
    `Market: ${MARKET_META[project.market].label}. Spoken and campaign language: ${language}. ${project.language !== "en" ? "Use natural Kuwait dialect—not Egyptian, Levantine, Emirati, Saudi, or generic Modern Standard Arabic—and compose deterministic RTL overlays with correct punctuation." : ""}`,
    project.offer ? `Offer: ${project.offer}.` : "Do not invent an offer or discount.",
    `CTA: ${project.cta}. Brand colour: ${project.brandColor}.`,
    "Scene recipe:",
    ...project.scenes.map((scene, index) => `${index + 1}. ${scene.duration}s — ${scene.title}. ${scene.direction} On-screen text: “${scene.headline}”.`),
    "Keep important text inside social safe zones. Premium, photoreal product advertising. No altered spelling, extra products, invented claims, watermarks or unreadable typography.",
  ].join("\n");
}

function validateLocalImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())) {
    throw new Error(`${file.name} must be a JPEG, PNG or WebP image.`);
  }
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is over 12 MB.`);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isClaimableImage(image: CreatorProject["product"]["images"][number]) {
  return !image.storagePath && (Boolean(image.assetKey) || image.source === "sample");
}

async function checksumForBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

function normalizeLoadedProject(project: CreatorProject): CreatorProject {
  const template = getCreatorTemplate(project.templateId);
  return sanitizeCreatorProjectOutput({
    ...project,
    title: project.title === "Untitled campaign" && project.product.name
      ? `${project.product.name} — ${template.name}`
      : project.title,
    market: "KW",
    resolution: normalizeCreatorResolution((project as CreatorProject & { resolution?: unknown }).resolution),
  });
}

function stepForLoadedProject(project: CreatorProject): CreatorStep {
  if (hasRealCreatorVideo(project)) return "editor";
  if (project.renderRunId && ["generating", "review", "completed"].includes(project.status)) {
    return "generating";
  }
  return project.product.images.length ? "details" : "source";
}

export function CreateStudio({ qaMode = false }: { qaMode?: boolean }) {
  const navigate = useNavigate();
  const { locale, t } = useLanguage();
  const arabicUi = locale === "ar";
  const tr = useCallback(
    (english: string, arabic: string) => arabicUi ? arabic : english,
    [arabicUi],
  );
  const [searchParams] = useSearchParams();
  const { projectId: routeProjectId, draftId: routeDraftId } = useParams();
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const portablePlatform = isFeatureEnabled("portableAuth");
  const localDemoGeneration = isFeatureEnabled("localDemoGeneration");
  const simulatedGeneration = import.meta.env.DEV && (qaMode || localDemoGeneration);
  const requestedProject = searchParams.get("project") || routeProjectId || null;
  const requestedTemplate = searchParams.get("template");
  const requestedDraft = searchParams.get("draft") || routeDraftId || null;
  const shouldResumeGeneration = searchParams.get("resume") === "generate";
  const initialProject = requestedProject ? getLocalCreatorProject(requestedProject, user?.id) : null;
  const normalizedInitialProject = initialProject ? normalizeLoadedProject(initialProject) : null;
  const homepageHandoff = useMemo(() => readHomepageHandoff(), []);
  const initialTemplate = requestedTemplate ?? homepageHandoff.templateId ?? undefined;
  const templateFirst = useRef(Boolean(initialTemplate));
  const localizedSteps = useMemo(
    () => STEPS.map((item) => ({ ...item, label: arabicUi ? ARABIC_STEP_LABELS[item.id] : item.label })),
    [arabicUi],
  );
  const flowSteps = useMemo(
    () => templateFirst.current ? localizedSteps : [localizedSteps[1]!, localizedSteps[0]!, ...localizedSteps.slice(2)],
    [localizedSteps],
  );
  const [project, setProject] = useState<CreatorProject>(() => {
    const draft = normalizedInitialProject ?? createDraftProject(initialTemplate);
    return normalizeLoadedProject(draft);
  });
  const [saveState, setSaveState] = useState<SaveLifecycleState>("idle");
  const saveRevision = useRef(0);
  const sessionDraftId = useRef(project.id);
  const [step, setStep] = useState<CreatorStep>(() => normalizedInitialProject ? stepForLoadedProject(normalizedInitialProject) : "source");
  const [sourceTab, setSourceTab] = useState<"product" | "business" | "upload">(
    project.promotionKind === "business" ? "business" : "product",
  );
  const [productUrl, setProductUrl] = useState(initialProject?.product.sourceUrl ?? homepageHandoff.sourceUrl);
  const [sourceError, setSourceError] = useState("");
  const [recovery, setRecovery] = useState<TypedGuestClaimRecovery | null>(null);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [claimProgress, setClaimProgress] = useState<GuestClaimProgressState | null>(null);
  const [modeSwitching, setModeSwitching] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateCancellation, setAuthGateCancellation] = useState("");
  const [draftRestoring, setDraftRestoring] = useState(Boolean(requestedDraft));
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<RenderProcessingStage>("preparing");
  const [generationMessage, setGenerationMessage] = useState(GENERATION_STATES[0]);
  const [activeSceneId, setActiveSceneId] = useState(project.scenes[0]?.id ?? "");
  const [inspectorTab, setInspectorTab] = useState<"scene" | "brand" | "format">("scene");
  const [changeRequest, setChangeRequest] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<CreatorAspectRatio>(project.aspectRatio);
  const [undoStack, setUndoStack] = useState<CreatorProject[]>([]);
  const [redoStack, setRedoStack] = useState<CreatorProject[]>([]);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(true);
  const saveTimer = useRef<number | null>(null);
  const generationCancelled = useRef(false);
  const generationSubmission = useRef(false);
  const activeClaimController = useRef<AbortController | null>(null);
  const resumedGeneration = useRef(false);
  const startGenerationRef = useRef<(ratioOverride?: CreatorAspectRatio) => Promise<void>>(async () => undefined);
  const generateButtonRef = useRef<HTMLButtonElement | null>(null);
  const recoveryActionRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const template = getCreatorTemplate(project.templateId);
  const projectDurationSeconds = project.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const [quote, setQuote] = useState<GenerationQuote | null>(null);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteFailure, setQuoteFailure] = useState<{
    code: string;
    retryable: boolean;
    requestId?: string;
  } | null>(null);
  const [quoteRetry, setQuoteRetry] = useState(0);
  const quoteAutoRetryCount = useRef(0);
  const activeScene = project.scenes.find((scene) => scene.id === activeSceneId) ?? project.scenes[0];
  const recoveryCopy = recovery ? getGuestClaimRecoveryCopy(arabicUi ? "ar" : "en", recovery.state) : null;
  const hasRenderedVideo = hasRealCreatorVideo(project);
  const productPreviewImage = project.product.images[0]?.url || null;
  const isRtl = project.language === "ar" || project.language === "bilingual";
  const activeSceneHeadline = arabicUi && activeScene?.headlineAr ? activeScene.headlineAr : activeScene?.headline;
  const activeScenePurpose = arabicUi && activeScene?.purposeAr ? activeScene.purposeAr : activeScene?.purpose;
  const localizedGenerationMessage = arabicUi
    ? ({
        "Preparing your product": "جارٍ تجهيز المنتج",
        "Building your campaign": "جارٍ بناء الحملة",
        "Creating your video": "جارٍ إنشاء الفيديو",
        "Securing your completed video": "جارٍ حفظ الفيديو المكتمل بأمان",
        "Checking video quality": "جارٍ فحص جودة الفيديو",
        "Creating the scenes": "جارٍ إنشاء المشاهد",
        "Adding your brand and copy": "جارٍ إضافة الهوية والنص",
        "Preparing your preview": "جارٍ تجهيز المعاينة",
        "Your preview is ready": "المعاينة جاهزة",
        "Your product preview is ready": "معاينة المنتج جاهزة",
        "Still working — reconnecting to your render": "ما زلنا نعمل — جارٍ إعادة الاتصال بالتوليد",
      } as Record<string, string>)[generationMessage] ?? generationMessage
    : generationMessage;

  useEffect(() => {
    if (!requestedProject || !userId) return;
    let active = true;
    void loadCreatorProjects(userId).then((projects) => {
      const saved = projects.find((item) => item.id === requestedProject);
      if (!active || !saved) return;
      const normalized = normalizeLoadedProject(saved);
      setProject(normalized);
      setStep(stepForLoadedProject(normalized));
    });
    return () => { active = false; };
  }, [requestedProject, userId]);

  useEffect(() => {
    const onOffline = () => {
      const next = selectGuestClaimRecovery(projectToCreationDraft(project, rightsConfirmed), "network_offline");
      setRecovery(next);
      setSourceError(getGuestClaimRecoveryCopy(arabicUi ? "ar" : "en", next.state).message);
    };
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [arabicUi, project, rightsConfirmed]);

  useEffect(() => {
    if (!recovery) return;
    const frame = window.requestAnimationFrame(() => recoveryActionRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [recovery]);

  useEffect(() => {
    let active = true;
    let automaticRetryTimer: number | null = null;
    setQuoteLoaded(false);
    setQuoteError("");
    setQuoteFailure(null);
    if (simulatedGeneration) {
      setQuote(null);
      setQuoteLoaded(true);
      return () => { active = false; };
    }
    if (portablePlatform) {
      const timer = window.setTimeout(() => {
        void resolvePortableTemplateVersionId(template.id)
          .then((templateVersionId) => portableCreatorApi.generationQuote({
            capability: "video.product_fidelity",
            templateVersionId,
            configuration: buildPortableGenerationConfiguration(project),
          }))
          .then((nextQuote) => {
            if (!active) return;
            quoteAutoRetryCount.current = 0;
            setQuote({ ...nextQuote, quoteId: nextQuote.quoteId ?? null });
          })
          .catch((error: unknown) => {
            if (!active) return;
            setQuote(null);
            const portableError = error instanceof PortableApiError ? error : null;
            const code = portableError?.code ?? "pricing_unavailable";
            const retryable = portableError?.retryable ?? true;
            const retryDelay = automaticQuoteRetryDelay(quoteAutoRetryCount.current, retryable);
            const shouldRetryAutomatically = retryDelay !== null;
            const message = code === "worker_unavailable"
              ? tr("Generation is temporarily paused. Your project is saved.", "التوليد متوقف مؤقتاً. مشروعك محفوظ.")
              : code === "pricing_unavailable"
                ? tr("We couldn’t confirm the current price. Try again.", "ما قدرنا نؤكد السعر الحالي. حاول مرة ثانية.")
                : tr("Video generation is temporarily unavailable.", "توليد الفيديو غير متوفر مؤقتاً.");
            setQuoteError(shouldRetryAutomatically
              ? `${message} ${tr("Retrying automatically…", "جارٍ إعادة المحاولة تلقائياً…")}`
              : message);
            setQuoteFailure({
              code,
              retryable,
              ...(portableError?.requestId ? { requestId: portableError.requestId } : {}),
            });
            if (retryDelay !== null) {
              quoteAutoRetryCount.current += 1;
              automaticRetryTimer = window.setTimeout(() => {
                if (active) setQuoteRetry((value) => value + 1);
              }, retryDelay);
            }
          })
          .finally(() => {
            if (active) setQuoteLoaded(true);
          });
      }, 250);
      return () => {
        active = false;
        window.clearTimeout(timer);
        if (automaticRetryTimer !== null) window.clearTimeout(automaticRetryTimer);
      };
    }
    void Promise.resolve({ data: null, error: new Error("Legacy creator pricing is retired.") }).then(({ data, error }) => {
      if (!active) return;
      if (!error && data?.quoteId) setQuote(data as GenerationQuote);
      else {
        setQuote(null);
        setQuoteError("Live pricing is unavailable. You can keep editing, but generation is temporarily disabled.");
      }
      setQuoteLoaded(true);
    });
    return () => {
      active = false;
      if (automaticRetryTimer !== null) window.clearTimeout(automaticRetryTimer);
    };
  }, [portablePlatform, project, projectDurationSeconds, quoteRetry, simulatedGeneration, template.duration, template.id, tr, user?.id]);

  const retryQuote = useCallback(() => {
    quoteAutoRetryCount.current = 0;
    setQuoteRetry((value) => value + 1);
  }, []);

  const persist = useCallback((next: CreatorProject) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const revision = ++saveRevision.current;
    if (!next.product.images.length && !next.product.sourceUrl && !next.product.name) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          if (!qaMode && (!user || hasUnclaimedCreatorAssets(next))) {
            await saveGuestDraft(projectToCreationDraft(next, rightsConfirmed));
            if (!requestedDraft) navigate(`/create?draft=${encodeURIComponent(next.id)}`, { replace: true });
          } else {
            await syncCreatorProject(next, qaMode ? null : user?.id);
          }
          if (saveRevision.current === revision) setSaveState("saved");
        } catch {
          if (saveRevision.current === revision) setSaveState("error");
        }
      })();
    }, 350);
  }, [navigate, qaMode, requestedDraft, rightsConfirmed, user]);

  useEffect(() => {
    if (!requestedDraft || qaMode) {
      setDraftRestoring(false);
      return;
    }
    if (requestedDraft === sessionDraftId.current && project.product.images.length) {
      setDraftRestoring(false);
      return;
    }
    let active = true;
    void (async () => {
      await cleanupExpiredGuestDrafts();
      const draft = await getGuestDraft(requestedDraft);
      if (!draft || !active) {
        setDraftRestoring(false);
        return;
      }
      const rebuilt = createDraftProject(draft.templateVersionId);
      const hydratedImages = await Promise.all(draft.product.images.map(async (image) => {
        if (!image.assetKey) return image;
        const stored = await getGuestAsset(image.assetKey);
        return stored ? { ...image, url: URL.createObjectURL(stored.blob) } : image;
      }));
      if (!active) return;
      sessionDraftId.current = draft.id;
      setProject(normalizeLoadedProject({
        ...rebuilt,
        id: draft.id,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        product: { ...draft.product, images: hydratedImages },
        market: "KW",
        language: draft.campaign.language,
        arabicDialect: draft.campaign.arabicDialect ?? "kuwaiti",
        dialectRegister: draft.campaign.dialectRegister ?? rebuilt.dialectRegister,
        promotionKind: draft.product.sourceType === "business_link" || draft.campaign.goal === "bookings" ? "business" : "product",
        vertical: draft.campaign.vertical ?? rebuilt.vertical,
        goal: draft.campaign.goal ?? rebuilt.goal,
        presenterMode: draft.campaign.presenterMode ?? "none",
        location: draft.campaign.location ?? "",
        bookingUrl: draft.campaign.bookingUrl ?? "",
        whatsapp: draft.campaign.whatsapp ?? "",
        offer: draft.campaign.offer,
        cta: draft.campaign.cta,
        brandColor: draft.campaign.brandColor,
        aspectRatio: draft.campaign.aspectRatio,
        resolution: normalizeCreatorResolution((draft.campaign as { resolution?: unknown }).resolution),
        subtitles: draft.campaign.subtitles,
        audio: draft.campaign.audio,
        pendingGenerationId: draft.pendingGenerationId,
        pendingQuoteCredits: draft.acceptedQuote?.credits ?? null,
      }));
      setRightsConfirmed(Boolean(draft.rightsAttestation?.confirmed));
      setProductUrl(draft.product.sourceUrl);
      setSourceTab(draft.product.sourceType === "business_link" ? "business" : draft.product.sourceType === "upload" ? "upload" : "product");
      setStep(draft.product.images.length ? "details" : "source");
      setDraftRestoring(false);
      if (user && shouldResumeGeneration && draft.pendingGenerationId) {
        toast.success("Campaign restored. Confirm the current price to start your render.");
      }
    })().catch(() => setDraftRestoring(false));
    return () => { active = false; };
  }, [project.product.images.length, qaMode, requestedDraft, shouldResumeGeneration, user]);

  useEffect(() => {
    persist(project);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [persist, project]);

  useEffect(() => {
    if ((!project.jobId && !project.renderRunId) || step !== "generating" || simulatedGeneration) return;
    let stopped = false;
    const poll = async () => {
      try {
        const job = project.renderRunId ? await pollCreatorGeneration(project.renderRunId) : await pollVideoJob(project.jobId!);
        if (stopped) return;
        const durableStage = job.processing_stage;
        setGenerationStage(durableStage);
        if (durableStage === "preparing") setGenerationMessage("Preparing your product");
        if (durableStage === "rendering") setGenerationMessage("Creating your video");
        if (durableStage === "securing_output") setGenerationMessage("Securing your completed video");
        if (durableStage === "quality_review") setGenerationMessage("Checking video quality");
        if (job.status === "completed") {
          if (job.video_url && !isBundledDemoVideoUrl(job.video_url)) {
            setProject((current) => ({ ...current, status: "review", videoUrl: job.video_url!, lastError: null, pendingGenerationId: null }));
            setGenerationStage("ready");
            setGenerationMessage("Your preview is ready");
            window.setTimeout(() => setStep("editor"), 450);
          } else {
            const message = "The render completed without a valid generated video.";
            setGenerationStage("failed");
            setProject((current) => ({ ...current, status: "failed", videoUrl: null, lastError: message, pendingGenerationId: null }));
            setSourceError(`${message} Your imported product images are unchanged.`);
            setStep("details");
          }
        } else if (job.status === "failed") {
          const recoverableOutput = job.error?.includes("provider_output") || job.error === "fetch failed";
          const message = recoverableOutput
            ? "Your video was created, but MovPrompt could not finish saving it. Open Projects and retry saving it—this will not generate or charge again."
            : job.error || "The render could not be completed.";
          setGenerationStage("failed");
          setProject((current) => ({ ...current, status: "failed", lastError: message, pendingGenerationId: null }));
          setSourceError(message);
          setStep("details");
        }
      } catch {
        setGenerationMessage("Still working — reconnecting to your render");
      }
    };
    void poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [project.jobId, project.renderRunId, simulatedGeneration, step]);

  const updateProject = (changes: Partial<CreatorProject>) => {
    setProject((current) => ({ ...current, ...changes, updatedAt: new Date().toISOString() }));
  };

  const updateProjectSource = (changes: Partial<CreatorProject>) => {
    setProject((current) => ({
      ...invalidateCreatorProjectOutput({ ...current, ...changes }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const commitProject = (updater: (current: CreatorProject) => CreatorProject) => {
    setProject((current) => {
      setUndoStack((items) => [...items.slice(-24), current]);
      setRedoStack([]);
      return { ...updater(current), updatedAt: new Date().toISOString() };
    });
  };

  const selectTemplate = (templateId: string) => {
    const nextTemplate = getCreatorTemplate(templateId);
    const nextVertical = nextTemplate.verticals[0] ?? project.vertical;
    const nextGoal = nextTemplate.goals[0] ?? project.goal;
    const serviceTemplate = nextVertical === "salon" || nextVertical === "clinic" || templateId === "app-service";
    const preserveConfirmedCampaign = Boolean(project.product.name || project.product.images.length);
    updateProjectSource({
      templateId,
      brandColor: nextTemplate.accent,
      language: preserveConfirmedCampaign
        ? project.language
        : nextTemplate.tags.some((tag) => /arabic|kuwait|ramadan|national/iu.test(tag)) ? "ar" : project.language,
      dialectRegister: nextTemplate.dialectRegister,
      promotionKind: serviceTemplate ? "business" : "product",
      vertical: nextVertical,
      goal: preserveConfirmedCampaign ? project.goal : nextGoal,
      cta: preserveConfirmedCampaign ? project.cta : getCampaignGoalOption(nextGoal).defaultCta,
      scenes: nextTemplate.scenes.map((scene) => ({ ...scene })),
      title: project.product.name ? `${project.product.name} — ${nextTemplate.name}` : "Untitled campaign",
    });
    setSourceTab(serviceTemplate ? "business" : "product");
    setActiveSceneId(nextTemplate.scenes[0].id);
    setStep(project.product.images.length ? "details" : "source");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useSampleProduct = () => {
    updateProjectSource({
      promotionKind: "product",
      product: { ...SAMPLE_PRODUCT, images: SAMPLE_PRODUCT.images.map((image) => ({ ...image })) },
      title: `${SAMPLE_PRODUCT.name} — ${template.name}`,
    });
    setSourceTab("product");
    setProductUrl("");
    setSourceError("");
  };

  const chooseSourceTab = (next: "product" | "business" | "upload") => {
    setSourceTab(next);
    setSourceError("");
    if (next === "business") {
      updateProject({ promotionKind: "business", vertical: "salon", goal: "bookings", cta: "Book now" });
    } else if (next === "product") {
      updateProject({ promotionKind: "product", vertical: "ecommerce", goal: "launch", cta: project.cta === "Book now" ? "Shop now" : project.cta });
    }
  };

  const handleSourceTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = ["product", "business", "upload"] as const;
    const currentIndex = tabs.indexOf(sourceTab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : event.key === "ArrowLeft"
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabs[nextIndex]!;
    chooseSourceTab(next);
    window.requestAnimationFrame(() => document.getElementById(`source-${next}-tab`)?.focus());
  };

  const scanSource = async () => {
    const trimmed = productUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setSourceError(`Enter a complete ${project.promotionKind === "business" ? "business" : "product"} link beginning with http:// or https://.`);
      return;
    }
    setSourceBusy(true);
    setSourceError("");
    setRecovery(null);
    try {
      const kind = project.promotionKind;
      const scan = await portableCreatorApi.scan(kind, trimmed);
      if (!scan.imageCandidates.length) throw new Error("no_image_found");
      const fact = (field: string) => scan.facts.find((item) => item.field === field)?.value ?? "";
      const name = fact("name") || (kind === "business" ? "Imported business" : "Imported product");
      const sameImportedSource = project.product.sourceUrl === scan.canonicalUrl;
      const importedChanges: Partial<CreatorProject> = {
        title: `${name} — ${template.name}`,
        product: {
          sourceType: kind === "business" ? "business_link" : "product_link",
          sourceUrl: scan.canonicalUrl,
          name,
          description: fact("description"),
          price: fact("price") || (sameImportedSource ? project.product.price : ""),
          brand: fact("brand") || (sameImportedSource ? project.product.brand : ""),
          images: scan.imageCandidates.slice(0, 5).map((url, index) => ({ id: `url-${index}`, name: `${name} ${index + 1}`, url, source: "url" as const })),
        },
      };
      if (!qaMode && user && portablePlatform) {
        const importedProject = {
          ...invalidateCreatorProjectOutput({ ...project, ...importedChanges }),
          updatedAt: new Date().toISOString(),
        };
        const securedProject = await syncCreatorProjectWithOwnedRemoteImages(importedProject, user.id);
        setProject(securedProject);
      } else {
        updateProjectSource(importedChanges);
      }
    } catch (error) {
      const next = selectGuestClaimRecovery(projectToCreationDraft(project, rightsConfirmed), "import_failed");
      setRecovery(next);
      setSourceError(getGuestClaimRecoveryCopy(arabicUi ? "ar" : "en", next.state).message);
    } finally {
      setSourceBusy(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const replacesSample = project.product.sourceType === "sample";
    const retainedImages = replacesSample ? [] : project.product.images;
    const selected = Array.from(files).slice(0, Math.max(0, 5 - retainedImages.length));
    if (!selected.length) {
      setSourceError("You can add up to five product photos.");
      return;
    }
    setSourceBusy(true);
    setSourceError("");
    setRecovery(null);
    try {
      const assets = await Promise.all(selected.map(async (file) => {
        validateLocalImage(file);
        const assetKey = await putGuestAsset(project.id, file);
        return {
          id: crypto.randomUUID(),
          name: file.name,
          url: URL.createObjectURL(file),
          mimeType: file.type.toLowerCase() as "image/jpeg" | "image/png" | "image/webp",
          assetKey,
          source: "upload" as const,
        };
      }));
      const images = [...retainedImages, ...assets].slice(0, 5);
      const uploadedName = selected[0].name.replace(/\.[^.]+$/, "");
      const product = replacesSample
        ? { ...project.product, sourceType: "upload" as const, sourceUrl: "", images, name: uploadedName, description: "", price: "", brand: "" }
        : { ...project.product, sourceType: "upload" as const, sourceUrl: "", images, name: project.product.name || uploadedName };
      updateProjectSource({
        product,
        title: replacesSample || project.title === "Untitled campaign" ? `${uploadedName} — ${template.name}` : project.title,
      });
    } catch (error) {
      const next = selectGuestClaimRecovery(projectToCreationDraft(project, rightsConfirmed), "import_failed");
      setRecovery(next);
      setSourceError(getGuestClaimRecoveryCopy(arabicUi ? "ar" : "en", next.state).message);
    } finally {
      setSourceBusy(false);
    }
  };

  const continueFromSource = () => {
    if (!project.product.images.length) {
      setSourceError(`Add at least one ${project.promotionKind === "business" ? "business or service" : "product"} photo${project.promotionKind === "product" ? " or use the sample product" : ""} to continue.`);
      return;
    }
    setSourceError("");
    setStep(templateFirst.current ? "details" : "template");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retryRecovery = () => {
    if (!recovery) return;
    setRecovery(null);
    setSourceError("");
    if (recovery.state === "claim_failed") {
      void startGenerationRef.current();
      return;
    }
    if (recovery.state === "import_failed") {
      void scanSource();
    }
  };

  const replaceRecoverySource = () => {
    if (!recovery) return;
    if (recovery.state === "session_mismatch") {
      void signOut();
      return;
    }
    setRecovery(null);
    setSourceError("");
    if (recovery.state === "claim_failed" || recovery.state === "import_failed") {
      setSourceTab("upload");
      setStep("source");
      window.requestAnimationFrame(() => document.getElementById("product-files")?.focus());
    }
  };

  const recoveryActions = recovery && recoveryCopy ? (
    <div className="creator-actions-row" role="group" aria-label={recoveryCopy.message}>
      <button ref={recoveryActionRef} className="creator-button creator-button-primary" type="button" onClick={retryRecovery}>
        {recoveryCopy.primaryAction}
      </button>
      <button className="creator-button creator-button-secondary" type="button" onClick={replaceRecoverySource}>
        {recoveryCopy.secondaryAction}
      </button>
    </div>
  ) : null;

  const switchToAdvanced = async () => {
    if (modeSwitching) return;
    setModeSwitching(true);
    try {
      const templateDraft = projectToCreationDraft(project, rightsConfirmed);
      await saveGuestDraft({
        ...templateDraft,
        mode: "advanced",
        advanced: {
          capability: "video.product_fidelity",
          prompt: project.product.images.length ? buildTemplatePrompt(project) : "",
          references: project.product.images.map((image) => image.assetKey || image.storagePath || image.url),
          renderSettings: { duration: template.duration, ratio: project.aspectRatio },
        },
        returnPath: `/advanced?draft=${encodeURIComponent(project.id)}`,
      });
      navigate(`/advanced?draft=${encodeURIComponent(project.id)}&from=template`);
    } catch {
      toast.error("We couldn’t open Advanced Mode. Your template draft is unchanged.");
      setModeSwitching(false);
    }
  };

  const runQaGeneration = () => {
    generationCancelled.current = false;
    setGenerationProgress(8);
    let value = 8;
    const timer = window.setInterval(() => {
      if (generationCancelled.current) {
        window.clearInterval(timer);
        return;
      }
      value = Math.min(100, value + 11 + Math.round(Math.random() * 7));
      setGenerationProgress(value);
      setGenerationMessage(GENERATION_STATES[Math.min(GENERATION_STATES.length - 1, Math.floor((value / 100) * GENERATION_STATES.length))]);
      if (value >= 100) {
        window.clearInterval(timer);
        setProject((current) => completeLocalProductPreview(current));
        setGenerationMessage("Your product preview is ready");
        window.setTimeout(() => setStep("editor"), 500);
      }
    }, 520);
  };

  const claimGuestProject = async (candidate: CreatorProject, options: {
    signal: AbortSignal;
    onProgress: (progress: GuestClaimProgressState) => void;
  }) => {
    if (options.signal.aborted) throw new DOMException("The private campaign claim was cancelled.", "AbortError");
    if (!user || qaMode) return candidate;
    const loadedGuestDraft = await loadGuestDraft(candidate.id);
    if (!("draft" in loadedGuestDraft) || !loadedGuestDraft.draft.pendingGenerationId) {
      return syncCreatorProject(candidate, user.id);
    }
    const guestDraft = loadedGuestDraft.draft;

    const createSourcePersistence = (claimCheckpoint: NonNullable<typeof guestDraft.claimCheckpoint>) => ({
      fromResult: (persisted: CreatorProject) => {
        if (!persisted.versionId || !persisted.versionNumber) {
          throw new Error("MovPrompt could not verify the saved imported images. Your local draft is unchanged.");
        }
        return {
          pendingGenerationId: claimCheckpoint.pendingGenerationId,
          snapshotDigest: claimCheckpoint.snapshotDigest,
          projectId: persisted.id,
          versionId: persisted.versionId,
          versionNumber: persisted.versionNumber,
          ...(persisted.sourceFingerprint ? { sourceFingerprint: persisted.sourceFingerprint } : {}),
        };
      },
      reuse: async (completion: {
        projectId: string;
        versionId: string;
        versionNumber: number;
        sourceFingerprint?: string;
      }) => {
        const cloud = await portableCreatorApi.getProject(completion.projectId);
        const persisted = await hydrateCloudProject(cloud);
        if (
          !persisted
          || persisted.id !== completion.projectId
          || persisted.versionId !== completion.versionId
          || persisted.versionNumber !== completion.versionNumber
          || (completion.sourceFingerprint && persisted.sourceFingerprint !== completion.sourceFingerprint)
        ) {
          throw new Error("MovPrompt could not verify the saved imported images. Your local draft is unchanged.");
        }
        return persisted;
      },
    });

    // A source version can succeed just before IndexedDB cleanup is interrupted
    // (for example, a browser storage fault). Its receipt is bound to this
    // pending intent, so reuse that exact immutable version before considering
    // another guest-claim or source-replacement request.
    const sourceCheckpoint = guestDraft.claimCheckpoint;
    if (sourceCheckpoint?.sourcePersistence) {
      const receipt = {
        status: "ready",
        draftId: guestDraft.id,
        pendingGenerationId: guestDraft.pendingGenerationId,
        snapshotDigest: sourceCheckpoint.snapshotDigest,
        assetManifest: sourceCheckpoint.assetManifest,
        project: {} as CanonicalClaimReceipt["project"],
        version: { configuration: sourceCheckpoint.configuration } as CanonicalClaimReceipt["version"],
      } satisfies CanonicalClaimReceipt;
      return persistBeforeVerifiedDraftCleanup({
        draftId: candidate.id,
        receipt,
        persist: async () => {
          throw new Error("MovPrompt could not verify the saved imported images. Your local draft is unchanged.");
        },
        sourcePersistence: createSourcePersistence(sourceCheckpoint),
      });
    }

    // The local IDs become the immutable asset identities accepted by the
    // server. Bundled samples did not originate in IndexedDB, so give them a
    // UUID before the same secure claim path fetches their bytes.
    const projectForClaim: CreatorProject = {
      ...candidate,
      product: {
        ...candidate.product,
        images: candidate.product.images.map((image) => isClaimableImage(image) && !UUID_PATTERN.test(image.id)
          ? { ...image, id: crypto.randomUUID() }
          : image),
      },
    };
    const blobs = new Map<string, Blob>();
    const assetManifest: GuestClaimAssetManifest = [];
    for (const [ordinal, image] of projectForClaim.product.images.entries()) {
      if (!isClaimableImage(image)) continue;
      let blob: Blob;
      let mimeType: string;
      if (image.assetKey) {
        const stored = await getGuestAsset(image.assetKey);
        if (!stored) throw new Error(`The local copy of ${image.name} is no longer available. Add it again to continue.`);
        blob = stored.blob;
        mimeType = stored.mimeType.toLowerCase();
      } else {
        const response = await fetch(image.url, { credentials: "same-origin", signal: options.signal });
        if (!response.ok) throw new Error(`The bundled sample image ${image.name} could not be loaded.`);
        blob = await response.blob();
        mimeType = blob.type.toLowerCase();
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        throw new Error(`${image.name} must be a JPEG, PNG or WebP image.`);
      }
      const checksumSha256 = await checksumForBlob(blob);
      blobs.set(image.id, blob);
      assetManifest.push({
        localAssetId: image.id,
        ordinal,
        kind: "product",
        mimeType,
        sizeBytes: blob.size,
        checksumSha256,
      });
    }

    const snapshot = await buildGuestClaimSnapshot({
      draftId: projectForClaim.id,
      pendingGenerationId: guestDraft.pendingGenerationId,
      assetManifest,
      title: projectForClaim.title,
      mode: "template",
      templateVersionId: await resolvePortableTemplateVersionId(projectForClaim.templateId),
      configuration: portableConfiguration(projectForClaim),
      productRecipe: portableProductRecipe(projectForClaim),
      campaignRecipe: portableCampaignRecipe(projectForClaim),
    });
    await saveGuestDraft({
      ...projectToCreationDraft(projectForClaim, rightsConfirmed, "claiming"),
      pendingGenerationId: snapshot.pendingGenerationId,
      acceptedQuote: guestDraft.acceptedQuote,
    });
    const checkpoint = await markClaimCheckpoint(projectForClaim.id, {
      pendingGenerationId: snapshot.pendingGenerationId,
      snapshotDigest: snapshot.snapshotDigest,
      configuration: snapshot.configuration,
      assetManifest: snapshot.assetManifest,
    });
    if (!checkpoint) throw new Error("The local campaign could not be prepared for secure recovery.");

    const claimed = await claimGuestAssets({ snapshot, blobs, signal: options.signal, onProgress: options.onProgress });
    const cloudProject = await hydrateCloudProject(claimed.receipt.project);
    if (!cloudProject) throw new Error("The saved campaign could not be restored after secure claim.");
    const claimedAssets = new Map(claimed.assets.map((asset) => [asset.localAssetId, asset]));
    const images = projectForClaim.product.images.map((image) => {
      const secure = claimedAssets.get(image.id);
      return secure
        ? { ...image, assetKey: undefined, storagePath: secure.storagePath, mimeType: secure.mimeType, checksum: secure.checksum, url: secure.url }
        : image;
    });
    const claimedProject = mergeClaimedCreatorProject(projectForClaim, cloudProject, images);

    // For link imports, remote mirroring and the immutable source version are
    // a required part of the claim. IndexedDB is cleared only after both have
    // succeeded, so a transient upstream failure keeps the exact URL draft
    // and checkpoint available for the existing Retry action.
    return persistBeforeVerifiedDraftCleanup({
      draftId: projectForClaim.id,
      receipt: claimed.receipt,
      persist: () => persistGuestClaimedCreatorProject(claimedProject, user.id),
      sourcePersistence: createSourcePersistence(checkpoint.claimCheckpoint!),
    });
  };

  const handleAuthGateChange = (open: boolean) => {
    if (authGateOpen && !open) setAuthGateCancellation(tr("Nothing changed. Continue editing when you’re ready.", "لم يتغيّر شيء. تابع التعديل عندما تكون جاهزاً."));
    setAuthGateOpen(open);
    if (!open) window.setTimeout(() => generateButtonRef.current?.focus(), 0);
  };

  const cancelGuestClaim = () => {
    const controller = activeClaimController.current;
    if (!controller) return;
    controller.abort();
    if (activeClaimController.current === controller) activeClaimController.current = null;
    setClaimProgress(null);
    setSourceBusy(false);
    setSourceError("");
    setAuthGateCancellation(t("auth.cancelled"));
    window.setTimeout(() => generateButtonRef.current?.focus(), 0);
  };

  const startGeneration = async (ratioOverride?: CreatorAspectRatio) => {
    if (!project.product.images.length) {
      setSourceError(`Add at least one ${project.promotionKind === "business" ? "business or service" : "product"} image before generating.`);
      setStep("source");
      return;
    }
    if (!rightsConfirmed && !project.videoUrl) {
      setSourceError("Confirm that you have permission to use these images and that the campaign facts are accurate.");
      return;
    }
    if (!simulatedGeneration && (!quoteLoaded || !quote)) {
      setSourceError(quoteError || "Live pricing is still loading. Try again in a moment.");
      return;
    }
    if (!simulatedGeneration && !user) {
      const pendingGenerationId = project.pendingGenerationId || crypto.randomUUID();
      const pendingProject = { ...project, pendingGenerationId, pendingQuoteCredits: quote!.credits };
      setProject(pendingProject);
      await saveGuestDraft(projectToCreationDraft(pendingProject, true, "auth_required"));
      setAuthGateCancellation("");
      setAuthGateOpen(true);
      return;
    }
    setSourceBusy(true);
    const controller = new AbortController();
    const showsClaimProgress = Boolean(user && !qaMode);
    if (showsClaimProgress) {
      activeClaimController.current = controller;
      setClaimProgress({ stage: "creating" });
      setAuthGateCancellation("");
    }
    let claimedProject: CreatorProject;
    try {
      claimedProject = await claimGuestProject(project, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (activeClaimController.current === controller) setClaimProgress(progress);
        },
      });
      setProject(claimedProject);
    } catch (error) {
      if (isAbortError(error)) return;
      const next = selectGuestClaimRecovery(
        projectToCreationDraft(project, rightsConfirmed),
        "asset_claim_failed",
        error instanceof GuestClaimAssetFailure ? { localAssetId: error.localAssetId } : {},
      );
      setRecovery(next);
      setSourceError(getGuestClaimRecoveryCopy(arabicUi ? "ar" : "en", next.state).message);
      setSourceBusy(false);
      return;
    } finally {
      if (activeClaimController.current === controller) activeClaimController.current = null;
      setClaimProgress(null);
    }
    let renderProject = claimedProject;
    if (ratioOverride && ratioOverride !== claimedProject.aspectRatio) {
      try {
        renderProject = await syncCreatorProject({
          ...claimedProject,
          aspectRatio: ratioOverride,
          updatedAt: new Date().toISOString(),
        }, user?.id);
        setProject(renderProject);
      } catch (error) {
        setSourceError(error instanceof Error
          ? error.message
          : "The selected export format could not be saved as a new project version.");
        setSourceBusy(false);
        return;
      }
    }
    let confirmedQuote = quote;
    if (portablePlatform) {
      try {
        if (!renderProject.versionId) throw new Error("The saved project version is not ready for generation.");
        const authoritativeQuoteResponse = await portableCreatorApi.generationQuote({
          capability: "video.product_fidelity",
          projectVersionId: renderProject.versionId,
        });
        const authoritativeQuote: GenerationQuote = {
          ...authoritativeQuoteResponse,
          quoteId: authoritativeQuoteResponse.quoteId ?? null,
        };
        if (!authoritativeQuote.quoteId) {
          throw new Error("The confirmed generation price could not be saved.");
        }
        if (authoritativeQuote.credits !== quote!.credits) {
          setQuote(authoritativeQuote);
          setProject({ ...renderProject, pendingQuoteCredits: authoritativeQuote.credits });
          setSourceError(tr(
            `The generation price changed from ${quote!.credits} to ${authoritativeQuote.credits} credits. Review the confirmed price, then select Generate video again.`,
            `تغيّر سعر التوليد من ${quote!.credits} إلى ${authoritativeQuote.credits} رصيد. راجع السعر المؤكد، ثم اختر توليد الفيديو مرة ثانية.`,
          ));
          setSourceBusy(false);
          return;
        }
        confirmedQuote = authoritativeQuote;
        setQuote(authoritativeQuote);
      } catch (error) {
        setSourceError(error instanceof Error ? error.message : "The confirmed generation price is unavailable. Your project remains saved.");
        setSourceBusy(false);
        return;
      }
    }
    if (!confirmedQuote?.quoteId) {
      setSourceError("The confirmed generation price is unavailable. Your project remains saved.");
      setSourceBusy(false);
      return;
    }
    setSourceBusy(false);
    setProject((current) => ({ ...current, aspectRatio: renderProject.aspectRatio, status: "generating", videoUrl: ratioOverride ? null : current.videoUrl, lastError: null }));
    setGenerationStage("preparing");
    if (simulatedGeneration) setGenerationProgress(8);
    setGenerationMessage(GENERATION_STATES[0]);
    setStep("generating");
    setExportOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (simulatedGeneration) {
      runQaGeneration();
      return;
    }

    if (generationSubmission.current) return;
    generationSubmission.current = true;
    try {
      const generation = await startCreatorGeneration({ projectId: renderProject.id, projectVersionId: renderProject.versionId!, quoteId: confirmedQuote.quoteId, idempotencyKey: renderProject.pendingGenerationId || crypto.randomUUID(), mode: "template", prompt: buildTemplatePrompt(renderProject), capability: "video.product_fidelity", options: { aspect_ratio: renderProject.aspectRatio === "4:5" ? "3:4" : renderProject.aspectRatio, duration: Math.min(15, template.duration), resolution: renderProject.resolution, audio: renderProject.audio }, referenceImages: renderProject.product.images.map((image) => image.url), rightsAttested: rightsConfirmed, metadata: { creator_project_id: renderProject.id, template_id: renderProject.templateId, language: renderProject.language, market: renderProject.market } });
      setProject((current) => ({ ...current, jobId: generation.job.id, renderRunId: generation.runId, status: "generating" }));
      setGenerationStage("preparing");
      setGenerationMessage("Your campaign is queued securely");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't start this render.";
      setProject((current) => ({ ...current, status: "failed", lastError: message, pendingGenerationId: null }));
      setSourceError(`${message} Your project is saved — you can try again.`);
      setStep("details");
    } finally {
      generationSubmission.current = false;
    }
  };
  startGenerationRef.current = startGeneration;

  useEffect(() => {
    if (simulatedGeneration || !user || !shouldResumeGeneration || draftRestoring || !quoteLoaded || !quote || resumedGeneration.current) return;
    if (!project.pendingGenerationId || !rightsConfirmed || !project.product.images.length || step !== "details") return;
    if (project.pendingQuoteCredits != null && project.pendingQuoteCredits !== quote.credits) {
      resumedGeneration.current = true;
      setSourceError(tr(
        `The generation price changed from ${project.pendingQuoteCredits} to ${quote.credits} credits. Review the new price, then select Generate video again.`,
        `تغيّر سعر التوليد من ${project.pendingQuoteCredits} إلى ${quote.credits} رصيد. راجع السعر الجديد، ثم اختر توليد الفيديو مرة ثانية.`,
      ));
      return;
    }
    resumedGeneration.current = true;
    void startGenerationRef.current();
  }, [draftRestoring, project.pendingGenerationId, project.pendingQuoteCredits, project.product.images.length, quote, quoteLoaded, rightsConfirmed, shouldResumeGeneration, simulatedGeneration, step, tr, user]);

  const cancelGeneration = async () => {
    if ((project.jobId || project.renderRunId) && !simulatedGeneration) {
      try {
        if (project.renderRunId) await cancelCreatorGeneration(project.renderRunId);
        else await cancelVideoJob(project.jobId!);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "This render could not be cancelled because provider processing has already started.";
        setSourceError(message);
        toast.error(message);
        return;
      }
    }
    generationCancelled.current = true;
    setGenerationStage("cancelled");
    setProject((current) => ({
      ...current,
      status: "ready",
      jobId: null,
      renderRunId: null,
      pendingGenerationId: null,
    }));
    setStep("details");
    toast("Generation cancelled. Your campaign details are saved.");
  };

  const updateScene = (sceneId: string, changes: Partial<CreatorScene>, recordHistory = false) => {
    const updater = (current: CreatorProject) => ({ ...current, scenes: current.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...changes } : scene) });
    if (recordHistory) commitProject(updater); else setProject((current) => updater(current));
  };

  const moveScene = (sceneId: string, direction: -1 | 1) => {
    commitProject((current) => {
      const scenes = [...current.scenes];
      const index = scenes.findIndex((scene) => scene.id === sceneId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= scenes.length) return current;
      [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
      return { ...current, scenes };
    });
  };

  const applyChangeRequest = () => {
    const request = changeRequest.trim();
    if (!request || !activeScene) return;
    commitProject((current) => {
      const lower = request.toLowerCase();
      if (/arabic|عربي/.test(lower)) return { ...current, language: "ar" };
      if (/english|انجليزي|إنجليزي/.test(lower)) return { ...current, language: "en" };
      const scenes = current.scenes.map((scene, index) => {
        if (/opening.*fast|faster.*opening/.test(lower) && index === 0) return { ...scene, duration: Math.max(1, scene.duration - 1), direction: `${scene.direction} Faster opening beat.` };
        if (/show.*product.*earl/.test(lower) && index === 0) return { ...scene, direction: `${scene.direction} Product is fully visible in the first second.` };
        if (scene.id === activeScene.id) return { ...scene, direction: `${scene.direction} Requested adjustment: ${request}` };
        return scene;
      });
      return { ...current, scenes };
    });
    setChangeRequest("");
    toast.success("Change added. Review it, then render the updated version.");
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((items) => [...items, project]);
    setUndoStack((items) => items.slice(0, -1));
    setProject(previous);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((items) => [...items, project]);
    setRedoStack((items) => items.slice(0, -1));
    setProject(next);
  };

  const downloadVideo = async () => {
    if (!hasRenderedVideo || !project.videoUrl) return;
    let downloadUrl = project.videoUrl;
    try {
      if (portablePlatform && project.renderRunId) {
        downloadUrl = await portableCreatorApi.outputDownload(project.id, project.renderRunId);
        setProject((current) => ({ ...current, videoUrl: downloadUrl }));
      }
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.product.name || "movprompt-video"}-${project.aspectRatio.replace(":", "x")}.mp4`;
      anchor.click();
      URL.revokeObjectURL(url);
      updateProject({ status: "completed" });
      toast.success("Download started.");
    } catch {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      toast("The video opened in a new tab. Use Save Video if the download did not start.");
    }
  };

  const selectedExportMeta = EXPORT_PRESETS.find((preset) => preset.ratio === selectedExport)!;

  const togglePreviewPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPreviewPlaying(true);
    } else {
      video.pause();
      setPreviewPlaying(false);
    }
  };

  if (claimProgress) {
    return (
      <CreatorShell qaMode={qaMode}>
        <Seo title="Securing your campaign · MovPrompt" description="MovPrompt is securing your campaign and images privately." noindex />
        <GuestClaimProgress
          progress={claimProgress}
          copy={{
            heading: t("creator.claim.heading"),
            detail: t("creator.claim.detail"),
            creating: t("creator.claim.stage.create"),
            asset: (current, total) => t("creator.claim.stage.asset").replace("{current}", String(current)).replace("{total}", String(total)),
            verifying: t("creator.claim.stage.verify"),
            cancel: tr("Cancel and keep editing", "إلغاء ومتابعة التعديل"),
          }}
          onCancel={cancelGuestClaim}
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{authGateCancellation}</p>
      </CreatorShell>
    );
  }

  if (step === "generating") {
    return (
      <CreatorShell qaMode={qaMode}>
        <Seo title="Creating your campaign · MovPrompt" description="MovPrompt is creating your template-based campaign." noindex />
        <section className="creator-generation" aria-live="polite" aria-busy="true">
          <div className="creator-generation-inner">
            <div className="creator-generation-preview">
              {productPreviewImage
                ? <img src={productPreviewImage} alt={tr(`${project.product.name || "Your product"} source image`, `صورة مصدر ${project.product.name || "المنتج"}`)} />
                : <div className="creator-media-empty"><FileImage aria-hidden="true" /><span>{tr("No product image added", "لم تتم إضافة صورة للمنتج")}</span></div>}
              <div className="creator-generation-scan" aria-hidden="true" />
            </div>
            <p className="creator-kicker">{arabicUi ? template.nameAr : template.name}</p>
            <h1>{tr("Building your campaign", "جارٍ بناء حملتك")}</h1>
            <p>{simulatedGeneration ? tr("Preview workflow only — no AI video or credits. We will open an editable still preview using only your imported product image.", "مسار معاينة فقط — بدون فيديو ذكاء اصطناعي أو رصيد. سنفتح معاينة ثابتة قابلة للتعديل باستخدام صورة منتجك المستوردة فقط.") : tr("You can leave this screen safely. Your project is saved and the render will continue in the background.", "تقدر تترك هذه الصفحة بأمان. مشروعك محفوظ والتوليد راح يكمل بالخلفية.")}</p>
            <div
              className="creator-generation-progress"
              role="progressbar"
              aria-label={tr("Campaign generation", "توليد الحملة")}
              aria-valuemin={simulatedGeneration ? 0 : 1}
              aria-valuemax={simulatedGeneration ? 100 : 5}
              aria-valuenow={simulatedGeneration ? generationProgress : GENERATION_STAGE_POSITION[generationStage]}
              aria-valuetext={simulatedGeneration ? `${localizedGenerationMessage} · ${generationProgress}%` : localizedGenerationMessage}
            >
              <span style={{ width: simulatedGeneration ? `${generationProgress}%` : `${GENERATION_STAGE_POSITION[generationStage] * 20}%` }} />
            </div>
            <div className="creator-generation-status" role="status">{localizedGenerationMessage}{simulatedGeneration ? ` · ${generationProgress}%` : ""}</div>
            <button className="creator-button creator-button-quiet" type="button" onClick={cancelGeneration}>{tr("Cancel generation", "إلغاء التوليد")}</button>
          </div>
        </section>
      </CreatorShell>
    );
  }

  if (step === "editor") {
    return (
      <CreatorShell qaMode={qaMode}>
        <Seo title={`Edit ${project.title} · MovPrompt`} description="Review and make simple changes to your MovPrompt campaign." noindex />
        <div className="creator-editor-page">
          <div className="creator-editor-toolbar">
            <div className="creator-editor-name">
              <button className="creator-icon-button" type="button" onClick={() => navigate(qaMode ? "/qa/create?view=projects" : "/projects")} aria-label={tr("Back to projects", "العودة للمشاريع")}><ArrowLeft aria-hidden="true" /></button>
              <div><strong>{project.title}</strong><SaveStatusIndicator state={saveState} arabic={arabicUi} className="creator-save-state" /></div>
            </div>
            <div className="creator-editor-actions">
              <button className="creator-icon-button" type="button" onClick={undo} disabled={!undoStack.length} aria-label={tr("Undo", "تراجع")}><Undo2 aria-hidden="true" /></button>
              <button className="creator-icon-button" type="button" onClick={redo} disabled={!redoStack.length} aria-label={tr("Redo", "إعادة")}><Redo2 aria-hidden="true" /></button>
              <button className="creator-button creator-button-secondary" type="button" onClick={() => void startGeneration() }>{hasRenderedVideo ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />} {hasRenderedVideo ? tr("Render updates", "توليد التعديلات") : tr("Generate video", "ولّد الفيديو")}</button>
              <button className="creator-button creator-button-primary" type="button" onClick={() => { setSelectedExport(project.aspectRatio); setExportOpen(true); }} disabled={!hasRenderedVideo} title={!hasRenderedVideo ? tr("Export becomes available after a real video render completes.", "يتوفر التصدير بعد اكتمال توليد فيديو حقيقي.") : undefined}><Download aria-hidden="true" /> {tr("Export", "تصدير")}</button>
            </div>
          </div>

          <div className="creator-editor-grid">
            <aside className="creator-panel creator-scenes-panel" aria-label={tr("Video scenes", "مشاهد الفيديو")}>
              <div className="creator-panel-label">{tr("Scenes", "المشاهد")} · {project.scenes.reduce((sum, scene) => sum + scene.duration, 0)} {tr("seconds", "ثانية")}</div>
              <div className="creator-scene-list">
                {project.scenes.map((scene, index) => (
                  <button key={scene.id} type="button" className={cn("creator-scene-card", scene.id === activeScene?.id && "is-selected")} onClick={() => { setActiveSceneId(scene.id); setInspectorTab("scene"); }} aria-pressed={scene.id === activeScene?.id}>
                    <span className="creator-scene-number">{index + 1}</span>
                    <span><strong>{arabicUi && scene.titleAr ? scene.titleAr : scene.title}</strong><span>{arabicUi && scene.headlineAr ? scene.headlineAr : scene.headline} · {scene.duration}{tr("s", "ث")}</span></span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="creator-stage" aria-label={tr("Video preview", "معاينة الفيديو")}>
              <div className="creator-video-frame" data-ratio={project.aspectRatio}>
                {hasRenderedVideo && project.videoUrl
                  ? <video ref={videoRef} key={project.videoUrl} src={project.videoUrl} poster={productPreviewImage ?? undefined} aria-label={tr(`Generated video for ${project.product.name}`, `الفيديو المولّد لـ ${project.product.name}`)} playsInline autoPlay loop muted={previewMuted} />
                  : productPreviewImage
                    ? <img src={productPreviewImage} alt={tr(`${project.product.name || "Product"} source preview`, `معاينة مصدر ${project.product.name || "المنتج"}`)} />
                    : <div className="creator-media-empty"><FileImage aria-hidden="true" /><span>{tr("Add a product image to preview this campaign", "أضف صورة منتج لمعاينة هذه الحملة")}</span></div>}
                <div className="creator-video-overlay" data-rtl={isRtl}>
                  <small>{project.product.brand || template.eyebrow}</small>
                  <h2>{activeSceneHeadline}</h2>
                  <p>{activeScenePurpose}</p>
                </div>
                {!hasRenderedVideo && <div className="creator-preview-truth" role="note"><strong>{tr("Product image preview", "معاينة صورة المنتج")}</strong><span>{tr("No AI video has been rendered", "لم يتم توليد فيديو بالذكاء الاصطناعي")}</span></div>}
                {hasRenderedVideo && <div className="creator-preview-controls"><button type="button" onClick={() => void togglePreviewPlayback()} aria-label={previewPlaying ? tr("Pause preview", "إيقاف المعاينة") : tr("Play preview", "تشغيل المعاينة")}>{previewPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button><button type="button" onClick={() => setPreviewMuted((muted) => !muted)} aria-label={previewMuted ? tr("Turn preview sound on", "تشغيل صوت المعاينة") : tr("Mute preview", "كتم المعاينة")}>{previewMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button></div>}
              </div>
              <span className="creator-stage-note">{hasRenderedVideo ? tr("Preview overlays update instantly. Scene imagery updates after rendering.", "النصوص تتحدث فوراً. صور المشاهد تتحدث بعد التوليد.") : tr("Still preview only. Generate a real video before exporting.", "معاينة ثابتة فقط. ولّد فيديو حقيقياً قبل التصدير.")}</span>
            </section>

            <aside className="creator-panel creator-inspector" aria-label={tr("Editing controls", "أدوات التعديل")}>
              <div className="creator-inspector-tabs" role="tablist" aria-label={tr("Editing sections", "أقسام التعديل")}>
                {(["scene", "brand", "format"] as const).map((tab) => (
                  <button key={tab} type="button" role="tab" aria-selected={inspectorTab === tab} className={cn("creator-inspector-tab", inspectorTab === tab && "is-active")} onClick={() => setInspectorTab(tab)}>{arabicUi ? ({ scene: "المشهد", brand: "الهوية", format: "المقاس" } as const)[tab] : tab[0].toUpperCase() + tab.slice(1)}</button>
                ))}
              </div>

              {inspectorTab === "scene" && activeScene && (
                <>
                  <div className="creator-field"><label htmlFor="scene-headline">{tr("On-screen headline", "العنوان على الشاشة")}</label><input id="scene-headline" className="creator-input" value={arabicUi ? activeScene.headlineAr ?? activeScene.headline : activeScene.headline} onChange={(event) => updateScene(activeScene.id, arabicUi ? { headlineAr: event.target.value } : { headline: event.target.value })} maxLength={70} /></div>
                  <div className="creator-field"><label htmlFor="scene-direction">{tr("What happens in this scene", "شنو يصير في هذا المشهد")}</label><textarea id="scene-direction" className="creator-textarea" value={activeScene.direction} onChange={(event) => updateScene(activeScene.id, { direction: event.target.value })} /></div>
                  <div className="creator-field"><label>{tr("Scene length", "مدة المشهد")}</label><div className="creator-duration-control"><button type="button" onClick={() => updateScene(activeScene.id, { duration: Math.max(1, activeScene.duration - 1) }, true)} aria-label={tr("Shorten scene", "قصّر المشهد")}><Minus aria-hidden="true" /></button><span>{activeScene.duration} {activeScene.duration === 1 ? tr("second", "ثانية") : tr("seconds", "ثوانٍ")}</span><button type="button" onClick={() => updateScene(activeScene.id, { duration: Math.min(5, activeScene.duration + 1) }, true)} aria-label={tr("Lengthen scene", "طوّل المشهد")}><Plus aria-hidden="true" /></button></div></div>
                  <div className="creator-scene-actions"><button className="creator-button creator-button-secondary" type="button" onClick={() => moveScene(activeScene.id, -1)} disabled={project.scenes[0]?.id === activeScene.id}><ChevronUp aria-hidden="true" /> {tr("Earlier", "أبكر")}</button><button className="creator-button creator-button-secondary" type="button" onClick={() => moveScene(activeScene.id, 1)} disabled={project.scenes.at(-1)?.id === activeScene.id}><ChevronDown aria-hidden="true" /> {tr("Later", "لاحقاً")}</button></div>
                </>
              )}

              {inspectorTab === "brand" && (
                <>
                  <div className="creator-field"><label htmlFor="editor-language">{tr("Campaign language", "لغة الحملة")}</label><select id="editor-language" className="creator-select" value={project.language} onChange={(event) => updateProject({ language: event.target.value as CreatorLanguage })}><option value="en">{tr("English", "الإنجليزية")}</option><option value="ar">{tr("Arabic · Kuwaiti dialect", "العربية · اللهجة الكويتية")}</option><option value="bilingual">{tr("Arabic + English · Kuwaiti dialect", "العربية + الإنجليزية · اللهجة الكويتية")}</option></select>{project.language !== "en" && <span className="creator-field-help">{tr("Voice and campaign copy use natural Kuwait Arabic (ar-KW).", "الصوت ونص الحملة يستخدمون عربي كويتي طبيعي (ar-KW).")}</span>}</div>
                  <div className="creator-field"><label htmlFor="editor-cta">{tr("Call to action", "الدعوة للإجراء")}</label><select id="editor-cta" className="creator-select" value={project.cta} onChange={(event) => updateProject({ cta: event.target.value })}>{CTA_OPTIONS.map((option) => <option key={option} value={option}>{arabicUi ? ARABIC_CTA_LABELS[option] ?? option : option}</option>)}</select></div>
                  <div className="creator-field"><label htmlFor="editor-offer">{tr("Offer", "العرض")}</label><input id="editor-offer" className="creator-input" value={project.offer} onChange={(event) => updateProject({ offer: event.target.value })} placeholder={tr("Optional — e.g. 20% off today", "اختياري — مثلاً خصم 20% اليوم")} /></div>
                  <div className="creator-field"><label htmlFor="editor-color">{tr("Brand colour", "لون العلامة")}</label><input id="editor-color" className="creator-input" type="color" value={project.brandColor} onChange={(event) => updateProject({ brandColor: event.target.value })} /></div>
                </>
              )}

              {inspectorTab === "format" && (
                <>
                  <div className="creator-field"><label>{tr("Video format", "مقاس الفيديو")}</label><div className="creator-choice-grid">{(["9:16", "1:1", "4:5", "16:9"] as CreatorAspectRatio[]).map((ratio) => <button key={ratio} type="button" className={cn("creator-choice", project.aspectRatio === ratio && "is-selected")} aria-pressed={project.aspectRatio === ratio} onClick={() => updateProject({ aspectRatio: ratio })}>{ratio}</button>)}</div>{project.aspectRatio === "4:5" && <span className="creator-field-help">{tr("Uses a 3:4 generation canvas, then preserves the 4:5 safe area in export.", "يستخدم مساحة توليد 3:4 ويحافظ على منطقة 4:5 الآمنة في التصدير.")}</span>}</div>
                  <div className="creator-field"><label htmlFor="editor-quality">{tr("Quality", "الجودة")}</label><select id="editor-quality" className="creator-select" value={project.resolution} onChange={(event) => updateProject({ resolution: event.target.value as CreatorResolution })}><option value="720p">720p · {tr("Recommended", "موصى به")}</option><option value="480p">480p · {tr("Faster preview", "معاينة أسرع")}</option></select></div>
                  <div className="creator-check-row"><input id="editor-subtitles" type="checkbox" checked={project.subtitles} onChange={(event) => updateProject({ subtitles: event.target.checked })} /><label htmlFor="editor-subtitles">{tr("Include subtitles when the video contains speech.", "أضف ترجمة مكتوبة إذا كان الفيديو يحتوي على كلام.")}</label></div>
                  <div className="creator-check-row"><input id="editor-audio" type="checkbox" checked={project.audio} onChange={(event) => updateProject({ audio: event.target.checked })} /><label htmlFor="editor-audio">{tr("Generate music and sound for this version.", "ولّد موسيقى وصوت لهذه النسخة.")}</label></div>
                </>
              )}

              <div className="creator-change-box">
                <div className="creator-change-box-header"><WandSparkles aria-hidden="true" /> {tr("Make a change in plain language", "اطلب تعديلاً بكلام بسيط")}</div>
                <textarea className="creator-textarea" value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} placeholder={tr("Try “show the product earlier” or “make the opening faster”", "جرّب «أظهر المنتج أبكر» أو «سرّع البداية»")} aria-label={tr("Describe a change", "اكتب التعديل")} />
                <button className="creator-button creator-button-primary" type="button" onClick={applyChangeRequest} disabled={!changeRequest.trim()} style={{ width: "100%", marginTop: 9 }}><Send aria-hidden="true" /> {tr("Apply change", "طبّق التعديل")}</button>
              </div>
            </aside>
          </div>
        </div>

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent closeLabel={tr("Close", "إغلاق")} className="creator-export-panel left-auto right-0 top-0 translate-x-0 translate-y-0 max-w-[460px] max-h-none h-full rounded-none border-0 gap-0 p-6">
            <div className="creator-export-head"><div><DialogTitle>{tr("Export campaign", "تصدير الحملة")}</DialogTitle><DialogDescription>{tr("Choose where this version will be published.", "اختر وين راح تنشر هذه النسخة.")}</DialogDescription></div></div>
            <div className="creator-export-options">
              {EXPORT_PRESETS.map((preset) => (
                <button key={preset.ratio} type="button" className={cn("creator-export-option", selectedExport === preset.ratio && "is-selected")} aria-pressed={selectedExport === preset.ratio} onClick={() => setSelectedExport(preset.ratio)}>
                  <span className="creator-ratio-icon">{preset.ratio}</span>
                  <span><strong>{arabicUi ? preset.titleAr : preset.title}</strong><span>{preset.ratio === project.aspectRatio ? tr("Current rendered version · Download", "النسخة المولّدة الحالية · تنزيل") : tr("New generative version · Separate quote", "نسخة توليد جديدة · تسعير منفصل")}</span></span>
                  {selectedExport === preset.ratio && <CheckCircle2 className="creator-export-check" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="creator-summary-list" style={{ marginTop: 24 }}><div className="creator-summary-row"><span>{tr("File", "الملف")}</span><strong>MP4 · H.264</strong></div><div className="creator-summary-row"><span>{tr("Quality", "الجودة")}</span><strong>{project.resolution}</strong></div><div className="creator-summary-row"><span>{tr("Audio", "الصوت")}</span><strong>{project.audio ? tr("Included", "مشمول") : tr("Muted", "مكتوم")}</strong></div></div>
            {selectedExport !== project.aspectRatio && (
              <div className="creator-export-generation-note" role="note">
                <strong>{tr("This creates a new AI-generated version", "هذا ينشئ نسخة جديدة مولّدة بالذكاء الاصطناعي")}</strong>
                <span>{tr(`The ${selectedExport} format is not a crop of your current video. MovPrompt will save a new version and request a separate confirmed quote before generation.`, `مقاس ${selectedExport} ليس قصاً من الفيديو الحالي. سيحفظ MovPrompt نسخة جديدة ويطلب سعراً مؤكداً منفصلاً قبل التوليد.`)}</span>
              </div>
            )}
            {simulatedGeneration ? (
              <div className="creator-import-note" role="note" style={{ marginTop: 24 }}><strong>{tr("Preview only", "معاينة فقط")}</strong><span>{tr("A downloadable MP4 becomes available after a real AI render completes.", "يتوفر ملف MP4 للتنزيل بعد اكتمال توليد حقيقي بالذكاء الاصطناعي.")}</span></div>
            ) : selectedExport === project.aspectRatio && hasRenderedVideo && project.videoUrl ? (
              <button className="creator-button creator-button-primary" type="button" onClick={downloadVideo} style={{ width: "100%", marginTop: 24 }}><Download aria-hidden="true" /> {tr("Download", "تنزيل")} {selectedExportMeta.ratio}</button>
            ) : (
              <button className="creator-button creator-button-primary" type="button" onClick={() => void startGeneration(selectedExport)} style={{ width: "100%", marginTop: 24 }}><Sparkles aria-hidden="true" /> {tr("Get quote for", "احصل على سعر لنسخة")} {selectedExport}</button>
            )}
          </DialogContent>
        </Dialog>
      </CreatorShell>
    );
  }

  return (
    <CreatorShell qaMode={qaMode}>
      <Seo title="Create a video · MovPrompt" description="Turn a product, business link or photos into a ready-to-post Kuwait campaign with a guided MovPrompt template." path="/create" noindex />
      {draftRestoring ? <div className="creator-page"><div className="creator-empty" role="status"><Loader2 className="animate-spin" aria-hidden="true" /><p>{tr("Restoring your campaign…", "جارٍ استرجاع حملتك…")}</p></div></div> : <div className="creator-page">
        <header className="creator-page-head">
          <div>
            <p className="creator-kicker">{tr("Create with a template", "أنشئ باستخدام قالب")}</p>
            <h1 className="creator-title creator-title-sm">{step === "template" ? (project.product.images.length ? tr(`Choose the best format for this ${project.promotionKind === "business" ? "service" : "product"}.`, "اختر أفضل قالب لهذه الحملة.") : tr("Choose the result you want.", "اختر النتيجة التي تريدها.")) : step === "source" ? tr("What are you promoting?", "شنو تبي تروّج له؟") : tr("Review the campaign.", "راجع الحملة.")}</h1>
            <p className="creator-subtitle">{step === "template" ? (project.product.images.length ? tr(`MovPrompt keeps your ${project.promotionKind === "business" ? "business" : "product"} facts while you compare proven campaign outcomes.`, "يحافظ MovPrompt على معلوماتك أثناء مقارنة نتائج الحملات المجربة.") : tr("Start from a proven campaign structure. You can still change the copy, branding and individual scenes later.", "ابدأ بهيكل حملة مجرب. تقدر تعدل النص والهوية والمشاهد لاحقاً.")) : step === "source" ? tr("Add a product page, business website or clear photos. You will confirm every imported fact before generation.", "أضف صفحة منتج أو موقع نشاط أو صور واضحة. راح تأكد كل معلومة قبل التوليد.") : tr("A few final details help MovPrompt create the right version for Kuwait.", "تفاصيل بسيطة تساعد MovPrompt يصنع النسخة المناسبة للكويت.")}</p>
            <button className="creator-mode-switch" type="button" onClick={() => void switchToAdvanced()} disabled={modeSwitching}>
              <span className="creator-mode-switch-icon"><SlidersHorizontal aria-hidden="true" /></span>
              <span className="creator-mode-switch-copy">
                <strong>{modeSwitching ? tr("Opening Advanced Mode…", "جارٍ فتح الوضع المتقدم…") : tr("Switch to Advanced", "الانتقال للوضع المتقدم")}</strong>
                <small>{project.product.images.length ? tr("Your product and campaign settings come with you.", "منتجك وإعدادات الحملة تنتقل معك.") : tr("Use prompts, references and detailed render controls.", "استخدم التوجيهات والمراجع وتحكم أدق بالتوليد.")}</small>
              </span>
              {modeSwitching ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </button>
          </div>
          <CreatorProgress current={step} steps={flowSteps} label={tr("Step", "الخطوة")} arabic={arabicUi} />
        </header>

        {step === "template" && <TemplateGrid selectedId={project.templateId} onSelect={selectTemplate} />}

        {step === "source" && (
          <div className="creator-workspace">
            <section className="creator-panel creator-panel-pad" aria-labelledby="source-heading">
              <div className="creator-panel-heading"><div><h2 id="source-heading">{tr("Campaign source", "مصدر الحملة")}</h2><p>{tr("Choose one starting point. We only use facts you review and approve.", "اختر نقطة بداية واحدة. نستخدم فقط المعلومات اللي تراجعها وتوافق عليها.")}</p></div><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep("template")}><ArrowLeft aria-hidden="true" /> {tr("Change template", "غيّر القالب")}</button></div>
              <div className="creator-source-tabs" role="tablist" aria-label={tr("Campaign source", "مصدر الحملة")} onKeyDown={handleSourceTabKey}>
                <button id="source-product-tab" role="tab" aria-controls="source-link-panel" aria-selected={sourceTab === "product"} tabIndex={sourceTab === "product" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "product" && "is-active")} type="button" onClick={() => chooseSourceTab("product")}>{tr("Product link", "رابط منتج")}</button>
                <button id="source-business-tab" role="tab" aria-controls="source-link-panel" aria-selected={sourceTab === "business"} tabIndex={sourceTab === "business" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "business" && "is-active")} type="button" onClick={() => chooseSourceTab("business")}>{tr("Business or service", "نشاط أو خدمة")}</button>
                <button id="source-upload-tab" role="tab" aria-controls="source-upload-panel" aria-selected={sourceTab === "upload"} tabIndex={sourceTab === "upload" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "upload" && "is-active")} type="button" onClick={() => chooseSourceTab("upload")}>{tr("Upload photos", "ارفع صور")}</button>
              </div>

              {sourceTab !== "upload" ? (
                <div id="source-link-panel" role="tabpanel" aria-labelledby={sourceTab === "business" ? "source-business-tab" : "source-product-tab"} style={{ marginTop: 22 }}>
                  <div className="creator-field"><label htmlFor="source-url">{sourceTab === "business" ? tr("Business or service website", "موقع النشاط أو الخدمة") : tr("Product page", "صفحة المنتج")}</label><div className="creator-input-row"><input id="source-url" className="creator-input" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder={sourceTab === "business" ? "https://yoursalon.com" : "https://yourstore.com/product"} inputMode="url" aria-describedby={sourceError ? "source-error" : "source-url-help"} /><button className="creator-button creator-button-primary" type="button" onClick={scanSource} disabled={sourceBusy}>{sourceBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />} {tr("Import", "استيراد")}</button></div><span id="source-url-help" className="creator-field-help">{sourceTab === "business" ? tr("We’ll look for the business name, description and public images. You will confirm location and booking details next.", "راح نبحث عن اسم النشاط ووصفه وصوره العامة. بعدها تأكد الموقع وتفاصيل الحجز.") : tr("We’ll look for the product name, description, price and up to five clear images.", "راح نبحث عن اسم المنتج ووصفه وسعره وحتى خمس صور واضحة.")}</span></div>
                  {sourceTab === "product" && <div className="creator-upload-zone" style={{ minHeight: 150, marginTop: 20 }}><button className="creator-button creator-button-quiet" type="button" onClick={useSampleProduct}><Sparkles aria-hidden="true" /> {tr("Or try a sample product", "أو جرّب منتجاً نموذجياً")}</button></div>}
                  {sourceTab === "business" && <div className="creator-import-note" role="note"><strong>{tr("Business facts stay locked", "معلومات النشاط تبقى ثابتة")}</strong><span>{tr("MovPrompt will not invent qualifications, prices, treatment results or service claims.", "MovPrompt ما راح يخترع مؤهلات أو أسعار أو نتائج علاج أو ادعاءات عن الخدمة.")}</span></div>}
                </div>
              ) : (
                <div id="source-upload-panel" role="tabpanel" aria-labelledby="source-upload-tab" className="creator-upload-zone">
                  <label htmlFor="product-files"><span className="creator-upload-icon"><Upload aria-hidden="true" /></span><strong>{tr("Drop product or business photos here", "اسحب صور المنتج أو النشاط هنا")}</strong><span>{tr("JPG, PNG or WebP · up to 5 images · 12 MB each", "JPG أو PNG أو WebP · حتى 5 صور · 12 MB لكل صورة")}</span></label>
                  <input id="product-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void uploadFiles(event.target.files)} />
                </div>
              )}
              {sourceBusy && <p className="creator-field-help" role="status" style={{ marginTop: 12 }}>{tr("Preparing your images…", "جارٍ تجهيز الصور…")}</p>}
              {sourceError && <p id="source-error" className="creator-error" role="alert">{sourceError}</p>}
              {recoveryActions}
              <div className="creator-actions-row"><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep("template")}><ArrowLeft aria-hidden="true" /> {tr("Back", "رجوع")}</button><button className="creator-button creator-button-primary" type="button" onClick={continueFromSource} disabled={!project.product.images.length}>{tr("Review campaign", "راجع الحملة")} <ArrowRight aria-hidden="true" /></button></div>
            </section>

            <aside className="creator-panel creator-product-card" aria-label={tr(`Imported ${project.promotionKind} preview`, "معاينة المصدر المستورد")}>
              <div className="creator-product-image">{project.product.images[0] ? <img src={project.product.images[0].url} alt={project.product.name || tr(`Imported ${project.promotionKind}`, "المصدر المستورد")} /> : <div className="creator-empty" style={{ minHeight: "100%", border: 0, borderRadius: 0 }}><div><span className="creator-empty-icon"><FileImage aria-hidden="true" /></span><p>{project.promotionKind === "business" ? tr("Your selected business or service will appear here.", "النشاط أو الخدمة اللي اخترتها راح تظهر هنا.") : tr("Your selected product will appear here.", "المنتج اللي اخترته راح يظهر هنا.")}</p></div></div>}</div>
              <div className="creator-product-copy"><p className="creator-kicker">{project.promotionKind === "business" ? tr("Business campaign", "حملة نشاط") : arabicUi ? template.nameAr : template.name}</p><h3>{project.product.name || (project.promotionKind === "business" ? tr("No business added yet", "ما أضفت نشاطاً للحين") : tr("No product added yet", "ما أضفت منتجاً للحين"))}</h3><p>{project.product.description || (project.promotionKind === "business" ? tr("Add a link or photos to prepare your booking campaign.", "أضف رابطاً أو صوراً لتجهيز حملة الحجوزات.") : tr("Add a link or photos to prepare your product campaign.", "أضف رابطاً أو صوراً لتجهيز حملة المنتج."))}</p>{project.product.images.length > 0 && <div className="creator-image-strip">{project.product.images.map((image) => <span className="creator-image-thumb" key={image.id}><img src={image.url} alt="" /></span>)}</div>}</div>
            </aside>
          </div>
        )}

        {step === "details" && (
          <div className="creator-workspace">
            <section className="creator-panel creator-panel-pad" aria-labelledby="campaign-heading">
              <div className="creator-panel-heading"><div><h2 id="campaign-heading">{tr("Campaign details", "تفاصيل الحملة")}</h2><p>{tr("Keep it simple. You can refine these details in the editor.", "خلّها بسيطة. تقدر تضبط التفاصيل أكثر في المحرر.")}</p></div></div>
              <div className="creator-form-grid">
                <div className="creator-field"><label htmlFor="product-name">{project.promotionKind === "business" ? tr("Business or service name", "اسم النشاط أو الخدمة") : tr("Product name", "اسم المنتج")}</label><input id="product-name" className="creator-input" value={project.product.name} onChange={(event) => updateProject({ product: { ...project.product, name: event.target.value }, title: `${event.target.value || tr("Untitled", "بدون عنوان")} — ${arabicUi ? template.nameAr : template.name}` })} /></div>
                <div className="creator-field"><label htmlFor="brand-name">{project.promotionKind === "business" ? tr("Business name", "اسم النشاط") : tr("Brand", "العلامة التجارية")}</label><input id="brand-name" className="creator-input" value={project.product.brand} onChange={(event) => updateProject({ product: { ...project.product, brand: event.target.value } })} placeholder={tr("Optional", "اختياري")} /></div>
                <div className="creator-field"><label htmlFor="market">{tr("Market", "السوق")}</label><select id="market" className="creator-select" value="KW" disabled><option value="KW">Kuwait · KWD</option></select><span className="creator-field-help">{tr("Kuwait is the supported launch market. More GCC markets are coming later.", "الكويت هي سوق الإطلاق المدعوم. باقي أسواق الخليج راح تتوفر لاحقاً.")}</span></div>
                <div className="creator-field"><label htmlFor="language">{tr("Campaign language", "لغة الحملة")}</label><select id="language" className="creator-select" value={project.language} onChange={(event) => updateProject({ language: event.target.value as CreatorLanguage })}><option value="en">{tr("English", "الإنجليزية")}</option><option value="ar">{tr("Arabic · Kuwaiti dialect", "العربية · اللهجة الكويتية")}</option><option value="bilingual">{tr("Arabic + English · Kuwaiti dialect", "العربية + الإنجليزية · اللهجة الكويتية")}</option></select>{project.language !== "en" && <span className="creator-field-help">{tr("Natural Kuwait Arabic (ar-KW), not general Arabic.", "عربي كويتي طبيعي (ar-KW)، مو عربي عام.")}</span>}</div>
                <div className="creator-field"><label htmlFor="price">{tr("Price", "السعر")}</label><input id="price" className="creator-input" value={project.product.price} onChange={(event) => updateProject({ product: { ...project.product, price: event.target.value } })} placeholder={`${tr("Optional", "اختياري")} · ${MARKET_META[project.market].currency}`} /></div>
                <div className="creator-field"><label htmlFor="offer">{tr("Offer", "العرض")}</label><input id="offer" className="creator-input" value={project.offer} onChange={(event) => updateProject({ offer: event.target.value })} placeholder={tr("Optional · e.g. 20% off today", "اختياري · مثلاً خصم 20% اليوم")} /></div>
                <div className="creator-field"><label htmlFor="campaign-goal">{tr("Campaign goal", "هدف الحملة")}</label><select id="campaign-goal" className="creator-select" value={project.goal} onChange={(event) => updateProject({ goal: event.target.value as CreatorProject["goal"] })}>{CAMPAIGN_GOAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{arabicUi ? ARABIC_GOAL_LABELS[option.value] : option.label}</option>)}</select></div>
                <div className="creator-field"><label htmlFor="cta">{tr("Call to action", "الدعوة للإجراء")}</label><select id="cta" className="creator-select" value={project.cta} onChange={(event) => updateProject({ cta: event.target.value })}>{CTA_OPTIONS.map((option) => <option key={option} value={option}>{arabicUi ? ARABIC_CTA_LABELS[option] ?? option : option}</option>)}</select></div>
                <div className="creator-field"><label htmlFor="brand-colour">{tr("Brand colour", "لون العلامة")}</label><input id="brand-colour" className="creator-input" type="color" value={project.brandColor} onChange={(event) => updateProject({ brandColor: event.target.value })} /></div>
                {project.promotionKind === "business" && <div className="creator-field"><label htmlFor="location">{tr("Kuwait location", "الموقع في الكويت")}</label><input id="location" className="creator-input" value={project.location} onChange={(event) => updateProject({ location: event.target.value })} placeholder={tr("Area and branch, if relevant", "المنطقة والفرع، إذا ينطبق")} /></div>}
                {project.promotionKind === "business" && <div className="creator-field"><label htmlFor="booking-url">{tr("Booking link", "رابط الحجز")}</label><input id="booking-url" className="creator-input" inputMode="url" value={project.bookingUrl} onChange={(event) => updateProject({ bookingUrl: event.target.value })} placeholder={`${tr("Optional", "اختياري")} · https://…`} /></div>}
                <div className="creator-field"><label htmlFor="whatsapp">{tr("WhatsApp number", "رقم واتساب")}</label><input id="whatsapp" className="creator-input" inputMode="tel" value={project.whatsapp} onChange={(event) => updateProject({ whatsapp: event.target.value })} placeholder={`${tr("Optional", "اختياري")} · +965 0000 0000`} /></div>
                <div className="creator-field"><label>{tr("Video format", "مقاس الفيديو")}</label><div className="creator-choice-grid">{(["9:16", "1:1", "4:5", "16:9"] as CreatorAspectRatio[]).map((ratio) => <button key={ratio} type="button" className={cn("creator-choice", project.aspectRatio === ratio && "is-selected")} aria-pressed={project.aspectRatio === ratio} onClick={() => updateProject({ aspectRatio: ratio })}>{ratio}</button>)}</div>{project.aspectRatio === "4:5" && <span className="creator-field-help">{tr("Uses a 3:4 generation canvas, then preserves the 4:5 portrait safe area in the deterministic export.", "يستخدم مساحة توليد 3:4، وبعدها يحافظ التصدير الثابت على منطقة 4:5 الآمنة.")}</span>}</div>
                <div className="creator-field"><label htmlFor="quality">{tr("Quality", "الجودة")}</label><select id="quality" className="creator-select" value={project.resolution} onChange={(event) => updateProject({ resolution: event.target.value as CreatorResolution })}><option value="720p">720p · {tr("Recommended", "موصى به")}</option><option value="480p">480p · {tr("Faster preview", "معاينة أسرع")}</option></select></div>
              </div>
              <div className="creator-check-row"><input id="preflight-subtitles" type="checkbox" checked={project.subtitles} onChange={(event) => updateProject({ subtitles: event.target.checked })} /><label htmlFor="preflight-subtitles">{tr("Include subtitles when the video contains speech.", "أضف ترجمة مكتوبة إذا كان الفيديو يحتوي على كلام.")}</label></div>
              <div className="creator-check-row"><input id="preflight-audio" type="checkbox" checked={project.audio} onChange={(event) => updateProject({ audio: event.target.checked })} /><label htmlFor="preflight-audio">{tr("Generate music and sound for this version.", "ولّد موسيقى وصوت لهذه النسخة.")}</label></div>
              <div className="creator-check-row"><input id="rights" type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><label htmlFor="rights">{tr("Confirm that you have permission to use these images and that the campaign facts are accurate.", "أكّد أن لديك إذناً لاستخدام هذه الصور وأن معلومات الحملة دقيقة.")}</label></div>
              {sourceError && <p className="creator-error" role="alert">{sourceError}</p>}
              {recoveryActions}
              <div className="creator-actions-row"><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep(templateFirst.current ? "source" : "template")}><ArrowLeft aria-hidden="true" /> {tr("Back", "رجوع")}</button><button ref={generateButtonRef} className="creator-button creator-button-primary" type="button" onClick={() => void startGeneration()} disabled={!project.product.name.trim() || !rightsConfirmed || (!simulatedGeneration && (!quoteLoaded || !quote)) || sourceBusy}><Sparkles aria-hidden="true" /> {simulatedGeneration ? tr("Prepare product preview", "جهّز معاينة المنتج") : tr("Generate video", "ولّد الفيديو")}</button></div>
            </section>

            <aside className="creator-panel creator-panel-pad creator-generation-summary" aria-label={tr("Generation summary", "ملخص التوليد")}>
              <p className="creator-kicker">{tr("Ready to create", "جاهز للإنشاء")}</p>
              <div className="creator-product-image" style={{ borderRadius: 14, overflow: "hidden" }}><img src={project.product.images[0]?.url} alt={project.product.name} /></div>
              <div className="creator-summary-list" style={{ marginTop: 16 }}><div className="creator-summary-row"><span>{tr("Template", "القالب")}</span><strong>{arabicUi ? template.nameAr : template.name}</strong></div><div className="creator-summary-row"><span>{tr("Campaign goal", "هدف الحملة")}</span><strong>{arabicUi ? ARABIC_GOAL_LABELS[project.goal] : getCampaignGoalOption(project.goal).label}</strong></div><div className="creator-summary-row"><span>{tr("Call to action", "الدعوة للإجراء")}</span><strong>{arabicUi ? ARABIC_CTA_LABELS[project.cta] ?? project.cta : project.cta}</strong></div>{project.product.price && <div className="creator-summary-row"><span>{tr("Price", "السعر")}</span><strong>{project.product.price} {MARKET_META[project.market].currency}</strong></div>}{project.offer && <div className="creator-summary-row"><span>{tr("Offer", "العرض")}</span><strong>{project.offer}</strong></div>}<div className="creator-summary-row"><span>{tr("Market", "السوق")}</span><strong>{MARKET_META[project.market].label}</strong></div><div className="creator-summary-row"><span>{tr("Campaign language", "لغة الحملة")}</span><strong>{project.language === "bilingual" ? tr("Kuwaiti Arabic + English", "عربي كويتي + إنجليزي") : project.language === "ar" ? tr("Kuwaiti Arabic", "عربي كويتي") : tr("English", "الإنجليزية")}</strong></div><div className="creator-summary-row"><span>{tr("Format", "المقاس")}</span><strong>{project.aspectRatio} · {project.resolution}</strong></div><div className="creator-summary-row"><span>{tr("Subtitles", "الترجمة المكتوبة")}</span><strong>{project.subtitles ? tr("Included", "مشمولة") : tr("Off", "متوقفة")}</strong></div><div className="creator-summary-row"><span>{tr("Audio", "الصوت")}</span><strong>{project.audio ? tr("Included", "مشمول") : tr("Off", "متوقف")}</strong></div></div>
              <div className="creator-cost-box" aria-live="polite">
                {quote ? <>
                  <small>{quote.entitlementEligible ? tr("Your first video", "فيديوك الأول") : tr("Confirmed generation price", "سعر التوليد المؤكد")}</small>
                  <strong>{quote.entitlementEligible ? tr("Included · 0 credits for this render", "مشمول · 0 رصيد لهذا التوليد") : tr(`${quote.credits} credits`, `${quote.credits} رصيد`)}</strong>
                  <span className="creator-cost-meta"><Clock3 aria-hidden="true" /> {tr(`Video length: ${projectDurationSeconds} seconds · estimated processing: 2–5 minutes`, `مدة الفيديو: ${projectDurationSeconds} ثانية · وقت المعالجة المتوقع: 2–5 دقائق`)}</span>
                </> : simulatedGeneration ? <><small>{localDemoGeneration ? tr("Client preview", "معاينة للعميل") : tr("Development preview", "معاينة تطوير")}</small><strong>{tr("No AI credits charged · preview workflow only", "ما ينخصم رصيد ذكاء اصطناعي · مسار معاينة فقط")}</strong></> : <><small>{tr("Generation availability", "توفر التوليد")}</small><strong>{quoteLoaded ? quoteError || tr("Video generation is temporarily unavailable.", "توليد الفيديو غير متوفر مؤقتاً.") : tr("Confirming the current price…", "جارٍ تأكيد السعر الحالي…")}</strong>{quoteLoaded && quoteFailure?.retryable && <button className="creator-cost-retry" type="button" onClick={retryQuote}><RefreshCw aria-hidden="true" /> {tr("Retry price", "أعد محاولة السعر")}</button>}{quoteFailure?.requestId && <details className="creator-support-details"><summary>{tr("Support details", "تفاصيل الدعم")}</summary><code>{tr("Request ID", "رقم الطلب")}: {quoteFailure.requestId}</code></details>}</>}
              </div>
            </aside>
          </div>
        )}
      </div>}
      <AuthGateDialog open={authGateOpen} onOpenChange={handleAuthGateChange} returnPath={`/create?draft=${encodeURIComponent(project.id)}&resume=generate`} />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{authGateCancellation}</p>
    </CreatorShell>
  );
}
