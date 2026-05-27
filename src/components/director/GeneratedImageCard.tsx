import { RotateCcw, Film, Maximize2, X, ChevronLeft, ChevronRight, Download, Wand2, Lightbulb, Play, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PromptInspector, type InspectorContext } from "./PromptInspector";
import { AnimatePanelDialog, type AnimateDialogResult, type AudioPlan } from "./AnimatePanelDialog";

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
  provider?: string;
  duration?: 5 | 10;
  audioPlan?: AudioPlan;
};

type Props = {
  data: GeneratedImageBubbleData;
  onRegenerate?: (intent: string) => void;
  onUnpinSubject?: () => void;
  onAnimatePanel?: (panel: AnimatePanelInput) => void | Promise<void>;
  onAnimateAllPanels?: (panels: AnimatePanelInput[]) => void | Promise<void>;
};

// ---- Layer 3 chip presets ----
// ---- Layer 3 chip presets ----
type ChipDef = { label: string; value: string };

const FRAMING_CHIPS: ChipDef[] = [
  { label: "Wide shot (WS)", value: "Wide shot (WS)" },
  { label: "Medium shot (MS)", value: "Medium shot (MS)" },
  { label: "Medium close-up (MCU)", value: "Medium close-up (MCU)" },
  { label: "Close-up (CU)", value: "Close-up (CU)" },
  { label: "Extreme close-up (ECU)", value: "Extreme close-up (ECU)" },
  { label: "Over-the-shoulder (OTS)", value: "Over-the-shoulder (OTS)" },
  { label: "Insert", value: "Insert" },
];
const ANGLE_CHIPS: ChipDef[] = [
  { label: "Low angle", value: "Low angle" },
  { label: "Eye level", value: "Eye level" },
  { label: "High angle", value: "High angle" },
  { label: "Dutch tilt", value: "Dutch tilt" },
];

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
        "text-xs px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary/15 text-primary border-primary/50 ring-1 ring-primary/40"
          : "bg-muted/30 text-muted-foreground/85 border-border/40 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ChipGroup({
  title, hint, options, value, onChange,
}: {
  title: string;
  hint?: string;
  options: Array<string | ChipDef>;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/85">{title}</div>
          {hint && <div className="text-[10.5px] text-muted-foreground/75 leading-snug">{hint}</div>}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const label = typeof o === "string" ? o : o.label;
          const v = typeof o === "string" ? o : o.value;
          return (
            <Chip key={v} label={label} active={value === v} onClick={() => onChange(value === v ? null : v)} />
          );
        })}
      </div>
    </div>
  );
}

