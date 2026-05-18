import { cn } from "@/lib/utils";

export type GeneratedImageBubbleData = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  images: Array<{ url: string; storage_path: string; shot_index?: number }>;
  directorsNote?: string;
};

type Props = {
  data: GeneratedImageBubbleData;
};

export function GeneratedImageCard({ data }: Props) {
  const isGrid = data.mode === "storyboard_panels" && data.images.length > 1;
  const label =
    data.mode === "character_sheet"
      ? "Character sheet"
      : data.mode === "storyboard_panels"
        ? `Storyboard · ${data.images.length} panels`
        : "Generated frame";

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
        {data.images.map((img, i) => (
          <div
            key={img.storage_path}
            className="relative rounded-lg overflow-hidden border border-border/30 bg-background/30 aspect-square"
          >
            <img
              src={img.url}
              alt={`Generated ${data.mode} ${img.shot_index ?? i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.shot_index && (
              <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                {img.shot_index}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
