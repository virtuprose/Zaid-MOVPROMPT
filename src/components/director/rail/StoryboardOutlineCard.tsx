import { LayoutGrid } from "lucide-react";
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

const STATUS_COLOR: Record<StoryboardPanel["status"], string> = {
  done: "bg-emerald-500",
  rendering: "bg-amber-500 animate-pulse",
  queued: "bg-muted-foreground/40",
  failed: "bg-destructive",
};

export function StoryboardOutlineCard({ panels }: StoryboardOutlineCardProps) {
  return (
    <RailSection
      id="storyboard-outline"
      title="Storyboard Outline"
      icon={<LayoutGrid className="w-3.5 h-3.5" />}
      badge={
        panels.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">{panels.length} shots</span>
        ) : null
      }
    >
      {panels.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70 italic py-2">
          No storyboard yet — ask the Director to build one.
        </p>
      ) : (
        <ol className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
          {panels.map((p) => (
            <li key={`${p.shot}-${p.url}`}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border/30 bg-background/40 p-1 transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted/40 border border-border/40">
                  <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_COLOR[p.status])} />
                    <span className="text-[11px] font-medium text-foreground">Shot {p.shot}</span>
                  </div>
                  {p.caption && (
                    <p className="text-[10px] text-muted-foreground truncate">{p.caption}</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}
    </RailSection>
  );
}
