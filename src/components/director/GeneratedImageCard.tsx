import { RotateCcw, Film, Maximize2, X, ChevronLeft, ChevronRight, Download, Wand2, Lightbulb, Play, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptInspector, type InspectorContext } from "./PromptInspector";

export type GeneratedImageBubbleData = {
  mode: "character_sheet" | "storyboard_panels" | "single_panel";
  images: Array<{ url: string; storage_path: string; shot_index?: number }>;
  directorsNote?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  progress?: { done: number; total: number };
  subjectSheet?: boolean;
  subjectKind?: "character" | "product";
  failedIndices?: number[];
  inspector?: InspectorContext;
};

export type AnimatePanelInput = {
  url: string;
  shot_index: number;
  directorsNote?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
};

type Props = {
  data: GeneratedImageBubbleData;
  onRegenerate?: (intent: string) => void;
  onUnpinSubject?: () => void;
  onAnimatePanel?: (panel: AnimatePanelInput) => void | Promise<void>;
  onAnimateAllPanels?: (panels: AnimatePanelInput[]) => void | Promise<void>;
};

// ---- Layer 3 chip presets ----
const SHOT_CHIPS = ["WS", "MS", "MCU", "CU", "ECU", "OTS", "Insert", "Low angle", "Eye level", "High angle", "Dutch tilt"];
const MOVE_CHIPS = ["Static", "Slow push-in", "Slow pull-out", "Dolly", "Pan", "Tilt", "Handheld micro-drift", "Crane", "Tracking"];
const LIGHT_CHIPS = ["Golden hour key", "Blue hour", "Hard side key", "Soft front fill", "Backlight rim", "Practical only", "Moonlit", "Window light", "Top-down hard"];
const MOOD_CHIPS = ["Tense", "Serene", "Melancholic", "Triumphant", "Intimate", "Ominous", "Awe", "Lonely"];

const GRADE_CHIPS = ["Teal & amber", "Bleach bypass", "Warm filmic", "Cool desaturated", "High-contrast noir", "Pastel halation", "Kodachrome saturated", "Cross-processed"];
const FILM_CHIPS = ["Kodak Vision3 500T", "Kodak Portra 400", "Cinestill 800T", "Fuji Eterna", "Arri Alexa native", "Ilford HP5 B&W", "16mm grain", "65mm IMAX clean"];
const ATMO_CHIPS = ["Dawn mist", "Dusk haze", "Heavy atmosphere", "Clean air", "Rain wet", "Smoke-filled", "Dust motes", "Night fog"];

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10.5px] px-2 py-0.5 rounded-full border transition-colors",
        active
          ? "bg-primary/15 text-primary border-primary/40"
          : "bg-muted/30 text-muted-foreground/85 border-border/40 hover:bg-muted/50",
      )}
    >
      {label}
    </button>
  );
}

function ChipGroup({
  title, options, value, onChange,
}: { title: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{title}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Chip key={o} label={o} active={value === o} onClick={() => onChange(value === o ? null : o)} />
        ))}
      </div>
    </div>
  );
}

