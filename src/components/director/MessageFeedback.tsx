import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FeedbackKind = "question" | "prompt" | "recommendation";

type Props = {
  sessionId: string | null;
  messageIndex: number;
  contentKind: FeedbackKind;
  content: string;
  questionText?: string;
  className?: string;
};

// Module-level flag so the "Director will adapt" toast only fires once per page session.
let firstThumbShown = false;

export function MessageFeedback({
  sessionId,
  messageIndex,
  contentKind,
  content,
  questionText,
  className,
}: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async (next: 1 | -1) => {
    if (busy) return;
    const previous = rating;
    setRating(next); // optimistic
    setBusy(true);
    try {
      const { error } = await supabase.from("director_message_feedback").insert({
        user_id: user.id,
        session_id: sessionId,
        message_index: messageIndex,
        content_kind: contentKind,
        content: content.slice(0, 4000),
        rating: next,
        question_text: questionText?.slice(0, 500) ?? null,
      });
      if (error) throw error;
      if (!firstThumbShown) {
        firstThumbShown = true;
        toast.success("Saved — the Director will adapt to your taste.");
      }
    } catch (e) {
      setRating(previous);
      toast.error("Couldn't save feedback. Try again.");
      console.error("MessageFeedback insert failed", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 pt-1 opacity-60 hover:opacity-100 transition-opacity", className)}>
      <button
        type="button"
        aria-label="Helpful"
        onClick={() => submit(1)}
        disabled={busy}
        className={cn(
          "rounded-md p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
          rating === 1 && "text-primary bg-primary/10",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        onClick={() => submit(-1)}
        disabled={busy}
        className={cn(
          "rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
          rating === -1 && "text-destructive bg-destructive/10",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
