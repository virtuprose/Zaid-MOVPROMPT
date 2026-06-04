import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, MapPin, Check, Loader2, X } from "lucide-react";

export type LocationOption = { url: string; storage_path: string; index: number };
export type LocationStepMode = "ask" | "generating" | "picking" | "done";

type Props = {
  mode: LocationStepMode;
  description?: string;
  options?: LocationOption[];
  chosenIndex?: number;
  chosenUrl?: string;
  uploadedUrl?: string;
  disabled?: boolean;
  onUpload: (file: File) => void;
  onDescribe: (text: string) => void;
  onChoose: (index: number) => void;
  onSkip: () => void;
};

const CHIPS = [
  "Modern studio with soft window light",
  "Sunlit kitchen, marble counter",
  "Neon-lit Tokyo alley at night",
  "Beach at golden hour",
  "Cozy bedroom, warm lamp",
  "Industrial loft, exposed brick",
  "Rooftop bar, city skyline at dusk",
  "Misty forest, morning fog",
];

export function LocationStepCard({
  mode,
  description,
  options,
  chosenIndex,
  chosenUrl,
  uploadedUrl,
  disabled,
  onUpload,
  onDescribe,
  onChoose,
  onSkip,
}: Props) {
  const [text, setText] = useState(description ?? "");
  const [draftIndex, setDraftIndex] = useState<number | null>(chosenIndex ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDone = mode === "done";
  const finalUrl = chosenUrl ?? uploadedUrl;

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-4 max-w-2xl border border-border/30">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          Pick a location for the scene
        </div>
        {!isDone && (
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-40"
          >
            Skip
          </button>
        )}
      </div>

      {mode === "ask" && (
        <>
          <p className="text-xs text-muted-foreground/80">
            Lock the place before the key frame so the character lands somewhere believable.
            Upload a reference photo, or describe it and I&apos;ll design 3 options.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "group rounded-xl border border-dashed border-border/50 bg-background/40 p-4 text-left",
                "hover:border-primary/60 hover:bg-primary/5 transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Upload className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-medium">Upload a reference</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                Use an exact place — photo, frame, plate.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
            </button>

            <div
              className={cn(
                "rounded-xl border border-border/40 bg-background/40 p-4",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              <Sparkles className="h-5 w-5 text-accent mb-2" />
              <div className="text-sm font-medium mb-2">Describe a location</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. a rooftop bar at golden hour, city skyline behind"
                rows={2}
                className="w-full text-xs bg-background/60 border border-border/40 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Button
                type="button"
                size="sm"
                disabled={!text.trim() || disabled}
                onClick={() => onDescribe(text.trim())}
                className="mt-2 w-full"
              >
                Design 3 options
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => setText(c)}
                className="text-[10px] px-2 py-1 rounded-full bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "generating" && (
        <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Designing 3 location options…</span>
        </div>
      )}

      {mode === "picking" && options && options.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground/80">
            Tap a location to lock it in. The character sheet will be composited into it.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {options.map((loc) => {
              const isSel = draftIndex === loc.index;
              return (
                <button
                  key={loc.storage_path}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDraftIndex(loc.index)}
                  className={cn(
                    "relative rounded-lg overflow-hidden border aspect-video group transition-all",
                    isSel
                      ? "border-primary ring-2 ring-primary/60"
                      : "border-border/30 hover:border-border/70 hover:-translate-y-0.5",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <img
                    src={loc.url}
                    alt={`Location ${loc.index}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                    {loc.index}
                  </div>
                  {isSel && (
                    <div className="absolute inset-0 bg-primary/15 flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary drop-shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={draftIndex === null || disabled}
            onClick={() => draftIndex !== null && onChoose(draftIndex)}
            className="w-full"
          >
            Lock this location
          </Button>
        </>
      )}

      {isDone && finalUrl && (
        <div className="flex items-center gap-3 rounded-lg bg-background/40 p-2.5 border border-border/30">
          <img
            src={finalUrl}
            alt="Locked location"
            className="h-14 w-24 object-cover rounded-md"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Location locked
            </div>
            <div className="text-[11px] text-muted-foreground/70 truncate">
              {uploadedUrl ? "Your uploaded reference" : `Option ${chosenIndex} of 3`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
