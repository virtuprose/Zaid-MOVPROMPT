import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { detectMediaAsk } from "@/lib/director/questionIntent";
import {
  detectSuggestion,
  isChipActive,
  toggleChip,
} from "@/lib/director/questionSuggestions";
import { QuestionUploadSlot } from "./QuestionUploadSlot";
import type { Attachment } from "@/lib/director/ingest";

const DURATION_RE = /(duration|length|how long|seconds|how many seconds|how long should)/i;
const DURATION_PRESETS = ["10s", "15s", "30s", "45s", "Other"];

type AgentSuggestion = {
  question_index: number;
  chips: string[];
  allow_other?: boolean;
};

type Props = {
  reason: string;
  questions: string[];
  disabled?: boolean;
  /** When true, render a compact read-only summary (no inputs, chips, or buttons). */
  collapsed?: boolean;
  attachments?: Attachment[];
  onAttach?: (next: Attachment[]) => void;
  onContinue: (formatted: string) => void;
  onSkip: () => void;
  /** Optional chips supplied by the Director (preferred over heuristic). */
  agentSuggestions?: AgentSuggestion[];
  /** Triggers the Image Prompt generation flow when the special chip is picked. */
  onGenerateImagePrompt?: () => void;
};

const IMAGE_PROMPT_CHIP = "Generate an image prompt";

export function QuestionCard({ reason, questions, disabled, attachments = [], onAttach, onContinue, onSkip, agentSuggestions, onGenerateImagePrompt }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [otherOpen, setOtherOpen] = useState<Record<number, boolean>>({});
  const [slotCounts, setSlotCounts] = useState<Record<number, number>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  const mediaAsks = useMemo(
    () => questions.map((q) => (DURATION_RE.test(q) ? null : detectMediaAsk(q))),
    [questions],
  );

  const suggestions = useMemo(
    () =>
      questions.map((q, i) => {
        if (mediaAsks[i]) return null;
        if (DURATION_RE.test(q)) return null;
        const fromAgent = agentSuggestions?.find((s) => s.question_index === i);
        if (fromAgent && fromAgent.chips?.length) {
          return {
            category: "agent" as const,
            example: "Pick one or more, or type your own",
            chips: fromAgent.chips,
          };
        }
        return detectSuggestion(q);
      }),
    [questions, mediaAsks, agentSuggestions],
  );

  useEffect(() => {
    if (!disabled) firstInputRef.current?.focus();
  }, [disabled]);

  const setAnswer = (i: number, v: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const submit = () => {
    if (disabled) return;
    const lines = questions
      .map((_, i) => {
        const txt = answers[i]?.trim();
        const count = slotCounts[i] || 0;
        const ask = mediaAsks[i];
        if (txt && count > 0) {
          return `${i + 1}. ${txt} (attached ${count} ${ask?.label || "file"}${count > 1 ? "s" : ""})`;
        }
        if (txt) return `${i + 1}. ${txt}`;
        if (count > 0 && ask) {
          return `${i + 1}. [attached ${count} ${ask.label}${count > 1 ? "s" : ""}]`;
        }
        return null;
      })
      .filter(Boolean) as string[];
    const formatted = lines.join("\n");
    if (!formatted) {
      onSkip();
      return;
    }
    onContinue(formatted);
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-muted/15 p-5 sm:p-6 space-y-5",
        disabled && "opacity-60 pointer-events-none",
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
          e.preventDefault();
          submit();
        }
      }}
    >
      {reason && <div className="text-xs text-muted-foreground/80 italic">{reason}</div>}

      <div className="space-y-4">
        {questions.map((q, i) => {
          const isDuration = DURATION_RE.test(q);
          const ask = mediaAsks[i];
          const suggestion = suggestions[i];
          const showOther = !!otherOpen[i];
          const value = answers[i] ?? "";
          return (
            <div key={i} className="space-y-2">
              <div className="text-sm text-foreground/90 font-normal">
                <span className="text-muted-foreground/70 mr-1.5">{i + 1}.</span>
                {q}
              </div>

              {ask && onAttach && (
                <QuestionUploadSlot
                  ask={ask}
                  attachments={attachments}
                  onAttach={onAttach}
                  onCountChange={(count) =>
                    setSlotCounts((prev) =>
                      prev[i] === count ? prev : { ...prev, [i]: count },
                    )
                  }
                  disabled={disabled}
                />
              )}

              {isDuration && (
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map((p) => {
                    const active = p === "Other" ? showOther : value === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          if (p === "Other") {
                            setOtherOpen((s) => ({ ...s, [i]: true }));
                            setAnswer(i, "");
                          } else {
                            setOtherOpen((s) => ({ ...s, [i]: false }));
                            setAnswer(i, p);
                          }
                        }}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs border transition-colors",
                          active
                            ? "bg-foreground/10 border-border/50 text-foreground"
                            : "bg-transparent border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              )}

              {!isDuration && suggestion && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.chips.map((chip) => {
                    const isImagePromptChip = chip === IMAGE_PROMPT_CHIP;
                    const active = !isImagePromptChip && isChipActive(value, chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          if (isImagePromptChip && onGenerateImagePrompt) {
                            onGenerateImagePrompt();
                            return;
                          }
                          setAnswer(i, toggleChip(value, chip));
                        }}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs border transition-colors",
                          isImagePromptChip
                            ? "bg-primary/10 border-primary/40 text-foreground hover:bg-primary/20 hover:border-primary/60"
                            : active
                            ? "bg-foreground/10 border-border/50 text-foreground"
                            : "bg-transparent border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60",
                        )}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              )}

              {(!isDuration || showOther) && (
                <input
                  ref={i === 0 ? firstInputRef : undefined}
                  type="text"
                  value={value}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  placeholder={
                    ask
                      ? "Add a note (optional)"
                      : suggestion?.example ?? "Enter your answer"
                  }
                  className="w-full rounded-full bg-background/30 border border-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background/50 focus:border-border/40 transition-colors"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          className="rounded-full gap-2 bg-foreground/10 text-foreground hover:bg-foreground/15 border border-border/30"
        >
          Continue
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-70">
            ⌘ ⇧ ↵
          </span>
        </Button>
      </div>
    </div>
  );
}