function PolishPanelPopover({
  shotNum, onApply,
}: { shotNum: number; onApply: (intent: string) => void }) {
  const [shot, setShot] = useState<string | null>(null);
  const [move, setMove] = useState<string | null>(null);
  const [light, setLight] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const apply = () => {
    const overrides: string[] = [];
    if (shot) overrides.push(`shot type → ${shot}`);
    if (move) overrides.push(`camera move → ${move}`);
    if (light) overrides.push(`lighting → ${light}`);
    if (mood) overrides.push(`mood → ${mood}`);
    const overrideClause = overrides.length
      ? ` Apply these polish overrides for this single shot: ${overrides.join("; ")}.`
      : "";
    const intent = `Polish panel ${shotNum} — keep the same anchor reference, same character/wardrobe/world, same color grade and film stock as the rest of the sequence. Tighten composition, motivated lighting, lens-correct geometry, finished cinematography quality (no draft sketch look).${overrideClause} Re-render only this single panel.`;
    onApply(intent);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-background/85 hover:bg-background text-foreground p-1.5 rounded"
          title={`Polish panel ${shotNum}`}
          aria-label={`Polish panel ${shotNum}`}
        >
          <Wand2 className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-3">
        <div>
          <div className="text-xs font-medium text-foreground">Polish panel {shotNum}</div>
          <div className="text-[10.5px] text-muted-foreground/80">Override one or more dimensions, then re-render just this shot.</div>
        </div>
        <ChipGroup title="Shot type" options={SHOT_CHIPS} value={shot} onChange={setShot} />
        <ChipGroup title="Camera move" options={MOVE_CHIPS} value={move} onChange={setMove} />
        <ChipGroup title="Lighting" options={LIGHT_CHIPS} value={light} onChange={setLight} />
        <ChipGroup title="Mood" options={MOOD_CHIPS} value={mood} onChange={setMood} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-7 text-xs" onClick={apply}>
            Polish shot
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RelightSequencePopover({ onApply }: { onApply: (intent: string) => void }) {
  const [light, setLight] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [film, setFilm] = useState<string | null>(null);
  const [atmo, setAtmo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const apply = () => {
    const parts: string[] = [];
    if (light) parts.push(`lighting: ${light}`);
    if (grade) parts.push(`color grade: ${grade}`);
    if (film) parts.push(`film emulation: ${film}`);
    if (atmo) parts.push(`atmosphere: ${atmo}`);
    const spec = parts.length ? ` New locked style_spec → ${parts.join(" · ")}.` : "";
    const intent = `Re-light the whole sequence — re-render every panel with a tightened style_spec. Keep the exact same shot beats, framing, blocking, subject/wardrobe/props; only the lighting, color grade, film stock and atmospheric density change. Propagate the new spec identically to every panel so the grade locks across the series.${spec}`;
    onApply(intent);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="secondary" className="h-7 text-xs">
          <Lightbulb className="h-3 w-3 mr-1" />
          Re-light all panels
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-96 space-y-3">
        <div>
          <div className="text-xs font-medium text-foreground">Re-light the whole sequence</div>
          <div className="text-[10.5px] text-muted-foreground/80">
            Lock a new lighting / grade / film stock and propagate it to every panel. Shot beats stay the same.
          </div>
        </div>
        <ChipGroup title="Lighting" options={LIGHT_CHIPS} value={light} onChange={setLight} />
        <ChipGroup title="Color grade" options={GRADE_CHIPS} value={grade} onChange={setGrade} />
        <ChipGroup title="Film emulation" options={FILM_CHIPS} value={film} onChange={setFilm} />
        <ChipGroup title="Atmosphere" options={ATMO_CHIPS} value={atmo} onChange={setAtmo} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-7 text-xs" onClick={apply}>
            Re-light sequence
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function GeneratedImageCard({ data, onRegenerate, onUnpinSubject, onAnimatePanel, onAnimateAllPanels }: Props) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [animatingShots, setAnimatingShots] = useState<Set<number>>(new Set());
  const [animateAllOpen, setAnimateAllOpen] = useState(false);
  const [animatingAll, setAnimatingAll] = useState(false);

  const handleAnimateOne = useCallback(async (panel: AnimatePanelInput) => {
    if (!onAnimatePanel) return;
    if (animatingShots.has(panel.shot_index)) return;
    setAnimatingShots((prev) => {
      const next = new Set(prev);
      next.add(panel.shot_index);
      return next;
    });
    try {
      await onAnimatePanel(panel);
    } finally {
      setAnimatingShots((prev) => {
        const next = new Set(prev);
        next.delete(panel.shot_index);
        return next;
      });
    }
  }, [onAnimatePanel, animatingShots]);

  const handleAnimateAll = useCallback(async () => {
    if (!onAnimateAllPanels) return;
    setAnimateAllOpen(false);
    setAnimatingAll(true);
    try {
      const panels: AnimatePanelInput[] = data.images.map((img, i) => ({
        url: img.url,
        shot_index: img.shot_index ?? i + 1,
        directorsNote: data.directorsNote,
        aspectRatio: data.aspectRatio,
      }));
      await onAnimateAllPanels(panels);
    } finally {
      setAnimatingAll(false);
    }
  }, [onAnimateAllPanels, data.images, data.directorsNote, data.aspectRatio]);

  const progress = data.progress;
  const inProgress = !!progress && progress.done < progress.total;
  const isGrid =
    data.mode === "storyboard_panels" && (data.images.length > 1 || (progress?.total ?? 0) > 1);
  const isKeyFrame = data.mode === "single_panel";
  const subjectLabel = data.subjectKind === "product" ? "Product" : "Character";
  const label = data.subjectSheet
    ? `${subjectLabel} sheet · pinned`
    : data.mode === "character_sheet"
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

  const downloadImage = useCallback(async (url: string, shotNum: number) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").split("+")[0];
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${data.mode}-${shotNum}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }, [data.mode]);
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
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80 inline-flex items-center gap-1.5">
          {data.subjectSheet && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" aria-hidden />
          )}
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground/60 inline-flex items-center gap-2">
          {inProgress
            ? `Rendering · ${progress!.done} / ${progress!.total}${(data.failedIndices?.length ?? 0) > 0 ? ` · ${data.failedIndices!.length} failed` : ""}`
            : (data.failedIndices?.length ?? 0) > 0
              ? `${data.failedIndices!.length} panel${data.failedIndices!.length === 1 ? "" : "s"} failed — credits refunded.`
              : data.subjectSheet
                ? "Auto-attached to every frame in this session."
                : isKeyFrame
                  ? "Locked as scene anchor — extend it into a sequence below."
                  : "Locked as references — continue the chat to use them."}
          {data.subjectSheet && onUnpinSubject && !inProgress && (
            <button
              type="button"
              onClick={onUnpinSubject}
              className="text-[10px] uppercase tracking-wide text-muted-foreground/70 hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Unpin
            </button>
          )}
        </div>
      </div>

      {inProgress && (
        <div className="h-px bg-muted/40 overflow-hidden rounded-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(progress!.done / progress!.total) * 100}%` }}
          />
        </div>
      )}

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
              {data.mode === "storyboard_panels" && onRegenerate && (
                <PolishPanelPopover shotNum={shotNum} onApply={regen} />
              )}
              {data.mode === "storyboard_panels" && onAnimatePanel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAnimateOne({
                          url: img.url,
                          shot_index: shotNum,
                          directorsNote: data.directorsNote,
                          aspectRatio: data.aspectRatio,
                        });
                      }}
                      disabled={animatingShots.has(shotNum)}
                      className="absolute top-1 right-9 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all bg-background/85 hover:bg-accent hover:text-accent-foreground text-foreground p-1.5 rounded disabled:opacity-60"
                      aria-label={`Animate panel ${shotNum}`}
                    >
                      {animatingShots.has(shotNum) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Animate panel {shotNum} · Kling 2.1 Master</TooltipContent>
                </Tooltip>
              )}
              {data.inspector && (
                <PromptInspector
                  ctx={data.inspector}
                  shotIndex={data.mode === "storyboard_panels" ? shotNum : undefined}
                  triggerTitle={
                    data.mode === "storyboard_panels"
                      ? `Inspect prompt · Shot ${shotNum}`
                      : "Inspect prompt"
                  }
                />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setZoomIndex(i)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    aria-label="Expand image"
                  >
                    <span className="bg-background/85 hover:bg-primary hover:text-primary-foreground text-foreground p-2 rounded-full shadow-md transition-colors">
                      <Maximize2 className="h-5 w-5" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Expand</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); downloadImage(img.url, shotNum); }}
                    className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all bg-background/85 hover:bg-emerald-500 hover:text-white text-foreground p-1.5 rounded"
                    aria-label="Download image"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              {onRegenerate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => regen(regenIntent)}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all bg-background/85 hover:bg-primary hover:text-primary-foreground text-foreground text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1"
                      aria-label={
                        data.mode === "storyboard_panels"
                          ? `Regenerate panel ${shotNum}`
                          : "Regenerate"
                      }
                    >
                      <RotateCcw className="h-3 w-3" />
                      {data.mode === "storyboard_panels" ? `Redo ${shotNum}` : "Redo"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {data.mode === "storyboard_panels" ? `Regenerate panel ${shotNum}` : "Regenerate"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
        {data.mode === "storyboard_panels" && (inProgress || (data.failedIndices?.length ?? 0) > 0) &&
          (() => {
            const total = progress?.total ?? data.images.length + (data.failedIndices?.length ?? 0);
            const filled = new Set(data.images.map((img, i) => img.shot_index ?? i + 1));
            const failed = new Set(data.failedIndices ?? []);
            const slots: number[] = [];
            for (let s = 1; s <= total; s++) if (!filled.has(s)) slots.push(s);
            const nextPending = slots.find((s) => !failed.has(s));
            return slots.map((shotNum) => {
              const isFailed = failed.has(shotNum);
              const isNext = inProgress && shotNum === nextPending;
              return (
                <div
                  key={`ph-${shotNum}`}
                  className={cn(
                    "relative rounded-lg overflow-hidden border aspect-square",
                    isFailed
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-border/30 bg-muted/20",
                    isNext && "animate-pulse",
                  )}
                >
                  <div className="absolute top-1 left-1 text-[10px] font-medium bg-background/60 text-muted-foreground px-1.5 py-0.5 rounded">
                    {shotNum}
                  </div>
                  {isFailed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] uppercase tracking-wide text-destructive/90 font-medium">Failed</span>
                    </div>
                  )}
                  {isFailed && onRegenerate && (
                    <button
                      type="button"
                      onClick={() =>
                        onRegenerate(
                          `Regenerate panel ${shotNum} — keep the same anchor reference and locked style, just re-roll this one shot.`,
                        )
                      }
                      className="absolute bottom-1 right-1 bg-background/85 hover:bg-background text-foreground text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1"
                      title={`Retry panel ${shotNum}`}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              );
            });
          })()}
      </div>

      {onRegenerate && isGrid && (
        <div className="pt-1 flex flex-wrap gap-2">
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
          {data.mode === "storyboard_panels" && !inProgress && (data.failedIndices?.length ?? 0) === 0 && (
            <RelightSequencePopover onApply={regen} />
          )}
          {data.mode === "storyboard_panels" && !inProgress && (data.failedIndices?.length ?? 0) === 0 && onAnimateAllPanels && (
            <Popover open={animateAllOpen} onOpenChange={setAnimateAllOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  disabled={animatingAll}
                >
                  {animatingAll ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  Animate all panels
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 space-y-3">
                <div>
                  <div className="text-xs font-medium text-foreground">Animate all panels</div>
                  <div className="text-[10.5px] text-muted-foreground/80">
                    Queues {data.images.length} Kling 2.1 Master renders — one per panel — using each frame as the starting image. Charges credits per clip.
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAnimateAllOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={() => void handleAnimateAll()}>
                    Queue {data.images.length} renders
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {data.mode === "storyboard_panels" && !inProgress && (data.failedIndices?.length ?? 0) === 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={() =>
                regen(
                  "Continue this storyboard — generate 6 more panels that pick up exactly where the last one ended. Keep the same scene anchor, locked style, lighting, lens, and color grade; only action and framing advance. Number the new panels starting from N+1 where N is the last existing panel.",
                )
              }
            >
              <Film className="h-3 w-3 mr-1" />
              Generate 6 more beats
            </Button>
          )}
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
                "Extend this key frame into a sequence — propose 6 continuation beats that keep the same scene, lighting, lens, color grade, and composition (only action and framing change), then generate them as a scene-locked storyboard.",
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
        {zoomIndex !== null && (
          <button
            type="button"
            onClick={() => downloadImage(data.images[zoomIndex].url, data.images[zoomIndex].shot_index ?? zoomIndex + 1)}
            className="absolute top-2 right-12 bg-background/80 hover:bg-background text-foreground p-1.5 rounded-md"
            title="Download"
            aria-label="Download image"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <DialogClose className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1.5 rounded-md">
          <X className="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
    </>
  );
}
