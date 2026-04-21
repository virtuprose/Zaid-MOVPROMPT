import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Film, Sparkles, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { HERO_PRESET_IDS, ALL_PRESET_IDS, PRESETS, PRESET_GROUPS, getPresetVideoUrl } from "@/lib/presets";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BUCKET = "preset-previews";

interface FileMeta {
  size: number;
  updated_at: string;
}

type CardStatus = "idle" | "generating" | "error";

const PresetPreviewsSection = () => {
  const [meta, setMeta] = useState<Record<string, FileMeta | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(Date.now());
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; presetId: string } | null>(null);
  const cancelRef = useRef(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const heroPresets = HERO_PRESET_IDS
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const refresh = async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 200 });
    if (error) {
      console.error(error);
      return;
    }
    const map: Record<string, FileMeta | null> = {};
    HERO_PRESET_IDS.forEach((id) => (map[id] = null));
    (data || []).forEach((f) => {
      const id = f.name.replace(/\.mp4$/, "");
      if (HERO_PRESET_IDS.includes(id)) {
        map[id] = {
          size: (f.metadata as { size?: number } | null)?.size ?? 0,
          updated_at: f.updated_at ?? f.created_at ?? "",
        };
      }
    });
    setMeta(map);
    setCacheBust(Date.now());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpload = async (presetId: string, file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file (MP4 recommended)");
      return;
    }
    setUploading(presetId);
    const path = `${presetId}.mp4`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: "video/mp4",
      cacheControl: "3600",
    });
    setUploading(null);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    toast.success(`Uploaded preview for ${presetId}`);
    await refresh();
  };

  const handleDelete = async (presetId: string) => {
    if (!confirm(`Delete preview for ${presetId}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([`${presetId}.mp4`]);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    toast.success("Deleted");
    await refresh();
  };

  /** Generate one preset via submit + client-side polling. */
  const generateOne = async (
    presetId: string,
    attempt = 0,
  ): Promise<{ ok: boolean; code?: string; error?: string }> => {
    setStatuses((s) => ({ ...s, [presetId]: "generating" }));
    setErrors((e) => {
      const next = { ...e };
      delete next[presetId];
      return next;
    });

    // 1. Submit
    const { data: subData, error: subErr } = await supabase.functions.invoke(
      "generate-preset-preview",
      { body: { action: "submit", presetId } },
    );
    const sub = (subData as { ok?: boolean; code?: string; error?: string; statusUrl?: string; responseUrl?: string } | null) ?? null;
    if (subErr || !sub?.ok) {
      const code = sub?.code;
      if (code === "rate_limit" && attempt < 2) {
        await new Promise((r) => setTimeout(r, 10_000));
        return generateOne(presetId, attempt + 1);
      }
      const msg = sub?.error || subErr?.message || "Submit failed";
      setStatuses((s) => ({ ...s, [presetId]: "error" }));
      setErrors((e) => ({ ...e, [presetId]: msg }));
      return { ok: false, code, error: msg };
    }

    // 2. Poll up to 6 minutes
    const deadline = Date.now() + 6 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 8_000));
      const { data: pData, error: pErr } = await supabase.functions.invoke(
        "generate-preset-preview",
        {
          body: {
            action: "poll",
            presetId,
            statusUrl: sub.statusUrl,
            responseUrl: sub.responseUrl,
          },
        },
      );
      const p = (pData as { ok?: boolean; status?: string; code?: string; error?: string } | null) ?? null;
      if (pErr || !p?.ok) {
        const msg = p?.error || pErr?.message || "Poll failed";
        setStatuses((s) => ({ ...s, [presetId]: "error" }));
        setErrors((e) => ({ ...e, [presetId]: msg }));
        return { ok: false, code: p?.code, error: msg };
      }
      if (p.status === "done") {
        setStatuses((s) => ({ ...s, [presetId]: "idle" }));
        await refresh();
        return { ok: true };
      }
    }
    const msg = "Timed out after 6 minutes";
    setStatuses((s) => ({ ...s, [presetId]: "error" }));
    setErrors((e) => ({ ...e, [presetId]: msg }));
    return { ok: false, code: "timeout", error: msg };
  };

  const handleGenerateOne = async (presetId: string) => {
    const res = await generateOne(presetId);
    if (res.ok) {
      toast.success(`Generated ${presetId}`);
    } else if (res.code === "no_credits") {
      toast.error("Fal.ai credits exhausted — top up at fal.ai/dashboard/billing");
    } else {
      toast.error(`Failed: ${res.error}`);
    }
  };

  const handleGenerateAll = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    cancelRef.current = false;
    const total = HERO_PRESET_IDS.length;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) {
        toast.info(`Cancelled — ${success} done, ${total - i} skipped`);
        break;
      }
      const presetId = HERO_PRESET_IDS[i];
      setBulkProgress({ current: i + 1, total, presetId });
      const res = await generateOne(presetId);
      if (res.ok) {
        success++;
      } else {
        failed++;
        if (res.code === "no_credits") {
          toast.error("Fal.ai credits exhausted — stopping. Top up at fal.ai/dashboard/billing");
          break;
        }
      }
    }

    setBulkProgress(null);
    setBulkRunning(false);
    if (!cancelRef.current) {
      if (failed === 0) {
        toast.success(`Generated all ${success} previews`);
      } else {
        toast.warning(`Done — ${success} succeeded, ${failed} failed`);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          Preset Previews
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Auto-generate looping clips for the 12 hero presets via Fal.ai Kling, or upload your own MP4.
          Public bucket — videos load instantly on hover in the main app.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          <Button
            type="button"
            onClick={handleGenerateAll}
            disabled={bulkRunning}
            className="gap-2"
          >
            {bulkRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {bulkRunning ? "Generating…" : "Auto-generate all 12"}
          </Button>
          <p className="text-xs text-muted-foreground">
            ~60–90s per clip · ~12–18 min total · ~$1.80
          </p>
        </div>
        {bulkProgress && (
          <div className="mt-3 rounded-md border border-border/50 bg-secondary/40 p-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Generating {bulkProgress.current} / {bulkProgress.total}
                <span className="text-muted-foreground font-mono ml-2">
                  {bulkProgress.presetId}
                </span>
              </p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                cancelRef.current = true;
              }}
              className="gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {heroPresets.map((preset) => {
            const fileMeta = meta[preset.id];
            const url = fileMeta ? `${getPresetVideoUrl(preset.id)}?t=${cacheBust}` : null;
            const Icon = preset.icon;
            const status = statuses[preset.id] ?? "idle";
            const errMsg = errors[preset.id];
            const isGen = status === "generating";
            return (
              <div
                key={preset.id}
                className="rounded-lg border border-border/50 bg-secondary/30 overflow-hidden flex flex-col"
              >
                <div className="relative h-28 bg-gradient-to-b from-background/60 to-secondary/60 flex items-center justify-center overflow-hidden">
                  {url ? (
                    <video
                      key={url}
                      src={url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Icon size={40} className="text-muted-foreground/40" />
                  )}
                  {isGen && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <div>
                    <p className="text-sm font-semibold">{preset.label}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{preset.id}</p>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {fileMeta ? (
                      <>
                        {formatSize(fileMeta.size)} ·{" "}
                        {fileMeta.updated_at
                          ? new Date(fileMeta.updated_at).toLocaleDateString()
                          : ""}
                      </>
                    ) : (
                      <span className="italic">No video uploaded</span>
                    )}
                  </div>
                  {status === "error" && errMsg && (
                    <div className="flex items-start gap-1.5 text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{errMsg}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <input
                      ref={(el) => (inputs.current[preset.id] = el)}
                      type="file"
                      accept="video/mp4,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(preset.id, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="flex-1 gap-1.5"
                      disabled={isGen || bulkRunning}
                      onClick={() => handleGenerateOne(preset.id)}
                    >
                      {isGen ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {isGen ? "Generating" : "Generate"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={uploading === preset.id || isGen}
                      onClick={() => inputs.current[preset.id]?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading === preset.id ? "…" : fileMeta ? "Replace" : "Upload"}
                    </Button>
                    {fileMeta && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(preset.id)}
                        disabled={isGen}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PresetPreviewsSection;
