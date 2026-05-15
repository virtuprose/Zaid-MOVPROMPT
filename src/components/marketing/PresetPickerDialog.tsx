import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StudioPreset } from "@/lib/marketingStudio";
import { LocationPanel } from "@/components/marketing/LocationPanel";
import type { LocationInput } from "@/lib/marketing/brandKit";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  presets: StudioPreset[];
  selectedId?: string;
  onSelect: (id: string) => void;
  categories?: { id: string; label: string }[];
  locationValue?: LocationInput;
  onLocationChange?: (v: LocationInput) => void;
};

export function PresetPickerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  presets,
  selectedId,
  onSelect,
  categories,
}: Props) {
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return presets.filter((p) => {
      if (tab !== "all" && p.category !== tab) return false;
      if (q && !`${p.label} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [presets, tab, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl border border-border/60 bg-[hsl(240_5%_8%)] p-6 sm:p-8">
        <DialogTitle className="font-display text-2xl sm:text-3xl tracking-tight uppercase">
          {title}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground leading-relaxed">
          {subtitle}
        </DialogDescription>

        <div className="flex items-center justify-between gap-3 pt-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                tab === "all" ? "bg-background text-foreground border border-border/60" : "text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors capitalize",
                  tab === c.id ? "bg-background text-foreground border border-border/60" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-9 rounded-full bg-muted/30 border-border/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pt-2">
          {filtered.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-2xl border bg-muted/20 p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                  active ? "border-primary ring-2 ring-primary/40" : "border-border/40",
                )}
              >
                <div className="aspect-[3/4] w-full rounded-xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center text-5xl">
                  <span>{p.emoji ?? "🎬"}</span>
                </div>
                <div className="px-1">
                  <div className="text-sm font-semibold text-foreground">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</div>
                </div>
                {active && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12 text-sm">
              No presets match.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
