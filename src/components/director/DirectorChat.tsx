import { useState, useRef, useEffect } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Composer } from "./Composer";
import { PromptResultCard } from "./PromptResultCard";
import { callDirectorAgent, type DirectorMsg, type AgentResponse } from "@/lib/director/api";
import type { Attachment } from "@/lib/director/ingest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoMark from "@/assets/logo-mark.svg";

type Bubble =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "result"; data: Extract<AgentResponse, { kind: "generate_prompt" }> }
  | { role: "questions"; questions: string[]; reason: string };

const WELCOME: Bubble = {
  role: "assistant",
  content:
    "I'm your AI Director. Drop your references and tell me what you're making. More context = sharper prompts.",
};

export function DirectorChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bubbles, setBubbles] = useState<Bubble[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles]);

  const persist = async (next: Bubble[], finalPrompt: string | null, title: string | null) => {
    if (!user) return;
    try {
      if (!sessionIdRef.current) {
        const { data, error } = await supabase
          .from("director_sessions")
          .insert({
            user_id: user.id,
            title: title ?? "Untitled brief",
            messages: next as any,
            final_prompt: finalPrompt,
            brief_context: { attachment_count: attachments.length },
          })
          .select("id")
          .single();
        if (error) throw error;
        sessionIdRef.current = data.id;
      } else {
        await supabase
          .from("director_sessions")
          .update({
            messages: next as any,
            final_prompt: finalPrompt,
            ...(title ? { title } : {}),
          })
          .eq("id", sessionIdRef.current);
      }
    } catch (e) {
      console.error("persist session failed", e);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) {
      toast.error("Add a brief or some references");
      return;
    }
    const userBubble: Bubble = {
      role: "user",
      content: text || "(See attached references.)",
    };
    const next = [...bubbles, userBubble];
    setBubbles(next);
    setInput("");
    setBusy(true);

    try {
      const history: DirectorMsg[] = next
        .filter((b): b is Bubble & { role: "user" | "assistant"; content: string } =>
          (b.role === "user" || b.role === "assistant") && typeof (b as any).content === "string",
        )
        .map((b) => ({ role: b.role as "user" | "assistant", content: b.content }));

      const resp = await callDirectorAgent(history, attachments);
      let added: Bubble;
      let finalPrompt: string | null = null;
      let title: string | null = null;

      if (resp.kind === "generate_prompt") {
        added = { role: "result", data: resp };
        finalPrompt = resp.prompt;
        title = resp.title;
      } else if (resp.kind === "ask_clarification") {
        added = { role: "questions", questions: resp.questions, reason: resp.reason };
      } else if (resp.kind === "video_request") {
        added = { role: "assistant", content: resp.message };
      } else {
        added = { role: "assistant", content: (resp as any).content || "..." };
      }

      const finalNext = [...next, added];
      setBubbles(finalNext);
      setAttachments([]);
      void persist(finalNext, finalPrompt, title);
    } catch (e: any) {
      toast.error(e?.message || "Director couldn't respond — try again");
      setBubbles((b) => [
        ...b,
        { role: "assistant", content: "Hit a snag reaching the model. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const startFresh = (save: boolean) => {
    if (!save && sessionIdRef.current) {
      // discard: best-effort delete
      void supabase.from("director_sessions").delete().eq("id", sessionIdRef.current);
    }
    sessionIdRef.current = null;
    setBubbles([{ role: "assistant", content: "Fresh brief. What are we directing?" }]);
    setAttachments([]);
    setInput("");
    setResetOpen(false);
  };

  const onResetClick = () => {
    const hasContent = bubbles.length > 1;
    if (!hasContent) {
      startFresh(false);
      return;
    }
    setResetOpen(true);
  };

  const isEmpty = bubbles.length === 1 && bubbles[0].role === "assistant";

  const STARTERS = [
    "📸 Cinematic product reveal",
    "🎭 Character introduction scene",
    "🌅 Atmospheric landscape transition",
    "🎬 Documentary narrative shot",
  ];

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-180px)] max-h-[820px]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Smart one-shot — I'll only ask if something would change the shot.
        </div>
        <Button size="sm" variant="ghost" onClick={onResetClick} className="gap-1.5 h-7 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> New brief
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto rounded-xl border border-[hsl(240_5%_13%)] bg-[hsl(240_8%_5.5%)] p-3 sm:p-4"
      >
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img src={logoMark} alt="" className="w-32 h-32 opacity-[0.05]" />
          </div>
        )}
        <div className="flex flex-col gap-3 min-h-full">
          {bubbles.map((b, i) => {
            if (b.role === "result") {
              return (
                <PromptResultCard
                  key={i}
                  title={b.data.title}
                  prompt={b.data.prompt}
                  breakdown={b.data.breakdown as Record<string, string>}
                  directorsNote={b.data.directors_note}
                />
              );
            }
            if (b.role === "questions") {
              return (
                <div
                  key={i}
                  className="rounded-lg border border-accent/30 bg-[hsl(20_30%_8%)] p-3 space-y-2 relative"
                >
                  <div className="text-xs text-accent/80 italic">{b.reason}</div>
                  <ul className="text-sm space-y-1.5">
                    {b.questions.map((q, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-accent font-semibold">{j + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            const isUser = b.role === "user";
            return (
              <div key={i} className={`relative flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? "border border-accent/50 bg-accent/15 text-foreground rounded-br-sm"
                      : "bg-[hsl(240_5%_9%)] border border-[hsl(240_5%_13%)] rounded-bl-sm"
                  }`}
                >
                  {b.content}
                </div>
              </div>
            );
          })}
          {isEmpty && (
            <div className="flex flex-wrap gap-2 pt-1">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[hsl(240_5%_15%)] bg-[hsl(240_5%_9%)] hover:border-accent/40 hover:text-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground relative">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Director is reading the brief…
            </div>
          )}
          {/* Spacer pushes content up so empty space sits below */}
          <div className="flex-1" />
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onSend={send}
        busy={busy}
      />

      <div className="text-center">
        <button
          onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Want more control? Switch to structured mode →
        </button>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this conversation before starting new?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current brief is saved automatically. You can keep it in your library or discard it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => startFresh(false)}>
              Discard
            </Button>
            <AlertDialogAction onClick={() => startFresh(true)}>Save and continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
