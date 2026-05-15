import { useEffect, useState } from "react";
import { Loader2, Film, Play, Download, AlertCircle } from "lucide-react";
import { Copy, Check, BookmarkPlus, Sparkles, Wand2, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Breakdown } from "@/lib/director/api";
import { submitVideoJob, pollVideoJob, type VideoJob } from "@/lib/director/api";
import { VIDEO_MODEL_GROUPS, findVideoModel, type VideoModel } from "@/lib/director/videoModels";
import { resolveRecommendation } from "@/lib/director/modelRanking";
import { VideoOptionsDialog } from "./VideoOptionsDialog";
import type { VideoOptions } from "@/lib/director/videoModelControls";
import { useApproval } from "./ApprovalContext";

type Props = {
  title: string;
  prompt: string;
  breakdown: Breakdown;
  directorsNote?: string;
  onRefine?: () => void;
  sessionId?: string | null;
};

const EXTERNAL_LINKS: Record<string, { label: string; url: string }> = {
  kling: { label: "Kling", url: "https://klingai.com" },
  veo: { label: "Veo (Google)", url: "https://deepmind.google/technologies/veo/" },
  seedance: { label: "Seedance", url: "https://seedance.ai" },
  hailuo: { label: "Hailuo (MiniMax)", url: "https://hailuoai.video/" },
  runway: { label: "Runway", url: "https://runwayml.com" },
  ltx: { label: "LTX Studio", url: "https://ltx.studio/" },
  wan: { label: "Wan", url: "https://wan.video/" },
};

function CopyBtn({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {done ? "Copied" : label}
    </button>
  );
}

function Section({
  label,
  body,
  accent,
}: {
  label: string;
  body?: string;
  accent?: boolean;
}) {
  if (!body) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
            accent ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {label}
        </div>
        <CopyBtn text={body} />
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{body}</div>
    </div>
  );
}