function PolishPanelPopover({
  shotNum, onApply,
}: { shotNum: number; onApply: (intent: string) => void }) {
  const [framing, setFraming] = useState<string | null>(null);
  const [angle, setAngle] = useState<string | null>(null);
  const [move, setMove] = useState<string | null>(null);
  const [light, setLight] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const hasAny = !!(framing || angle || move || light || mood);

  const apply = () => {
    const overrides: string[] = [];
    if (framing) overrides.push(`framing → ${framing}`);
    if (angle) overrides.push(`camera angle → ${angle}`);
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
          className="absolute top-1 right-1 z-10 opacity-70 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-all bg-background/85 hover:bg-background text-foreground p-1.5 rounded"
          title={`Refine shot ${shotNum}`}
          aria-label={`Refine shot ${shotNum}`}
        >
          <Wand2 className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[22rem] max-h-[70vh] overflow-y-auto space-y-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold text-foreground">Refine this shot</div>
            <div className="text-[10.5px] text-muted-foreground/70">· Panel {shotNum}</div>
          </div>
          <div className="text-[11px] text-muted-foreground/85 leading-snug">
            Adjust any of these and I'll re-render just this panel. Leave a row untouched to keep it the same.
          </div>
        </div>

        <ChipGroup
          title="Framing"
          hint="How tight is the camera on the subject?"
          options={FRAMING_CHIPS}
          value={framing}
          onChange={setFraming}
        />
        <ChipGroup
          title="Camera angle"
          hint="Where is the camera looking from?"
          options={ANGLE_CHIPS}
          value={angle}
          onChange={setAngle}
        />
        <ChipGroup
          title="Camera move"
          hint="How does the camera move during the shot?"
          options={MOVE_CHIPS}
          value={move}
          onChange={setMove}
        />
        <ChipGroup
          title="Lighting"
          hint="What's the dominant light source and quality?"
          options={LIGHT_CHIPS}
          value={light}
          onChange={setLight}
        />
        <ChipGroup
          title="Mood"
          hint="What should the shot feel like?"
          options={MOOD_CHIPS}
          value={mood}
          onChange={setMood}
        />

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="text-[10.5px] text-muted-foreground/80 leading-snug">
            {hasAny ? "Only this panel changes." : "Pick at least one change to continue."}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={apply} disabled={!hasAny}>
              Re-render this shot
            </Button>
          </div>
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
  const [singleAnimate, setSingleAnimate] = useState<AnimatePanelInput | null>(null);

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

  const handleAnimateAll = useCallback(async (result: AnimateDialogResult) => {
    if (!onAnimateAllPanels) return;
    setAnimatingAll(true);
    try {
      const panels: AnimatePanelInput[] = data.images.map((img, i) => ({
        url: img.url,
        shot_index: img.shot_index ?? i + 1,
        directorsNote: data.directorsNote,
        aspectRatio: data.aspectRatio,
        provider: result.provider,
        duration: result.duration,
        audioPlan: result.audioPlan,
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
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setZoomIndex(i)}
                    className="absolute inset-0 z-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    aria-label="Expand image"
                  >
                    <span className="bg-background/85 hover:bg-primary hover:text-primary-foreground text-foreground p-2 rounded-full shadow-md transition-colors">
                      <Maximize2 className="h-5 w-5" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Expand</TooltipContent>
              </Tooltip>
              {data.mode === "storyboard_panels" && (
                <div className="absolute top-1 left-1 z-10 text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                  {shotNum}
                </div>
              )}
              {data.mode === "storyboard_panels" && onRegenerate && (
                <PolishPanelPopover shotNum={shotNum} onApply={regen} />
              )}
              {data.mode === "storyboard_panels" && onAnimatePanel && (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSingleAnimate({
                          url: img.url,
                          shot_index: shotNum,
                          directorsNote: data.directorsNote,
                          aspectRatio: data.aspectRatio,
                        });
                      }}
                      disabled={animatingShots.has(shotNum)}
                      className="absolute top-1 right-9 z-10 opacity-70 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-all bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground p-1.5 rounded disabled:opacity-60"
                      aria-label={`Animate panel ${shotNum}`}
                    >
                      {animatingShots.has(shotNum) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Animate panel {shotNum}…</TooltipContent>
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
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); downloadImage(img.url, shotNum); }}
                    className="absolute bottom-1 left-1 z-10 opacity-70 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-all bg-background/85 hover:bg-emerald-500 hover:text-white text-foreground p-1.5 rounded"
                    aria-label="Download image"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              {onRegenerate && (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => regen(regenIntent)}
                      className="absolute bottom-1 right-1 z-10 opacity-70 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-all bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-medium px-2 py-1 rounded inline-flex items-center gap-1"
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              disabled={animatingAll}
              onClick={() => setAnimateAllOpen(true)}
            >
              {animatingAll ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Animate all panels
            </Button>
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

      {isKeyFrame && (
        <div className="pt-1 flex flex-wrap gap-2">
          {onAnimatePanel && data.images[0] && (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 text-xs"
              onClick={() =>
                void onAnimatePanel({
                  url: data.images[0].url,
                  shot_index: data.images[0].shot_index ?? 1,
                  directorsNote: data.directorsNote,
                  aspectRatio: data.aspectRatio,
                })
              }
            >
              <Play className="h-3 w-3 mr-1" />
              Make video from this frame
            </Button>
          )}
          {onRegenerate && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() =>
                regen(
                  "Regenerate this key frame — keep the same scene, subject, lens, lighting, and color grade; just re-roll the render.",
                )
              }
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          )}
          {onRegenerate && (
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
          )}
          {data.images[0] && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => downloadImage(data.images[0].url, data.images[0].shot_index ?? 1)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          )}
          {data.inspector && (
            <PromptInspector ctx={data.inspector} triggerTitle="Edit prompt" />
          )}
        </div>
      )}
    </div>

    <Dialog open={zoomIndex !== null} onOpenChange={(o) => !o && setZoomIndex(null)}>
      <DialogContent className="max-w-[95vw] w-fit p-0 bg-background/95 border-border/40">
        <VisuallyHidden>
          <DialogTitle>Image preview</DialogTitle>
          <DialogDescription>Zoomed view of the generated image. Use arrow keys to navigate.</DialogDescription>
        </VisuallyHidden>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => downloadImage(data.images[zoomIndex].url, data.images[zoomIndex].shot_index ?? zoomIndex + 1)}
                className="absolute top-2 right-12 bg-background/80 hover:bg-emerald-500 hover:text-white text-foreground p-1.5 rounded-md transition-colors"
                aria-label="Download image"
              >
                <Download className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        )}
        <DialogClose className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1.5 rounded-md">
          <X className="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>

    {/* Per-panel animate dialog with AI model recommendation */}
    <AnimatePanelDialog
      open={!!singleAnimate}
      onOpenChange={(o) => { if (!o) setSingleAnimate(null); }}
      mode="single"
      shotIndex={singleAnimate?.shot_index}
      aspectRatio={singleAnimate?.aspectRatio ?? data.aspectRatio}
      directorsNote={singleAnimate?.directorsNote ?? data.directorsNote}
      onConfirm={async (result) => {
        if (!singleAnimate) return;
        await handleAnimateOne({ ...singleAnimate, provider: result.provider, duration: result.duration, audioPlan: result.audioPlan });
        setSingleAnimate(null);
      }}
    />

    {/* Animate-all dialog */}
    <AnimatePanelDialog
      open={animateAllOpen}
      onOpenChange={setAnimateAllOpen}
      mode="all"
      totalPanels={data.images.length}
      aspectRatio={data.aspectRatio}
      directorsNote={data.directorsNote}
      onConfirm={async (result) => {
        await handleAnimateAll(result);
      }}
    />
    </>
  );
}
