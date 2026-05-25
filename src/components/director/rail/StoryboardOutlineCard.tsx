import { RailSection } from "./RailSection";
import { cn } from "@/lib/utils";

export type StoryboardPanel = {
  url: string;
  shot: number;
  caption?: string;
  status: "done" | "rendering" | "queued" | "failed";
};

interface StoryboardOutlineCardProps {
  panels: StoryboardPanel[];
}

type Variant = "active" | "pending" | "attention";

function variantFor(p: StoryboardPanel, isFirst: boolean): Variant {
  if (p.status === "failed") return "attention";
  if (isFirst) return "active";
  return "pending";
}

export function StoryboardOutlineCard({ panels }: StoryboardOutlineCardProps) {
  return (
    <RailSection
      id="storyboard-outline"
      title="Storyboard Outline"
      accent="primary"
      badge={
        panels.length > 0 ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {panels.length} {panels.length === 1 ? "shot" : "shots"}
          </span>
        ) : null
      }
    >
      {panels.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70 italic py-2">
          No storyboard yet — ask the Director to build one.
        </p>
      ) : (
        <div className="relative space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {/* Timeline vertical line */}
          <div
            className="absolute left-[13px] top-2 bottom-2 w-px"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--brand) / 0.5), hsl(var(--foreground) / 0.08), transparent)",
            }}
            aria-hidden
          />
          {panels.map((p, i) => {
            const variant = variantFor(p, i === 0);
            return (
              <a
                key={`${p.shot}-${p.url}`}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="relative flex gap-3 group cursor-pointer"
              >
                <div
                  className={cn(
                    "z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                    variant === "active" &&
                      "bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] ring-4 ring-[hsl(var(--brand)/0.2)]",
                    variant === "pending" &&
                      "bg-[hsl(var(--card))] border border-foreground/20 text-foreground/40 group-hover:border-foreground/40",
                    variant === "attention" &&
                      "bg-[hsl(var(--primary)/0.2)] border border-[hsl(var(--primary)/0.5)] text-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary)/0.1)]",
                  )}
                >
                  <span className="text-[10px] font-bold tabular-nums">
                    {String(p.shot).padStart(2, "0")}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex-1 min-w-0 p-2.5 rounded-xl border transition-colors",
                    variant === "active" &&
                      "bg-gradient-to-r from-[hsl(var(--brand)/0.1)] to-transparent border-[hsl(var(--brand)/0.3)]",
                    variant === "pending" &&
                      "bg-transparent border-white/5 group-hover:bg-foreground/[0.02]",
                    variant === "attention" &&
                      "bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.2)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-muted/40 border border-white/5">
                      <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-[12px] font-medium truncate",
                          variant === "active" && "text-foreground",
                          variant === "pending" && "text-foreground/60 group-hover:text-foreground",
                          variant === "attention" && "text-[hsl(var(--primary))]",
                        )}
                      >
                        {p.caption || `Shot ${p.shot}`}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-0.5 uppercase tracking-tight font-semibold truncate",
                          variant === "active" && "text-[hsl(var(--brand))]",
                          variant === "pending" && "text-foreground/30",
                          variant === "attention" && "text-[hsl(var(--primary)/0.8)]",
                        )}
                      >
                        {variant === "active"
                          ? "Current view"
                          : variant === "attention"
                            ? "Failed — retry"
                            : p.status}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </RailSection>
  );
}
