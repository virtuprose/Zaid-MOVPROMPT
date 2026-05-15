import { useMemo, useRef, useState } from "react";
import { Loader2, Upload, X, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBrandKit, type LocationInput, EMPTY_LOCATION } from "@/lib/marketing/brandKit";

const TRENDING: string[] = ["Tokyo", "Dubai", "Paris", "LA", "Seoul"];

const REGIONS: { label: string; cities: string[] }[] = [
  { label: "MENA", cities: ["Dubai", "Riyadh", "Doha", "Istanbul", "Cairo", "Marrakech"] },
  { label: "Asia", cities: ["Tokyo", "Seoul", "Mumbai", "Bangkok", "Singapore", "Shanghai"] },
  { label: "Americas", cities: ["NYC", "LA", "Mexico City", "São Paulo", "Toronto"] },
  { label: "Europe", cities: ["London", "Paris", "Berlin", "Lisbon", "Rome"] },
  { label: "Africa", cities: ["Lagos", "Cape Town", "Nairobi"] },
];

export function LocationPanel({
  value,
  onChange,
}: {
  value: LocationInput;
  onChange: (v: LocationInput) => void;
}) {
  const { uploadLocationImage } = useBrandKit();
  const [uploading, setUploading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) return toast.error("Use PNG or JPG");
    setUploading(true);
    try {
      const { path, url } = await uploadLocationImage(file);
      onChange({ ...value, imagePath: path, imageUrl: url });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const query = (value.place || "").trim().toLowerCase();
  const isFiltering = query.length > 0;

  const filteredTrending = useMemo(
    () => (isFiltering ? TRENDING.filter((c) => c.toLowerCase().includes(query)) : TRENDING),
    [query, isFiltering],
  );
  const filteredRegions = useMemo(() => {
    if (!isFiltering) return REGIONS;
    return REGIONS
      .map((g) => ({ ...g, cities: g.cities.filter((c) => c.toLowerCase().includes(query)) }))
      .filter((g) => g.cities.length > 0);
  }, [query, isFiltering]);

  const hasMatches = filteredTrending.length > 0 || filteredRegions.length > 0;

  const Chip = ({ city }: { city: string }) => {
    const selected = value.place === city;
    return (
      <button
        type="button"
        onClick={() => onChange({ ...value, place: city })}
        className={cn(
          "px-2.5 h-7 rounded-full text-xs border transition-colors cursor-pointer",
          selected
            ? "border-[#F5A524] bg-[#F5A524] text-black font-medium"
            : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-[#F5A524]/60 hover:bg-[#F5A524]/5",
        )}
      >
        {city}
      </button>
    );
  };

  const hasAny = !!(value.place || value.imagePath);

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F5A524]" /> Location
          </div>
          <div className="text-[11px] text-muted-foreground">
            Where in the world the scene takes place. Optional.
          </div>
        </div>
        {hasAny && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_LOCATION)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
        <div className="space-y-2">
          <Input
            value={value.place}
            onChange={(e) => onChange({ ...value, place: e.target.value })}
            placeholder="Tokyo, Marrakech, Dubai…"
            className="bg-background/60"
          />
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {filteredTrending.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
                  {isFiltering ? "Matches · Trending" : "Trending"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredTrending.map((c) => (
                    <Chip key={`t-${c}`} city={c} />
                  ))}
                </div>
              </div>
            )}
            {(isFiltering || showAll) &&
              filteredRegions.map((g) => (
                <div key={g.label} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.cities.map((c) => (
                      <Chip key={`${g.label}-${c}`} city={c} />
                    ))}
                  </div>
                </div>
              ))}
            {!isFiltering && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs text-[#F5A524] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> See all locations
              </button>
            )}
            {isFiltering && !hasMatches && (
              <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-[#F5A524]" />
                Using "{value.place}" as a custom location.
              </div>
            )}
          </div>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {value.imageUrl ? (
            <div className="space-y-1.5">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/60 bg-muted/10">
                <img src={value.imageUrl} alt="Location" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onChange({ ...value, imagePath: null, imageUrl: null })}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] text-[#F5A524] hover:underline"
              >
                Replace image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full h-full min-h-[120px] rounded-lg border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-[#F5A524]/60 hover:bg-[#F5A524]/5 transition-colors px-3"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-[11px]">Reference image</span>
              <span className="text-[10px] text-muted-foreground/70">PNG/JPG · ≤5MB</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
