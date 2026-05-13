import { ArrowRight } from "lucide-react";
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
      <p className="text-[13px] text-muted-foreground px-1">
        Examples · Try one or upload your own
      </p>
      <div className="space-y-2">
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="group flex w-full items-center gap-3 h-[120px] rounded-xl border border-border/60 bg-card/40 p-2.5 text-left transition-colors cursor-pointer hover:border-primary/40 hover:bg-[#161618]"
          >
            <div className="w-[140px] aspect-video shrink-0 rounded-md overflow-hidden bg-muted/40">
              <img
                src={ex.thumb}
                alt={ex.alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
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
            <span className="shrink-0 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 pe-1">
              Use this <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
