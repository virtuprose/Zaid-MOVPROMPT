import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useBrandKit, type LocationInput } from "@/lib/marketing/brandKit";

const PRESETS = [
  "Tokyo",
  "New York",
  "Paris",
  "Dubai",
  "Los Angeles",
  "London",
  "Lagos",
  "São Paulo",
  "Seoul",
  "Mexico City",
  "Mumbai",
  "Berlin",
];

export function LocationPopover({
  trigger,
  value,
  onChange,
}: {
  trigger: React.ReactNode;
  value: LocationInput;
  onChange: (v: LocationInput) => void;
}) {
  const { uploadLocationImage } = useBrandKit();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LocationInput>(value);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOpen = (o: boolean) => {
    if (o) setDraft(value);
    setOpen(o);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const { path, url } = await uploadLocationImage(file);
      setDraft((d) => ({ ...d, imagePath: path, imageUrl: url }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const clear = () => {
    const empty = { place: "", imagePath: null, imageUrl: null };
    setDraft(empty);
    onChange(empty);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Tabs defaultValue="place" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent">
            <TabsTrigger value="place" className="flex-1">Place</TabsTrigger>
            <TabsTrigger value="image" className="flex-1">Reference image</TabsTrigger>
          </TabsList>

          <TabsContent value="place" className="p-3 space-y-3 mt-0">
            <Input
              autoFocus
              value={draft.place}
              onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))}
              placeholder="Tokyo rooftop, Marrakech medina…"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, place: p }))}
                  className={cn(
                    "px-2.5 h-7 rounded-full text-xs border transition-colors",
                    draft.place === p
                      ? "border-[#F5A524] bg-[#F5A524]/15 text-foreground"
                      : "border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="image" className="p-3 space-y-3 mt-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {draft.imageUrl ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/60">
                <img src={draft.imageUrl} alt="Location" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, imagePath: null, imageUrl: null }))
                  }
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-lg border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="text-xs">Upload a photo of the location</span>
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Storefront, neighborhood, room — used as visual ground truth.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 p-3 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={clear} className="flex-1">
            Clear
          </Button>
          <Button
            size="sm"
            onClick={apply}
            className="flex-1 bg-[#F5A524] text-black hover:bg-[#F5A524]/90"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
