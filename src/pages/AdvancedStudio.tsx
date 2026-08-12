import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Expand,
  Focus,
  Frame,
  ImagePlus,
  Lightbulb,
  Loader2,
  Maximize2,
  Mic2,
  MoreVertical,
  Move3D,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Upload,
  Volume2,
  WandSparkles,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { startCreatorGeneration } from "@/lib/director/api";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { AuthGateDialog } from "@/features/create/AuthGateDialog";
import { CreatorShell } from "@/features/create/CreatorShell";
import { estimateGenerationQuote, GUEST_DRAFT_TTL_MS, type ApprovedCapability, type CreationDraft, type GenerationQuote } from "@/features/create/contracts";
import { getGuestAsset, getGuestDraft, putGuestAsset, saveGuestDraft } from "@/features/create/guestDraftStore";
import type { CreatorAspectRatio } from "@/features/create/types";

type DirectorOption<T extends string> = { id: T; label: string; icon: LucideIcon };
type ReferenceAsset = { id: string; name: string; url: string; assetKey?: string; role: "Style" | "Lighting" | "Setting" | "Motion" };

const CAMERA_OPTIONS: Array<DirectorOption<"push-in" | "orbit" | "handheld" | "static">> = [
  { id: "push-in", label: "Push in", icon: Focus },
  { id: "orbit", label: "Orbit", icon: RotateCcw },
  { id: "handheld", label: "Handheld", icon: Waves },
  { id: "static", label: "Static", icon: Camera },
];

const SHOT_OPTIONS: Array<DirectorOption<"macro" | "close" | "medium" | "wide">> = [
  { id: "macro", label: "Macro", icon: Aperture },
  { id: "close", label: "Close", icon: Focus },
  { id: "medium", label: "Medium", icon: Frame },
  { id: "wide", label: "Wide", icon: Expand },
];

const LIGHTING_OPTIONS = ["Studio rim", "Soft daylight", "Golden hour", "Night contrast"] as const;
const FIDELITY_OPTIONS = ["Exact", "Strong", "Flexible"] as const;
const MOTION_OPTIONS = ["Calm", "Natural", "Dynamic"] as const;
const RATIOS: CreatorAspectRatio[] = ["9:16", "1:1", "4:5", "16:9"];

function readSetting<T>(draft: CreationDraft | null, key: string, fallback: T): T {
  return (draft?.advanced?.renderSettings?.[key] as T | undefined) ?? fallback;
}

