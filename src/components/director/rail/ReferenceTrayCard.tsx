import { useMemo, useState } from "react";
import { Images, Upload, Sparkles, Plus } from "lucide-react";
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

  const hero = filtered[0];
  const rest = filtered.slice(1);

  const pills: Array<{ key: typeof filter; label: string; icon: typeof Images }> = [
    { key: "all", label: "All", icon: Images },
    { key: "uploaded", label: "Uploaded", icon: Upload },
    { key: "generated", label: "Generated", icon: Sparkles },
  ];

  return (
    <RailSection
      id="reference-tray"
      title="Reference Tray"
      accent="muted"
      badge={
        assets.length > 0 ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">{assets.length}</span>
        ) : null
      }
    >
      <div className="flex gap-1.5 mb-3">
        {pills.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
              filter === key
                ? "border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                : "border-white/5 bg-[hsl(var(--card))] text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {!hero ? (
        <p className="text-[11px] text-muted-foreground/70 italic py-2">
          Drop or generate something — it'll land here.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Hero card with stacked shadow */}
          <div className="relative p-1">
            <div
              className="absolute inset-0 top-2 translate-x-2 -translate-y-2 rounded-xl bg-[hsl(var(--card))] border border-white/5 opacity-50"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setPreview(hero)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/uri-list", hero.url);
                e.dataTransfer.setData("text/plain", hero.url);
              }}
              className="relative w-full rounded-xl overflow-hidden aspect-video border border-white/10 group cursor-pointer block"
            >
              <img
                src={hero.url}
                alt={hero.label || ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
                aria-hidden
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "hsl(var(--brand) / 0.1)" }}
                aria-hidden
              />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-[10px] font-bold text-white capitalize">
                  {hero.label || hero.source}
                </p>
                <p className="text-[9px] text-white/60 uppercase tracking-wider">
                  {hero.source}
                </p>
              </div>
              <span
                className={cn(
                  "absolute top-2 right-2 h-5 px-2 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 text-[9px] font-semibold uppercase tracking-wider",
                  hero.source === "generated"
                    ? "text-[hsl(var(--brand))]"
                    : "text-[hsl(var(--primary))]",
                )}
              >
                {hero.source === "generated" ? "AI" : "Ref"}
              </span>
            </button>
          </div>

          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {rest.slice(0, 8).map((a, i) => (
                <button
                  key={`${a.url}-${i}`}
                  type="button"
                  onClick={() => setPreview(a)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/uri-list", a.url);
                    e.dataTransfer.setData("text/plain", a.url);
                  }}
                  className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-[hsl(var(--card))] hover:border-[hsl(var(--brand)/0.5)] transition-all"
                  title={a.label || a.source}
                >
                  <img
                    src={a.url}
                    alt={a.label || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
                      a.source === "generated"
                        ? "bg-[hsl(var(--brand))]"
                        : "bg-[hsl(var(--primary))]",
                    )}
                  />
                </button>
              ))}
              {rest.length > 8 && (
                <div className="aspect-square rounded-md border border-dashed border-white/10 flex items-center justify-center text-[10px] text-muted-foreground">
                  +{rest.length - 8}
                </div>
              )}
            </div>
          )}
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
