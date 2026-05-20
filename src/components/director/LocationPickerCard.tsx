import { useState } from "react";
import { cn } from "@/lib/utils";
import { Maximize2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

export type StoryLocation = {
  url: string;
  storage_path: string;
  index: number;
};

type Props = {
  locations: StoryLocation[];
  characterUrl?: string;
  propUrl?: string;
  aspect: "16:9" | "9:16" | "1:1";
  chosenIndex?: number;
  disabled?: boolean;
  onChoose: (index: number) => void;
};

export function LocationPickerCard({ locations, characterUrl, propUrl, aspect, chosenIndex, disabled, onChoose }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const aspectClass =
    aspect === "9:16" ? "aspect-[9/16]" : aspect === "1:1" ? "aspect-square" : "aspect-video";

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          Story step 4 — pick your location
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          Drag a location into the slot, or tap one.
        </div>
      </div>

      {(characterUrl || propUrl) && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {characterUrl && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Character locked
            </span>
          )}
          {propUrl && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Prop locked
            </span>
          )}
        </div>
      )}

      {/* Drop slot */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          const idx = Number(e.dataTransfer.getData("text/plain"));
          if (!Number.isNaN(idx)) onChoose(idx);
        }}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all",
          aspectClass,
          "max-w-md mx-auto w-full",
          chosenIndex
            ? "border-primary/50 bg-primary/5"
            : over
              ? "border-primary bg-primary/10"
              : "border-border/40 bg-background/30",
        )}
      >
        {chosenIndex && locations[chosenIndex - 1] ? (
          <img
            src={locations[chosenIndex - 1].url}
            alt={`Location ${chosenIndex}`}
            className="absolute inset-0 w-full h-full object-cover rounded-xl"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/70">
            <MousePointerClick className="h-6 w-6" />
            <div className="text-xs font-medium">Drop a location here</div>
            <div className="text-[10px]">…or tap one below</div>
          </div>
        )}
      </div>

      {/* 7-location grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {locations.map((loc) => {
          const isChosen = chosenIndex === loc.index;
          return (
            <button
              key={loc.storage_path}
              type="button"
              draggable={!disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(loc.index));
                setDragIndex(loc.index);
              }}
              onDragEnd={() => setDragIndex(null)}
              onClick={() => !disabled && onChoose(loc.index)}
              disabled={disabled}
              className={cn(
                "relative rounded-lg overflow-hidden border aspect-square group transition-all",
                isChosen
                  ? "border-primary ring-2 ring-primary/50"
                  : "border-border/30 hover:border-border/60 hover:-translate-y-0.5",
                dragIndex === loc.index && "opacity-40",
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
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                <Maximize2 className="h-4 w-4 opacity-0 group-hover:opacity-80 text-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      {chosenIndex && (
        <div className="text-center text-xs text-muted-foreground/80">
          Location {chosenIndex} locked. Director is composing the 8 acts…
        </div>
      )}
    </div>
  );
}
