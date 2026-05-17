import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles,
  Globe2,
  Loader2,
  Wand2,
  ChevronDown,
  Heart,
  Building2,
  MapPin,
  UserRound,
  X,
  Plus,
  Package,
  AppWindow,
  Download,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmRightsDialog } from "@/components/director/ConfirmRightsDialog";
import { PresetPickerDialog } from "@/components/marketing/PresetPickerDialog";
import {
  FORMATS,
  HOOKS,
  SETTINGS,
  composeStudioPrompt,
  type Subject,
  type StudioPreset,
} from "@/lib/marketingStudio";
import { useBrandKit, EMPTY_LOCATION, type LocationInput } from "@/lib/marketing/brandKit";
import { BrandKitSheet } from "@/components/marketing/BrandKitSheet";
import { BrandPickerPopover } from "@/components/marketing/BrandPickerPopover";
import { CharacterPickerPopover } from "@/components/marketing/CharacterPickerPopover";
import { CharacterKitSheet } from "@/components/marketing/CharacterKitSheet";
import { useCharacterKit } from "@/lib/marketing/characterKit";
import {
  RenderSettingsPopover,
  RENDER_DEFAULTS,
  type RenderSettings,
} from "@/components/marketing/RenderSettingsPopover";

import { submitVideoJob, pollVideoJob, cancelVideoJob, writeAdScene, type VideoJob } from "@/lib/director/api";
import loopKitchen from "@/assets/loop-kitchen.mp4.asset.json";
import loopCyberpunk from "@/assets/loop-cyberpunk.mp4.asset.json";
import loopDesert from "@/assets/loop-desert.mp4.asset.json";
import loopPortrait from "@/assets/loop-portrait.mp4.asset.json";
import loopTokyo from "@/assets/loop-tokyo.mp4.asset.json";
import loopUnderwater from "@/assets/loop-underwater.mp4.asset.json";

const RIGHTS_KEY = "vidoprompt:rights-ack";
const find = (list: StudioPreset[], id?: string) =>
  id ? list.find((p) => p.id === id) : undefined;

type FeaturedAd = {
  url: string;
  handle: string;
  likes: number;
  tag: "Product" | "App" | "UGC" | "Cinematic";
  template: { formatId: string; hookId: string; settingId: string };
};

const FEATURED_ADS: FeaturedAd[] = [
  { url: loopKitchen.url, handle: "@chefnova", likes: 1284, tag: "Product", template: { formatId: "product-hit", hookId: "first-line", settingId: "kitchen" } },
  { url: loopCyberpunk.url, handle: "@neonlab", likes: 942, tag: "Cinematic", template: { formatId: "hyper-motion", hookId: "pov-reveal", settingId: "street" } },
  { url: loopPortrait.url, handle: "@rae.studio", likes: 2103, tag: "UGC", template: { formatId: "ugc", hookId: "talking-avatar", settingId: "bedroom" } },
  { url: loopTokyo.url, handle: "@tokyo.frame", likes: 765, tag: "Cinematic", template: { formatId: "hyper-motion", hookId: "pov-reveal", settingId: "rooftop" } },
  { url: loopDesert.url, handle: "@wandr", likes: 1556, tag: "Product", template: { formatId: "before-after", hookId: "product-hit", settingId: "nature" } },
  { url: loopUnderwater.url, handle: "@deepblue", likes: 689, tag: "App", template: { formatId: "tutorial", hookId: "spicy", settingId: "studio" } },
];

const FILTERS = ["All", "Product", "App", "UGC", "Cinematic"] as const;

type UserAd = { id: string; video_url: string; created_at: string; liked: boolean; prompt?: string | null };

