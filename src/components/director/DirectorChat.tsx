import { useState, useRef, useEffect, useMemo } from "react";
import { RotateCcw, FileText, Music, Sparkles, MessageCircleMore, ArrowRight, Film, Megaphone, LayoutGrid, Wand2 } from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { QuestionCard } from "./QuestionCard";
import { cn } from "@/lib/utils";
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
import { ModelChoiceCard } from "./ModelChoiceCard";
import { SessionHealthPanel } from "./SessionHealthPanel";
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
import { ApprovalProvider, useApproval } from "./ApprovalContext";
import {
  AwaitingApprovalPill,
  BottomApprovalBar,
  InlineApprovalCard,
} from "./ApprovalRequest";
import { AssistantAvatar, type AvatarState } from "./AssistantAvatar";
import { TypingIndicator } from "./TypingIndicator";
import { TypewriterText } from "./TypewriterText";

type Bubble =
  | { role: "user"; content: string; attachments?: Attachment[] }
  | { role: "assistant"; content: string; animate?: boolean }
  | { role: "result"; data: Extract<AgentResponse, { kind: "generate_prompt" }>; partial?: boolean }
  | { role: "questions"; questions: string[]; reason: string }
  | { role: "model_choice"; recommended_model_id: string; alternatives?: string[]; reason: string; chosen?: string }
  | { role: "error"; message: string; detail?: string; retryable: boolean };

const WELCOME: Bubble = {
  role: "assistant",
  animate: true,
  content:
    "Hey — I'm your Director. Drop your references and tell me what you're making. More context means sharper prompts.",
};

const MOOD_LINES = [
  "Ready when you are.",
  "Pitch me the scene.",
  "I'm all eyes.",
  "Let's make something cinematic.",
];

const IDLE_NUDGE =
  "Still there? Tell me the vibe — a couple words is plenty and I'll take it from there.";

export function DirectorChat() {
  return (
    <ApprovalProvider>
      <DirectorChatInner />
    </ApprovalProvider>
  );
}

