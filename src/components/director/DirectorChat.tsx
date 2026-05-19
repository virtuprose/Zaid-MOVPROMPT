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
import { notifyInsufficientCredits } from "@/lib/credits/insufficient";
import { Composer } from "./Composer";
import { PromptResultCard } from "./PromptResultCard";
import { ModelChoiceCard } from "./ModelChoiceCard";
import { GeneratedImageCard } from "./GeneratedImageCard";
import { AspectChoiceCard, type AspectRatio } from "./AspectChoiceCard";
import { SubjectLockChoiceCard, type SubjectKind } from "./SubjectLockChoiceCard";

import {
  streamDirectorAgent,
  submitVideoJob,
  pollVideoJob,
  type DirectorMsg,
  type AgentResponse,
  type DirectorPhase,
} from "@/lib/director/api";
import { VideoBubble } from "./VideoBubble";
import type { Attachment } from "@/lib/director/ingest";
import * as localState from "@/lib/director/localState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoMark from "@/assets/logo-mark-white.svg";
import { ApprovalProvider, useApproval } from "./ApprovalContext";
import {
  AwaitingApprovalPill,
  BottomApprovalBar,
} from "./ApprovalRequest";
import { AssistantAvatar, type AvatarState } from "./AssistantAvatar";
import { TypingIndicator } from "./TypingIndicator";
import { TypewriterText } from "./TypewriterText";

