import { useState } from "react";
import { Copy, Check, Video, BookmarkPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  title: string;
  prompt: string;
  breakdown: Record<string, string>;
  directorsNote?: string;
};

export function PromptResultCard({ title, prompt, breakdown, directorsNote }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveToLibrary = async () => {
    if (!user) return;
    const { error } = await supabase.from("prompt_history").insert({
      user_id: user.id,
      workflow_type: "director",
      target_model: "any",
      results: { title, prompt, breakdown, directors_note: directorsNote },
    });
    if (error) toast.error(error.message);
    else {
      setSaved(true);
      toast.success("Saved to your library");
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5 space-y-4 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-base sm:text-lg font-semibold">{title}</h3>
        </div>
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{prompt}</p>

      {Object.keys(breakdown).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(breakdown).map(([k, v]) =>
            v ? (
              <div key={k} className="rounded-md bg-muted/50 px-2.5 py-1.5">
                <div className="text-muted-foreground capitalize text-[10px] tracking-wide">
                  {k.replace(/_/g, " ")}
                </div>
                <div className="text-foreground">{v}</div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {directorsNote && (
        <div className="text-xs text-muted-foreground italic border-l-2 border-accent/40 pl-3">
          Director's note — {directorsNote}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={copy} className="gap-1.5">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        <Button size="sm" variant="outline" onClick={saveToLibrary} disabled={saved} className="gap-1.5">
          <BookmarkPlus className="w-4 h-4" /> {saved ? "Saved" : "Save to library"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled
          title="Video generation arrives in a future update"
          className="gap-1.5 opacity-60 cursor-not-allowed"
        >
          <Video className="w-4 h-4" /> Generate video
          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">soon</span>
        </Button>
      </div>
    </div>
  );
}
