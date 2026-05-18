import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type GeneratedImageBubbleData = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  images: Array<{ url: string; storage_path: string; shot_index?: number }>;
  directorsNote?: string;
};

type Props = {
  data: GeneratedImageBubbleData;
  onRegenerate?: (intent: string) => void;
};

export function GeneratedImageCard({ data, onRegenerate }: Props) {
  const isGrid = data.mode === "storyboard_panels" && data.images.length > 1;
  const label =
    data.mode === "character_sheet"
      ? "Character sheet · 3 views"
      : data.mode === "storyboard_panels"
        ? `Storyboard · ${data.images.length} panels`
        : "Generated frame";

  const regen = (intent: string) => {
    if (!onRegenerate) return;
    onRegenerate(intent);
  };

  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-3 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          Locked as references — continue the chat to use them.
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
              ? `Regenerate panel ${shotNum} — keep the same character and locked style, just re-roll this one shot.`
              : data.mode === "character_sheet"
                ? "Regenerate the character sheet — same brief, give me another take on the design."
                : "Regenerate this reference frame — same brief, another take.";
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
                "Regenerate all storyboard panels — keep the same character, locked style, and beat sheet; just re-roll the renders.",
              )
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Regenerate all panels
          </Button>
        </div>
      )}
    </div>
  );
}
