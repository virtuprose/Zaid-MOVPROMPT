import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AttachmentDropzone } from "./AttachmentDropzone";
import { PromptResultCard } from "./PromptResultCard";
import { callDirectorAgent, type DirectorMsg, type AgentResponse } from "@/lib/director/api";
import type { Attachment } from "@/lib/director/ingest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Bubble =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "result"; data: Extract<AgentResponse, { kind: "generate_prompt" }> }
  | { role: "questions"; questions: string[]; reason: string };

export function DirectorChat() {
  const { user } = useAuth();
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      role: "assistant",
      content:
        "I'm your AI Director. Drop a brief — text, images, video, audio, or a PDF — and I'll build a cinematic prompt ready for any video model. The more references you give me, the sharper the result.",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
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
      // Clear attachments after successful turn (already incorporated)
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

  const reset = () => {
    sessionIdRef.current = null;
    setBubbles([
      {
        role: "assistant",
        content: "Fresh brief. What are we directing?",
      },
    ]);
    setAttachments([]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-180px)] max-h-[820px]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Smart one-shot — I'll only ask if something would change the shot.
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 h-7 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> New brief
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border bg-card/50 p-3 sm:p-4 space-y-3"
      >
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
              <div key={i} className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="text-xs text-muted-foreground italic">{b.reason}</div>
                <ul className="text-sm space-y-1.5">
                  {b.questions.map((q, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-accent">{j + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          const isUser = b.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                {b.content}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Director is reading the brief…
          </div>
        )}
      </div>

      <AttachmentDropzone attachments={attachments} onChange={setAttachments} />

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (!busy) void send();
            }
          }}
          placeholder="What are we making? Mood, action, setting, references… or just drop files above."
          rows={2}
          className="resize-none min-h-[60px]"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy} size="lg" className="self-stretch px-4">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground text-center">
        ⌘/Ctrl + Enter to send · Max 12 attachments
      </div>
    </div>
  );
}
