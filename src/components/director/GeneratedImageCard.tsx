import { RotateCcw, Film, Maximize2, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

export type GeneratedImageBubbleData = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  images: Array<{ url: string; storage_path: string; shot_index?: number }>;
  directorsNote?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
};

type Props = {
  data: GeneratedImageBubbleData;
  onRegenerate?: (intent: string) => void;
};

export function GeneratedImageCard({ data, onRegenerate }: Props) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const isGrid = data.mode === "storyboard_panels" && data.images.length > 1;
  const isKeyFrame = data.mode === "single_panel";
  const label =
    data.mode === "character_sheet"
      ? "Character sheet · 3 views"
      : data.mode === "storyboard_panels"
        ? `Storyboard · ${data.images.length} panels`
        : "Key frame · hero shot";

  const regen = (intent: string) => {
    if (!onRegenerate) return;
    onRegenerate(intent);
  };

  const n = data.images.length;
  const hasMultiple = n > 1;
  const goPrev = useCallback(
    () => setZoomIndex((i) => (i === null ? i : (i - 1 + n) % n)),
    [n],
  );
  const goNext = useCallback(
    () => setZoomIndex((i) => (i === null ? i : (i + 1) % n)),
    [n],
  );

  useEffect(() => {
    if (zoomIndex === null || !hasMultiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIndex, hasMultiple, goPrev, goNext]);

  return (
    <>
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-3 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          {isKeyFrame
            ? "Locked as scene anchor — extend it into a sequence below."
            : "Locked as references — continue the chat to use them."}
        </div>
      </div>

      {data.directorsNote && (
        <div className="text-sm text-foreground/85 italic leading-snug">
          {data.directorsNote}
        </div>
      )}

      <div
        className={cn(
          isGrid
            ? "grid grid-cols-3 gap-2"
            : "grid grid-cols-1 gap-2 max-w-sm",
        )}
      >
        {data.images.map((img, i) => {
          const shotNum = img.shot_index ?? i + 1;
          const regenIntent =
            data.mode === "storyboard_panels"
              ? `Regenerate panel ${shotNum} — keep the same anchor reference and locked style, just re-roll this one shot.`
              : data.mode === "character_sheet"
                ? "Regenerate the character sheet — same brief, give me another take on the design."
                : "Regenerate this key frame — same brief, another take on the composition.";
          return (
            <div
              key={img.storage_path}
              className="group relative rounded-lg overflow-hidden border border-border/30 bg-background/30 aspect-square"
            >
              <img
                src={img.url}
                alt={`Generated ${data.mode} ${shotNum}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {data.mode === "storyboard_panels" && (
                <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                  {shotNum}
                </div>
              )}
              <button
                type="button"
                onClick={() => setZoomIndex(i)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                title="Expand"
                aria-label="Expand image"
              >
                <span className="bg-background/85 hover:bg-background text-foreground p-2 rounded-full shadow-md">
                  <Maximize2 className="h-5 w-5" />
                </span>
              </button>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => regen(regenIntent)}
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-background/85 hover:bg-background text-foreground text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1"
                  title={
                    data.mode === "storyboard_panels"
                      ? `Regenerate panel ${shotNum}`
                      : "Regenerate"
                  }
                >
                  <RotateCcw className="h-3 w-3" />
                  {data.mode === "storyboard_panels" ? `Redo ${shotNum}` : "Redo"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {onRegenerate && isGrid && (
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() =>
              regen(
                "Regenerate all storyboard panels — keep the same anchor reference, locked style, and beat sheet; just re-roll the renders.",
              )
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Regenerate all panels
          </Button>
        </div>
      )}

      {onRegenerate && isKeyFrame && (
        <div className="pt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() =>
              regen(
                "Extend this key frame into a sequence — propose 8 continuation beats that keep the same scene, lighting, lens, color grade, and composition (only action and framing change), then generate them as a scene-locked storyboard.",
              )
            }
          >
            <Film className="h-3 w-3 mr-1" />
            Extend frame-by-frame
          </Button>
        </div>
      )}
    </div>

    <Dialog open={zoomIndex !== null} onOpenChange={(o) => !o && setZoomIndex(null)}>
      <DialogContent className="max-w-[95vw] w-fit p-0 bg-background/95 border-border/40">
        {zoomIndex !== null && (
          <div className="relative">
            <img
              src={data.images[zoomIndex].url}
              alt="Expanded view"
              className="max-h-[90vh] max-w-[95vw] w-auto h-auto object-contain rounded-lg"
            />
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium bg-background/85 text-foreground px-2 py-1 rounded-full">
                  {zoomIndex + 1} / {n}
                </div>
              </>
            )}
          </div>
        )}
        <DialogClose className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1.5 rounded-md">
          <X className="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
    </>
  );
}
