import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Box, Smartphone, Sparkles, Target, Globe2, Loader2, Wand2 } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { submitVideoJob } from "@/lib/director/api";

const RIGHTS_KEY = "vidoprompt:rights-ack";

const find = (list: StudioPreset[], id?: string) => (id ? list.find((p) => p.id === id) : undefined);

export default function MarketingStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<Subject>("product");
  const [master, setMaster] = useState("");
  const [formatId, setFormatId] = useState<string | undefined>();
  const [hookId, setHookId] = useState<string | undefined>();
  const [settingId, setSettingId] = useState<string | undefined>();

  const [openPicker, setOpenPicker] = useState<"format" | "hook" | "setting" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  const format = find(FORMATS, formatId);
  const hook = find(HOOKS, hookId);
  const setting = find(SETTINGS, settingId);

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
      const prompt = composeStudioPrompt({ subject, master, formatId, hookId, settingId });
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Marketing Studio — MovPrompt</title>
        <meta
          name="description"
          content="Turn any product or app into a video ad. Pick a format, a scroll-stopping hook and a setting — render in one click with Seedance 2.0."
        />
      </Helmet>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[hsl(340_85%_55%)]/15 rounded-full blur-[140px]" />
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

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-10 sm:mb-14">
          <div className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-3">
            Marketing Studio
          </div>
          <h1 className="font-display text-4xl sm:text-6xl tracking-tight uppercase leading-[0.95]">
            Turn any product
            <br /> into a video ad
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Pick a format, a scroll-stopping hook and a setting. We compose the prompt and render
            it on Seedance 2.0.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-4">
          {/* Subject rail */}
          <div className="flex lg:flex-col gap-2 justify-center lg:justify-start">
            <SubjectPill
              icon={<Box className="w-4 h-4" />}
              label="Product"
              active={subject === "product"}
              onClick={() => setSubject("product")}
            />
            <SubjectPill
              icon={<Smartphone className="w-4 h-4" />}
              label="App"
              active={subject === "app"}
              onClick={() => setSubject("app")}
            />
          </div>

          {/* Composer card */}
          <div className="rounded-3xl border border-border/60 bg-[hsl(340_30%_8%)]/60 backdrop-blur p-4 sm:p-6">
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
                label={subject === "app" ? "App format" : "Format"}
                value={format?.label}
                onClick={() => setOpenPicker("format")}
              />
              <PresetChip
                icon={<Target className="w-3.5 h-3.5" />}
                label="Hook"
                value={hook?.label}
                onClick={() => setOpenPicker("hook")}
              />
              <PresetChip
                icon={<Globe2 className="w-3.5 h-3.5" />}
                label="Setting"
                value={setting?.label}
                onClick={() => setOpenPicker("setting")}
              />

              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="lg"
                  disabled={!ready || submitting}
                  onClick={startGenerate}
                  className={cn(
                    "rounded-2xl px-6 h-12 font-semibold text-base",
                    "bg-gradient-to-br from-[hsl(340_85%_60%)] to-[hsl(355_85%_50%)] text-white",
                    "hover:opacity-90 disabled:opacity-40 shadow-lg shadow-[hsl(340_85%_50%)]/30",
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-1.5" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            {ready && (
              <div className="mt-4 rounded-xl border border-border/30 bg-muted/10 p-3 text-xs text-muted-foreground">
                <span className="text-foreground/80 font-medium">Renders as:</span> {hook?.label} ·{" "}
                {format?.label} · {setting?.label} · 9:16 · 5s · audio on
              </div>
            )}
          </div>
        </div>
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
  );
}

function SubjectPill({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-2xl border w-20 h-20 transition-all",
        active
          ? "border-primary/60 bg-primary/10 text-foreground ring-2 ring-primary/30"
          : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function PresetChip({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs transition-colors",
        value
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      {icon}
      <span className="font-medium">{value ?? label}</span>
    </button>
  );
}
