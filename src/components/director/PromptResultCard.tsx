import { useEffect, useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Breakdown } from "@/lib/director/api";

type Props = {
  title: string;
  prompt: string;
  breakdown: Breakdown;
  directorsNote?: string;
  onRefine?: () => void;
};

const MODEL_LINKS: { id: string; label: string; url: string }[] = [
  { id: "seedance", label: "Seedance", url: "https://seedance.ai" },
  { id: "veo", label: "Veo (Google)", url: "https://deepmind.google/technologies/veo/" },
  { id: "kling", label: "Kling", url: "https://klingai.com" },
  { id: "runway", label: "Runway", url: "https://runwayml.com" },
];

function detectRecommendedModel(rec?: string): typeof MODEL_LINKS[number] {
  const r = (rec || "").toLowerCase();
  return MODEL_LINKS.find((m) => r.includes(m.id)) || MODEL_LINKS[0];
}

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

export function PromptResultCard({ title, prompt, breakdown, directorsNote, onRefine }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  const cameraLighting = [breakdown.camera, breakdown.lighting].filter(Boolean).join(" · ");
  const film = breakdown.film_emulation;
  const negative = breakdown.negative_prompt;
  const recommendation = breakdown.model_recommendation;
  const recommendedModel = detectRecommendedModel(recommendation);

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

  // Auto-save once when card mounts (item 7)
  useEffect(() => {
    if (user) void saveToLibrary(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60 pt-3">
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
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="w-4 h-4" /> Open in {recommendedModel.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MODEL_LINKS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={async () => {
                    await navigator.clipboard.writeText(prompt);
                    toast.success(`Prompt copied — opening ${m.label}`);
                    window.open(m.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  {m.label}
                </DropdownMenuItem>
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
