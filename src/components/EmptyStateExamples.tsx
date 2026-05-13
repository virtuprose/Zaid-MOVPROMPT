import exampleTokyo from "@/assets/example-tokyo.jpg";
import exampleDesert from "@/assets/example-desert.jpg";
import examplePortrait from "@/assets/example-portrait.jpg";

interface ExampleItem {
  thumb: string;
  alt: string;
  title: string;
  model: string;
  duration: string;
}

const EXAMPLES: ExampleItem[] = [
  {
    thumb: exampleTokyo,
    alt: "Neon Tokyo alley",
    title: "Slow push-in on neon Tokyo alley",
    model: "Kling 3.0",
    duration: "10s",
  },
  {
    thumb: exampleDesert,
    alt: "Desert at golden hour",
    title: "Wide pan across desert at golden hour",
    model: "Veo 3",
    duration: "8s",
  },
  {
    thumb: examplePortrait,
    alt: "Rainy window portrait",
    title: "Tight portrait, rain on window, rack focus",
    model: "Sora",
    duration: "6s",
  },
];

export const EmptyStateExamples = () => {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 px-1">
        Examples — Try one of these or upload your own
      </p>
      <div className="space-y-2.5">
        {EXAMPLES.map((ex, i) => (
          <div
            key={i}
            className="group flex items-stretch gap-3 rounded-xl border border-border bg-card/40 p-2.5 hover:border-border/80 hover:bg-card/60 transition-colors"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-muted/40">
              <img
                src={ex.thumb}
                alt={ex.alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                {ex.title}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-md border border-border/70 bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {ex.model}
                </span>
                <span className="inline-flex items-center rounded-md border border-border/70 bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {ex.duration}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