export default function AdvancedStudio() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedDraft = searchParams.get("draft");
  const fromTemplate = searchParams.get("from") === "template";
  const resume = searchParams.get("resume") === "generate";
  const [draftId] = useState(() => requestedDraft || crypto.randomUUID());
  const [versionId] = useState(() => crypto.randomUUID());
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(8);
  const [ratio, setRatio] = useState<CreatorAspectRatio>("9:16");
  const [capability, setCapability] = useState<ApprovedCapability>("video.seedance.latest");
  const [cameraMove, setCameraMove] = useState<(typeof CAMERA_OPTIONS)[number]["id"]>("push-in");
  const [shotType, setShotType] = useState<(typeof SHOT_OPTIONS)[number]["id"]>("macro");
  const [motion, setMotion] = useState<(typeof MOTION_OPTIONS)[number]>("Natural");
  const [lighting, setLighting] = useState<(typeof LIGHTING_OPTIONS)[number]>("Studio rim");
  const [fidelity, setFidelity] = useState<(typeof FIDELITY_OPTIONS)[number]>("Exact");
  const [audio, setAudio] = useState(true);
  const [rights, setRights] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sourceDraft, setSourceDraft] = useState<CreationDraft | null>(null);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [selectedDirection, setSelectedDirection] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(!requestedDraft);
  const resumed = useRef(false);
  const generateRef = useRef<() => Promise<void>>(async () => undefined);
  const fallbackQuote = useMemo(() => estimateGenerationQuote(duration, true), [duration]);
  const [quote, setQuote] = useState<GenerationQuote>(fallbackQuote);

  const productImage = sourceDraft?.product.images[0]?.url || "/create/sample-kinza.jpg";
  const projectName = sourceDraft?.product.name ? `${sourceDraft.product.name} Campaign` : "Untitled direction";
  const templatePath = requestedDraft ? `/create?draft=${encodeURIComponent(draftId)}` : "/create";
  const directionImages = [productImage, "/homepage/hero-creator.png", "/homepage/hero-lifestyle.png", "/homepage/template-texture-study.png"];
  const directionLabels = ["Hero", "Creator", "Lifestyle", "Macro"];

  useEffect(() => {
    let active = true;
    void supabase.functions.invoke("generation-quote", { body: { capability, duration_seconds: duration } }).then(({ data, error }) => {
      if (!active) return;
      setQuote(!error && data?.quoteId ? data as GenerationQuote : fallbackQuote);
    });
    return () => { active = false; };
  }, [capability, duration, fallbackQuote, user?.id]);

  useEffect(() => {
    if (!requestedDraft) return;
    void getGuestDraft(requestedDraft).then(async (draft) => {
      if (!draft) {
        setHydrated(true);
        return;
      }
      setSourceDraft(draft);
      setPrompt(draft.advanced?.prompt || "");
      setCapability(draft.advanced?.capability || "video.seedance.latest");
      setDuration(Number(readSetting(draft, "duration", 8)));
      setRatio(readSetting(draft, "ratio", draft.campaign.aspectRatio));
      setCameraMove(readSetting(draft, "camera", "push-in"));
      setShotType(readSetting(draft, "shot", "macro"));
      setMotion(readSetting(draft, "motion", "Natural"));
      setLighting(readSetting(draft, "lighting", "Studio rim"));
      setFidelity(readSetting(draft, "fidelity", "Exact"));
      setAudio(readSetting(draft, "audio", draft.campaign.audio));
      setRights(Boolean(draft.rightsAttestation?.confirmed));
      setPendingId(draft.pendingGenerationId || null);
      const hydratedReferences = await Promise.all((draft.advanced?.references || []).slice(0, 4).map(async (reference, index) => {
        const stored = await getGuestAsset(reference);
        return stored
          ? { id: reference, name: stored.name, url: URL.createObjectURL(stored.blob), assetKey: reference, role: (index === 0 ? "Style" : index === 1 ? "Lighting" : "Setting") as ReferenceAsset["role"] }
          : { id: reference, name: `Reference ${index + 1}`, url: reference, role: (index === 0 ? "Style" : index === 1 ? "Lighting" : "Setting") as ReferenceAsset["role"] };
      }));
      setReferences(hydratedReferences.filter((reference) => /^blob:|^https?:|^\//.test(reference.url)));
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [requestedDraft]);

  const makeDraft = useCallback((status: CreationDraft["status"]): CreationDraft => {
    const now = new Date();
    const product = sourceDraft?.product ?? { sourceType: null, sourceUrl: "", name: "Advanced video", description: "", price: "", brand: "", images: [] };
    const campaign = sourceDraft?.campaign ?? { market: "KW", language: "en", offer: "", cta: "Learn more", brandColor: "#d49737", aspectRatio: "9:16", resolution: "1080p", subtitles: false, audio: true };
    return {
      id: draftId,
      mode: "advanced",
      status,
      templateVersionId: sourceDraft?.templateVersionId,
      product,
      assetKeys: [...(sourceDraft?.assetKeys ?? []), ...references.flatMap((reference) => reference.assetKey ? [reference.assetKey] : [])],
      campaign: { ...campaign, aspectRatio: ratio, audio },
      advanced: {
        capability,
        prompt,
        references: references.map((reference) => reference.assetKey || reference.url),
        renderSettings: { duration, ratio, camera: cameraMove, shot: shotType, motion, lighting, fidelity, audio },
      },
      rightsAttestation: { confirmed: rights, confirmedAt: rights ? now.toISOString() : undefined, version: "2026-08-11" },
      pendingGenerationId: pendingId || undefined,
      returnPath: `/advanced?draft=${draftId}`,
      createdAt: sourceDraft?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + GUEST_DRAFT_TTL_MS).toISOString(),
    };
  }, [audio, cameraMove, capability, draftId, duration, fidelity, lighting, motion, pendingId, prompt, ratio, references, rights, shotType, sourceDraft]);

  useEffect(() => {
    if (!hydrated || (!prompt.trim() && !sourceDraft?.product.images.length && !references.length)) return;
    const timer = window.setTimeout(() => { void saveGuestDraft(makeDraft("editing")); }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, makeDraft, prompt, references.length, sourceDraft?.product.images.length]);

  const directorPrompt = () => [
    prompt.trim(),
    `Camera: ${cameraMove}. Shot: ${shotType}. Motion: ${motion.toLowerCase()}. Lighting: ${lighting}.`,
    `Product fidelity: ${fidelity}. ${fidelity === "Exact" ? "Keep the supplied product shape, label, colours and proportions unchanged." : "Respect the supplied product identity."}`,
  ].filter(Boolean).join("\n\n");

  const improveDirection = () => {
    const product = sourceDraft?.product.name || "the product";
    const improved = `A premium ${shotType} product shot of ${product}. ${cameraMove === "push-in" ? "Slow cinematic push-in" : `${cameraMove} camera movement`}, ${motion.toLowerCase()} pacing, ${lighting.toLowerCase()} lighting. Keep the product label, shape and colours exact.`;
    setPrompt(improved);
    toast.success("Direction prepared. You can edit every word before generating.");
  };

  const addReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, Math.max(0, 4 - references.length));
    try {
      const next = await Promise.all(selected.map(async (file, index) => {
        if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) throw new Error("Use JPG, PNG or WebP images up to 12 MB.");
        const assetKey = await putGuestAsset(draftId, file);
        return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), assetKey, role: (index === 0 ? "Style" : "Lighting") as ReferenceAsset["role"] };
      }));
      setReferences((current) => [...current, ...next].slice(0, 4));
      toast.success(`${next.length} visual reference${next.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The references could not be added.");
    }
  };

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe the shot or choose Improve direction first.");
      return;
    }
    if (!rights) {
      toast.error("Confirm that you have permission to use these assets.");
      return;
    }
    const operationId = pendingId || crypto.randomUUID();
    setPendingId(operationId);
    if (!user) {
      await saveGuestDraft({ ...makeDraft("auth_required"), pendingGenerationId: operationId });
      setAuthOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const title = sourceDraft?.product.name || prompt.slice(0, 64) || "Advanced video";
      const { error: projectError } = await supabase.from("creator_projects").upsert({ id: draftId, user_id: user.id, title, mode: "advanced", status: "ready", updated_at: now });
      if (projectError) throw projectError;
      const configuration = { id: draftId, versionId, mode: "advanced", prompt: directorPrompt(), capability, duration, ratio, cameraMove, shotType, motion, lighting, fidelity, sourceTemplateVersionId: sourceDraft?.templateVersionId, rightsAttestation: { confirmed: true, confirmedAt: now } };
      const { error: versionError } = await supabase.from("creator_project_versions").upsert({ id: versionId, project_id: draftId, user_id: user.id, mode: "advanced", version_number: 1, configuration: configuration as unknown as Json, product_recipe: (sourceDraft?.product ?? {}) as unknown as Json, campaign_recipe: (sourceDraft?.campaign ?? { ratio }) as unknown as Json });
      if (versionError) throw versionError;
      await supabase.from("creator_projects").update({ current_accepted_version_id: versionId }).eq("id", draftId).eq("user_id", user.id);
      const referenceImages = [...(sourceDraft?.product.images.map((image) => image.url) ?? []), ...references.map((reference) => reference.url)];
      const generation = await startCreatorGeneration({ projectId: draftId, projectVersionId: versionId, quoteId: quote.quoteId, idempotencyKey: operationId, mode: "advanced", prompt: directorPrompt(), capability: capability as "video.seedance.latest" | "video.omni_flash.latest", options: { duration, aspect_ratio: ratio, resolution: "1080p", audio }, referenceImages, rightsAttested: true, metadata: { advanced_flow: true, camera_move: cameraMove, shot_type: shotType, motion, lighting, product_fidelity: fidelity, source_template_version_id: sourceDraft?.templateVersionId } });
      toast.success("Direction queued. You can follow it in Advanced History.");
      window.location.assign(`/advanced/history?run=${encodeURIComponent(generation.runId)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The render could not be started.");
      setSubmitting(false);
    }
  };
  generateRef.current = generate;

  useEffect(() => {
    if (!user || !resume || !pendingId || !prompt || !rights || resumed.current) return;
    resumed.current = true;
    void generateRef.current();
  }, [pendingId, prompt, resume, rights, user]);

  if (!hydrated) {
    return <CreatorShell><div className="advanced-loading" role="status"><Loader2 className="animate-spin" aria-hidden="true" /><span>Restoring your studio…</span></div></CreatorShell>;
  }

  return (
    <CreatorShell studio={{ title: projectName, templatePath, onExport: () => toast("Export becomes available after your first direction is ready.") }}>
      <Seo title={`${projectName} · Advanced Studio · MovPrompt`} description="Direct an AI video with visual references, camera controls and product-safe generation." path="/advanced" noindex />
      <div className="advanced-studio">
        {fromTemplate && sourceDraft && (
          <div className="advanced-handoff" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span><strong>Template moved into Advanced</strong><small>Product, campaign and brand settings are preserved.</small></span>
            <Link to={templatePath}><ArrowLeft aria-hidden="true" /> Return to Template</Link>
          </div>
        )}

        <aside className="advanced-assets" aria-label="Project assets">
          <div className="advanced-column-head"><h1>Assets</h1><button type="button" aria-label="Manage assets"><Settings2 aria-hidden="true" /></button></div>
          <section className="advanced-asset-section" aria-labelledby="advanced-product-title">
            <div className="advanced-section-label"><h2 id="advanced-product-title">Product</h2><ChevronRight aria-hidden="true" /></div>
            <div className="advanced-product-asset">
              <span className="advanced-asset-check"><Check aria-hidden="true" /></span>
              <img src={productImage} alt={sourceDraft?.product.name || "Sample product"} />
              <span><strong>{sourceDraft?.product.name || "Sample product"}</strong><small>{sourceDraft?.product.brand || "Primary product"}</small><small>{sourceDraft?.product.images[0]?.name || "Product reference"}</small></span>
              <button type="button" aria-label="Product asset options"><MoreVertical aria-hidden="true" /></button>
            </div>
          </section>

          <section className="advanced-asset-section" aria-labelledby="advanced-references-title">
            <div className="advanced-section-label"><span><h2 id="advanced-references-title">Visual references</h2><small>Guide style, lighting or setting.</small></span><i>{references.length}</i></div>
            <div className="advanced-reference-grid">
              {references.map((reference, index) => (
                <button key={reference.id} type="button" className="advanced-reference" title={`${reference.role}: ${reference.name}`} onClick={() => setSelectedDirection(Math.min(index, 3))}>
                  <img src={reference.url} alt={`${reference.role} reference: ${reference.name}`} />
                  <span>{reference.role}</span>
                </button>
              ))}
              {!references.length && ["/homepage/template-texture-study.png", "/homepage/hero-product.png", "/homepage/hero-lifestyle.png"].map((url, index) => (
                <button key={url} type="button" className="advanced-reference is-suggestion" onClick={() => toast("Upload this visual as a reference to use it in generation.")}>
                  <img src={url} alt="Suggested visual reference" />
                  <span>{index === 0 ? "Style" : index === 1 ? "Lighting" : "Setting"}</span>
                </button>
              ))}
            </div>
            <label className="advanced-add-media"><Upload aria-hidden="true" /><span>Add media</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addReferences(event.target.files)} /></label>
          </section>

          <button className="advanced-rail-row" type="button" onClick={() => toast("Your template brand colour and product identity are already connected.")}><span><ShieldCheck aria-hidden="true" /> Brand kit</span><ChevronRight aria-hidden="true" /></button>
          <button className="advanced-rail-row" type="button" onClick={() => toast("Character references can be added as visual references.")}><span><Plus aria-hidden="true" /> Characters</span><ChevronRight aria-hidden="true" /></button>
        </aside>

        <main className="advanced-main">
          <section className="advanced-preview" aria-label="Direction preview">
            <div className="advanced-preview-badge">{ratio}</div>
            <button className="advanced-preview-expand" type="button" aria-label="Open full-screen preview"><Maximize2 aria-hidden="true" /></button>
            <div className="advanced-preview-media" data-ratio={ratio}>
              <img src={directionImages[selectedDirection]} alt={`${directionLabels[selectedDirection]} direction preview`} />
            </div>
            <div className="advanced-player" aria-label="Preview controls">
              <button type="button" onClick={() => setPreviewPlaying((playing) => !playing)} aria-label={previewPlaying ? "Pause preview" : "Play preview"}>{previewPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>
              <span>00:04 / 00:{String(duration).padStart(2, "0")}</span>
              <span className="advanced-player-track"><i /></span>
              <button type="button" aria-label="Preview volume"><Volume2 aria-hidden="true" /></button>
              <span>100%</span>
              <button type="button" aria-label="Show safe zones"><Frame aria-hidden="true" /></button>
            </div>
          </section>

          <section className="advanced-composer" aria-labelledby="advanced-prompt-label">
            <label id="advanced-prompt-label" htmlFor="advanced-prompt">Direct this shot</label>
            <textarea id="advanced-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={8000} placeholder="Describe the subject, action, camera and light. Or use Improve direction." aria-describedby="advanced-prompt-help" />
            <div className="advanced-composer-actions">
              <div className="advanced-prompt-tools">
                <button type="button" onClick={() => setPrompt((current) => `${current}${current ? " " : ""}@Product`)}>@Product</button>
                <button type="button" disabled={!references.length} onClick={() => setPrompt((current) => `${current}${current ? " " : ""}@Reference1`)}>@Reference 1</button>
                <button type="button" onClick={improveDirection}><WandSparkles aria-hidden="true" /> Improve direction</button>
              </div>
              <button className="advanced-settings-trigger" type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-controls="advanced-quick-settings" aria-label="Quick render settings"><Settings2 aria-hidden="true" /></button>
              <button className="advanced-generate" type="button" onClick={() => void generate()} disabled={submitting}>{submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />} Generate direction</button>
            </div>
            <div className="advanced-composer-meta">
              <label><input type="checkbox" checked={rights} onChange={(event) => setRights(event.target.checked)} /><span>I have permission to use these assets</span></label>
              <span id="advanced-prompt-help">{quote.credits} credits · usually 2–5 minutes</span>
            </div>
            {settingsOpen && (
              <div id="advanced-quick-settings" className="advanced-quick-settings">
                <label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[5, 8, 10, 15].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
                <label>Format<select value={ratio} onChange={(event) => setRatio(event.target.value as CreatorAspectRatio)}>{RATIOS.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
            )}
          </section>

          <section className="advanced-directions" aria-labelledby="advanced-directions-title">
            <div className="advanced-directions-head"><h2 id="advanced-directions-title">Directions</h2><span>Version 3 <CircleGauge aria-hidden="true" /></span></div>
            <div className="advanced-directions-grid">
              {directionImages.map((image, index) => (
                <button key={`${image}-${directionLabels[index]}`} type="button" className={cn("advanced-direction-card", selectedDirection === index && "is-selected")} onClick={() => setSelectedDirection(index)} aria-pressed={selectedDirection === index}>
                  <img src={image} alt="" />
                  <span>{String(index + 1).padStart(2, "0")} {directionLabels[index]}</span>
                  {selectedDirection === index && <i><Check aria-hidden="true" /></i>}
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside className="advanced-director" aria-label="Director controls">
          <div className="advanced-column-head"><span><h2>Director</h2><small>Shape the shot visually.</small></span><button type="button" onClick={() => { setCameraMove("push-in"); setShotType("macro"); setMotion("Natural"); setLighting("Studio rim"); setFidelity("Exact"); }}><RotateCcw aria-hidden="true" /> Reset</button></div>
          <fieldset className="advanced-control-group"><legend>Camera</legend><div className="advanced-visual-options">{CAMERA_OPTIONS.map((option) => { const Icon = option.icon; return <button key={option.id} type="button" className={cn(cameraMove === option.id && "is-selected")} onClick={() => setCameraMove(option.id)} aria-pressed={cameraMove === option.id}><Icon aria-hidden="true" /><span>{option.label}</span></button>; })}</div></fieldset>
          <fieldset className="advanced-control-group"><legend>Shot</legend><div className="advanced-visual-options">{SHOT_OPTIONS.map((option) => { const Icon = option.icon; return <button key={option.id} type="button" className={cn(shotType === option.id && "is-selected")} onClick={() => setShotType(option.id)} aria-pressed={shotType === option.id}><Icon aria-hidden="true" /><span>{option.label}</span></button>; })}</div></fieldset>
          <fieldset className="advanced-control-group"><legend>Motion</legend><div className="advanced-segmented">{MOTION_OPTIONS.map((option) => <button key={option} type="button" className={cn(motion === option && "is-selected")} onClick={() => setMotion(option)} aria-pressed={motion === option}>{option}</button>)}</div><input className="advanced-motion-range" type="range" min="0" max="2" step="1" value={MOTION_OPTIONS.indexOf(motion)} onChange={(event) => setMotion(MOTION_OPTIONS[Number(event.target.value)])} aria-label="Motion intensity" /></fieldset>
          <details className="advanced-control-disclosure"><summary><span><SunMedium aria-hidden="true" /> Lighting</span><span>{lighting}<ChevronRight aria-hidden="true" /></span></summary><div className="advanced-detail-options">{LIGHTING_OPTIONS.map((option) => <button key={option} type="button" className={cn(lighting === option && "is-selected")} onClick={() => setLighting(option)}>{option}</button>)}</div></details>
          <details className="advanced-control-disclosure"><summary><span><ShieldCheck aria-hidden="true" /> Product fidelity</span><span>{fidelity}<ChevronRight aria-hidden="true" /></span></summary><div className="advanced-detail-options">{FIDELITY_OPTIONS.map((option) => <button key={option} type="button" className={cn(fidelity === option && "is-selected")} onClick={() => setFidelity(option)}>{option}</button>)}</div></details>
          <details className="advanced-control-disclosure"><summary><span><Mic2 aria-hidden="true" /> Audio</span><span>{audio ? "On" : "Off"}<ChevronRight aria-hidden="true" /></span></summary><div className="advanced-detail-options"><button type="button" className={cn(audio && "is-selected")} onClick={() => setAudio(true)}>Audio on</button><button type="button" className={cn(!audio && "is-selected")} onClick={() => setAudio(false)}>Silent</button></div></details>
          <details className="advanced-control-disclosure advanced-expert-settings"><summary><span><Settings2 aria-hidden="true" /> Expert settings</span><ChevronRight aria-hidden="true" /></summary><label>Approved capability<select value={capability} onChange={(event) => setCapability(event.target.value as ApprovedCapability)}><option value="video.seedance.latest">Seedance · Latest approved</option><option value="video.omni_flash.latest" disabled>Omni Flash · Unavailable</option></select></label></details>
          <div className="advanced-render-strip"><span><Move3D aria-hidden="true" /> {duration}s</span><span><Frame aria-hidden="true" /> {ratio}</span><span><ImagePlus aria-hidden="true" /> 1080p</span><button type="button" onClick={() => setSettingsOpen(true)} aria-label="Edit render settings"><Settings2 aria-hidden="true" /></button></div>
        </aside>
      </div>
      <AuthGateDialog open={authOpen} onOpenChange={setAuthOpen} returnPath={`/advanced?draft=${encodeURIComponent(draftId)}&resume=generate`} />
    </CreatorShell>
  );
}
