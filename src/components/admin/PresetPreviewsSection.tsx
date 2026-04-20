import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Film } from "lucide-react";
import { toast } from "sonner";
import { HERO_PRESET_IDS, PRESETS, getPresetVideoUrl } from "@/lib/presets";

const BUCKET = "preset-previews";

interface FileMeta {
  size: number;
  updated_at: string;
}

const PresetPreviewsSection = () => {
  const [meta, setMeta] = useState<Record<string, FileMeta | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(Date.now());
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
          Upload short looping MP4 clips (≤2s, ~150KB) for hero presets. Public bucket — videos load
          instantly on hover in the main app.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {heroPresets.map((preset) => {
            const fileMeta = meta[preset.id];
            const url = fileMeta ? `${getPresetVideoUrl(preset.id)}?t=${cacheBust}` : null;
            const Icon = preset.icon;
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
                  <div className="flex gap-2 mt-auto">
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
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={uploading === preset.id}
                      onClick={() => inputs.current[preset.id]?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading === preset.id ? "Uploading..." : fileMeta ? "Replace" : "Upload"}
                    </Button>
                    {fileMeta && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(preset.id)}
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
