import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2, X, FileText, Image as ImageIcon, Music, ShieldCheck, ShieldAlert, ShieldQuestion, Mic, Square, Sparkles, MessageCircle, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  classifyFile,
  ingestAudio,
  ingestDocument,
  ingestImage,
  ingestVideo,
  type Attachment,
} from "@/lib/director/ingest";
import { moderateImage } from "@/lib/director/api";
import { useVoiceCapture } from "@/lib/director/useVoiceCapture";
import { QuickReplies } from "./QuickReplies";
import { CostChip } from "@/components/credits/CostChip";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  onSend: () => void;
  busy: boolean;
  showHelper?: boolean;
  quickReplies?: string[];
  onQuickReply?: (chip: string) => void;
  onGenerateImagePrompt?: () => void;
  imagePromptBusy?: boolean;
};

export function Composer({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSend,
  busy,
  showHelper,
  quickReplies,
  onQuickReply,
  onGenerateImagePrompt,
  imagePromptBusy,
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = useCallback(async () => {
    const draft = value.trim();
    if (draft.length < 3 || enhancing) return;
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-description", {
        body: { description: draft },
      });
      if (error) throw error;
      const enhanced = typeof data?.enhanced === "string" ? data.enhanced.trim() : "";
      if (!enhanced) throw new Error("No enhanced text returned");
      onChange(enhanced);
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.focus();
        const pos = enhanced.length;
        ta.setSelectionRange(pos, pos);
      });
      toast.success("Description enhanced");
    } catch (e: any) {
      toast.error(e?.message || "Could not enhance description");
    } finally {
      setEnhancing(false);
    }
  }, [value, enhancing, onChange]);

  // Global drag detection so the composer signals "drop here" from anywhere on the page
  useEffect(() => {
    let counter = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter++;
      setPageDrag(true);
    };
    const onLeave = () => {
      counter = Math.max(0, counter - 1);
      if (counter === 0) setPageDrag(false);
    };
    const onDrop = () => {
      counter = 0;
      setPageDrag(false);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const [pendingCount, setPendingCount] = useState(0);

  // Voice capture wiring
  const voice = useVoiceCapture({
    userId: user?.id ?? null,
    onTranscript: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const next = value ? `${value.replace(/\s+$/, "")} ${trimmed}` : trimmed;
      onChange(next);
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.focus();
        const pos = next.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    onError: (msg) => toast.error(msg),
  });
  const recording = voice.state === "recording";
  const transcribing = voice.state === "transcribing";

  // Use a ref to the latest attachments so async moderation patches don't
  // race with concurrent uploads/removals.
  const attachmentsRef = useRef<Attachment[]>(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const isImageLike = (a: Attachment) => a.kind === "image" || a.kind === "video_keyframes";

  const moderateAttachment = useCallback(
    async (att: Attachment) => {
      if (!isImageLike(att) || !("url" in att) || !att.url) return;
      try {
        const verdict = await moderateImage(att.url);
        const next = attachmentsRef.current.map((a) => {
          if (a === att) {
            const moderation = verdict.eligible
              ? { state: "ok" as const }
              : {
                  state: "blocked" as const,
                  reason: verdict.reason || "Image flagged by content moderation.",
                  categories: verdict.categories,
                };
            return { ...(a as any), moderation };
          }
          return a;
        });
        if (!verdict.eligible) {
          toast.error(`Image blocked: ${verdict.reason || "content policy"}`);
        }
        attachmentsRef.current = next;
        onAttachmentsChange(next);
      } catch {
        const next = attachmentsRef.current.map((a) =>
          a === att ? { ...(a as any), moderation: { state: "unknown" as const } } : a,
        );
        attachmentsRef.current = next;
        onAttachmentsChange(next);
      }
    },
    [onAttachmentsChange],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files || []);
      if (arr.length === 0) return;
      setIngesting(true);
      setPendingCount((c) => c + arr.length);

      const ingestOne = async (f: File): Promise<Attachment[]> => {
        const kind = classifyFile(f);
        if (kind === "image") return [await ingestImage(f)];
        if (kind === "video") return await ingestVideo(f);
        if (kind === "audio") {
          if (!user) throw new Error("Sign in to upload audio");
          return [await ingestAudio(f, user.id)];
        }
        if (kind === "document") return [await ingestDocument(f)];
        throw new Error(`Unsupported file: ${f.name}`);
      };

      const results = await Promise.allSettled(arr.map(ingestOne));
      const fresh: Attachment[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") fresh.push(...r.value);
        else toast.error(r.reason?.message || `Could not read ${arr[i].name}`);
      });

      // Mark image-like attachments as scanning before we hand them to the parent.
      const stamped = fresh.map((a) =>
        isImageLike(a) ? ({ ...(a as any), moderation: { state: "scanning" as const } }) : a,
      );

      const next = [...attachmentsRef.current, ...stamped].slice(0, 12);
      attachmentsRef.current = next;
      onAttachmentsChange(next);
      setPendingCount((c) => Math.max(0, c - arr.length));
      setIngesting(false);

      // Kick off moderation in parallel; results patch the attachment in place.
      stamped.forEach((a) => {
        if (isImageLike(a)) void moderateAttachment(a);
      });
    },
    [onAttachmentsChange, user, moderateAttachment],
  );

  const remove = (i: number) => onAttachmentsChange(attachments.filter((_, idx) => idx !== i));

  const iconFor = (a: Attachment) => {
    if (a.kind === "audio_transcript") return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  // @-mention picker state
  const [mention, setMention] = useState<{ query: string; start: number; index: number } | null>(null);
  const filteredMentions = mention
    ? attachments
        .map((a, i) => ({ a, i }))
        .filter(({ a, i }) => {
          const q = mention.query.toLowerCase();
          if (!q) return true;
          return String(i + 1).startsWith(q) || a.name.toLowerCase().includes(q);
        })
    : [];

  const detectMention = (text: string, caret: number) => {
    const upto = text.slice(0, caret);
    const m = upto.match(/(?:^|\s)@([\w.-]*)$/);
    if (!m) return null;
    const start = caret - m[1].length - 1; // position of '@'
    return { query: m[1], start, index: 0 };
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart ?? text.length;
    if (attachments.length === 0) {
      setMention(null);
      return;
    }
    setMention(detectMention(text, caret));
  };

  const insertMention = (attachmentIndex: number) => {
    if (!mention) return;
    const caretEnd = taRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mention.start);
    const after = value.slice(caretEnd);
    const token = `@${attachmentIndex + 1} `;
    const next = before + token + after;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      const pos = (before + token).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const highlight = drag || pageDrag;

  return (
    <TooltipProvider>
      <div className="space-y-1.5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`relative rounded-2xl bg-card transition-colors ${
            highlight ? "ring-2 ring-accent bg-accent/5" : ""
          }`}
        >
          {highlight && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-accent/10">
              <span className="text-sm font-medium text-accent">Drop here to attach</span>
            </div>
          )}
          <textarea
            ref={taRef}
            value={value}
            onChange={handleTextChange}
            onKeyUp={(e) => {
              const ta = e.currentTarget;
              if (attachments.length === 0) return;
              setMention(detectMention(ta.value, ta.selectionStart ?? ta.value.length));
            }}
            onBlur={() => setTimeout(() => setMention(null), 150)}
            onKeyDown={(e) => {
              if (mention && filteredMentions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMention({ ...mention, index: (mention.index + 1) % filteredMentions.length });
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMention({
                    ...mention,
                    index: (mention.index - 1 + filteredMentions.length) % filteredMentions.length,
                  });
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(filteredMentions[mention.index].i);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMention(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing && e.keyCode !== 229) {
                e.preventDefault();
                if (!busy) onSend();
              }
            }}
            placeholder="What are you making? Describe the mood, action, and setting — or drop your references. Type @ to reference a file."
            rows={2}
            disabled={busy}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[64px]"
          />

          {mention && filteredMentions.length > 0 && (
            <div className="absolute left-3 right-3 z-20 -translate-y-full mt-[-6px] top-0 max-h-56 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Reference files
              </div>
              {filteredMentions.map(({ a, i }, fi) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(i);
                  }}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                    fi === mention.index ? "bg-accent/15 text-accent" : "hover:bg-muted"
                  }`}
                >
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-accent/20 px-1 text-[11px] font-semibold text-accent">
                    @{i + 1}
                  </span>
                  {isImageLike(a) && "url" in a && (
                    <img src={(a as any).url} alt="" className="h-6 w-6 rounded object-cover" />
                  )}
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          )}

          {(attachments.length > 0 || pendingCount > 0) && (
            <div className="flex flex-wrap gap-2 px-3 pb-2">
              {attachments.map((a, i) => {
                const mod = (a as any).moderation as
                  | { state: "scanning" | "ok" | "blocked" | "unknown"; reason?: string; categories?: string[] }
                  | undefined;
                const blocked = mod?.state === "blocked";
                const tooltip = blocked
                  ? `Blocked: ${mod?.reason || "content policy"}${mod?.categories?.length ? ` (${mod.categories.join(", ")})` : ""}`
                  : mod?.state === "scanning"
                    ? `Scanning ${a.name}…`
                    : mod?.state === "unknown"
                      ? `Couldn't verify ${a.name}`
                      : a.name;
                return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={`group relative h-16 w-16 overflow-hidden rounded-lg bg-muted ring-1 transition-colors ${
                        blocked ? "ring-2 ring-destructive" : "ring-border"
                      }`}
                    >
                      <span className="absolute left-0.5 top-0.5 z-10 inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-accent px-1 text-[10px] font-semibold text-accent-foreground shadow">
                        {i + 1}
                      </span>
                      {isImageLike(a) && "url" in a ? (
                        <img
                          src={(a as any).url}
                          alt={a.name}
                          loading="lazy"
                          className={`h-full w-full object-cover ${blocked ? "opacity-50" : ""}`}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground">
                          {iconFor(a)}
                          <span className="w-full truncate text-center text-[9px] leading-tight">{a.name}</span>
                        </div>
                      )}
                      {mod?.state === "scanning" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                          <Loader2 className="h-4 w-4 animate-spin text-foreground/80" />
                        </div>
                      )}
                      {mod && mod.state !== "scanning" && (
                        <span
                          className={`absolute bottom-0.5 left-0.5 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full shadow ${
                            blocked
                              ? "bg-destructive text-destructive-foreground"
                              : mod.state === "ok"
                                ? "bg-emerald-500/90 text-white"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {blocked ? (
                            <ShieldAlert className="h-2.5 w-2.5" />
                          ) : mod.state === "ok" ? (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          ) : (
                            <ShieldQuestion className="h-2.5 w-2.5" />
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label="Remove"
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tooltip}</TooltipContent>
                </Tooltip>
                );
              })}
              {Array.from({ length: pendingCount }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-16 w-16 animate-pulse rounded-lg bg-muted ring-1 ring-border"
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={busy || ingesting || recording || transcribing}
                aria-label="Attach files"
                className="h-11 w-11 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
              >
                {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleEnhance}
                    disabled={busy || ingesting || enhancing || recording || transcribing || value.trim().length < 3}
                    aria-label="Enhance description"
                    className="h-11 w-11 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {enhancing ? "Enhancing…" : "Enhance description"}
                </TooltipContent>
              </Tooltip>

              {onGenerateImagePrompt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={onGenerateImagePrompt}
                      disabled={busy || ingesting || imagePromptBusy || recording || transcribing}
                      aria-label="Generate image prompt"
                      className="h-11 w-11 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      {imagePromptBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {imagePromptBusy ? "Composing image prompt…" : "Generate pro image prompt"}
                  </TooltipContent>
                </Tooltip>
              )}




              {voice.supported && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (transcribing) return;
                        if (recording) void voice.stop();
                        else void voice.start();
                      }}
                      disabled={busy || ingesting}
                      aria-label={recording ? "Stop recording" : "Record voice brief"}
                      aria-pressed={recording}
                      className={cn(
                        "relative h-11 w-11 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground transition-colors",
                        recording && "text-destructive hover:text-destructive",
                      )}
                    >
                      {transcribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : recording ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      {recording && (
                        <span
                          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-destructive/60 motion-safe:animate-ping"
                          style={{ opacity: 0.3 + Math.min(0.7, voice.level) }}
                          aria-hidden
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {transcribing
                      ? "Transcribing…"
                      : recording
                        ? "Stop & transcribe"
                        : "Record a voice brief"}
                  </TooltipContent>
                </Tooltip>
              )}

              {recording && (
                <span className="ml-1 text-[11px] text-destructive font-medium tabular-nums">
                  ● Recording
                </span>
              )}
              {transcribing && (
                <span className="ml-1 text-[11px] text-muted-foreground">Transcribing…</span>
              )}
            </div>
            {(() => {
              const scanning = attachments.some(
                (a) => (a as any).moderation?.state === "scanning",
              );
              const blocked = attachments.some(
                (a) => (a as any).moderation?.state === "blocked",
              );
              const sendDisabled = busy || scanning || blocked;
              const handleSend = () => {
                if (blocked) {
                  toast.error("Remove the flagged images to continue.");
                  return;
                }
                if (scanning) {
                  toast.message("Scanning attachments — one moment…");
                  return;
                }
                onSend();
              };
              const tip = blocked
                ? "Remove flagged images to continue"
                : scanning
                  ? "Scanning attachments…"
                  : "Enter to send · Shift+Enter for newline";
              return (
                <div className="flex items-center gap-2">

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSend}
                        disabled={sendDisabled}
                        size="icon"
                        aria-label="Send"
                        className="h-11 w-11 sm:h-9 sm:w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {busy || scanning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{tip}</TooltipContent>
                  </Tooltip>
                </div>
              );
            })()}

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.docx,.txt,.md"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        </div>
        {quickReplies && quickReplies.length > 0 && !busy && (
          <div className="px-1 pt-1">
            <QuickReplies
              chips={quickReplies}
              disabled={busy}
              onPick={(chip) => {
                if (onQuickReply) {
                  onQuickReply(chip);
                  return;
                }
                const next = value ? `${value.replace(/\s+$/, "")} ${chip}` : chip;
                onChange(next);
                requestAnimationFrame(() => {
                  const ta = taRef.current;
                  if (!ta) return;
                  ta.focus();
                  const pos = next.length;
                  ta.setSelectionRange(pos, pos);
                });
              }}
            />
          </div>
        )}
        {showHelper && (
          <div className="text-[11px] text-muted-foreground text-center">
            Tip: drop files anywhere in this input · press the mic to speak
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
