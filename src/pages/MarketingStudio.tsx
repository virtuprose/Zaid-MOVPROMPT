import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Globe2,
  Loader2,
  Wand2,
  ChevronDown,
  Heart,
  Building2,
  MapPin,
  X,
} from "lucide-react";
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
import { BrandsRow } from "@/components/marketing/BrandsRow";

import { submitVideoJob } from "@/lib/director/api";
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

type UserAd = { id: string; video_url: string; created_at: string };

export default function MarketingStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { kits, activeKit: brandKit, activeId: brandActiveId, setActive: setBrandActive, deleteKit: deleteBrand } = useBrandKit();
  const subject: Subject = brandKit?.subject ?? "product";
  const [master, setMaster] = useState("");
  const [formatId, setFormatId] = useState<string | undefined>();
  const [hookId, setHookId] = useState<string | undefined>();
  const [settingId, setSettingId] = useState<string | undefined>();
  const [customSetting, setCustomSetting] = useState<string>("");
  const [location, setLocation] = useState<LocationInput>(EMPTY_LOCATION);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const [openPicker, setOpenPicker] = useState<"format" | "hook" | "setting" | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [showCommunity, setShowCommunity] = useState(false);
  const [flashChips, setFlashChips] = useState(false);
  const composerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("id,video_url,created_at")
        .eq("user_id", user.id)
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!cancelled && data) {
        setUserAds(data.filter((d) => d.video_url) as UserAd[]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!loading && !user) return null;

  const format = find(FORMATS, formatId);
  const hook = find(HOOKS, hookId);
  const setting = find(SETTINGS, settingId);

  const hasInputs =
    master.trim().length > 0 ||
    !!formatId ||
    !!hookId ||
    !!settingId ||
    !!customSetting.trim() ||
    !!brandKit?.name ||
    !!location.place ||
    !!location.imagePath;
  const ready = !!(formatId && hookId && (settingId || customSetting.trim()));

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
        hookId,
        settingId,
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
      });
      await submitVideoJob(prompt, "seedance-2.0", null, {
        aspect_ratio: "9:16",
        duration: 5,
        resolution: "1080p",
        audio: true,
      });
      toast.success("Render started — check your Library when it finishes.");
      navigate("/library");
    } catch (e: any) {
      toast.error(e?.message || "Could not start render");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAds = FEATURED_ADS.filter(
    (a) => filter === "All" || a.tag === filter,
  );

  const adCount = userAds.length;
  const mode: "empty" | "mixed" | "full" =
    adCount === 0 ? "empty" : adCount < 10 ? "mixed" : "full";

  const applyTemplate = (tpl: { formatId: string; hookId: string; settingId: string }) => {
    setFormatId(tpl.formatId);
    setHookId(tpl.hookId);
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[hsl(35_90%_55%)]/12 rounded-full blur-[140px]" />
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

        <div className="relative z-10 container max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[14px] tracking-[0.1em] uppercase mb-4 pb-1 border-b border-[hsl(0_72%_55%)]/40 text-[hsl(0_72%_60%)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(0_72%_55%)]" />
              Ads Studio
            </div>
            <h1 className="font-display text-[40px] sm:text-[52px] tracking-tight uppercase leading-[1]">
              Turn any product
              <br /> into a video ad
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm">
              Pick a format, a scroll-stopping hook and a setting. We compose the prompt and render your ad.
            </p>
          </div>

          <BrandsRow
            kits={kits}
            activeId={brandActiveId}
            onSelect={(id) => void setBrandActive(id)}
            onNew={() => {
              setBrandEditId(null);
              setBrandOpen(true);
            }}
            onEdit={(id) => {
              setBrandEditId(id);
              setBrandOpen(true);
            }}
            onDelete={(id) => void deleteBrand(id)}
          />

          {/* Composer card */}
          <div ref={composerRef} className="rounded-3xl border border-border/60 bg-[hsl(240_5%_8%)]/70 backdrop-blur p-4 sm:p-6 scroll-mt-20">
            {(brandKit?.name || location.imagePath || location.place) && (
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-border/30">
                {brandKit?.name && (
                  <div className="inline-flex items-center gap-2 h-9 pl-1 pr-1.5 rounded-xl border border-border/60 bg-secondary/40 text-xs">
                    <div className="w-7 h-7 rounded-md bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                      {brandKit.logo_url ? (
                        <img
                          src={brandKit.logo_url}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[160px]">
                      {brandKit.name}
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

            <Textarea
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              placeholder="Describe what happens in the ad…"
              className="min-h-[80px] bg-transparent border-0 resize-none text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 px-0"
              maxLength={800}
            />

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">

              <PresetChip
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="Format"
                value={format?.label}
                tooltip="The visual style of your ad"
                onClick={() => setOpenPicker("format")}
                flash={flashChips}
              />
              <PresetChip
                icon={<Target className="w-3.5 h-3.5" />}
                label="Hook"
                value={hook?.label}
                tooltip="The attention-grabber in the first 3 seconds"
                onClick={() => setOpenPicker("hook")}
                flash={flashChips}
              />
              <PresetChip
                icon={<Globe2 className="w-3.5 h-3.5" />}
                label="Setting"
                value={
                  setting?.label
                    ? `${setting.label}${location.place ? ` · ${location.place}` : location.imagePath ? " · Custom" : ""}`
                    : location.place || (location.imagePath ? "Custom location" : undefined)
                }
                tooltip="Scene type and location"
                onClick={() => setOpenPicker("setting")}
                flash={flashChips}
              />

              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="lg"
                  disabled={!hasInputs || submitting}
                  onClick={startGenerate}
                  className={cn(
                    "rounded-2xl px-6 h-12 font-semibold text-base transition-all",
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
              <div className="mt-4 rounded-xl border border-border/30 bg-muted/10 p-3 text-xs text-muted-foreground">
                <span className="text-foreground/80 font-medium">Renders as:</span>{" "}
                {hook?.label} · {format?.label} · {setting?.label} · 9:16 · 5s · audio on
              </div>
            )}
          </div>

          {/* Ads gallery */}
          <section className="mt-14">
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
                  subtitle="Pick up where you left off — or remix one of yours."
                  right={
                    <button
                      type="button"
                      onClick={() => navigate("/library")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Browse all {adCount} →
                    </button>
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userAds.slice(0, 3).map((ad) => (
                    <UserAdCard key={ad.id} ad={ad} onClick={() => navigate("/library")} />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userAds.slice(0, 6).map((ad) => (
                      <UserAdCard key={ad.id} ad={ad} onClick={() => navigate("/library")} />
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
          categories={[
            { id: "ugc", label: "UGC" },
            { id: "commercial", label: "Commercial" },
          ]}
        />
        <PresetPickerDialog
          open={openPicker === "hook"}
          onOpenChange={(o) => !o && setOpenPicker(null)}
          title="Hooks that stop the scroll"
          subtitle="The first 3 seconds decide if your ad gets watched or skipped. Pick a proven opener."
          presets={HOOKS}
          selectedId={hookId}
          onSelect={setHookId}
          categories={[
            { id: "stunt", label: "Stunt" },
            { id: "subtle", label: "Subtle" },
          ]}
        />
        <PresetPickerDialog
          open={openPicker === "setting"}
          onOpenChange={(o) => !o && setOpenPicker(null)}
          title="Settings that set the scene"
          subtitle="Pick the scene type and where in the world it unfolds."
          presets={SETTINGS}
          selectedId={settingId}
          onSelect={setSettingId}
          categories={[
            { id: "realistic", label: "Realistic" },
            { id: "unrealistic", label: "Unrealistic" },
          ]}
          locationValue={location}
          onLocationChange={setLocation}
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
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight uppercase">{title}</h2>
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
      <div className="aspect-[9/12] overflow-hidden">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ads.map((ad) => (
        <CommunityCard key={ad.url} ad={ad} onClick={() => onPick(ad)} />
      ))}
    </div>
  );
}

function UserAdCard({ ad, onClick }: { ad: UserAd; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-muted/10 cursor-pointer transition-all hover:border-[hsl(35_90%_55%)]/60 hover:shadow-[0_0_24px_hsl(35_90%_55%/0.25)]"
    >
      <div className="aspect-[9/12] overflow-hidden">
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
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
        <span className="text-xs opacity-80">
          {new Date(ad.created_at).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}
