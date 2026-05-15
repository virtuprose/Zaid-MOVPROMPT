import { useState, useRef, useEffect } from "react";
import { Loader2, RotateCcw, FileText, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  streamDirectorAgent,
  submitVideoJob,
  type DirectorMsg,
  type AgentResponse,
} from "@/lib/director/api";
import type { Attachment } from "@/lib/director/ingest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoMark from "@/assets/logo-mark.svg";

type Bubble =
  | { role: "user"; content: string; attachments?: Attachment[] }
  | { role: "assistant"; content: string }
  | { role: "result"; data: Extract<AgentResponse, { kind: "generate_prompt" }>; partial?: boolean }
  | { role: "questions"; questions: string[]; reason: string };

const WELCOME: Bubble = {
  role: "assistant",
  content:
    "I'm your AI Director. Drop your references and tell me what you're making. More context = sharper prompts.",
};

export function DirectorChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const [bubbles, setBubbles] = useState<Bubble[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getLatestGeneratedPrompt = () => {
    for (let i = bubbles.length - 1; i >= 0; i -= 1) {
      const bubble = bubbles[i];
      if (bubble.role === "result") {
        const value = bubble.data.prompt?.trim();
        if (value) return value;
      }
    }
    return "";
  };

  // Load session from route param
  useEffect(() => {
    if (!user || !routeSessionId) {
      sessionIdRef.current = null;
      return;
    }
    if (sessionIdRef.current === routeSessionId) return;
    (async () => {
      const { data, error } = await supabase
        .from("director_sessions")
        .select("id, messages")
        .eq("id", routeSessionId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Could not load that session");
        navigate("/director", { replace: true });
        return;
      }
      sessionIdRef.current = data.id;
      const loaded = (data.messages as Bubble[]) || [WELCOME];
      setBubbles(loaded.length ? loaded : [WELCOME]);
    })();
  }, [routeSessionId, user, navigate]);

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
        navigate(`/director/${data.id}`, { replace: true });
      } else {
        await supabase
          .from("director_sessions")
          .update({
            messages: next as any,
            final_prompt: finalPrompt,
            updated_at: new Date().toISOString(),
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
    const fallback = attachments.length
      ? `References attached: ${attachments.length} file${attachments.length === 1 ? "" : "s"}`
      : "(See attached references.)";
    const userBubble: Bubble = {
      role: "user",
      content: text || fallback,
      attachments: attachments.length ? attachments : undefined,
    };
    const next: Bubble[] = [...bubbles, userBubble];
    setBubbles(next);
    setInput("");
    setBusy(true);

    try {
      const history: DirectorMsg[] = next
        .filter((b): b is Bubble & { role: "user" | "assistant"; content: string } =>
          (b.role === "user" || b.role === "assistant") && typeof (b as any).content === "string",
        )
        .map((b) => ({ role: b.role as "user" | "assistant", content: b.content }));

      // Insert a placeholder bubble that we'll progressively fill
      const placeholderIndex = next.length;
      let lastKind: AgentResponse["kind"] | null = null;

      const handlePartial = (partial: AgentResponse) => {
        lastKind = partial.kind;
        setBubbles((prev) => {
          const copy = [...prev];
          if (partial.kind === "generate_prompt") {
            // Build a result bubble with whatever fields we have so far
            const data = {
              kind: "generate_prompt" as const,
              title: (partial as any).title || "Composing…",
              prompt: (partial as any).prompt || "",
              breakdown: (partial as any).breakdown || {},
              directors_note: (partial as any).directors_note,
            };
            copy[placeholderIndex] = { role: "result", data, partial: true };
          } else if (partial.kind === "ask_clarification") {
            copy[placeholderIndex] = {
              role: "questions",
              questions: (partial as any).questions || [],
              reason: (partial as any).reason || "",
            };
          }
          return copy;
        });
      };

      // Reserve the placeholder slot
      setBubbles((prev) => [...prev, { role: "assistant", content: "…" }]);

      const resp = await streamDirectorAgent(history, attachments, handlePartial);

      let added: Bubble;
      let finalPrompt: string | null = null;
      let title: string | null = null;

      if (resp.kind === "generate_prompt") {
        added = { role: "result", data: resp };
        finalPrompt = resp.prompt;
        title = resp.title;
      } else if (resp.kind === "ask_clarification") {
        added = { role: "questions", questions: resp.questions, reason: resp.reason };
      } else if (resp.kind === "request_video_generation") {
        // Trigger render directly
        added = {
          role: "assistant",
          content: `Sending this to the ${resp.provider_preference || "seedance"} renderer…`,
        };
        try {
          const resolvedPrompt = resp.prompt?.trim() || getLatestGeneratedPrompt();
          const provider =
            resp.provider_preference && resp.provider_preference !== "any"
              ? resp.provider_preference
              : "seedance";
          await submitVideoJob(resolvedPrompt, provider, sessionIdRef.current);
          toast.success("Render started — check your Library when it finishes.");
        } catch (e: any) {
          toast.error(e?.message || "Could not start render");
        }
      } else {
        added = { role: "assistant", content: (resp as any).content || "..." };
      }

      const finalNext: Bubble[] = [...next, added];
      setBubbles(finalNext);
      setAttachments([]);
      void persist(finalNext, finalPrompt, title);
    } catch (e: any) {
      toast.error(e?.message || "Director couldn't respond — try again");
      setBubbles((b) => {
        // Remove the placeholder if it's still a "…" bubble
        const trimmed =
          b.length && b[b.length - 1].role === "assistant" && (b[b.length - 1] as any).content === "…"
            ? b.slice(0, -1)
            : b;
        return [
          ...trimmed,
          { role: "assistant", content: "Hit a snag reaching the model. Try again in a moment." },
        ];
      });
    } finally {
      setBusy(false);
    }
  };

  const startFresh = (save: boolean) => {
    if (!save && sessionIdRef.current) {
      void supabase.from("director_sessions").delete().eq("id", sessionIdRef.current);
    }
    sessionIdRef.current = null;
    setBubbles([{ role: "assistant", content: "Fresh brief. What are we directing?" }]);
    setAttachments([]);
    setInput("");
    setResetOpen(false);
    navigate("/director", { replace: true });
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

  const lastBubble = bubbles[bubbles.length - 1];
  const subhead =
    lastBubble?.role === "questions"
      ? "Gathering details to craft your prompt…"
      : lastBubble?.role === "result"
        ? "Prompt ready. Refine, render, or open in your video model."
        : "Smart one-shot — I'll only ask if something would change the shot.";

  const handleRefine = (currentPrompt: string) => {
    setInput(`Refine this prompt: ${currentPrompt}\n\nMy changes: `);
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-180px)] max-h-[820px]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground transition-colors">{subhead}</div>
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
                <div key={i} className="relative">
                  {b.partial && (
                    <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 text-[10px] text-primary bg-background/80 px-2 py-0.5 rounded-full border border-primary/30">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" /> composing
                    </div>
                  )}
                  <PromptResultCard
                    title={b.data.title}
                    prompt={b.data.prompt}
                    breakdown={b.data.breakdown}
                    directorsNote={b.data.directors_note}
                    onRefine={() => handleRefine(b.data.prompt)}
                    sessionId={sessionIdRef.current}
                  />
                </div>
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
              <div key={i} className={`relative flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? "border border-accent/50 bg-accent/15 text-foreground rounded-br-sm"
                      : "bg-[hsl(240_5%_9%)] border border-[hsl(240_5%_13%)] rounded-bl-sm"
                  }`}
                >
                  {isUser
                    ? b.content.split(/(@\d+)/g).map((part, k) =>
                        /^@\d+$/.test(part) ? (
                          <span
                            key={k}
                            className="inline-flex items-center rounded bg-accent/25 px-1 text-[12px] font-semibold text-accent"
                          >
                            {part}
                          </span>
                        ) : (
                          <span key={k}>{part}</span>
                        ),
                      )
                    : b.content}
                </div>
                {isUser && b.role === "user" && b.attachments && b.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[85%] justify-end">
                    {b.attachments.map((a, j) => {
                      const isImage = a.kind === "image" || a.kind === "video_keyframes";
                      return (
                        <div
                          key={j}
                          className="flex items-center gap-1.5 rounded-lg border border-[hsl(240_5%_15%)] bg-[hsl(240_5%_8%)] p-1 pr-2"
                        >
                          {isImage ? (
                            <img
                              src={(a as any).url}
                              alt={a.name}
                              className="w-[60px] h-[60px] object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-[60px] h-[60px] rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                              {a.kind === "audio_transcript" ? (
                                <Music className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground max-w-[160px] truncate">
                            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-accent/20 px-1 text-[10px] font-semibold text-accent">
                              @{j + 1}
                            </span>
                            <span className="truncate">{a.name}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
        showHelper={isEmpty && attachments.length === 0}
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
