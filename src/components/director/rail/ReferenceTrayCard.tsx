import { useMemo, useState } from "react";
import { Images, Upload, Sparkles } from "lucide-react";
import { RailSection } from "./RailSection";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Asset = { url: string; source: "uploaded" | "generated"; label?: string };

interface ReferenceTrayCardProps {
  assets: Asset[];
}

export function ReferenceTrayCard({ assets }: ReferenceTrayCardProps) {
  const [filter, setFilter] = useState<"all" | "uploaded" | "generated">("all");
  const [preview, setPreview] = useState<Asset | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? assets : assets.filter((a) => a.source === filter)),
    [assets, filter],
  );

  const pills: Array<{ key: typeof filter; label: string; icon: any }> = [
    { key: "all", label: "All", icon: Images },
    { key: "uploaded", label: "Uploaded", icon: Upload },
    { key: "generated", label: "Generated", icon: Sparkles },
  ];

  return (
    <RailSection
      id="reference-tray"
      title="Reference Tray"
      icon={<Images className="w-3.5 h-3.5" />}
      badge={
        assets.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">{assets.length}</span>
        ) : null
      }
    >
      <div className="flex gap-1 mb-2">
        {pills.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              filter === key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/40 bg-background/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70 italic py-2">
          Drop or generate something — it'll land here.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
          {filtered.map((a, i) => (
            <button
              key={`${a.url}-${i}`}
              type="button"
              onClick={() => setPreview(a)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/uri-list", a.url);
                e.dataTransfer.setData("text/plain", a.url);
              }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-md border border-border/40 bg-muted/30 transition-all",
                "hover:border-primary/60 hover:shadow-[0_0_12px_-4px_hsl(var(--primary)/0.6)]",
              )}
              title={a.label || a.source}
            >
              <img src={a.url} alt={a.label || ""} className="w-full h-full object-cover" loading="lazy" />
              <span
                className={cn(
                  "absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
                  a.source === "generated" ? "bg-primary" : "bg-accent",
                )}
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl bg-background/95 border-border/60">
          {preview && (
            <div className="space-y-2">
              <img src={preview.url} alt="" className="w-full max-h-[75vh] object-contain rounded-md" />
              <div className="text-xs text-muted-foreground capitalize">{preview.source}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RailSection>
  );
}