export default function MarketingStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { kits, activeKit: brandKit, activeId: brandActiveId, setActive: setBrandActive, deleteKit: deleteBrand } = useBrandKit();
  const {
    kits: characterKits,
    activeKit: characterKit,
    activeId: characterActiveId,
    setActive: setCharacterActive,
    deleteKit: deleteCharacter,
  } = useCharacterKit();
  const [subjectOverride, setSubjectOverride] = useState<Subject | null>(null);
  const subject: Subject = subjectOverride ?? brandKit?.subject ?? "product";
  useEffect(() => {
    if (brandKit?.subject) setSubjectOverride(brandKit.subject);
  }, [brandKit?.subject]);
  const [master, setMaster] = useState("");
  const [formatId, setFormatId] = useState<string | undefined>();
  const [customFormat, setCustomFormat] = useState<string>("");
  const [settingId, setSettingId] = useState<string | undefined>();
  const [customSetting, setCustomSetting] = useState<string>("");
  const [location, setLocation] = useState<LocationInput>(EMPTY_LOCATION);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const [openPicker, setOpenPicker] = useState<"format" | "location" | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterEditId, setCharacterEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(RENDER_DEFAULTS);

  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [pendingJobs, setPendingJobs] = useState<VideoJob[]>([]);
  const [deleteAdId, setDeleteAdId] = useState<string | null>(null);
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [flashChips, setFlashChips] = useState(false);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [{ data: done }, { data: active }] = await Promise.all([
        supabase
          .from("video_jobs")
          .select("id,video_url,created_at,liked,prompt")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .not("video_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(24),
        supabase
          .from("video_jobs")
          .select("id,status,provider,prompt,created_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .in("status", ["queued", "processing"])
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (done) setUserAds(done.filter((d) => d.video_url) as UserAd[]);
      if (active && active.length > 0) {
        setPendingJobs(active as unknown as VideoJob[]);
        toast.message(`Resuming ${active.length} render${active.length > 1 ? "s" : ""} in progress…`);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!loading && !user) return null;

  const format = find(FORMATS, formatId);
  const setting = find(SETTINGS, settingId);

  const hasInputs =
    master.trim().length > 0 ||
    !!formatId ||
    !!customFormat.trim() ||
    !!settingId ||
    !!customSetting.trim() ||
    !!brandKit?.name ||
    !!characterKit?.name ||
    !!location.place ||
    !!location.imagePath;
  const ready = !!(
    (formatId || customFormat.trim()) &&
    (settingId || customSetting.trim() || location.place || location.imagePath)
  );

  // Auto-write the describe box from the current Format/Hook/Setting + brand/avatar/location.
  // Re-runs on every trio change. Aborts in-flight requests when picks change again.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDrafting(true);
      writeAdScene(
        {
          subject,
          format: format
            ? { label: format.label, fragment: format.fragment }
            : customFormat.trim()
              ? { custom: customFormat.trim() }
              : undefined,
          setting: setting
            ? { label: setting.label, fragment: setting.fragment }
            : customSetting.trim()
              ? { custom: customSetting.trim() }
              : undefined,
          brand: brandKit
            ? {
                name: brandKit.name,
                description: brandKit.description,
                tagline: brandKit.tagline,
                audience: brandKit.audience,
              }
            : null,
          character: characterKit
            ? {
                name: characterKit.name,
                role: characterKit.role,
                description: characterKit.description,
              }
            : null,
          location:
            location.place || location.imagePath
              ? { place: location.place || undefined, hasImage: !!location.imagePath }
              : null,
        },
        controller.signal,
      )
        .then((scene) => {
          if (controller.signal.aborted) return;
          if (scene) setMaster(scene);
        })
        .catch((err) => {
          if (controller.signal.aborted || err?.name === "AbortError") return;
          console.warn("write-ad-scene failed", err);
          toast.message("Couldn't draft the scene — type your own.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setDrafting(false);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setDrafting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formatId,
    customFormat,
    settingId,
    customSetting,
    brandKit?.id,
    characterKit?.id,
    location.place,
    location.imagePath,
    subject,
  ]);

  const startGenerate = () => {
    if (!ready) {
      toast.error("Pick a format, hook and setting first.");
      return;
    }
    if (sessionStorage.getItem(RIGHTS_KEY) === "1") {
      void doGenerate();
      return;
    }
    setConfirmOpen(true);
  };

  const doGenerate = async () => {
    setSubmitting(true);
    try {
      const prompt = composeStudioPrompt({
        subject,
        master,
        formatId,
        settingId,
        customFormat: customFormat || undefined,
        customSetting: customSetting || undefined,
        brand: brandKit
          ? {
              name: brandKit.name,
              description: brandKit.description,
              url: brandKit.url,
              tagline: brandKit.tagline,
              audience: brandKit.audience,
            }
          : undefined,
        location: {
          place: location.place || undefined,
          hasImage: !!location.imagePath,
        },
        character: characterKit
          ? {
              name: characterKit.name,
              description: characterKit.description,
              role: characterKit.role,
              hasImage: !!characterKit.reference_path,
            }
          : undefined,
      });
      const referenceImages = [
        brandKit?.logo_url,
        characterKit?.reference_url,
        location.imageUrl,
      ].filter((u): u is string => typeof u === "string" && u.length > 0);
      const provider = referenceImages.length > 0 ? "seedance-2.0-ref" : "seedance-v1-pro";
      const job = await submitVideoJob(
        prompt,
        provider,
        null,
        {
          aspect_ratio: renderSettings.aspect_ratio,
          duration: renderSettings.duration,
          resolution: renderSettings.resolution,
          audio: true,
        },
        referenceImages,
      );
      setPendingJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
      toast.success("Generating your ad…");
      window.setTimeout(() => {
        galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (e: any) {
      toast.error(e?.message || "Could not start render");
    } finally {
      setSubmitting(false);
    }
  };

  // Poll pending jobs until they finish
  useEffect(() => {
    if (pendingJobs.length === 0) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      const snapshot = pendingJobs;
      for (const job of snapshot) {
        try {
          const updated = await pollVideoJob(job.id);
          if (cancelled) return;
          if (updated.video_url) {
            setPendingJobs((prev) => prev.filter((j) => j.id !== job.id));
            setUserAds((prev) => [
              {
                id: updated.id,
                video_url: updated.video_url!,
                created_at: new Date().toISOString(),
                liked: false,
                prompt: (updated as any).prompt ?? null,
              },
              ...prev.filter((a) => a.id !== updated.id),
            ]);
            toast.success("Your ad is ready");
          } else if (updated.status === "failed" || updated.error) {
            setPendingJobs((prev) => prev.filter((j) => j.id !== job.id));
            toast.error(updated.error || "Render failed");
          }
        } catch {
          // ignore transient errors, keep polling
        }
      }
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingJobs]);

  const handleCancelJob = (jobId: string) => {
    setCancelJobId(jobId);
  };

  const confirmCancelJob = async () => {
    const jobId = cancelJobId;
    if (!jobId) return;
    setCancelJobId(null);
    // optimistic remove
    setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await cancelVideoJob(jobId);
      toast.success("Generation canceled");
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel — it may have already finished");
    }
  };

  const handleDownloadAd = async (ad: UserAd) => {
    try {
      const res = await fetch(ad.video_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vidoprompt-${ad.id.slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e: any) {
      toast.error(e?.message || "Could not download video");
    }
  };

  const handleToggleLike = async (ad: UserAd) => {
    const next = !ad.liked;
    setUserAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, liked: next } : a)));
    const { error } = await supabase
      .from("video_jobs")
      .update({ liked: next })
      .eq("id", ad.id);
    if (error) {
      setUserAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, liked: !next } : a)));
      toast.error("Couldn't update like");
    }
  };

  const confirmDeleteAd = async () => {
    const adId = deleteAdId;
    if (!adId) return;
    setDeleteAdId(null);
    const removed = userAds.find((a) => a.id === adId);
    setUserAds((prev) => prev.filter((a) => a.id !== adId));
    const { error } = await supabase
      .from("video_jobs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", adId);
    if (error) {
      if (removed) setUserAds((prev) => [removed, ...prev]);
      toast.error("Couldn't delete ad");
      return;
    }
    toast.success("Ad deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          const { error: undoErr } = await supabase
            .from("video_jobs")
            .update({ deleted_at: null })
            .eq("id", adId);
          if (undoErr) {
            toast.error("Couldn't restore ad");
            return;
          }
          if (removed) setUserAds((prev) => [removed, ...prev.filter((a) => a.id !== adId)]);
        },
      },
    });
  };

  const filteredAds = FEATURED_ADS.filter(
    (a) => filter === "All" || a.tag === filter,
  );

  const adCount = userAds.length;
  const totalCount = adCount + pendingJobs.length;
  const mode: "empty" | "mixed" | "full" =
    totalCount === 0 ? "empty" : totalCount < 10 ? "mixed" : "full";

  const applyTemplate = (tpl: { formatId: string; hookId?: string; settingId: string }) => {
    setFormatId(tpl.formatId);
    setSettingId(tpl.settingId);
    setFlashChips(true);
    window.setTimeout(() => setFlashChips(false), 900);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.success("Template loaded — tweak and generate.");
  };

  const btnLabel = submitting
    ? "Generating..."
    : !hasInputs
      ? "Add inputs to generate"
      : "Generate ad";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Ads Studio — MovPrompt</title>
          <meta
            name="description"
            content="Turn any product or app into a video ad. Pick a format, a scroll-stopping hook and a setting — render in one click with Seedance 2.0."
          />
        </Helmet>

        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-[hsl(35_90%_55%)]/12 rounded-full blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(0_0%_100%/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(0_0%_100%/0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <TopNav />

        <div className="relative z-10 container max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-[32px] sm:text-[44px] tracking-tight uppercase leading-[1]">
              Turn any product
              <br /> into a video ad
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm leading-snug">
              Pick a format, a scroll-stopping hook and a setting. We compose the prompt and render your ad.
            </p>
          </div>

          {/* Composer with sidebar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Subject sidebar */}
            <div className="flex sm:flex-col gap-1.5 shrink-0">
              {([
                { id: "product", label: "Product", icon: Package },
                { id: "app", label: "App", icon: AppWindow },
              ] as const).map(({ id, label, icon: Icon }) => {
                const active = subject === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSubjectOverride(id)}
                    className={cn(
                      "w-16 h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-all",
                      active
                        ? "border-[#F5A524]/50 bg-[#F5A524]/10 text-foreground"
                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                );
              })}
            </div>

          {/* Composer card */}
          <div ref={composerRef} className="flex-1 min-w-0 rounded-3xl border border-border/60 bg-[hsl(240_5%_8%)]/70 backdrop-blur p-4 sm:p-5 scroll-mt-20">
            {(brandKit || characterKit || location.place || location.imagePath) && (
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-border/30">
                {brandKit && (
                  <div className="inline-flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-xl border border-[#F5A524]/40 bg-[#F5A524]/10 text-xs">
                    <div className="w-7 h-7 rounded-md bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {brandKit.logo_url ? (
                        <img src={brandKit.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[160px]">
                      {brandKit.name || (subject === "app" ? "App" : "Product")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void setBrandActive(null)}
                      className="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 flex items-center justify-center shrink-0"
                      aria-label="Detach brand"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {characterKit && (
                  <div className="inline-flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-xl border border-[#F5A524]/40 bg-[#F5A524]/10 text-xs">
                    <div className="w-7 h-7 rounded-md bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {characterKit.reference_url ? (
                        <img src={characterKit.reference_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[160px]">
                      {characterKit.name || "Avatar"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void setCharacterActive(null)}
                      className="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 flex items-center justify-center shrink-0"
                      aria-label="Detach character"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {(location.place || location.imagePath) && (
                  <div className="inline-flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-xl border border-border/60 bg-secondary/40 text-xs">
                    <div className="w-7 h-7 rounded-md bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {location.imageUrl ? (
                        <img src={location.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[160px]">
                      {location.place || "Location image"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocation(EMPTY_LOCATION)}
                      className="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 flex items-center justify-center shrink-0"
                      aria-label="Detach location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <Textarea
                value={master}
                onChange={(e) => setMaster(e.target.value)}
                placeholder={drafting ? "Writing scene…" : "Describe what happens in the ad…"}
                disabled={drafting}
                className={cn(
                  "min-h-[80px] bg-transparent border-0 resize-none text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 px-0",
                  drafting && "opacity-70",
                )}
                maxLength={800}
              />
              {drafting && (
                <div className="absolute top-2 right-0 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Drafting…
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">

              <PresetChip
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="Format"
                value={
                  format?.label ||
                  (customFormat.trim()
                    ? `Custom: ${customFormat.trim().slice(0, 24)}${customFormat.trim().length > 24 ? "…" : ""}`
                    : undefined)
                }
                tooltip="The visual style of your ad"
                onClick={() => setOpenPicker("format")}
                flash={flashChips}
              />
              <PresetChip
                icon={<Globe2 className="w-3.5 h-3.5" />}
                label="Location"
                value={(() => {
                  const sceneLabel =
                    setting?.label ||
                    (customSetting.trim()
                      ? `Custom: ${customSetting.trim().slice(0, 28)}${customSetting.trim().length > 28 ? "…" : ""}`
                      : undefined);
                  const locSuffix = location.imagePath ? " · Ref image" : "";
                  if (sceneLabel) return `${sceneLabel}${locSuffix}`;
                  return location.imagePath ? "Reference image" : undefined;
                })()}
                tooltip="Where the ad takes place — pick a scene or attach a reference image"
                onClick={() => setOpenPicker("location")}
                flash={flashChips}
              />

              <RenderSettingsPopover value={renderSettings} onChange={setRenderSettings} />

              <div className="ml-auto flex items-center gap-2">
                <BrandPickerPopover
                  kits={kits}
                  activeId={brandActiveId}
                  onSelect={(id) => void setBrandActive(id === brandActiveId ? null : id)}
                  onNew={() => { setBrandEditId(null); setBrandOpen(true); }}
                  onEdit={(id) => { setBrandEditId(id); setBrandOpen(true); }}
                  onDelete={(id) => void deleteBrand(id)}
                  trigger={
                    <button
                      type="button"
                      aria-label="Brand preview"
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-[#F5A524]/60 transition-colors shrink-0"
                    >
                      {brandKit?.logo_url ? (
                        <>
                          <img src={brandKit.logo_url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-semibold tracking-wider uppercase text-center py-0.5">
                            {subject === "app" ? "App" : "Product"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="absolute top-1 left-1 w-[18px] h-[18px] rounded-full border border-white/30 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white/80" />
                          </span>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-bold tracking-wider uppercase text-white">
                            {subject === "app" ? "App" : "Product"}
                          </span>
                        </>
                      )}
                    </button>
                  }
                />
                <CharacterPickerPopover
                  kits={characterKits}
                  activeId={characterActiveId}
                  onSelect={(id) => void setCharacterActive(id === characterActiveId ? null : id)}
                  onNew={() => { setCharacterEditId(null); setCharacterOpen(true); }}
                  onEdit={(id) => { setCharacterEditId(id); setCharacterOpen(true); }}
                  onDelete={(id) => void deleteCharacter(id)}
                  trigger={
                    <button
                      type="button"
                      aria-label="Character preview"
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-[#F5A524]/60 transition-colors shrink-0"
                    >
                      {characterKit?.reference_url ? (
                        <>
                          <img src={characterKit.reference_url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-semibold tracking-wider uppercase text-center py-0.5">
                            Avatar
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="absolute top-1 left-1 w-[18px] h-[18px] rounded-full border border-white/30 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white/80" />
                          </span>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-bold tracking-wider uppercase text-white">
                            Avatar
                          </span>
                        </>
                      )}
                    </button>
                  }
                />


                <Button
                  size="lg"
                  disabled={!hasInputs || submitting || drafting}
                  onClick={startGenerate}
                  className={cn(
                    "rounded-2xl px-5 h-11 font-semibold text-sm transition-all",
                    hasInputs
                      ? "bg-[#F5A524] text-black hover:bg-[#F5A524]/90 shadow-lg shadow-[#F5A524]/25"
                      : "bg-muted text-muted-foreground hover:bg-muted",
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : hasInputs ? (
                    <Wand2 className="w-4 h-4 mr-1.5" />
                  ) : null}
                  {btnLabel}
                </Button>
              </div>
            </div>

            {ready && (
              <div className="mt-4 rounded-xl border border-border/30 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="text-foreground/80 font-medium">Renders as:</span>{" "}
                {format?.label || "Custom format"} · {setting?.label || customSetting.trim() || location.place || "Reference image"} · {renderSettings.aspect_ratio} · {renderSettings.duration}s · {renderSettings.resolution} · audio on
              </div>
            )}
          </div>
          </div>

          {/* Ads gallery */}
          <section ref={galleryRef} className="mt-10 scroll-mt-20">
            {mode === "empty" && (
              <>
                <SectionHeader
                  title="Ads made with Ads Studio"
                  subtitle="New to Ads Studio? Click any template below to start."
                  right={
                    <FilterTabs value={filter} onChange={setFilter} />
                  }
                />
                <CommunityGrid
                  ads={filteredAds}
                  onPick={(ad) => applyTemplate(ad.template)}
                />
              </>
            )}

            {mode === "mixed" && (
              <div>
                <SectionHeader
                  title="Your recent ads"
                  subtitle={
                    pendingJobs.length > 0
                      ? "Your ad is rendering — it'll appear here in a moment."
                      : "Pick up where you left off — or remix one of yours."
                  }
                  right={
                    adCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => navigate("/library")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Browse all {adCount} →
                      </button>
                    ) : null
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {pendingJobs.map((job) => (
                    <PendingAdCard key={job.id} onCancel={() => handleCancelJob(job.id)} />
                  ))}
                  {userAds.slice(0, Math.max(0, 4 - pendingJobs.length)).map((ad) => (
                    <UserAdCard
                      key={ad.id}
                      ad={ad}
                      onClick={() => navigate("/library")}
                      onDownload={() => handleDownloadAd(ad)}
                      onToggleLike={() => handleToggleLike(ad)}
                      onDelete={() => setDeleteAdId(ad.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {mode === "full" && (
              <>
                <SectionHeader
                  title={showCommunity ? "Community ads" : "Your ads"}
                  subtitle={
                    showCommunity
                      ? "Click any template to load its format, hook and setting."
                      : pendingJobs.length > 0
                        ? "Your ad is rendering — it'll appear here in a moment."
                        : "Tap one to revisit it in your Library."
                  }
                  right={
                    <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
                      <ToggleTab active={!showCommunity} onClick={() => setShowCommunity(false)}>
                        Yours ({adCount})
                      </ToggleTab>
                      <ToggleTab active={showCommunity} onClick={() => setShowCommunity(true)}>
                        Community
                      </ToggleTab>
                    </div>
                  }
                />
                {showCommunity ? (
                  <CommunityGrid
                    ads={filteredAds}
                    onPick={(ad) => applyTemplate(ad.template)}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pendingJobs.map((job) => (
                      <PendingAdCard key={job.id} onCancel={() => handleCancelJob(job.id)} />
                    ))}
                    {userAds.slice(0, Math.max(0, 8 - pendingJobs.length)).map((ad) => (
                      <UserAdCard
                        key={ad.id}
                        ad={ad}
                        onClick={() => navigate("/library")}
                        onDownload={() => handleDownloadAd(ad)}
                        onToggleLike={() => handleToggleLike(ad)}
                        onDelete={() => setDeleteAdId(ad.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <PresetPickerDialog
          open={openPicker === "format"}
          onOpenChange={(o) => !o && setOpenPicker(null)}
          title="Pick the format that hits"
          subtitle="From unboxing to UGC — choose the type of video that fits your product and audience."
          presets={FORMATS}
          selectedId={formatId}
          onSelect={setFormatId}
          searchPlaceholder="Search formats… (try 'UGC' or 'unboxing')"
          customLabel="Custom format"
          customValue={customFormat}
          onCustomChange={setCustomFormat}
          categories={[
            { id: "ugc", label: "UGC", tooltip: "Casual social-media formats" },
            { id: "commercial", label: "Commercial", tooltip: "Polished brand formats" },
            { id: "avatar", label: "Avatar", tooltip: "Avatar-led formats" },
            { id: "animated", label: "Animated", tooltip: "Motion-graphic formats" },
          ]}
        />
        <PresetPickerDialog
          open={openPicker === "location"}
          onOpenChange={(o) => !o && setOpenPicker(null)}
          title="Pick the location"
          subtitle="Where does the ad take place? Pick a scene type, add a real-world place, or attach a reference image."
          presets={SETTINGS}
          selectedId={settingId}
          onSelect={setSettingId}
          searchPlaceholder="Search locations… (try 'rooftop' or 'cafe')"
          customLabel="Custom location"
          categories={[
            { id: "realistic", label: "Real", tooltip: "Real-world settings — bedrooms, kitchens, streets" },
            { id: "unrealistic", label: "Stylized", tooltip: "Stylized scenes — surreal, dramatic, cinematic" },
          ]}
          locationValue={location}
          onLocationChange={setLocation}
          customValue={customSetting}
          onCustomChange={setCustomSetting}
        />

        <CharacterKitSheet
          open={characterOpen}
          onOpenChange={(o) => {
            setCharacterOpen(o);
            if (!o) setCharacterEditId(null);
          }}
          kitId={characterEditId}
        />

        <BrandKitSheet
          open={brandOpen}
          onOpenChange={(o) => {
            setBrandOpen(o);
            if (!o) setBrandEditId(null);
          }}
          kitId={brandEditId}
        />

        <ConfirmRightsDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={(dontShow) => {
            if (dontShow) sessionStorage.setItem(RIGHTS_KEY, "1");
            setConfirmOpen(false);
            void doGenerate();
          }}
        />

        <AlertDialog open={cancelJobId !== null} onOpenChange={(o) => !o && setCancelJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this generation?</AlertDialogTitle>
              <AlertDialogDescription>
                You won't be charged for canceled jobs, but any in-progress work will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep generating</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelJob}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel generation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteAdId !== null} onOpenChange={(o) => !o && setDeleteAdId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
              <AlertDialogDescription>
                The ad will be removed from your library. You can undo from the toast for a few seconds.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAd}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function PresetChip({
  icon,
  label,
  value,
  tooltip,
  onClick,
  flash,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  tooltip: string;
  onClick: () => void;
  flash?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs transition-all duration-300",
            value
              ? "border-[hsl(0_72%_55%)]/50 bg-[hsl(0_72%_55%)]/10 text-foreground"
              : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border",
            flash && value &&
              "border-[hsl(35_90%_55%)] bg-[hsl(35_90%_55%)]/20 text-foreground shadow-[0_0_18px_hsl(35_90%_55%/0.5)] scale-[1.04]",
          )}
        >
          {icon}
          <span className="font-medium">
            {value ? `${label}: ${value}` : label}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
      <div>
        <h2 className="font-display text-xl sm:text-2xl tracking-tight uppercase">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: (typeof FILTERS)[number];
  onChange: (v: (typeof FILTERS)[number]) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            value === f
              ? "bg-background text-foreground border border-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function ToggleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded-full transition-colors",
        active
          ? "bg-background text-foreground border border-border/60"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CommunityCard({ ad, onClick }: { ad: FeaturedAd; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-muted/10 cursor-pointer transition-all hover:border-[hsl(35_90%_55%)]/60 hover:shadow-[0_0_24px_hsl(35_90%_55%/0.25)]"
    >
      <div className="aspect-[3/4] overflow-hidden">
        <video
          src={ad.url}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] uppercase tracking-wide text-white/90">
        {ad.tag}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-3 py-1.5 rounded-full bg-[hsl(35_90%_55%)] text-black text-xs font-semibold">
          Click to use as template
        </span>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white">
        <span className="text-sm font-medium">{ad.handle}</span>
        <span className="inline-flex items-center gap-1 text-xs">
          <Heart className="w-3.5 h-3.5 fill-current" />
          {ad.likes.toLocaleString()}
        </span>
      </div>
    </article>
  );
}

function CommunityGrid({
  ads,
  onPick,
}: {
  ads: FeaturedAd[];
  onPick: (ad: FeaturedAd) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {ads.map((ad) => (
        <CommunityCard key={ad.url} ad={ad} onClick={() => onPick(ad)} />
      ))}
    </div>
  );
}

function UserAdCard({
  ad,
  onClick,
  onDownload,
  onToggleLike,
  onDelete,
}: {
  ad: UserAd;
  onClick: () => void;
  onDownload?: () => void;
  onToggleLike?: () => void;
  onDelete?: () => void;
}) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.();
  };
  return (
    <article
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-muted/10 cursor-pointer transition-all hover:border-[hsl(35_90%_55%)]/60 hover:shadow-[0_0_24px_hsl(35_90%_55%/0.25)]"
    >
      <div className="aspect-[3/4] overflow-hidden">
        <video
          src={ad.video_url}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[hsl(35_90%_55%)]/90 backdrop-blur text-[10px] uppercase tracking-wide text-black font-semibold">
        Yours
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onToggleLike && (
          <button
            type="button"
            onClick={stop(onToggleLike)}
            aria-label={ad.liked ? "Unlike" : "Like"}
            className="h-8 w-8 rounded-full bg-black/55 backdrop-blur border border-white/10 grid place-items-center text-white hover:bg-black/75 hover:border-[hsl(35_90%_55%)]/60 hover:text-[hsl(35_90%_55%)] transition"
          >
            <Heart className="h-4 w-4" fill={ad.liked ? "currentColor" : "none"} />
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={stop(onDownload)}
            aria-label="Download"
            className="h-8 w-8 rounded-full bg-black/55 backdrop-blur border border-white/10 grid place-items-center text-white hover:bg-black/75 hover:border-[hsl(190_90%_50%)]/60 hover:text-[hsl(190_90%_50%)] transition"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={stop(onDelete)}
            aria-label="Delete"
            className="h-8 w-8 rounded-full bg-black/55 backdrop-blur border border-white/10 grid place-items-center text-white hover:bg-destructive/80 hover:border-destructive transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
        <span className="text-xs opacity-80">
          {new Date(ad.created_at).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}

function PendingAdCard({ onCancel }: { onCancel?: () => void }) {
  return (
    <article
      aria-busy="true"
      className="group relative overflow-hidden rounded-2xl border border-[hsl(35_90%_55%)]/60 bg-muted/10 shadow-[0_0_24px_hsl(35_90%_55%/0.25)]"
    >
      <div className="aspect-[3/4] relative bg-gradient-to-br from-muted/25 via-muted/10 to-muted/25 animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="w-6 h-6 text-[hsl(35_90%_55%)] animate-spin" />
          <span className="text-xs uppercase tracking-[0.18em] text-foreground/80 font-semibold">
            Generating…
          </span>
          <span className="text-[10.5px] text-muted-foreground">Rendering — usually 1–3 minutes</span>
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[hsl(35_90%_55%)]/90 backdrop-blur text-[10px] uppercase tracking-wide text-black font-semibold">
        Generating
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel generation"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur text-white/90 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </article>
  );
}
