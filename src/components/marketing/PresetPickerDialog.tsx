import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, Plus, Sparkles, X, AlertTriangle, Image as ImageIcon, MapPin, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StudioPreset } from "@/lib/marketingStudio";
import { LocationPanel } from "@/components/marketing/LocationPanel";
import { EMPTY_LOCATION, type LocationInput } from "@/lib/marketing/brandKit";

export type PlaceMode = "preset" | "city" | "image";

const PLACE_SUGGESTIONS = ["Tokyo", "Paris", "New York", "Marrakech", "Dubai", "London", "Seoul", "Lagos"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  presets: StudioPreset[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  categories?: { id: string; label: string; tooltip?: string }[];
  searchPlaceholder?: string;
  locationValue?: LocationInput;
  onLocationChange?: (v: LocationInput) => void;
  /** Optional: enables the "Custom" card. */
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customLabel?: string;
  /** Optional: enables the Place mode toggle (preset / city / image). */
  placeMode?: PlaceMode;
  onPlaceModeChange?: (m: PlaceMode) => void;
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
  searchPlaceholder = "Search presets…",
  locationValue,
  onLocationChange,
  customValue,
  onCustomChange,
  customLabel = "Custom",
  placeMode,
  onPlaceModeChange,
}: Props) {
  const hasPlaceModes = !!placeMode && !!onPlaceModeChange;
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>(selectedId);
  const [draftCustom, setDraftCustom] = useState<string>(customValue ?? "");
  const [draftLocation, setDraftLocation] = useState<LocationInput | undefined>(locationValue);
  const [draftMode, setDraftMode] = useState<PlaceMode>(placeMode ?? "preset");
  const [customOpen, setCustomOpen] = useState<boolean>(!!(customValue && !selectedId));
  const cancelledRef = useRef(false);

  // Sync drafts when dialog opens
  useEffect(() => {
    if (open) {
      setDraftId(selectedId);
      setDraftCustom(customValue ?? "");
      setDraftLocation(locationValue);
      setDraftMode(placeMode ?? "preset");
      setCustomOpen(!!(customValue && !selectedId));
      setQ("");
      setTab("all");
      cancelledRef.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return presets.filter((p) => {
      if (tab !== "all" && p.category !== tab) return false;
      if (q && !`${p.label} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [presets, tab, q]);

  const noMatch = q.trim().length > 0 && filtered.length === 0;
  const supportsCustom = !!onCustomChange;
  const showPresets = !hasPlaceModes || draftMode === "preset";
  const showCityInput = hasPlaceModes && (draftMode === "city" || draftMode === "image");
  const showImagePanel = hasPlaceModes ? draftMode === "image" : !!(locationValue && onLocationChange);

  // Detect conflicts: a preset is picked AND a city or image is also set.
  const hasPreset = !!draftId || !!draftCustom.trim();
  const hasCity = !!draftLocation?.place?.trim();
  const hasImage = !!draftLocation?.imagePath;
  const conflict = hasPlaceModes && hasPreset && (hasCity || hasImage);

  const switchMode = (m: PlaceMode) => {
    setDraftMode(m);
    onPlaceModeChange?.(m);
    if (m === "preset") {
      // leaving location modes — clear city + image
      setDraftLocation(EMPTY_LOCATION);
    } else {
      // moving into city or image — clear preset
      setDraftId(undefined);
      setDraftCustom("");
      setCustomOpen(false);
      if (m === "city") {
        // city mode keeps place but clears image
        setDraftLocation((prev) => ({ ...(prev ?? EMPTY_LOCATION), imagePath: null, imageUrl: null }));
      }
    }
  };

  const commit = useCallback(() => {
    if (supportsCustom) {
      if (draftCustom.trim() && !draftId) {
        onCustomChange?.(draftCustom.trim());
        onSelect(undefined);
      } else {
        onCustomChange?.("");
        onSelect(draftId);
      }
    } else {
      onSelect(draftId);
    }
    if (onLocationChange) onLocationChange(draftLocation ?? EMPTY_LOCATION);
  }, [supportsCustom, draftCustom, draftId, draftLocation, onCustomChange, onSelect, onLocationChange]);

  const apply = () => {
    commit();
    onOpenChange(false);
  };

  const cancel = () => {
    cancelledRef.current = true;
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (!cancelledRef.current) commit();
    onOpenChange(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && q) {
      e.stopPropagation();
      setQ("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl rounded-3xl border border-border/60 bg-[hsl(240_5%_8%)] p-0 gap-0 max-h-[90vh] flex flex-col"
        onKeyDown={handleKey}
      >
        <div className="p-6 sm:p-8 pb-3">
          <DialogTitle className="font-display text-2xl sm:text-3xl tracking-tight uppercase">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            {subtitle}
          </DialogDescription>

          {hasPlaceModes && (
            <div className="pt-4">
              <div className="inline-flex items-center gap-1 rounded-full bg-muted/30 p-1">
                {([
                  { id: "preset", label: "Preset scene", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  { id: "city", label: "Real city", icon: <MapPin className="w-3.5 h-3.5" /> },
                  { id: "image", label: "Reference image", icon: <ImageIcon className="w-3.5 h-3.5" /> },
                ] as { id: PlaceMode; label: string; icon: JSX.Element }[]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => switchMode(m.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full transition-colors inline-flex items-center gap-1.5",
                      draftMode === m.id
                        ? "bg-background text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/80 mt-2">
                {draftMode === "preset" && "Pick a generic scene type — quick and clean."}
                {draftMode === "city" && "Name a real city — we'll match its architecture, light and styling."}
                {draftMode === "image" && "Upload a photo of the place — the AI copies it pixel-faithfully."}
              </p>
            </div>
          )}

          {showPresets && (
            <div className="flex items-center justify-between gap-3 pt-4 flex-wrap">
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full transition-colors",
                      tab === "all"
                        ? "bg-background text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    All
                  </button>
                  {categories?.map((c) => {
                    const btn = (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTab(c.id)}
                        className={cn(
                          "px-3 py-1 text-xs rounded-full transition-colors capitalize",
                          tab === c.id
                            ? "bg-background text-foreground border border-border/60"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                    return c.tooltip ? (
                      <Tooltip key={c.id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent>{c.tooltip}</TooltipContent>
                      </Tooltip>
                    ) : (
                      btn
                    );
                  })}
                </div>
              </TooltipProvider>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-8 rounded-full bg-muted/30 border-border/40"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4">
          {conflict && (
            <div className="mb-4 rounded-2xl border border-[#F5A524]/40 bg-[#F5A524]/10 p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#F5A524] mt-0.5 shrink-0" />
              <div className="flex-1 text-xs text-foreground/90 leading-relaxed">
                Your {hasImage ? "reference image" : "city"} will override the preset scene. Pick one mode to keep the prompt clean.
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftId(undefined);
                      setDraftCustom("");
                      switchMode(hasImage ? "image" : "city");
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#F5A524] text-black text-[11px] font-semibold"
                  >
                    Use {hasImage ? "reference" : "city"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftLocation(EMPTY_LOCATION);
                      switchMode("preset");
                    }}
                    className="px-2.5 py-1 rounded-full border border-border/60 text-[11px]"
                  >
                    Use preset
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCityInput && (
            <div className="pb-4 rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-foreground">City or place</div>
                <div className="text-[11px] text-muted-foreground">
                  Type a city, neighborhood, or landmark.
                </div>
              </div>
              <Input
                value={draftLocation?.place ?? ""}
                onChange={(e) =>
                  setDraftLocation({ ...(draftLocation ?? EMPTY_LOCATION), place: e.target.value })
                }
                placeholder="e.g. Tokyo, Shibuya crossing"
                className="bg-background/60"
              />
              <div className="flex flex-wrap gap-1.5">
                {PLACE_SUGGESTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setDraftLocation({ ...(draftLocation ?? EMPTY_LOCATION), place: p })
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                      draftLocation?.place === p
                        ? "border-[#F5A524] bg-[#F5A524]/10 text-foreground"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showImagePanel && draftLocation && (
            <div className="pb-4">
              <LocationPanel value={draftLocation} onChange={setDraftLocation} />
            </div>
          )}


          {showPresets && (<>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => {
              const active = p.id === draftId && !draftCustom;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDraftId(p.id);
                    setDraftCustom("");
                    setCustomOpen(false);
                  }}
                  className={cn(
                    "group relative aspect-[3/4] rounded-2xl overflow-hidden border bg-muted/20 text-left transition-all",
                    "hover:border-[#F5A524]/60 hover:scale-[1.02] hover:shadow-[0_0_0_3px_hsl(35_90%_55%/0.15)]",
                    active
                      ? "border-[#F5A524] scale-[1.02] shadow-[0_0_0_3px_hsl(35_90%_55%/0.35)]"
                      : "border-border/40",
                  )}
                >
                  {p.video ? (
                    <video
                      src={p.video}
                      poster={p.image}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : p.image ? (
                    <img
                      src={p.image}
                      alt={p.label}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center text-5xl">
                      <span>{p.emoji ?? "🎬"}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-3 px-3">
                    <div className="text-sm font-semibold text-white">{p.label}</div>
                    <div className="text-[11px] text-white/70 line-clamp-2">{p.description}</div>
                  </div>
                  {!active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-[#F5A524] text-black text-[11px] font-semibold">
                        Click to use
                      </span>
                    </div>
                  )}
                  {active && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F5A524] text-black inline-flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Custom scene card */}
            {supportsCustom && !noMatch && (
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                  setDraftId(undefined);
                }}
                className={cn(
                  "group aspect-[3/4] rounded-2xl border-2 border-dashed bg-muted/10 flex flex-col items-center justify-center gap-2 transition-all p-4 text-center",
                  "hover:border-[#F5A524]/70 hover:bg-[#F5A524]/5 hover:scale-[1.02]",
                  draftCustom && !draftId
                    ? "border-[#F5A524] bg-[#F5A524]/5"
                    : "border-border/50",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-[#F5A524]/15 text-[#F5A524] inline-flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-foreground">+ {customLabel}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">
                  {draftCustom || `Describe your ${customLabel.toLowerCase()}`}
                </div>
              </button>
            )}
          </div>

          {/* Empty state with custom suggestion */}
          {noMatch && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#F5A524]/40 bg-[#F5A524]/5 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-[#F5A524]" />
                <span>
                  No match for <span className="font-semibold">"{q}"</span>.
                </span>
              </div>
              {supportsCustom && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDraftCustom(q);
                    setDraftId(undefined);
                    setCustomOpen(true);
                    setQ("");
                  }}
                  className="bg-[#F5A524] text-black hover:bg-[#F5A524]/90"
                >
                  Use "{q}" as custom
                </Button>
              )}
            </div>
          )}

          {/* Custom scene editor */}
          {supportsCustom && customOpen && (
            <div className="mt-4 rounded-2xl border border-[#F5A524]/40 bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{customLabel}</div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    setDraftCustom("");
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <Textarea
                value={draftCustom}
                onChange={(e) => setDraftCustom(e.target.value)}
                placeholder={`Describe your ${customLabel.toLowerCase()}…`}
                className="min-h-[80px] bg-background/60"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                The AI will use this description directly.
              </p>
            </div>
          )}
          </>)}
        </div>


        <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3 bg-[hsl(240_5%_8%)] rounded-b-3xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancel}
              className="text-sm text-muted-foreground hover:text-foreground px-2"
            >
              Cancel
            </button>
            <span className="hidden sm:inline text-[11px] text-muted-foreground/70">
              Selection saves automatically — Cancel to discard.
            </span>
          </div>
          <Button
            onClick={apply}
            className="bg-[#F5A524] text-black hover:bg-[#F5A524]/90 font-semibold px-5"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