function DirectorChatInner() {
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
  const lastSendRef = useRef<{ text: string; attachments: Attachment[] } | null>(null);

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

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
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
    setAvatarPulse("nod");
    window.setTimeout(() => setAvatarPulse("idle"), 650);
    idleNudgedRef.current = true;

    try {
      // Serialize EVERY bubble (including result / questions / model_choice) into the
      // history so the agent remembers what it already asked, generated, and recommended.
      const history: DirectorMsg[] = [];
      for (const b of next) {
        if (b.role === "user") {
          const attachLine =
            Array.isArray(b.attachments) && b.attachments.length
              ? `\n[Attached on this turn: ${b.attachments.map((a) => `${a.kind}:${a.name}`).join(", ")}]`
              : "";
          history.push({ role: "user", content: (b.content || "") + attachLine });
        } else if (b.role === "assistant") {
          if (b.content && b.content !== "…") {
            history.push({ role: "assistant", content: b.content });
          }
        } else if (b.role === "result") {
          const br: any = b.data.breakdown || {};
          const summary =
            `[Previously generated prompt — "${b.data.title || "Untitled"}"]\n` +
            `Prompt: ${b.data.prompt}\n` +
            (br.recommended_model_id ? `Target model: ${br.recommended_model_id}\n` : "") +
            (br.subject ? `Subject: ${br.subject}\n` : "") +
            (br.camera ? `Camera: ${br.camera}\n` : "") +
            (br.lighting ? `Lighting: ${br.lighting}\n` : "") +
            (br.mood ? `Mood: ${br.mood}\n` : "") +
            (br.negative_prompt ? `Negative: ${br.negative_prompt}` : "");
          history.push({ role: "assistant", content: summary.trim() });
        } else if (b.role === "questions") {
          history.push({
            role: "assistant",
            content:
              `[I asked the user: ${b.reason}]\n` +
              b.questions.map((q, i) => `${i + 1}) ${q}`).join("\n"),
          });
        } else if (b.role === "model_choice") {
          const alts = b.alternatives?.length ? ` (alternatives: ${b.alternatives.join(", ")})` : "";
          history.push({
            role: "assistant",
            content: `[I asked the user to pick a target video model. Recommended: ${b.recommended_model_id}${alts}. Reason: ${b.reason}]`,
          });
          if (b.chosen) {
            history.push({ role: "user", content: `Target model: ${b.chosen}` });
          }
        }
      }

      // Aggregate attachments from EVERY prior user bubble + current ones, deduped,
      // most-recent first, capped at 12 (edge function further limits images to 8).
      const allAttachments: Attachment[] = [];
      const seen = new Set<string>();
      const pushAttachment = (a: Attachment) => {
        const key = (a as any).url || (a as any).storage_path || `${a.kind}:${a.name}`;
        if (seen.has(key)) return;
        seen.add(key);
        allAttachments.push(a);
      };
      // current turn first (most relevant)
      for (const a of attachments) pushAttachment(a);
      // then walk history newest → oldest
      for (let i = next.length - 1; i >= 0; i -= 1) {
        const b = next[i];
        if (b.role === "user" && Array.isArray(b.attachments)) {
          for (const a of b.attachments) pushAttachment(a);
        }
      }
      const mergedAttachments = allAttachments.slice(0, 12);

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
          } else if (partial.kind === "ask_model_choice") {
            const rec = (partial as any).recommended_model_id;
            if (rec) {
              copy[placeholderIndex] = {
                role: "model_choice",
                recommended_model_id: rec,
                alternatives: (partial as any).alternatives || [],
                reason: (partial as any).reason || "",
              };
            }
          }
          return copy;
        });
      };

      // Reserve the placeholder slot
      setBubbles((prev) => [...prev, { role: "assistant", content: "…" }]);

      const resp = await streamDirectorAgent(history, mergedAttachments, handlePartial);

      let added: Bubble;
      let finalPrompt: string | null = null;
      let title: string | null = null;

      if (resp.kind === "generate_prompt") {
        added = { role: "result", data: resp };
        finalPrompt = resp.prompt;
        title = resp.title;
      } else if (resp.kind === "ask_clarification") {
        added = { role: "questions", questions: resp.questions, reason: resp.reason };
      } else if (resp.kind === "ask_model_choice") {
        added = {
          role: "model_choice",
          recommended_model_id: resp.recommended_model_id,
          alternatives: resp.alternatives,
          reason: resp.reason,
        };
      } else if (resp.kind === "request_video_generation") {
        // Trigger render directly
        added = {
          role: "assistant",
          animate: true,
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
        added = { role: "assistant", animate: true, content: (resp as any).content || "..." };
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
          {
            role: "assistant",
            animate: true,
            content: "Lost you for a sec — mind sending that again?",
          },
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

  const firstName = (() => {
    const meta = (user as any)?.user_metadata?.full_name as string | undefined;
    if (meta) return meta.split(" ")[0];
    const email = user?.email;
    if (email) {
      const local = email.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return "Director";
  })();

  const CATEGORIES = [
    {
      id: "cinema",
      label: "Cinema",
      icon: Film,
      prompts: [
        "Slow dolly-in on a neon-lit ramen bar at dusk, anamorphic flares",
        "Anamorphic 2.39:1 chase through a rain-slick Tokyo alley",
        "Golden-hour aerial sweep over coastal cliffs, gentle parallax",
      ],
    },
    {
      id: "ugc",
      label: "UGC",
      icon: Megaphone,
      prompts: [
        "Selfie-style product review of my serum with a green-haired creator",
        "Virtual try-on of my hoodie, mirror angle, natural light",
        "Unboxing reel of my sneakers on a bedroom desk, vertical 9:16",
      ],
    },
    {
      id: "storyboard",
      label: "Storyboard",
      icon: LayoutGrid,
      prompts: [
        "Three-shot intro: establishing wide, medium reveal, close-up emotion",
        "Five-shot product launch sequence with matched color grade",
        "Two-frame transition: dawn skyline to character waking up",
      ],
    },
    {
      id: "animate",
      label: "Animate",
      icon: Wand2,
      prompts: [
        "Anime portrait, soft wind moving hair, 2D Ghibli palette",
        "Cartoon mascot bouncing across a candy-colored landscape",
        "Stylized 3D character waving, Pixar lighting, shallow depth",
      ],
    },
  ] as const;

  const [activeCategory, setActiveCategory] = useState<string>("cinema");
  const [composerFocused, setComposerFocused] = useState(false);
  const activeCat = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];


  const [sessionTitle, setSessionTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!routeSessionId) {
      setSessionTitle(null);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("director_sessions")
        .select("title")
        .eq("id", routeSessionId)
        .maybeSingle();
      if (!cancel) setSessionTitle((data as any)?.title ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [routeSessionId]);

  const lastBubble = bubbles[bubbles.length - 1];
  const subhead =
    lastBubble?.role === "questions"
      ? "Gathering details to craft your prompt…"
      : lastBubble?.role === "result"
        ? "Prompt ready. Refine, render, or open in your video model."
        : sessionTitle
          ? `Working on: ${sessionTitle}`
          : "Smart one-shot — I'll only ask if something would change the shot.";

  const handleRefine = (currentPrompt: string) => {
    setInput(`Refine this prompt: ${currentPrompt}\n\nMy changes: `);
  };

  const { pending: pendingApproval } = useApproval();

  // --- Presence state machine ---------------------------------------------
  const [avatarPulse, setAvatarPulse] = useState<AvatarState>("idle");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [moodIndex, setMoodIndex] = useState(0);
  const prevAttachCount = useRef(attachments.length);
  const typingTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const idleNudgedRef = useRef(false);

  // Rotate mood lines when idle
  useEffect(() => {
    const id = window.setInterval(() => setMoodIndex((n) => (n + 1) % MOOD_LINES.length), 4200);
    return () => window.clearInterval(id);
  }, []);

  // Detect "listening" while the user types in the composer
  useEffect(() => {
    if (busy) return;
    if (!input) {
      setIsUserTyping(false);
      return;
    }
    setIsUserTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setIsUserTyping(false), 900);
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, [input, busy]);

  // React when attachments are added (scanning sweep)
  useEffect(() => {
    if (attachments.length > prevAttachCount.current) {
      setAvatarPulse("scanning");
      const id = window.setTimeout(() => setAvatarPulse("idle"), 1400);
      prevAttachCount.current = attachments.length;
      return () => window.clearTimeout(id);
    }
    prevAttachCount.current = attachments.length;
  }, [attachments.length]);

  // React when a finished prompt result arrives (success flash)
  useEffect(() => {
    const last = bubbles[bubbles.length - 1];
    if (last?.role === "result" && !(last as any).partial) {
      setAvatarPulse("success");
      const id = window.setTimeout(() => setAvatarPulse("idle"), 1600);
      return () => window.clearTimeout(id);
    }
  }, [bubbles]);

  // Idle nudge: send a soft prompt if the user has been silent on a fresh chat
  useEffect(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    const onlyWelcome = bubbles.length === 1 && bubbles[0].role === "assistant";
    if (!onlyWelcome || idleNudgedRef.current || busy || input || attachments.length) return;
    idleTimer.current = window.setTimeout(() => {
      idleNudgedRef.current = true;
      setBubbles((prev) => [...prev, { role: "assistant", content: IDLE_NUDGE, animate: true }]);
    }, 45000);
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [bubbles, busy, input, attachments.length]);

  const avatarState: AvatarState = busy
    ? (attachments.length > 0 ? "scanning" : "thinking")
    : avatarPulse !== "idle"
      ? avatarPulse
      : isUserTyping
        ? "listening"
        : "idle";

  const statusText = busy
    ? attachments.length > 0
      ? "Looking at your references…"
      : "Thinking…"
    : isUserTyping
      ? "Listening…"
      : lastBubble?.role === "questions"
        ? "Waiting on you"
        : "Online";

  const statusDotClass = busy
    ? "bg-amber-400 motion-safe:animate-pulse"
    : isUserTyping
      ? "bg-primary motion-safe:animate-pulse"
      : "bg-emerald-400";

  const typingCaptions = useMemo(() => {
    if (attachments.length > 0) {
      return [
        "Looking at your references…",
        "Reading the mood…",
        "Pulling it together…",
        "Almost there…",
      ];
    }
    return [
      "Thinking about the shot…",
      "Sketching the prompt…",
      "Framing it up…",
      "Almost there…",
    ];
  }, [attachments.length]);

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-8 min-h-[calc(100vh-120px)] justify-center max-w-3xl mx-auto w-full px-2 sm:px-0">
        {/* Hero: logo + greeting */}
        <div className="flex items-center gap-5 sm:gap-7">
          <div
            className={cn(
              "relative shrink-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(240_10%_8%)] to-[hsl(240_12%_5%)] p-3 sm:p-4 hero-logo-glow",
              composerFocused && "hero-logo-glow-listening",
            )}
          >
            <img
              src={logoMark}
              alt="VidoPrompt"
              className="w-20 h-20 sm:w-24 sm:h-24 hero-logo-float"
            />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight text-foreground">
            {firstName}, <span className="text-muted-foreground/80">what are we</span>
            <br className="hidden sm:block" />
            <span className="text-muted-foreground/80"> filming </span>today?
          </h1>
        </div>

        {/* Composer */}
        <div
          onFocusCapture={() => setComposerFocused(true)}
          onBlurCapture={() => setComposerFocused(false)}
        >
          <Composer
            value={input}
            onChange={setInput}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onSend={send}
            busy={busy}
            showHelper={false}
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = c.id === activeCategory;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all",
                    active
                      ? "border border-primary/60 bg-primary/10 text-foreground shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]"
                      : "border border-border/40 bg-muted/10 text-muted-foreground hover:border-border hover:text-foreground hover:-translate-y-0.5",
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Suggestions */}
          <div className="flex flex-col">
            {activeCat.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                className="group flex items-center gap-3 py-3 text-left text-sm text-muted-foreground hover:text-foreground transition-colors border-b border-border/20 last:border-b-0"
              >
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                <span>{p}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Want more control? Switch to structured mode →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">
      {/* Presence header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AssistantAvatar size="sm" state={avatarState} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>Director</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass)} aria-hidden />
              <span
                className="text-[11px] font-normal text-muted-foreground"
                aria-live="polite"
              >
                {statusText}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground/70 transition-opacity truncate">
              {sessionTitle
                ? `Working on: ${sessionTitle}`
                : lastBubble?.role === "result"
                  ? "Prompt ready. Refine, render, or open in your video model."
                  : MOOD_LINES[moodIndex]}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground/70 hidden sm:block">{subhead}</div>
      </div>

      <SessionHealthPanel
        bubbles={bubbles as any}
        currentAttachmentCount={attachments.length}
        className="mb-2"
      />

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto rounded-xl border border-[hsl(240_5%_13%)] bg-[hsl(240_8%_5.5%)] p-3 sm:p-4"
      >
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img src={logoMark} alt="" className="w-32 h-32 opacity-[0.05]" />
          </div>
        )}
        <div className="flex flex-col gap-6 min-h-full">
          <div className="flex-1" />
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
                    hasReferenceImage={
                      attachments.length > 0 ||
                      bubbles.some(
                        (x) =>
                          x.role === "user" &&
                          Array.isArray(x.attachments) &&
                          x.attachments.length > 0,
                      )
                    }
                  />
                </div>
              );
            }
            if (b.role === "questions") {
              // Only the most recent questions block is interactive.
              const isLatestQuestions = (() => {
                for (let k = bubbles.length - 1; k >= 0; k -= 1) {
                  if (bubbles[k].role === "questions") return k === i;
                }
                return false;
              })();
              return (
                <QuestionCard
                  key={i}
                  reason={b.reason}
                  questions={b.questions}
                  disabled={!isLatestQuestions || busy}
                  attachments={attachments}
                  onAttach={setAttachments}
                  onContinue={(formatted) => void send(formatted)}
                  onSkip={() => void send("Skip")}
                />
              );
            }
            if (b.role === "model_choice") {
              // Only the most recent model_choice block is interactive.
              const isLatest = (() => {
                for (let k = bubbles.length - 1; k >= 0; k -= 1) {
                  if (bubbles[k].role === "model_choice") return k === i;
                }
                return false;
              })();
              const hasReferenceImage =
                attachments.length > 0 ||
                bubbles.some(
                  (x) => x.role === "user" && Array.isArray(x.attachments) && x.attachments.length > 0,
                );
              return (
                <div key={i} className="motion-safe:animate-fade-up">
                  <ModelChoiceCard
                    recommendedId={b.recommended_model_id}
                    alternatives={b.alternatives}
                    reason={b.reason}
                    disabled={!isLatest || busy || !!b.chosen}
                    hasReferenceImage={hasReferenceImage}
                    onConfirm={(modelId) => {
                      setBubbles((prev) => {
                        const copy = [...prev];
                        copy[i] = { ...b, chosen: modelId };
                        return copy;
                      });
                      void send(`Target model: ${modelId}`);
                    }}
                  />
                </div>
              );
            }
            if (b.role === "error") {
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <div className="flex-1 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
                    <div className="font-medium text-foreground">{b.message}</div>
                    {b.detail && (
                      <div className="mt-1 text-[12px] text-muted-foreground whitespace-pre-wrap">
                        {b.detail}
                      </div>
                    )}
                    {b.retryable && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-7 text-xs"
                          onClick={() => void retryLast()}
                          disabled={busy}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            const isUser = b.role === "user";
            if (!isUser) {
              // Hide the streaming placeholder bubble; TypingIndicator covers it.
              if (b.content === "…" || b.content === "") return null;
              const animate = (b as any).animate === true;
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <Message from="assistant" className="flex-1">
                    <MessageContent className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {animate ? (
                        <TypewriterText text={b.content} speed={20} />
                      ) : (
                        b.content
                      )}
                    </MessageContent>
                  </Message>
                </div>
              );
            }
            return (
              <Message key={i} from="user" className="items-end">
                <MessageContent
                  className={cn(
                    "rounded-2xl bg-muted/40 border border-border/40 px-4 py-2 text-sm",
                    "group-[.is-user]:bg-muted/40 group-[.is-user]:rounded-2xl group-[.is-user]:px-4 group-[.is-user]:py-2",
                  )}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {b.content.split(/(@\d+)/g).map((part, k) =>
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
                    )}
                  </div>
                </MessageContent>
                {b.attachments && b.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[85%] justify-end">
                    {b.attachments.map((a, j) => {
                      const isImage = a.kind === "image" || a.kind === "video_keyframes";
                      return (
                        <div
                          key={j}
                          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 p-1 pr-2"
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
              </Message>
            );
          })}
          {busy && (
            <TypingIndicator
              captions={typingCaptions}
              state={attachments.length > 0 ? "scanning" : "thinking"}
            />
          )}
          {!busy && lastBubble?.role === "questions" && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <MessageCircleMore className="w-4 h-4" />
              <span>Awaiting your input</span>
            </div>
          )}
          {pendingApproval && (
            <>
              <InlineApprovalCard request={pendingApproval} />
              <AwaitingApprovalPill />
            </>
          )}
        </div>
      </div>

      {pendingApproval && <BottomApprovalBar request={pendingApproval} />}

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
