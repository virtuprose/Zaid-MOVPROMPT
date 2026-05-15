import { useState } from "react";
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
import { LocationPopover } from "@/components/marketing/LocationPopover";
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

const FEATURED_ADS = [
  { url: loopKitchen.url, handle: "@chefnova", likes: 1284, tag: "Product" },
  { url: loopCyberpunk.url, handle: "@neonlab", likes: 942, tag: "Cinematic" },
  { url: loopPortrait.url, handle: "@rae.studio", likes: 2103, tag: "UGC" },
  { url: loopTokyo.url, handle: "@tokyo.frame", likes: 765, tag: "Cinematic" },
  { url: loopDesert.url, handle: "@wandr", likes: 1556, tag: "Product" },
  { url: loopUnderwater.url, handle: "@deepblue", likes: 689, tag: "App" },
];

const FILTERS = ["All", "Product", "App", "UGC", "Cinematic"] as const;

export default function MarketingStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { kit: brandKit } = useBrandKit();
  const subject: Subject = brandKit?.subject ?? "product";
  const [master, setMaster] = useState("");
  const [formatId, setFormatId] = useState<string | undefined>();
  const [hookId, setHookId] = useState<string | undefined>();
  const [settingId, setSettingId] = useState<string | undefined>();
  const [location, setLocation] = useState<LocationInput>(EMPTY_LOCATION);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const [openPicker, setOpenPicker] = useState<"format" | "hook" | "setting" | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  const format = find(FORMATS, formatId);
  const hook = find(HOOKS, hookId);
  const setting = find(SETTINGS, settingId);

  const hasInputs =
    master.trim().length > 0 ||
    !!formatId ||
    !!hookId ||
    !!settingId ||
    !!brandKit?.name ||
    !!location.place ||
    !!location.imagePath;
  const ready = !!(formatId && hookId && settingId);

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

          {/* Composer card */}
          <div className="rounded-3xl border border-border/60 bg-[hsl(240_5%_8%)]/70 backdrop-blur p-4 sm:p-6">
            <Textarea
              value={master}
              onChange={(e) => setMaster(e.target.value)}
              placeholder="Describe what happens in the ad…"
              className="min-h-[80px] bg-transparent border-0 resize-none text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 px-0"
              maxLength={800}
            />

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">
              <PresetChip
                icon={
                  brandKit?.logo_url ? (
                    <img src={brandKit.logo_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5" />
                  )
                }
                label="Brand"
                value={brandKit?.name || undefined}
                tooltip="Tell the AI what you're advertising"
                onClick={() => setBrandOpen(true)}
              />

              <LocationPopover
                value={location}
                onChange={setLocation}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs transition-colors",
                      location.place || location.imagePath
                        ? "border-[hsl(0_72%_55%)]/50 bg-[hsl(0_72%_55%)]/10 text-foreground"
                        : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    {location.imageUrl ? (
                      <img src={location.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                    <span className="font-medium">
                      {location.place
                        ? `Location: ${location.place}`
                        : location.imagePath
                          ? "Location: Custom"
                          : "Location"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                }
              />

              <span className="mx-1 h-5 w-px bg-border/50" />

              <PresetChip
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="Format"
                value={format?.label}
                tooltip="The visual style of your ad"
                onClick={() => setOpenPicker("format")}
              />
              <PresetChip
                icon={<Target className="w-3.5 h-3.5" />}
                label="Hook"
                value={hook?.label}
                tooltip="The attention-grabber in the first 3 seconds"
                onClick={() => setOpenPicker("hook")}
              />
              <PresetChip
                icon={<Globe2 className="w-3.5 h-3.5" />}
                label="Setting"
                value={setting?.label}
                tooltip="Scene type — kitchen, studio, rooftop"
                onClick={() => setOpenPicker("setting")}
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

          {/* Featured ads grid */}
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl tracking-tight uppercase">
                  Ads made with Ads Studio
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Click any ad to use it as a template.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full transition-colors",
                      filter === f
                        ? "bg-background text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAds.map((ad) => (
                <article
                  key={ad.url}
                  className="group relative overflow-hidden rounded-2xl border border-border/40 bg-muted/10 cursor-pointer hover:border-border transition-colors"
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
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white">
                    <span className="text-sm font-medium">{ad.handle}</span>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      {ad.likes.toLocaleString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
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
          subtitle="Choose where the story unfolds. Pick a setting that frames your ad with the right mood."
          presets={SETTINGS}
          selectedId={settingId}
          onSelect={setSettingId}
          categories={[
            { id: "realistic", label: "Realistic" },
            { id: "unrealistic", label: "Unrealistic" },
          ]}
        />

        <BrandKitSheet open={brandOpen} onOpenChange={setBrandOpen} />

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
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs transition-colors",
            value
              ? "border-[hsl(0_72%_55%)]/50 bg-[hsl(0_72%_55%)]/10 text-foreground"
              : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border",
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