export function PromptResultCard({ title, prompt, breakdown, directorsNote, onRefine, sessionId }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pendingModel, setPendingModel] = useState<VideoModel | null>(null);

  const cameraLighting = [breakdown.camera, breakdown.lighting].filter(Boolean).join(" · ");
  const film = breakdown.film_emulation;
  const negative = breakdown.negative_prompt;
  const recommendation =
    breakdown.recommendation_reason || breakdown.model_recommendation;
  const resolved = resolveRecommendation(breakdown);
  const recommendedModel =
    findVideoModel(resolved.primary.id) ?? findVideoModel("seedance-v1-pro")!;
  const topPicks = [resolved.primary, ...resolved.alternatives]
    .map((c) => findVideoModel(c.id))
    .filter((m): m is VideoModel => !!m);
  const externalLink = EXTERNAL_LINKS[recommendedModel.family];

  const fullText = [
    `# ${title}`,
    "",
    "## Main prompt",
    prompt,
    cameraLighting && `\n## Camera & Lighting\n${cameraLighting}`,
    film && `\n## Film emulation\n${film}`,
    negative && `\n## Negative prompt\n${negative}`,
    recommendation && `\n## Model recommendation\n${recommendation}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copyAll = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveToLibrary = async (silent = false) => {
    if (!user || saved) return;
    const { error } = await supabase.from("prompt_history").insert({
      user_id: user.id,
      workflow_type: "director",
      target_model: recommendedModel.id,
      results: { title, prompt, breakdown, directors_note: directorsNote },
    });
    if (error) {
      if (!silent) toast.error(error.message);
      return;
    }
    setSaved(true);
    if (!silent) toast.success("Saved to your library");
  };

  useEffect(() => {
    if (user) void saveToLibrary(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Poll active video job
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await pollVideoJob(job.id);
        if (cancelled) return;
        setJob(next);
        if (next.status === "completed" || next.status === "failed") return;
        setTimeout(tick, 4000);
      } catch (e) {
        console.error(e);
        if (!cancelled) setTimeout(tick, 8000);
      }
    };
    const t = setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [job]);

  const openOptionsFor = (modelId: string) => {
    if (!user) {
      toast.error("Sign in to generate videos");
      return;
    }
    const m = findVideoModel(modelId);
    if (!m) return;
    setPendingModel(m);
  };

  const generateVideo = async (
    model: VideoModel,
    options: VideoOptions,
    finalPrompt: string,
    meta: { rewritten: boolean; summary?: string; original?: string },
  ) => {
    setGenerating(true);
    try {
      const newJob = await submitVideoJob(finalPrompt, model.id, sessionId, options);
      setJob(newJob);
      if (meta.rewritten) {
        toast.success(
          `Prompt rewritten to pass ${model.label} content checks. Rendering now — ${meta.summary || "minor edits applied."}`,
        );
      } else {
        toast.success(`Rendering with ${model.label} — this can take a few minutes`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not start video generation");
    } finally {
      setGenerating(false);
    }
  };

  const renderVideoPanel = () => {
    if (!job) return null;
    if (job.status === "completed" && job.video_url) {
      return (
        <div className="rounded-lg border border-primary/30 bg-[hsl(240_5%_8%)] p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-primary">
            <Play className="w-3.5 h-3.5" />
            <span className="font-medium">Rendered with {job.provider}</span>
          </div>
          <video
            src={job.video_url}
            controls
            playsInline
            className="w-full rounded-md aspect-video bg-black"
          />
          <a
            href={job.video_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3 h-3" /> Download MP4
          </a>
        </div>
      );
    }
    if (job.status === "failed") {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />
          <div>
            <div className="font-medium text-destructive">Generation failed</div>
            <div className="text-muted-foreground mt-0.5">{job.error || "Provider error"}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-border bg-[hsl(240_5%_8%)] p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        Rendering with {job.provider}… this usually takes 1–3 minutes.
      </div>
    );
  };

  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5 space-y-4 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.4)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-display text-[20px] leading-tight font-semibold truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
          >
            <Maximize2 className="w-3 h-3" /> View full
          </button>
        </div>

        <Section label="Main prompt" body={prompt} accent />
        <Section label="Camera & Lighting" body={cameraLighting} />
        <Section label="Film emulation" body={film} />
        <Section label="Negative prompt" body={negative} />
        <Section label="Model recommendation" body={recommendation} />

        {directorsNote && (
          <div className="text-xs text-muted-foreground italic border-l-2 border-accent/40 pl-3">
            Director's note — {directorsNote}
          </div>
        )}

        {renderVideoPanel()}

        <VideoOptionsDialog
          open={!!pendingModel}
          model={pendingModel}
          prompt={prompt}
          onCancel={() => setPendingModel(null)}
          onConfirm={(opts, finalPrompt, meta) => {
            const m = pendingModel;
            setPendingModel(null);
            if (m) void generateVideo(m, opts, finalPrompt, meta);
          }}
        />

        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
          <Button size="sm" onClick={copyAll} className="gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy full prompt"}
          </Button>
          <Button size="sm" variant="outline" onClick={onRefine} className="gap-1.5">
            <Wand2 className="w-4 h-4" /> Refine
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveToLibrary(false)}
            disabled={saved}
            className="gap-1.5"
          >
            <BookmarkPlus className="w-4 h-4" /> {saved ? "Saved" : "Save to library"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={generating || (!!job && job.status !== "completed" && job.status !== "failed")}
                className="gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Film className="w-4 h-4" />
                )}
                Generate video
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[420px] overflow-y-auto w-72">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Top picks
              </DropdownMenuLabel>
              {topPicks.map((m, idx) => (
                <DropdownMenuItem key={`top-${m.id}`} onClick={() => openOptionsFor(m.id)}>
                  <span className="truncate">{m.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {idx === 0 ? "Best fit" : `Alt #${idx}`}
                  </span>
                </DropdownMenuItem>
              ))}
              {resolved.reasons.length > 0 && (
                <div className="px-2 py-1 text-[10px] text-muted-foreground/80 leading-relaxed">
                  {resolved.reasons.slice(0, 3).join(" · ")}
                </div>
              )}
              {VIDEO_MODEL_GROUPS.map((group) => (
                <div key={group.label}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.models.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => openOptionsFor(m.id)}>
                      <span className="truncate">{m.label}</span>
                      {m.note && (
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{m.note}</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <Section label="Main prompt" body={prompt} accent />
            <Section label="Camera & Lighting" body={cameraLighting} />
            <Section label="Film emulation" body={film} />
            <Section label="Negative prompt" body={negative} />
            <Section label="Model recommendation" body={recommendation} />
            {directorsNote && (
              <div className="text-xs text-muted-foreground italic border-l-2 border-accent/40 pl-3">
                Director's note — {directorsNote}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={copyAll} className="gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy full prompt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
