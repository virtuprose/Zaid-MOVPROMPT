import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import { Seo } from "@/components/Seo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { isFeatureEnabled } from "@/config/features";
import { portableCreatorApi } from "@/lib/api/portableApiClient";
import { cancelCreatorGeneration, cancelVideoJob, pollCreatorGeneration, pollVideoJob, startCreatorGeneration } from "@/lib/director/api";
import { cn } from "@/lib/utils";
import { CreatorShell } from "./CreatorShell";
import { AuthGateDialog } from "./AuthGateDialog";
import { TemplateGrid } from "./TemplateGrid";
import { SAMPLE_PRODUCT, createDraftProject, getCreatorTemplate } from "./templates";
import { getLocalCreatorProject, loadCreatorProjects, syncCreatorProject } from "./projectStore";
import { projectToCreationDraft, type CreationDraft, type GenerationQuote } from "./contracts";
import { cleanupExpiredGuestDrafts, deleteGuestDraft, getGuestAsset, getGuestDraft, putGuestAsset, saveGuestDraft } from "./guestDraftStore";
import { claimGuestImage, mirrorProductImages } from "./creatorAssets";
import {
  CTA_OPTIONS,
  MARKET_META,
  type CreatorAspectRatio,
  type CreatorLanguage,
  type CreatorMarket,
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

const GENERATION_STATES = [
  "Preparing your product",
  "Building your campaign",
  "Creating the scenes",
  "Adding your brand and copy",
  "Preparing your preview",
];

const EXPORT_PRESETS: Array<{ ratio: CreatorAspectRatio; title: string; detail: string }> = [
  { ratio: "9:16", title: "TikTok, Reels & Snapchat", detail: "1080 × 1920 · Vertical safe zones" },
  { ratio: "1:1", title: "Instagram feed", detail: "1080 × 1080 · Square" },
  { ratio: "4:5", title: "Instagram portrait", detail: "1080 × 1350 · Portrait" },
  { ratio: "16:9", title: "YouTube & website", detail: "1920 × 1080 · Landscape" },
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
  const language = project.language === "ar" ? "Arabic" : project.language === "bilingual" ? "Arabic and English" : "English";
  return [
    `Create a ${template.duration}-second ${project.aspectRatio} ${project.promotionKind === "business" ? "service" : "product"} campaign using ${template.name}.`,
    `The supplied references are ${refs}. ${project.promotionKind === "business" ? "Keep the business environment, people and branding faithful to the references. Do not invent service results, qualifications or claims." : "Preserve the exact product shape, package, label, colours and logo across every shot."}`,
    `${project.promotionKind === "business" ? "Business or service" : "Product"} facts: ${project.product.name}. ${project.product.description}. Brand: ${project.product.brand || "not supplied"}. Price: ${project.product.price || "not supplied"} ${MARKET_META[project.market].currency}.`,
    ...(project.promotionKind === "business" ? [`Location: ${project.location || "not supplied"}. Booking destination: ${project.bookingUrl || "not supplied"}. WhatsApp: ${project.whatsapp || "not supplied"}.`] : []),
    `Market: ${MARKET_META[project.market].label}. On-screen language: ${language}. ${project.language !== "en" ? "Use natural RTL Arabic composition and correct punctuation." : ""}`,
    project.offer ? `Offer: ${project.offer}.` : "Do not invent an offer or discount.",
    `CTA: ${project.cta}. Brand colour: ${project.brandColor}.`,
    "Scene recipe:",
    ...project.scenes.map((scene, index) => `${index + 1}. ${scene.duration}s — ${scene.title}. ${scene.direction} On-screen text: “${scene.headline}”.`),
    "Keep important text inside social safe zones. Premium, photoreal product advertising. No altered spelling, extra products, invented claims, watermarks or unreadable typography.",
  ].join("\n");
}

function validateLocalImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is over 12 MB.`);
}

function Progress({ current, steps = STEPS }: { current: CreatorStep; steps?: Array<{ id: CreatorStep; label: string }> }) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <div className="creator-progress" aria-label={`Step ${currentIndex + 1} of ${steps.length}`}>
      {steps.map((step, index) => (
        <div key={step.id} aria-current={index === currentIndex ? "step" : undefined} className={cn("creator-progress-step", index === currentIndex && "is-current", index < currentIndex && "is-done")}>
          <span>{index < currentIndex ? <Check aria-hidden="true" /> : index + 1}</span>
          {step.label}
        </div>
      ))}
    </div>
  );
}

export function CreateStudio({ qaMode = false }: { qaMode?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectId: routeProjectId, draftId: routeDraftId } = useParams();
  const { user } = useAuth();
  const requestedProject = searchParams.get("project") || routeProjectId || null;
  const requestedTemplate = searchParams.get("template");
  const requestedDraft = searchParams.get("draft") || routeDraftId || null;
  const shouldResumeGeneration = searchParams.get("resume") === "generate";
  const initialProject = requestedProject ? getLocalCreatorProject(requestedProject, user?.id) : null;
  const homepageHandoff = useMemo(() => readHomepageHandoff(), []);
  const initialTemplate = requestedTemplate ?? homepageHandoff.templateId ?? undefined;
  const templateFirst = useRef(Boolean(initialTemplate));
  const flowSteps = useMemo(() => templateFirst.current ? STEPS : [STEPS[1], STEPS[0], ...STEPS.slice(2)], []);
  const [project, setProject] = useState<CreatorProject>(() => initialProject ?? createDraftProject(initialTemplate));
  const sessionDraftId = useRef(project.id);
  const [step, setStep] = useState<CreatorStep>(() => initialProject?.videoUrl ? "editor" : initialProject?.product.images.length ? "details" : "source");
  const [sourceTab, setSourceTab] = useState<"product" | "business" | "upload">(
    initialProject?.promotionKind === "business" ? "business" : "product",
  );
  const [productUrl, setProductUrl] = useState(initialProject?.product.sourceUrl ?? homepageHandoff.sourceUrl);
  const [sourceError, setSourceError] = useState("");
  const [sourceBusy, setSourceBusy] = useState(false);
  const [modeSwitching, setModeSwitching] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [draftRestoring, setDraftRestoring] = useState(Boolean(requestedDraft));
  const [generationProgress, setGenerationProgress] = useState(0);
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
  const resumedGeneration = useRef(false);
  const startGenerationRef = useRef<(ratioOverride?: CreatorAspectRatio) => Promise<void>>(async () => undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const template = getCreatorTemplate(project.templateId);
  const [quote, setQuote] = useState<GenerationQuote | null>(null);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const activeScene = project.scenes.find((scene) => scene.id === activeSceneId) ?? project.scenes[0];
  const isRtl = project.language === "ar" || project.language === "bilingual";

  useEffect(() => {
    if (!requestedProject || !user || initialProject) return;
    let active = true;
    void loadCreatorProjects(user.id).then((projects) => {
      const saved = projects.find((item) => item.id === requestedProject);
      if (!active || !saved) return;
      setProject(saved);
      setStep(saved.videoUrl ? "editor" : saved.product.images.length ? "details" : "source");
    });
    return () => { active = false; };
  }, [initialProject, requestedProject, user]);

  useEffect(() => {
    let active = true;
    setQuoteLoaded(false);
    setQuoteError("");
    if (isFeatureEnabled("portableAuth")) {
      setQuote(null);
      setQuoteError("Generation remains safely disabled until a benchmarked provider and authoritative pricing are configured.");
      setQuoteLoaded(true);
      return () => { active = false; };
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
    return () => { active = false; };
  }, [template.duration, template.id, user?.id]);

  const persist = useCallback((next: CreatorProject) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!next.product.images.length && !next.product.sourceUrl && !next.product.name) return;
      if (!qaMode && !user) {
        void saveGuestDraft(projectToCreationDraft(next, rightsConfirmed)).then(() => {
          if (!requestedDraft) navigate(`/create?draft=${encodeURIComponent(next.id)}`, { replace: true });
        });
        return;
      }
      void syncCreatorProject(next, qaMode ? null : user?.id);
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
      setProject({
        ...rebuilt,
        id: draft.id,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        product: { ...draft.product, images: hydratedImages },
        market: draft.campaign.market,
        language: draft.campaign.language,
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
        resolution: draft.campaign.resolution,
        subtitles: draft.campaign.subtitles,
        audio: draft.campaign.audio,
        pendingGenerationId: draft.pendingGenerationId,
        pendingQuoteCredits: draft.acceptedQuote?.credits ?? null,
      });
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
    if (!project.jobId || step !== "generating" || qaMode) return;
    let stopped = false;
    const poll = async () => {
      try {
        const job = project.renderRunId ? await pollCreatorGeneration(project.renderRunId) : await pollVideoJob(project.jobId!);
        if (stopped) return;
        setGenerationProgress((value) => Math.min(92, Math.max(value + 7, job.status === "processing" ? 52 : 18)));
        if (job.status === "completed" && job.video_url) {
          setProject((current) => ({ ...current, status: "review", videoUrl: job.video_url!, lastError: null }));
          setGenerationProgress(100);
          setGenerationMessage("Your preview is ready");
          window.setTimeout(() => setStep("editor"), 450);
        } else if (job.status === "failed") {
          setProject((current) => ({ ...current, status: "failed", lastError: job.error || "The render could not be completed." }));
          setSourceError(job.error || "The render could not be completed. Try again.");
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
  }, [project.jobId, project.renderRunId, qaMode, step]);

  const updateProject = (changes: Partial<CreatorProject>) => {
    setProject((current) => ({ ...current, ...changes, updatedAt: new Date().toISOString() }));
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
    const serviceTemplate = templateId === "salon-booking-offer" || templateId === "app-service";
    updateProject({
      templateId,
      brandColor: nextTemplate.accent,
      language: templateId === "gcc-offer-launch" ? "ar" : project.language,
      promotionKind: serviceTemplate ? "business" : project.promotionKind,
      vertical: templateId === "salon-booking-offer" ? "salon" : project.vertical,
      goal: templateId === "salon-booking-offer" ? "bookings" : project.goal,
      cta: templateId === "salon-booking-offer" ? "Book now" : project.cta,
      scenes: nextTemplate.scenes.map((scene) => ({ ...scene })),
      title: project.product.name ? `${project.product.name} — ${nextTemplate.name}` : "Untitled campaign",
    });
    setActiveSceneId(nextTemplate.scenes[0].id);
    setStep(project.product.images.length ? "details" : "source");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useSampleProduct = () => {
    updateProject({ promotionKind: "product", product: SAMPLE_PRODUCT, title: `${SAMPLE_PRODUCT.name} — ${template.name}`, status: "ready" });
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
    try {
      const kind = project.promotionKind;
      const scan = await portableCreatorApi.scan(kind, trimmed);
      if (!scan.imageCandidates.length) throw new Error("no_image_found");
      const fact = (field: string) => scan.facts.find((item) => item.field === field)?.value ?? "";
      const name = fact("name") || (kind === "business" ? "Imported business" : "Imported product");
      updateProject({
        title: `${name} — ${template.name}`,
        status: "ready",
        product: {
          sourceType: kind === "business" ? "business_link" : "product_link",
          sourceUrl: scan.canonicalUrl,
          name,
          description: fact("description"),
          price: fact("price") || project.product.price,
          brand: project.product.brand,
          images: scan.imageCandidates.slice(0, 5).map((url, index) => ({ id: `url-${index}`, name: `${name} ${index + 1}`, url, source: "url" as const })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setSourceError(message.includes("no_image") ? `We couldn't find a clear ${project.promotionKind === "business" ? "business" : "product"} image on that page. Upload photos instead.` : "We couldn't read that page. Check the link or upload photos instead.");
    } finally {
      setSourceBusy(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, 5 - project.product.images.length));
    if (!selected.length) {
      setSourceError("You can add up to five product photos.");
      return;
    }
    setSourceBusy(true);
    setSourceError("");
    try {
      const assets = await Promise.all(selected.map(async (file) => {
        validateLocalImage(file);
        const assetKey = await putGuestAsset(project.id, file);
        return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), assetKey, source: "upload" as const };
      }));
      const images = [...project.product.images, ...assets].slice(0, 5);
      updateProject({
        status: "ready",
        product: { ...project.product, sourceType: "upload", sourceUrl: "", images, name: project.product.name || selected[0].name.replace(/\.[^.]+$/, "") },
        title: project.title === "Untitled campaign" ? `${selected[0].name.replace(/\.[^.]+$/, "")} — ${template.name}` : project.title,
      });
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "The images could not be uploaded. Try again.");
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
        setProject((current) => ({ ...current, status: "review", videoUrl: template.previewVideo, jobId: null, lastError: null }));
        setGenerationMessage("Your preview is ready");
        window.setTimeout(() => setStep("editor"), 500);
      }
    }, 520);
  };

  const claimGuestProject = async (candidate: CreatorProject) => {
    if (!user || qaMode) return candidate;
    const cloudProject = await syncCreatorProject(candidate, user.id);
    let images = await Promise.all(cloudProject.product.images.map(async (image) => {
      if (!image.assetKey) return image;
      const stored = await getGuestAsset(image.assetKey);
      if (!stored) throw new Error(`The local copy of ${image.name} is no longer available. Add it again to continue.`);
      const claimed = await claimGuestImage({ userId: user.id, projectId: cloudProject.id, assetId: image.id, name: stored.name, blob: stored.blob, contentType: stored.mimeType });
      return { ...image, id: claimed.assetId, url: claimed.url, storagePath: claimed.storagePath, checksum: claimed.checksum, assetKey: undefined };
    }));
    if (images.some((image) => image.source === "url" && !image.storagePath)) images = await mirrorProductImages(cloudProject.id, images);
    const claimed = await syncCreatorProject({ ...cloudProject, product: { ...cloudProject.product, images } }, user.id);
    if (requestedDraft || candidate.product.images.some((image) => image.assetKey)) await deleteGuestDraft(candidate.id);
    return claimed;
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
    if (!qaMode && (!quoteLoaded || !quote)) {
      setSourceError(quoteError || "Live pricing is still loading. Try again in a moment.");
      return;
    }
    if (!qaMode && !user) {
      const pendingGenerationId = project.pendingGenerationId || crypto.randomUUID();
      const pendingProject = { ...project, pendingGenerationId, pendingQuoteCredits: quote!.credits };
      setProject(pendingProject);
      await saveGuestDraft(projectToCreationDraft(pendingProject, true, "auth_required"));
      setAuthGateOpen(true);
      return;
    }
    setSourceBusy(true);
    let claimedProject: CreatorProject;
    try {
      claimedProject = await claimGuestProject(project);
      setProject(claimedProject);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "We could not securely save your product images. Your local draft is unchanged.");
      setSourceBusy(false);
      return;
    }
    setSourceBusy(false);
    const renderProject = ratioOverride ? { ...claimedProject, aspectRatio: ratioOverride } : claimedProject;
    setProject((current) => ({ ...current, aspectRatio: renderProject.aspectRatio, status: "generating", videoUrl: ratioOverride ? null : current.videoUrl, lastError: null }));
    setGenerationProgress(8);
    setGenerationMessage(GENERATION_STATES[0]);
    setStep("generating");
    setExportOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (qaMode) {
      runQaGeneration();
      return;
    }

    try {
      const generation = await startCreatorGeneration({ projectId: renderProject.id, projectVersionId: renderProject.versionId!, quoteId: quote!.quoteId, idempotencyKey: renderProject.pendingGenerationId || crypto.randomUUID(), mode: "template", prompt: buildTemplatePrompt(renderProject), capability: "video.product_fidelity", options: { aspect_ratio: renderProject.aspectRatio === "4:5" ? "3:4" : renderProject.aspectRatio, duration: Math.min(15, template.duration), resolution: renderProject.resolution, audio: renderProject.audio }, referenceImages: renderProject.product.images.map((image) => image.url), rightsAttested: rightsConfirmed, metadata: { creator_project_id: renderProject.id, template_id: renderProject.templateId, language: renderProject.language, market: renderProject.market } });
      setProject((current) => ({ ...current, jobId: generation.job.id, renderRunId: generation.runId, status: "generating" }));
      setGenerationProgress(18);
      setGenerationMessage("Your campaign is queued securely");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't start this render.";
      setProject((current) => ({ ...current, status: "failed", lastError: message }));
      setSourceError(`${message} Your project is saved — you can try again.`);
      setStep("details");
    }
  };
  startGenerationRef.current = startGeneration;

  useEffect(() => {
    if (qaMode || !user || !shouldResumeGeneration || draftRestoring || !quoteLoaded || !quote || resumedGeneration.current) return;
    if (!project.pendingGenerationId || !rightsConfirmed || !project.product.images.length || step !== "details") return;
    if (project.pendingQuoteCredits != null && project.pendingQuoteCredits !== quote.credits) {
      resumedGeneration.current = true;
      setSourceError(`The generation price changed from ${project.pendingQuoteCredits} to ${quote.credits} credits. Review the new price, then select Generate video again.`);
      return;
    }
    resumedGeneration.current = true;
    void startGenerationRef.current();
  }, [draftRestoring, project.pendingGenerationId, project.pendingQuoteCredits, project.product.images.length, qaMode, quote, quoteLoaded, rightsConfirmed, shouldResumeGeneration, step, user]);

  const cancelGeneration = async () => {
    generationCancelled.current = true;
    if (project.jobId && !qaMode) {
      try { if (project.renderRunId) await cancelCreatorGeneration(project.renderRunId); else await cancelVideoJob(project.jobId); } catch { /* job may already be finishing */ }
    }
    setProject((current) => ({ ...current, status: "ready", jobId: null }));
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
    if (!project.videoUrl) return;
    try {
      const response = await fetch(project.videoUrl);
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
      window.open(project.videoUrl, "_blank", "noopener,noreferrer");
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

  if (step === "generating") {
    return (
      <CreatorShell qaMode={qaMode}>
        <Seo title="Creating your campaign · MovPrompt" description="MovPrompt is creating your template-based campaign." noindex />
        <section className="creator-generation" aria-live="polite" aria-busy="true">
          <div className="creator-generation-inner">
            <div className="creator-generation-preview">
              <img src={project.product.images[0]?.url || template.poster} alt="Your product preview" />
              <div className="creator-generation-scan" aria-hidden="true" />
            </div>
            <p className="creator-kicker">{template.name}</p>
            <h1>Building your campaign</h1>
            <p>You can leave this screen safely. Your project is saved and the render will continue in the background.</p>
            <div className="creator-generation-progress" role="progressbar" aria-label="Campaign generation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}>
              <span style={{ width: `${generationProgress}%` }} />
            </div>
            <div className="creator-generation-status">{generationMessage} · {generationProgress}%</div>
            <button className="creator-button creator-button-quiet" type="button" onClick={cancelGeneration}>Cancel generation</button>
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
              <button className="creator-icon-button" type="button" onClick={() => navigate(qaMode ? "/qa/create?view=projects" : "/projects")} aria-label="Back to projects"><ArrowLeft aria-hidden="true" /></button>
              <div><strong>{project.title}</strong><div className="creator-save-state">Saved just now</div></div>
            </div>
            <div className="creator-editor-actions">
              <button className="creator-icon-button" type="button" onClick={undo} disabled={!undoStack.length} aria-label="Undo"><Undo2 aria-hidden="true" /></button>
              <button className="creator-icon-button" type="button" onClick={redo} disabled={!redoStack.length} aria-label="Redo"><Redo2 aria-hidden="true" /></button>
              <button className="creator-button creator-button-secondary" type="button" onClick={() => void startGeneration() }><RefreshCw aria-hidden="true" /> Render updates</button>
              <button className="creator-button creator-button-primary" type="button" onClick={() => setExportOpen(true)}><Download aria-hidden="true" /> Export</button>
            </div>
          </div>

          <div className="creator-editor-grid">
            <aside className="creator-panel creator-scenes-panel" aria-label="Video scenes">
              <div className="creator-panel-label">Scenes · {project.scenes.reduce((sum, scene) => sum + scene.duration, 0)} seconds</div>
              <div className="creator-scene-list">
                {project.scenes.map((scene, index) => (
                  <button key={scene.id} type="button" className={cn("creator-scene-card", scene.id === activeScene?.id && "is-selected")} onClick={() => { setActiveSceneId(scene.id); setInspectorTab("scene"); }} aria-pressed={scene.id === activeScene?.id}>
                    <span className="creator-scene-number">{index + 1}</span>
                    <span><strong>{scene.title}</strong><span>{scene.headline} · {scene.duration}s</span></span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="creator-stage" aria-label="Video preview">
              <div className="creator-video-frame" data-ratio={project.aspectRatio}>
                {project.videoUrl ? <video ref={videoRef} key={project.videoUrl} src={project.videoUrl} poster={template.poster} playsInline autoPlay loop muted={previewMuted} /> : <img src={template.poster} alt="Campaign preview" />}
                <div className="creator-video-overlay" data-rtl={isRtl}>
                  <small>{project.product.brand || template.eyebrow}</small>
                  <h2>{activeScene?.headline}</h2>
                  <p>{activeScene?.purpose}</p>
                </div>
                {project.videoUrl && <div className="creator-preview-controls"><button type="button" onClick={() => void togglePreviewPlayback()} aria-label={previewPlaying ? "Pause preview" : "Play preview"}>{previewPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button><button type="button" onClick={() => setPreviewMuted((muted) => !muted)} aria-label={previewMuted ? "Turn preview sound on" : "Mute preview"}>{previewMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button></div>}
              </div>
              <span className="creator-stage-note">Preview overlays update instantly. Scene imagery updates after rendering.</span>
            </section>

            <aside className="creator-panel creator-inspector" aria-label="Editing controls">
              <div className="creator-inspector-tabs" role="tablist" aria-label="Editing sections">
                {(["scene", "brand", "format"] as const).map((tab) => (
                  <button key={tab} type="button" role="tab" aria-selected={inspectorTab === tab} className={cn("creator-inspector-tab", inspectorTab === tab && "is-active")} onClick={() => setInspectorTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
                ))}
              </div>

              {inspectorTab === "scene" && activeScene && (
                <>
                  <div className="creator-field"><label htmlFor="scene-headline">On-screen headline</label><input id="scene-headline" className="creator-input" value={activeScene.headline} onChange={(event) => updateScene(activeScene.id, { headline: event.target.value })} maxLength={70} /></div>
                  <div className="creator-field"><label htmlFor="scene-direction">What happens in this scene</label><textarea id="scene-direction" className="creator-textarea" value={activeScene.direction} onChange={(event) => updateScene(activeScene.id, { direction: event.target.value })} /></div>
                  <div className="creator-field"><label>Scene length</label><div className="creator-duration-control"><button type="button" onClick={() => updateScene(activeScene.id, { duration: Math.max(1, activeScene.duration - 1) }, true)} aria-label="Shorten scene"><Minus aria-hidden="true" /></button><span>{activeScene.duration} {activeScene.duration === 1 ? "second" : "seconds"}</span><button type="button" onClick={() => updateScene(activeScene.id, { duration: Math.min(5, activeScene.duration + 1) }, true)} aria-label="Lengthen scene"><Plus aria-hidden="true" /></button></div></div>
                  <div className="creator-scene-actions"><button className="creator-button creator-button-secondary" type="button" onClick={() => moveScene(activeScene.id, -1)} disabled={project.scenes[0]?.id === activeScene.id}><ChevronUp aria-hidden="true" /> Earlier</button><button className="creator-button creator-button-secondary" type="button" onClick={() => moveScene(activeScene.id, 1)} disabled={project.scenes.at(-1)?.id === activeScene.id}><ChevronDown aria-hidden="true" /> Later</button></div>
                </>
              )}

              {inspectorTab === "brand" && (
                <>
                  <div className="creator-field"><label htmlFor="editor-language">Campaign language</label><select id="editor-language" className="creator-select" value={project.language} onChange={(event) => updateProject({ language: event.target.value as CreatorLanguage })}><option value="en">English</option><option value="ar">Arabic</option><option value="bilingual">Arabic + English</option></select></div>
                  <div className="creator-field"><label htmlFor="editor-cta">Call to action</label><select id="editor-cta" className="creator-select" value={project.cta} onChange={(event) => updateProject({ cta: event.target.value })}>{CTA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></div>
                  <div className="creator-field"><label htmlFor="editor-offer">Offer</label><input id="editor-offer" className="creator-input" value={project.offer} onChange={(event) => updateProject({ offer: event.target.value })} placeholder="Optional — e.g. 20% off today" /></div>
                  <div className="creator-field"><label htmlFor="editor-color">Brand colour</label><input id="editor-color" className="creator-input" type="color" value={project.brandColor} onChange={(event) => updateProject({ brandColor: event.target.value })} /></div>
                </>
              )}

              {inspectorTab === "format" && (
                <>
                  <div className="creator-field"><label>Video format</label><div className="creator-choice-grid">{(["9:16", "1:1", "16:9"] as CreatorAspectRatio[]).map((ratio) => <button key={ratio} type="button" className={cn("creator-choice", project.aspectRatio === ratio && "is-selected")} onClick={() => updateProject({ aspectRatio: ratio })}>{ratio}</button>)}</div></div>
                  <div className="creator-field"><label htmlFor="editor-quality">Quality</label><select id="editor-quality" className="creator-select" value={project.resolution} onChange={(event) => updateProject({ resolution: event.target.value as "720p" | "1080p" })}><option value="1080p">1080p · Recommended</option><option value="720p">720p · Uses fewer credits</option></select></div>
                  <div className="creator-check-row"><input id="editor-subtitles" type="checkbox" checked={project.subtitles} onChange={(event) => updateProject({ subtitles: event.target.checked })} /><label htmlFor="editor-subtitles">Include subtitles when the video contains speech.</label></div>
                  <div className="creator-check-row"><input id="editor-audio" type="checkbox" checked={project.audio} onChange={(event) => updateProject({ audio: event.target.checked })} /><label htmlFor="editor-audio">Generate music and sound for this version.</label></div>
                </>
              )}

              <div className="creator-change-box">
                <div className="creator-change-box-header"><WandSparkles aria-hidden="true" /> Make a change in plain language</div>
                <textarea className="creator-textarea" value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} placeholder="Try “show the product earlier” or “make the opening faster”" aria-label="Describe a change" />
                <button className="creator-button creator-button-primary" type="button" onClick={applyChangeRequest} disabled={!changeRequest.trim()} style={{ width: "100%", marginTop: 9 }}><Send aria-hidden="true" /> Apply change</button>
              </div>
            </aside>
          </div>
        </div>

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="creator-export-panel left-auto right-0 top-0 translate-x-0 translate-y-0 max-w-[460px] max-h-none h-full rounded-none border-0 gap-0 p-6">
            <div className="creator-export-head"><div><DialogTitle>Export campaign</DialogTitle><DialogDescription>Choose where this version will be published.</DialogDescription></div></div>
            <div className="creator-export-options">
              {EXPORT_PRESETS.map((preset) => (
                <button key={preset.ratio} type="button" className={cn("creator-export-option", selectedExport === preset.ratio && "is-selected")} onClick={() => setSelectedExport(preset.ratio)}>
                  <span className="creator-ratio-icon">{preset.ratio}</span>
                  <span><strong>{preset.title}</strong><span>{preset.detail}</span></span>
                  {selectedExport === preset.ratio && <CheckCircle2 className="creator-export-check" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="creator-summary-list" style={{ marginTop: 24 }}><div className="creator-summary-row"><span>File</span><strong>MP4 · H.264</strong></div><div className="creator-summary-row"><span>Quality</span><strong>{project.resolution}</strong></div><div className="creator-summary-row"><span>Audio</span><strong>{project.audio ? "Included" : "Muted"}</strong></div></div>
            {selectedExport === "4:5" && <p className="creator-field-help" style={{ marginTop: 16 }}>Portrait export uses a 3:4 generation canvas and preserves the 4:5 safe area.</p>}
            {selectedExport === project.aspectRatio && project.videoUrl ? (
              <button className="creator-button creator-button-primary" type="button" onClick={downloadVideo} style={{ width: "100%", marginTop: 24 }}><Download aria-hidden="true" /> Download {selectedExportMeta.ratio}</button>
            ) : (
              <button className="creator-button creator-button-primary" type="button" onClick={() => void startGeneration(selectedExport)} style={{ width: "100%", marginTop: 24 }}><Sparkles aria-hidden="true" /> Create {selectedExport} version</button>
            )}
          </DialogContent>
        </Dialog>
      </CreatorShell>
    );
  }

  return (
    <CreatorShell qaMode={qaMode}>
      <Seo title="Create a video · MovPrompt" description="Turn a product, business link or photos into a ready-to-post Kuwait campaign with a guided MovPrompt template." path="/create" noindex />
      {draftRestoring ? <div className="creator-page"><div className="creator-empty" role="status"><Loader2 className="animate-spin" aria-hidden="true" /><p>Restoring your campaign…</p></div></div> : <div className="creator-page">
        <header className="creator-page-head">
          <div>
            <p className="creator-kicker">Create with a template</p>
            <h1 className="creator-title creator-title-sm">{step === "template" ? (project.product.images.length ? `Choose the best format for this ${project.promotionKind === "business" ? "service" : "product"}.` : "Choose the result you want.") : step === "source" ? "What are you promoting?" : "Review the campaign."}</h1>
            <p className="creator-subtitle">{step === "template" ? (project.product.images.length ? `MovPrompt keeps your ${project.promotionKind === "business" ? "business" : "product"} facts while you compare proven campaign outcomes.` : "Start from a proven campaign structure. You can still change the copy, branding and individual scenes later.") : step === "source" ? "Add a product page, business website or clear photos. You will confirm every imported fact before generation." : "A few final details help MovPrompt create the right version for Kuwait."}</p>
            <button className="creator-mode-switch" type="button" onClick={() => void switchToAdvanced()} disabled={modeSwitching}>
              <span className="creator-mode-switch-icon"><SlidersHorizontal aria-hidden="true" /></span>
              <span className="creator-mode-switch-copy">
                <strong>{modeSwitching ? "Opening Advanced Mode…" : "Switch to Advanced"}</strong>
                <small>{project.product.images.length ? "Your product and campaign settings come with you." : "Use prompts, references and detailed render controls."}</small>
              </span>
              {modeSwitching ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </button>
          </div>
          <Progress current={step} steps={flowSteps} />
        </header>

        {step === "template" && <TemplateGrid selectedId={project.templateId} onSelect={selectTemplate} />}

        {step === "source" && (
          <div className="creator-workspace">
            <section className="creator-panel creator-panel-pad" aria-labelledby="source-heading">
              <div className="creator-panel-heading"><div><h2 id="source-heading">Campaign source</h2><p>Choose one starting point. We only use facts you review and approve.</p></div><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep("template")}><ArrowLeft aria-hidden="true" /> Change template</button></div>
              <div className="creator-source-tabs" role="tablist" aria-label="Campaign source" onKeyDown={handleSourceTabKey}>
                <button id="source-product-tab" role="tab" aria-controls="source-link-panel" aria-selected={sourceTab === "product"} tabIndex={sourceTab === "product" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "product" && "is-active")} type="button" onClick={() => chooseSourceTab("product")}>Product link</button>
                <button id="source-business-tab" role="tab" aria-controls="source-link-panel" aria-selected={sourceTab === "business"} tabIndex={sourceTab === "business" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "business" && "is-active")} type="button" onClick={() => chooseSourceTab("business")}>Business or service</button>
                <button id="source-upload-tab" role="tab" aria-controls="source-upload-panel" aria-selected={sourceTab === "upload"} tabIndex={sourceTab === "upload" ? 0 : -1} className={cn("creator-source-tab", sourceTab === "upload" && "is-active")} type="button" onClick={() => chooseSourceTab("upload")}>Upload photos</button>
              </div>

              {sourceTab !== "upload" ? (
                <div id="source-link-panel" role="tabpanel" aria-labelledby={sourceTab === "business" ? "source-business-tab" : "source-product-tab"} style={{ marginTop: 22 }}>
                  <div className="creator-field"><label htmlFor="source-url">{sourceTab === "business" ? "Business or service website" : "Product page"}</label><div className="creator-input-row"><input id="source-url" className="creator-input" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder={sourceTab === "business" ? "https://yoursalon.com" : "https://yourstore.com/product"} inputMode="url" aria-describedby={sourceError ? "source-error" : "source-url-help"} /><button className="creator-button creator-button-primary" type="button" onClick={scanSource} disabled={sourceBusy}>{sourceBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />} Import</button></div><span id="source-url-help" className="creator-field-help">{sourceTab === "business" ? "We’ll look for the business name, description and public images. You will confirm location and booking details next." : "We’ll look for the product name, description, price and up to five clear images."}</span></div>
                  {sourceTab === "product" && <div className="creator-upload-zone" style={{ minHeight: 150, marginTop: 20 }}><button className="creator-button creator-button-quiet" type="button" onClick={useSampleProduct}><Sparkles aria-hidden="true" /> Or try a sample product</button></div>}
                  {sourceTab === "business" && <div className="creator-import-note" role="note"><strong>Business facts stay locked</strong><span>MovPrompt will not invent qualifications, prices, treatment results or service claims.</span></div>}
                </div>
              ) : (
                <div id="source-upload-panel" role="tabpanel" aria-labelledby="source-upload-tab" className="creator-upload-zone">
                  <label htmlFor="product-files"><span className="creator-upload-icon"><Upload aria-hidden="true" /></span><strong>Drop product or business photos here</strong><span>JPG, PNG or WebP · up to 5 images · 12 MB each</span></label>
                  <input id="product-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void uploadFiles(event.target.files)} />
                </div>
              )}
              {sourceBusy && <p className="creator-field-help" role="status" style={{ marginTop: 12 }}>Preparing your product images…</p>}
              {sourceError && <p id="source-error" className="creator-error" role="alert">{sourceError}</p>}
              <div className="creator-actions-row"><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep("template")}><ArrowLeft aria-hidden="true" /> Back</button><button className="creator-button creator-button-primary" type="button" onClick={continueFromSource} disabled={!project.product.images.length}>Review campaign <ArrowRight aria-hidden="true" /></button></div>
            </section>

            <aside className="creator-panel creator-product-card" aria-label={`Imported ${project.promotionKind} preview`}>
              <div className="creator-product-image">{project.product.images[0] ? <img src={project.product.images[0].url} alt={project.product.name || `Imported ${project.promotionKind}`} /> : <div className="creator-empty" style={{ minHeight: "100%", border: 0, borderRadius: 0 }}><div><span className="creator-empty-icon"><FileImage aria-hidden="true" /></span><p>Your selected {project.promotionKind === "business" ? "business or service" : "product"} will appear here.</p></div></div>}</div>
              <div className="creator-product-copy"><p className="creator-kicker">{project.promotionKind === "business" ? "Business campaign" : template.name}</p><h3>{project.product.name || `No ${project.promotionKind} added yet`}</h3><p>{project.product.description || `Add a link or photos to prepare your ${project.promotionKind === "business" ? "booking" : "product"} campaign.`}</p>{project.product.images.length > 0 && <div className="creator-image-strip">{project.product.images.map((image) => <span className="creator-image-thumb" key={image.id}><img src={image.url} alt="" /></span>)}</div>}</div>
            </aside>
          </div>
        )}

        {step === "details" && (
          <div className="creator-workspace">
            <section className="creator-panel creator-panel-pad" aria-labelledby="campaign-heading">
              <div className="creator-panel-heading"><div><h2 id="campaign-heading">Campaign details</h2><p>Keep it simple. You can refine these details in the editor.</p></div></div>
              <div className="creator-form-grid">
                <div className="creator-field"><label htmlFor="product-name">{project.promotionKind === "business" ? "Business or service name" : "Product name"}</label><input id="product-name" className="creator-input" value={project.product.name} onChange={(event) => updateProject({ product: { ...project.product, name: event.target.value }, title: `${event.target.value || "Untitled"} — ${template.name}` })} /></div>
                <div className="creator-field"><label htmlFor="brand-name">{project.promotionKind === "business" ? "Business name" : "Brand"}</label><input id="brand-name" className="creator-input" value={project.product.brand} onChange={(event) => updateProject({ product: { ...project.product, brand: event.target.value } })} placeholder="Optional" /></div>
                <div className="creator-field"><label htmlFor="market">Market</label><select id="market" className="creator-select" value={project.market} onChange={(event) => updateProject({ market: event.target.value as CreatorMarket })}>{Object.entries(MARKET_META).map(([code, meta]) => <option key={code} value={code}>{meta.label} · {meta.currency}</option>)}</select></div>
                <div className="creator-field"><label htmlFor="language">Language</label><select id="language" className="creator-select" value={project.language} onChange={(event) => updateProject({ language: event.target.value as CreatorLanguage })}><option value="en">English</option><option value="ar">Arabic</option><option value="bilingual">Arabic + English</option></select></div>
                <div className="creator-field"><label htmlFor="price">Price</label><input id="price" className="creator-input" value={project.product.price} onChange={(event) => updateProject({ product: { ...project.product, price: event.target.value } })} placeholder={`Optional · ${MARKET_META[project.market].currency}`} /></div>
                <div className="creator-field"><label htmlFor="offer">Offer</label><input id="offer" className="creator-input" value={project.offer} onChange={(event) => updateProject({ offer: event.target.value })} placeholder="Optional · e.g. 20% off today" /></div>
                <div className="creator-field"><label htmlFor="cta">Call to action</label><select id="cta" className="creator-select" value={project.cta} onChange={(event) => updateProject({ cta: event.target.value })}>{CTA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></div>
                <div className="creator-field"><label htmlFor="brand-colour">Brand colour</label><input id="brand-colour" className="creator-input" type="color" value={project.brandColor} onChange={(event) => updateProject({ brandColor: event.target.value })} /></div>
                {project.promotionKind === "business" && <div className="creator-field"><label htmlFor="location">Kuwait location</label><input id="location" className="creator-input" value={project.location} onChange={(event) => updateProject({ location: event.target.value })} placeholder="Area and branch, if relevant" /></div>}
                {project.promotionKind === "business" && <div className="creator-field"><label htmlFor="booking-url">Booking link</label><input id="booking-url" className="creator-input" inputMode="url" value={project.bookingUrl} onChange={(event) => updateProject({ bookingUrl: event.target.value })} placeholder="Optional · https://…" /></div>}
                <div className="creator-field"><label htmlFor="whatsapp">WhatsApp number</label><input id="whatsapp" className="creator-input" inputMode="tel" value={project.whatsapp} onChange={(event) => updateProject({ whatsapp: event.target.value })} placeholder="Optional · +965 0000 0000" /></div>
              </div>
              <div className="creator-check-row"><input id="rights" type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><label htmlFor="rights">I own these images or have permission to use them in advertising, and the campaign details above are accurate.</label></div>
              {sourceError && <p className="creator-error" role="alert">{sourceError}</p>}
              <div className="creator-actions-row"><button className="creator-button creator-button-quiet" type="button" onClick={() => setStep(templateFirst.current ? "source" : "template")}><ArrowLeft aria-hidden="true" /> Back</button><button className="creator-button creator-button-primary" type="button" onClick={() => void startGeneration()} disabled={!project.product.name.trim() || !rightsConfirmed || (!qaMode && (!quoteLoaded || !quote)) || sourceBusy}><Sparkles aria-hidden="true" /> Generate video</button></div>
            </section>

            <aside className="creator-panel creator-panel-pad" aria-label="Generation summary">
              <p className="creator-kicker">Ready to create</p>
              <div className="creator-product-image" style={{ borderRadius: 14, overflow: "hidden" }}><img src={project.product.images[0]?.url} alt={project.product.name} /></div>
              <div className="creator-summary-list" style={{ marginTop: 16 }}><div className="creator-summary-row"><span>Template</span><strong>{template.name}</strong></div><div className="creator-summary-row"><span>Outcome</span><strong>{project.goal === "bookings" ? "Get bookings" : project.goal === "whatsapp_orders" ? "Get WhatsApp orders" : "Launch campaign"}</strong></div><div className="creator-summary-row"><span>Market</span><strong>{MARKET_META[project.market].label}</strong></div><div className="creator-summary-row"><span>Language</span><strong>{project.language === "bilingual" ? "Arabic + English" : project.language === "ar" ? "Arabic" : "English"}</strong></div><div className="creator-summary-row"><span>Format</span><strong>{project.aspectRatio} · {project.resolution}</strong></div></div>
              <div className="creator-cost-box">
                {quote ? <><small>{quote.entitlementEligible ? "Starter render eligible" : "Confirmed generation price"}</small><strong>{quote.entitlementEligible ? `Included for eligible new accounts · otherwise ${quote.credits} credits` : `${quote.credits} credits`} · usually 2–5 minutes</strong></> : <><small>Live pricing unavailable</small><strong>{qaMode ? "Development preview — no credits charged" : "Generation is disabled until pricing reconnects"}</strong></>}
              </div>
            </aside>
          </div>
        )}
      </div>}
      <AuthGateDialog open={authGateOpen} onOpenChange={setAuthGateOpen} returnPath={`/create?draft=${encodeURIComponent(project.id)}&resume=generate`} />
    </CreatorShell>
  );
}