type Bubble =
  | { role: "user"; content: string; attachments?: Attachment[] }
  | { role: "assistant"; content: string; animate?: boolean }
  | {
      role: "result";
      data: Extract<AgentResponse, { kind: "generate_prompt" }>;
      partial?: boolean;
      nextSuggestions?: string[];
    }
  | {
      role: "questions";
      questions: string[];
      reason: string;
      agentSuggestions?: import("@/lib/director/api").AgentSuggestion[];
    }
  | { role: "model_choice"; recommended_model_id: string; alternatives?: string[]; reason: string; chosen?: string; lockedSpec?: import("@/lib/director/api").LockedSpec }
  | { role: "error"; message: string; detail?: string; retryable: boolean }
  | { role: "generated_images"; data: import("./GeneratedImageCard").GeneratedImageBubbleData }
  | {
      role: "aspect_choice";
      payload: {
        mode: "single_panel";
        prompt: string;
        reference_urls?: string[];
        count?: number;
        per_shot_prompts?: string[];
        shot_index?: number;
        lock_mode?: "character" | "scene" | "auto";
        directors_note?: string;
        scene_already_described?: boolean;
      };
      chosen?: AspectRatio;
    }
  | {
      role: "subject_lock_choice";
      payload: {
        mode: "single_panel";
        prompt: string;
        reference_urls?: string[];
        count?: number;
        per_shot_prompts?: string[];
        shot_index?: number;
        lock_mode?: "character" | "scene" | "auto";
        directors_note?: string;
        scene_already_described?: boolean;
      };
      chosen?: "character" | "product" | "none";
    }
  | {
      role: "scene_describe";
      payload: {
        mode: "single_panel";
        prompt: string;
        reference_urls?: string[];
        count?: number;
        per_shot_prompts?: string[];
        shot_index?: number;
        lock_mode?: "character" | "scene" | "auto";
        directors_note?: string;
        scene_already_described?: boolean;
      };
      submitted?: boolean;
    }
  | { role: "video"; data: import("./VideoBubble").VideoBubbleData };

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
  const [phase, setPhase] = useState<DirectorPhase>("thinking");
  const [resetOpen, setResetOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef<{ text: string; attachments: Attachment[] } | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const localScope = routeSessionId ?? "new";
  const { request: requestApproval } = useApproval();

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

  // Hydrate from localStorage immediately on scope change (instant restore on reload).
  useEffect(() => {
    const userId = user?.id ?? null;
    const hydrationKey = `${userId}:${localScope}`;
    if (hydratedRef.current === hydrationKey) return;
    hydratedRef.current = hydrationKey;
    const cached = localState.load(userId, localScope);
    if (cached) {
      if (cached.bubbles?.length) setBubbles(cached.bubbles as Bubble[]);
      if (typeof cached.input === "string") setInput(cached.input);
      if (Array.isArray(cached.attachments)) setAttachments(cached.attachments);
      if (cached.sessionId) sessionIdRef.current = cached.sessionId;
    } else if (!routeSessionId) {
      // Fresh "new" scope with no cache — reset transient state
      sessionIdRef.current = null;
    }
  }, [user?.id, localScope, routeSessionId]);

  // Load server-side session from route param. Only override local cache when
  // the server has a longer (newer) message history, to avoid flicker.
  useEffect(() => {
    if (!user || !routeSessionId) {
      if (!routeSessionId) sessionIdRef.current = null;
      return;
    }
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
      const remote = loaded.length ? loaded : [WELCOME];
      setBubbles((prev) => (remote.length >= prev.length ? remote : prev));

      // Also merge any video_jobs for this session that aren't already represented.
      const { data: jobs } = await supabase
        .from("video_jobs")
        .select("id,prompt,provider,status,video_url,error,liked,created_at")
        .eq("session_id", routeSessionId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (jobs && jobs.length) {
        setBubbles((prev) => {
          const existingIds = new Set(
            prev.flatMap((b) => (b.role === "video" ? [b.data.jobId] : [])),
          );
          const fresh = jobs
            .filter((j: any) => !existingIds.has(j.id))
            .map<Bubble>((j: any) => ({
              role: "video",
              data: {
                jobId: j.id,
                prompt: j.prompt,
                provider: j.provider,
                status: j.status,
                videoUrl: j.video_url || undefined,
                error: j.error || undefined,
                liked: !!j.liked,
              },
            }));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }
    })();
  }, [routeSessionId, user, navigate]);

  // Poll any in-flight video bubbles until completed/failed.
  useEffect(() => {
    const pending = bubbles
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.role === "video" && (b.data.status === "queued" || b.data.status === "processing"));
    if (pending.length === 0) return;
    let cancelled = false;
    const tick = async () => {
      for (const { b } of pending) {
        if (cancelled || b.role !== "video") continue;
        try {
          const job = await pollVideoJob(b.data.jobId);
          if (cancelled) return;
          setBubbles((prev) => {
            const copy = [...prev];
            for (let k = 0; k < copy.length; k++) {
              const cur = copy[k];
              if (cur.role === "video" && cur.data.jobId === job.id) {
                copy[k] = {
                  role: "video",
                  data: {
                    ...cur.data,
                    status: (job.status as any) || cur.data.status,
                    videoUrl: job.video_url || cur.data.videoUrl,
                    error: job.error || cur.data.error,
                  },
                };
              }
            }
            return copy;
          });
        } catch {
          /* ignore — retry next tick */
        }
      }
    };
    const handle = window.setInterval(tick, 4000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [bubbles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles]);

  // Debounced localStorage save of in-progress draft.
  useEffect(() => {
    if (busy) return; // avoid persisting transient "…" placeholders
    const onlyWelcome =
      bubbles.length <= 1 && !input && attachments.length === 0;
    if (onlyWelcome) return;
    const userId = user?.id ?? null;
    const handle = window.setTimeout(() => {
      localState.save(userId, localScope, {
        sessionId: sessionIdRef.current,
        bubbles,
        input,
        attachments,
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [bubbles, input, attachments, busy, user?.id, localScope]);

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
        localState.migrate(user.id, "new", data.id);
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

  const runImageGeneration = async (
    baseBubbles: Bubble[],
    payload: {
      mode: "character_sheet" | "storyboard_panels" | "single_panel";
      prompt: string;
      reference_urls?: string[];
      count?: number;
      aspect_ratio?: "1:1" | "16:9" | "9:16";
      per_shot_prompts?: string[];
      shot_index?: number;
      lock_mode?: "character" | "scene" | "auto";
      directors_note?: string;
      subject_kind?: "character" | "product";
    },
    options?: { subjectSheet?: boolean; subjectKind?: "character" | "product" },
  ) => {
    // Auto-attach the pinned subject sheet to every reference call EXCEPT when
    // we're generating the sheet itself.
    if (!options?.subjectSheet && pinnedSubject) {
      const refs = payload.reference_urls ?? [];
      if (!refs.includes(pinnedSubject.url)) {
        payload = { ...payload, reference_urls: [pinnedSubject.url, ...refs] };
      }
    }

    // Confirm credit cost before kicking off the generation.
    const imageCount =
      payload.mode === "storyboard_panels"
        ? payload.shot_index
          ? 1
          : (payload.per_shot_prompts?.length ?? Math.min(Math.max(payload.count ?? 9, 1), 9))
        : Math.min(Math.max(payload.count ?? 1, 1), 9);
    const PER_IMAGE_CREDITS = 5;
    const approvalCost = imageCount * PER_IMAGE_CREDITS;
    const approvalLabel =
      payload.mode === "storyboard_panels"
        ? payload.shot_index
          ? `Regenerate panel ${payload.shot_index}`
          : `Storyboard panels (${imageCount})`
        : payload.mode === "character_sheet"
          ? options?.subjectKind === "product"
            ? "Product sheet"
            : "Character sheet"
          : "Key frame";
    const approvalKey =
      payload.mode === "storyboard_panels"
        ? payload.shot_index
          ? "approval:image:single_panel_regen"
          : "approval:image:storyboard_panels"
        : payload.mode === "character_sheet"
          ? "approval:image:character_sheet"
          : "approval:image:single_panel";
    const truncate = (s: string, n = 90) =>
      s.length > n ? `${s.slice(0, n - 1)}…` : s;
    const approvalItems: string[] =
      payload.mode === "storyboard_panels" && payload.per_shot_prompts?.length
        ? (() => {
            const first = payload.per_shot_prompts!.slice(0, 3).map((p, i) => `Shot ${i + 1}: ${truncate(p)}`);
            const extra = payload.per_shot_prompts!.length - 3;
            return extra > 0 ? [...first, `+${extra} more shot${extra === 1 ? "" : "s"}`] : first;
          })()
        : [truncate(payload.prompt || "Generate image")];

    const confirmed = await new Promise<boolean>((resolve) => {
      requestApproval({
        action: "image",
        label: approvalLabel,
        question: `Use ${approvalCost} credit${approvalCost === 1 ? "" : "s"}?`,
        items: approvalItems,
        cost: approvalCost,
        alwaysAllowKey: approvalKey,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;


    const isStreamingStoryboard =
      payload.mode === "storyboard_panels" &&
      !payload.shot_index &&
      ((payload.per_shot_prompts?.length ?? payload.count ?? 9) > 1);
    const streamTotal =
      payload.per_shot_prompts?.length ?? Math.min(Math.max(payload.count ?? 9, 1), 9);



    const loadingBubble: Bubble = {
      role: "assistant",
      animate: true,
      content:
        payload.mode === "storyboard_panels"
          ? "Generating storyboard panels…"
          : payload.mode === "character_sheet"
            ? "Designing a character sheet…"
            : "Generating a reference frame…",
    };

    // For streaming storyboard, mount the live image bubble immediately and
    // skip the text loading bubble (the progress bar replaces it).
    const liveImageBubble: Bubble | null = isStreamingStoryboard
      ? {
          role: "generated_images",
          data: {
            mode: payload.mode,
            images: [],
            directorsNote: payload.directors_note,
            progress: { done: 0, total: streamTotal },
          },
        }
      : null;
    const liveBubbleIndex = isStreamingStoryboard ? baseBubbles.length : -1;
    setBubbles(
      liveImageBubble ? [...baseBubbles, liveImageBubble] : [...baseBubbles, loadingBubble],
    );

    try {
      const api = await import("@/lib/director/api");
      const streamedImages: Array<{ url: string; storage_path: string; shot_index?: number }> = [];
      const result = isStreamingStoryboard
        ? await api.generateReferenceImageStream(
            {
              mode: payload.mode,
              prompt: payload.prompt,
              reference_urls: payload.reference_urls,
              count: payload.count,
              aspect_ratio: payload.aspect_ratio,
              per_shot_prompts: payload.per_shot_prompts,
              lock_mode: payload.lock_mode,
              subject_kind: payload.subject_kind,
            },
            (ev) => {
              if (ev.type === "panel") {
                streamedImages.push(ev.value);
                setBubbles((prev) => {
                  const next = prev.slice();
                  const b = next[liveBubbleIndex];
                  if (b && b.role === "generated_images") {
                    next[liveBubbleIndex] = {
                      ...b,
                      data: {
                        ...b.data,
                        images: [...streamedImages].sort(
                          (a, z) => (a.shot_index ?? 0) - (z.shot_index ?? 0),
                        ),
                        progress: { done: streamedImages.length, total: streamTotal },
                      },
                    };
                  }
                  return next;
                });
              }
            },
          )
        : await api.generateReferenceImage({
            mode: payload.mode,
            prompt: payload.prompt,
            reference_urls: payload.reference_urls,
            count: payload.count,
            aspect_ratio: payload.aspect_ratio,
            per_shot_prompts: payload.per_shot_prompts,
            shot_index: payload.shot_index,
            lock_mode: payload.lock_mode,
            subject_kind: payload.subject_kind,
          });

      const role: "character" | "storyboard" | "reference" | "key_frame" =
        payload.mode === "character_sheet"
          ? "character"
          : payload.mode === "storyboard_panels"
            ? "storyboard"
            : "key_frame";
      const newAttachments: Attachment[] = result.images.map((img, i) => ({
        kind: "image" as const,
        name:
          role === "storyboard"
            ? `panel-${img.shot_index ?? i + 1}.png`
            : role === "key_frame"
              ? `key-frame.png`
              : `${role}.png`,
        url: img.url,
        storage_path: img.storage_path,
        role,
        shot_index: img.shot_index,
        ...(role === "key_frame" && payload.aspect_ratio
          ? { aspect_ratio: payload.aspect_ratio }
          : {}),
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
      const isSheet = options?.subjectSheet || payload.mode === "character_sheet";
      const sheetKind: "character" | "product" =
        options?.subjectKind ?? (payload.subject_kind === "product" ? "product" : "character");
      const imageBubble: Bubble = {
        role: "generated_images",
        data: {
          mode: payload.mode,
          images: result.images,
          directorsNote: payload.directors_note,
          ...(payload.aspect_ratio ? { aspectRatio: payload.aspect_ratio } : {}),
          ...(isSheet ? { subjectSheet: true as const, subjectKind: sheetKind } : {}),
        },
      };
      const carrierBubble: Bubble = {
        role: "user",
        content:
          role === "character"
            ? "(Generated character sheet — use as identity reference.)"
            : role === "storyboard"
              ? `(Generated ${newAttachments.length} storyboard panels — use in shot order.)`
              : `(Generated key frame at ${payload.aspect_ratio ?? "16:9"} — use as scene anchor for any frame-by-frame extension.)`,
        attachments: newAttachments,
      };
      const finalBubbles: Bubble[] = [...baseBubbles, imageBubble, carrierBubble];
      setBubbles(finalBubbles);
      setAttachments([]);
      void persist(finalBubbles, null, null);
      toast.success(
        role === "storyboard"
          ? `${newAttachments.length} panels generated`
          : role === "key_frame"
            ? "Key frame generated"
            : "Reference image generated",
      );
    } catch (e: any) {
      const handled = await notifyInsufficientCredits(e);
      const message = handled
        ? "You're out of credits — top up to keep generating."
        : e?.message || "Image generation failed";
      if (!handled) toast.error(message);
      setBubbles((prev) => {
        const trimmed =
          prev.length && prev[prev.length - 1].role === "assistant"
            ? prev.slice(0, -1)
            : prev;
        return [
          ...trimmed,
          { role: "error", message, retryable: !handled },
        ];
      });
    }
  };

  const handleAspectChoice = async (bubbleIndex: number, aspect: AspectRatio) => {
    if (busy) return;
    const target = bubbles[bubbleIndex];
    if (!target || target.role !== "aspect_choice" || target.chosen) return;
    const stamped: Bubble[] = bubbles.map((b, i) =>
      i === bubbleIndex && b.role === "aspect_choice" ? { ...b, chosen: aspect } : b,
    );
    setBubbles(stamped);
    setBusy(true);
    try {
      await runImageGeneration(stamped, {
        ...target.payload,
        aspect_ratio: aspect,
      });
    } finally {
      setBusy(false);
    }
  };

  // Find the most recent pinned subject sheet in the chat (latest wins, unless unpinned).
  const pinnedSubject = useMemo(() => {
    for (let i = bubbles.length - 1; i >= 0; i -= 1) {
      const b = bubbles[i];
      if (b.role === "generated_images" && b.data.subjectSheet && b.data.images[0]) {
        return {
          url: b.data.images[0].url,
          storage_path: b.data.images[0].storage_path,
          kind: b.data.subjectKind ?? "character",
        };
      }
    }
    return null;
  }, [bubbles]);

  const handleSubjectLockChoice = async (bubbleIndex: number, kind: SubjectKind) => {
    if (busy) return;
    const target = bubbles[bubbleIndex];
    if (!target || target.role !== "subject_lock_choice" || target.chosen) return;
    const stamped: Bubble[] = bubbles.map((b, i) =>
      i === bubbleIndex && b.role === "subject_lock_choice" ? { ...b, chosen: kind } : b,
    );
    setBubbles(stamped);

    // After choosing, surface the existing aspect-ratio chip for the original key frame.
    const aspectBubble: Bubble = {
      role: "aspect_choice",
      payload: target.payload,
    };

    if (kind === "none") {
      const withAspect: Bubble[] = [...stamped, aspectBubble];
      setBubbles(withAspect);
      void persist(withAspect, null, null);
      return;
    }

    // Build a multi-angle subject sheet first, then ask the user to describe the
    // opening key frame scene BEFORE asking for aspect ratio.
    const sheetPrompt =
      kind === "product"
        ? `The product/object described by the user: ${target.payload.prompt}`
        : `The character described by the user: ${target.payload.prompt}`;

    setBusy(true);
    try {
      await runImageGeneration(stamped, {
        mode: "character_sheet",
        prompt: sheetPrompt,
        reference_urls: target.payload.reference_urls,
        directors_note:
          kind === "product"
            ? "Pinned product sheet — I'll attach this to every frame so the product stays consistent."
            : "Pinned character sheet — I'll attach this to every frame so the character stays consistent.",
        lock_mode: "auto",
        subject_kind: kind === "product" ? "product" : "character",
      }, { subjectSheet: true, subjectKind: kind === "product" ? "product" : "character" });

      // After the sheet returns, append a scene_describe bubble. The aspect chip
      // is queued after the user describes (or skips) the opening key frame scene.
      setBubbles((prev) => {
        const sceneBubble: Bubble = { role: "scene_describe", payload: target.payload };
        const withScene = [...prev, sceneBubble];
        void persist(withScene, null, null);
        return withScene;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSceneDescribeSubmit = (bubbleIndex: number, sceneText: string) => {
    if (busy) return;
    const target = bubbles[bubbleIndex];
    if (!target || target.role !== "scene_describe" || target.submitted) return;
    const trimmed = sceneText.trim();
    const stamped: Bubble[] = bubbles.map((b, i) =>
      i === bubbleIndex && b.role === "scene_describe" ? { ...b, submitted: true } : b,
    );
    const mergedPrompt = trimmed
      ? `${target.payload.prompt}\n\nOpening key frame scene: ${trimmed}`
      : target.payload.prompt;
    const userEcho: Bubble | null = trimmed
      ? { role: "user", content: `Opening key frame scene: ${trimmed}` }
      : null;
    const aspectBubble: Bubble = {
      role: "aspect_choice",
      payload: { ...target.payload, prompt: mergedPrompt },
    };
    const next: Bubble[] = userEcho
      ? [...stamped, userEcho, aspectBubble]
      : [...stamped, aspectBubble];
    setBubbles(next);
    void persist(next, null, null);
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
    const turnAttachments = attachments;
    const userBubble: Bubble = {
      role: "user",
      content: text || fallback,
      attachments: turnAttachments.length ? turnAttachments : undefined,
    };
    // Drop any prior error bubble so retry replaces it cleanly,
    // and drop the idle nudge so it disappears the moment the user sends.
    const cleaned = bubbles.filter(
      (b) => b.role !== "error" && !(b.role === "assistant" && b.content === IDLE_NUDGE),
    );
    const next: Bubble[] = [...cleaned, userBubble];
    lastSendRef.current = { text: text || fallback, attachments: turnAttachments };
    setBubbles(next);
    setInput("");
    if (idleTimer.current) window.clearTimeout(idleTimer.current);

    setBusy(true);
    setPhase(
      attachments.some((a) => a.kind === "image" || a.kind === "video_keyframes")
        ? "analyzing_image"
        : "thinking",
    );
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
          const ls: any = (b.data as any).locked_spec || {};
          const lockedLine =
            ls && Object.keys(ls).length
              ? `Locked spec: ${[
                  ls.duration_seconds ? `${ls.duration_seconds}s` : null,
                  ls.aspect_ratio,
                  ls.resolution,
                  ls.audio,
                  ls.style,
                  ls.input_mode,
                ]
                  .filter(Boolean)
                  .join(" · ")}\n`
              : "";
          const summary =
            `[Previously generated prompt — "${b.data.title || "Untitled"}"]\n` +
            `Prompt: ${b.data.prompt}\n` +
            lockedLine +
            (br.recommended_model_id ? `Target model: ${br.recommended_model_id}\n` : "") +
            (br.subject ? `Subject: ${br.subject}\n` : "") +
            (br.camera ? `Camera: ${br.camera}\n` : "") +
            (br.lighting ? `Lighting: ${br.lighting}\n` : "") +
            (br.mood ? `Mood: ${br.mood}\n` : "") +
            (br.film_emulation ? `Film emulation: ${br.film_emulation}\n` : "") +
            (br.color_palette ? `Color palette: ${br.color_palette}\n` : "") +
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
        } else if (b.role === "generated_images") {
          const tag =
            b.data.mode === "character_sheet"
              ? "character sheet"
              : b.data.mode === "storyboard_panels"
                ? `${b.data.images.length} storyboard panels (shot ${b.data.images.map((i) => i.shot_index ?? "?").join(", ")})`
                : "key frame (hero / establishing shot)";
          const roleTag =
            b.data.mode === "character_sheet"
              ? "character"
              : b.data.mode === "storyboard_panels"
                ? "storyboard"
                : "key_frame";
          const aspectLine = b.data.aspectRatio ? ` Aspect ratio: ${b.data.aspectRatio}.` : "";
          history.push({
            role: "assistant",
            content: `[Generated ${tag} via generate_reference_image.${aspectLine} They are attached on the next user turn with role: ${roleTag}. If the user asks to extend a key_frame frame-by-frame, call generate_reference_image again with mode: "storyboard_panels", lock_mode: "scene", and the key_frame URL in reference_urls. Do not regenerate the existing image. The client will inherit the key frame's aspect ratio automatically — you can omit aspect_ratio.]`,
          });
        } else if (b.role === "aspect_choice") {
          if (b.chosen) {
            history.push({
              role: "user",
              content: `Aspect ratio chosen for the key frame: ${b.chosen}.`,
            });
          } else {
            history.push({
              role: "assistant",
              content: `[Asked the user to pick an aspect ratio for the key frame. Waiting for their choice.]`,
            });
          }
        } else if (b.role === "scene_describe") {
          if (!b.submitted) {
            history.push({
              role: "assistant",
              content: `[Asked the user to describe the opening key frame scene before choosing aspect ratio. Waiting for their description.]`,
            });
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
            copy[placeholderIndex] = {
              role: "result",
              data,
              partial: true,
              nextSuggestions: (partial as any).next_suggestions,
            };
          } else if (partial.kind === "ask_clarification") {
            copy[placeholderIndex] = {
              role: "questions",
              questions: (partial as any).questions || [],
              reason: (partial as any).reason || "",
              agentSuggestions: (partial as any).suggestions,
            };
          } else if (partial.kind === "ask_model_choice") {
            const rec = (partial as any).recommended_model_id;
            if (rec) {
              copy[placeholderIndex] = {
                role: "model_choice",
                recommended_model_id: rec,
                alternatives: (partial as any).alternatives || [],
                reason: (partial as any).reason || "",
                lockedSpec: (partial as any).locked_spec,
              };
            }
          }
          return copy;
        });
      };

      // Reserve the placeholder slot
      setBubbles((prev) => [...prev, { role: "assistant", content: "…" }]);

      // Retry up to 2 times on transient errors (timeouts, 5xx, network).
      const MAX_ATTEMPTS = 3;
      let resp: AgentResponse | null = null;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          resp = await streamDirectorAgent(history, mergedAttachments, handlePartial, undefined, {
            idleTimeoutMs: 30_000,
            totalTimeoutMs: 120_000,
            onPhase: (p) => setPhase(p),
          });
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const retryable = err?.retryable === true;
          if (!retryable || attempt === MAX_ATTEMPTS) break;
          const backoff = 600 * attempt;
          toast.message(`Retrying… (${attempt}/${MAX_ATTEMPTS - 1})`, {
            description: err?.message,
          });
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      if (!resp) throw lastErr ?? new Error("Director didn't respond.");

      let added: Bubble;
      let finalPrompt: string | null = null;
      let title: string | null = null;

      if (resp.kind === "generate_prompt") {
        added = { role: "result", data: resp, nextSuggestions: resp.next_suggestions };
        finalPrompt = resp.prompt;
        title = resp.title;
      } else if (resp.kind === "ask_clarification") {
        added = {
          role: "questions",
          questions: resp.questions,
          reason: resp.reason,
          agentSuggestions: resp.suggestions,
        };
      } else if (resp.kind === "ask_model_choice") {
        added = {
          role: "model_choice",
          recommended_model_id: resp.recommended_model_id,
          alternatives: resp.alternatives,
          reason: resp.reason,
          lockedSpec: resp.locked_spec,
        };
      } else if (resp.kind === "generate_reference_image") {
        // Key frame (single_panel) → ask the user for aspect ratio first.
        if (resp.mode === "single_panel") {
          const payload = {
            mode: "single_panel" as const,
            prompt: resp.prompt,
            reference_urls: resp.reference_urls,
            count: resp.count,
            per_shot_prompts: resp.per_shot_prompts,
            shot_index: resp.shot_index,
            lock_mode: resp.lock_mode,
            directors_note: resp.directors_note,
            scene_already_described: resp.scene_already_described,
          };

          // If no subject sheet is pinned and we haven't asked yet this session,
          // surface the subject-lock chip BEFORE the aspect chip.
          const alreadyAsked = next.some((b) => b.role === "subject_lock_choice");
          if (!pinnedSubject && !alreadyAsked) {
            const subjectBubble: Bubble = { role: "subject_lock_choice", payload };
            const withSubject: Bubble[] = [...next, subjectBubble];
            setBubbles(withSubject);
            setAttachments([]);
            void persist(withSubject, null, null);
            return;
          }

          const aspectBubble: Bubble = { role: "aspect_choice", payload };
          const withAspect: Bubble[] = [...next, aspectBubble];
          setBubbles(withAspect);
          setAttachments([]);
          void persist(withAspect, null, null);
          return;
        }

        // Storyboard scene-extension → inherit aspect from the most recent key frame.
        let effectiveAspect = resp.aspect_ratio;
        if (resp.mode === "storyboard_panels" && resp.lock_mode === "scene") {
          for (let i = next.length - 1; i >= 0; i -= 1) {
            const b = next[i];
            if (b.role === "generated_images" && b.data.mode === "single_panel" && b.data.aspectRatio) {
              effectiveAspect = b.data.aspectRatio;
              break;
            }
          }
        }

        await runImageGeneration(next, {
          mode: resp.mode,
          prompt: resp.prompt,
          reference_urls: resp.reference_urls,
          count: resp.count,
          aspect_ratio: effectiveAspect,
          per_shot_prompts: resp.per_shot_prompts,
          shot_index: resp.shot_index,
          lock_mode: resp.lock_mode,
          directors_note: resp.directors_note,
        });
        return;
      } else if (resp.kind === "request_video_generation") {
        const refCount = referenceImageUrls.length;
        const provider =
          refCount >= 2 ? "seedance-2.0-ref" : refCount === 1 ? "seedance-2.0" : "seedance-v1-pro";
        added = {
          role: "assistant",
          animate: true,
          content: `Sending this to the ${provider} renderer…`,
        };
        try {
          const basePrompt = resp.prompt?.trim() || getLatestGeneratedPrompt();
          const slotLabels: Record<"brand" | "character" | "location", string> = {
            brand: "brand / product",
            character: "main subject",
            location: "location / scene",
          };
          const tagLines = referenceImageUrls
            .map((_, i) => `@Image${i + 1} = ${slotLabels[referenceImageSlots[i]] || `reference ${i + 1}`}`)
            .join("\n");
          const resolvedPrompt = tagLines ? `${tagLines}\n\n${basePrompt}` : basePrompt;
          const job = await submitVideoJob(
            resolvedPrompt,
            provider,
            sessionIdRef.current,
            undefined,
            referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          );
          const videoBubble: Bubble = {
            role: "video",
            data: {
              jobId: job.id,
              prompt: resolvedPrompt,
              provider,
              status: (job.status as any) || "queued",
              videoUrl: job.video_url || undefined,
            },
          };
          const withVideo: Bubble[] = [...next, added, videoBubble];
          setBubbles(withVideo);
          setAttachments([]);
          void persist(withVideo, finalPrompt, title);
          toast.success("Rendering — it'll appear here when ready.");
          return;
        } catch (e: any) {
          if (!(await notifyInsufficientCredits(e))) toast.error(e?.message || "Could not start render");
        }
      } else {
        added = { role: "assistant", animate: true, content: (resp as any).content || "..." };
      }

      const finalNext: Bubble[] = [...next, added];
      setBubbles(finalNext);
      setAttachments([]);
      void persist(finalNext, finalPrompt, title);
    } catch (e: any) {
      const retryable = e?.retryable !== false;
      const message =
        e?.name === "DirectorTimeoutError"
          ? "The Director didn't respond in time"
          : e?.message || "The Director couldn't respond";
      if (!(await notifyInsufficientCredits(e))) toast.error(message);
      setBubbles((b) => {
        const trimmed =
          b.length &&
          b[b.length - 1].role === "assistant" &&
          (b[b.length - 1] as any).content === "…"
            ? b.slice(0, -1)
            : b;
        const errorBubble: Bubble = {
          role: "error",
          message,
          detail: retryable
            ? "Your message is saved — tap Retry to try again."
            : e?.message && e.message !== message
              ? e.message
              : undefined,
          retryable,
        };
        return [...trimmed, errorBubble];
      });
    } finally {
      setBusy(false);
    }
  };

  const retryLast = async () => {
    const last = lastSendRef.current;
    if (!last || busy) return;
    setBubbles((prev) => {
      const copy = [...prev];
      if (copy.length && copy[copy.length - 1].role === "error") copy.pop();
      if (copy.length && copy[copy.length - 1].role === "user") copy.pop();
      return copy;
    });
    setAttachments(last.attachments);
    setTimeout(() => void send(last.text), 0);
  };

  const startFresh = (save: boolean) => {
    const uid = user?.id ?? null;
    if (!save && sessionIdRef.current) {
      void supabase.from("director_sessions").delete().eq("id", sessionIdRef.current);
      localState.clear(uid, sessionIdRef.current);
    }
    localState.clear(uid, "new");
    sessionIdRef.current = null;
    hydratedRef.current = null;
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

  // Aggregate every image attachment ever sent in this chat (current turn first,
  // then newest → oldest), dedupe by URL, cap at 9 (Seedance 2.0 ref limit).
  // First image is treated as brand/product, second as main character, rest as
  // location/scene — same convention as MarketingStudio.
  const { referenceImageUrls, referenceImageSlots } = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const push = (a: Attachment) => {
      const url = (a as any).url as string | undefined;
      if (!url || seen.has(url)) return;
      if ((a as any).kind && (a as any).kind !== "image") return;
      seen.add(url);
      urls.push(url);
    };
    for (const a of attachments) push(a);
    for (let i = bubbles.length - 1; i >= 0; i -= 1) {
      const b = bubbles[i];
      if (b.role === "user" && Array.isArray(b.attachments)) {
        for (const a of b.attachments) push(a);
      }
    }
    const slotOrder: Array<"brand" | "character" | "location"> = ["brand", "character", "location"];
    const sliced = urls.slice(0, 9);
    return {
      referenceImageUrls: sliced,
      referenceImageSlots: sliced.map((_, i) => slotOrder[Math.min(i, 2)]),
    };
  }, [attachments, bubbles]);

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
              alt="MovPrompt"
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
    <div className="flex flex-col gap-2 h-[calc(100vh-120px)]">
      {/* Presence header */}
      <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto w-full">
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
      </div>


      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto border-[hsl(240_5%_13%)] p-3 sm:p-4 border-0 rounded-none"
      >
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img src={logoMark} alt="" className="w-32 h-32 opacity-[0.05]" />
          </div>
        )}
        <div className="flex flex-col gap-6 min-h-full max-w-3xl mx-auto w-full">
          <div className="flex-1" />
          {bubbles.map((b, i) => {
            if (b.role === "result") {
              // Find the most recent model the user explicitly picked in a
              // ModelChoiceCard before this result bubble — that's what the
              // primary "Generate" button should target.
              let pickedModelId: string | undefined;
              let pickedSpec: import("@/lib/director/api").LockedSpec | undefined;
              for (let k = i - 1; k >= 0; k -= 1) {
                const prev = bubbles[k];
                if (prev.role === "model_choice") {
                  if ((prev as any).chosen) pickedModelId = (prev as any).chosen as string;
                  if (!pickedSpec) pickedSpec = (prev as any).lockedSpec;
                  if (pickedModelId) break;
                }
              }
              const resolvedSpec =
                (b.data as any).locked_spec ?? pickedSpec ?? undefined;
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
                    referenceImageUrls={referenceImageUrls}
                    referenceImageSlots={referenceImageSlots}
                    preferredModelId={pickedModelId}
                    lockedSpec={resolvedSpec}
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
                  agentSuggestions={b.agentSuggestions}
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
                    lockedSpec={b.lockedSpec}
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
            if (b.role === "generated_images") {
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <div className="flex-1">
                    <GeneratedImageCard
                      data={b.data}
                      onRegenerate={(intent) => {
                        if (busy) return;
                        void send(intent);
                      }}
                      onUnpinSubject={
                        b.data.subjectSheet
                          ? () => {
                              setBubbles((prev) => {
                                const copy = prev.slice();
                                const cur = copy[i];
                                if (cur.role === "generated_images") {
                                  copy[i] = {
                                    ...cur,
                                    data: { ...cur.data, subjectSheet: false },
                                  };
                                }
                                void persist(copy, null, null);
                                return copy;
                              });
                              toast.success("Subject sheet unpinned");
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              );
            }
            if (b.role === "video") {
              return (
                <div key={i} className="motion-safe:animate-fade-up">
                  <VideoBubble
                    data={b.data}
                    onChange={(next) => {
                      setBubbles((prev) => {
                        const copy = [...prev];
                        copy[i] = { role: "video", data: next };
                        return copy;
                      });
                    }}
                  />
                </div>
              );
            }
            if (b.role === "aspect_choice") {
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <div className="flex-1">
                    <AspectChoiceCard
                      chosen={b.chosen}
                      disabled={busy}
                      onChoose={(aspect) => void handleAspectChoice(i, aspect)}
                    />
                  </div>
                </div>
              );
            }
            if (b.role === "subject_lock_choice") {
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <div className="flex-1">
                    <SubjectLockChoiceCard
                      chosen={b.chosen}
                      disabled={busy}
                      onChoose={(kind) => void handleSubjectLockChoice(i, kind)}
                    />
                  </div>
                </div>
              );
            }
            if (b.role === "scene_describe") {
              return (
                <div key={i} className="flex items-start gap-2 motion-safe:animate-fade-up">
                  <AssistantAvatar size="sm" state="idle" className="mt-1" />
                  <div className="flex-1">
                    <QuestionCard
                      reason="Before we render the key frame, set the scene — this anchors the whole story."
                      questions={[
                        "Describe the opening key frame: setting, action, mood, lighting, time of day.",
                      ]}
                      disabled={busy || b.submitted}
                      onContinue={(formatted) => {
                        // QuestionCard returns "1. <answer>"; strip the numbering.
                        const answer = formatted.replace(/^\s*1\.\s*/, "").trim();
                        handleSceneDescribeSubmit(i, answer);
                      }}
                      onSkip={() => handleSceneDescribeSubmit(i, "")}
                    />
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
              phase={phase}
              state={
                phase === "analyzing_image" || phase === "decomposing_scene"
                  ? "scanning"
                  : "thinking"
              }
            />
          )}
          {!busy && lastBubble?.role === "questions" && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <MessageCircleMore className="w-4 h-4" />
              <span>Awaiting your input</span>
            </div>
          )}
          {pendingApproval && <AwaitingApprovalPill />}
        </div>
      </div>

      {pendingApproval && <BottomApprovalBar request={pendingApproval} />}

      <div className="max-w-3xl mx-auto w-full">
        <Composer
          value={input}
          onChange={setInput}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          onSend={send}
          busy={busy}
          showHelper={isEmpty && attachments.length === 0}
          quickReplies={(() => {
            if (busy) return undefined;
            const last = bubbles[bubbles.length - 1];
            if (last?.role === "result" && last.nextSuggestions?.length) {
              return last.nextSuggestions;
            }
            return undefined;
          })()}
          onQuickReply={(chip) => void send(chip)}
        />
      </div>

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
