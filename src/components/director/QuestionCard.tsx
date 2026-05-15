import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DURATION_RE = /(duration|length|how long|seconds|how many seconds|how long should)/i;
const DURATION_PRESETS = ["10s", "15s", "30s", "45s", "Other"];

type Props = {
  reason: string;
  questions: string[];
  disabled?: boolean;
  onContinue: (formatted: string) => void;
  onSkip: () => void;
};

export function QuestionCard({ reason, questions, disabled, onContinue, onSkip }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [otherOpen, setOtherOpen] = useState<Record<number, boolean>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

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
    const formatted = questions
      .map((_, i) => answers[i]?.trim())
      .map((a, i) => (a ? `${i + 1}. ${a}` : null))
      .filter(Boolean)
      .join("\n");
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
          const showOther = !!otherOpen[i];
          const value = answers[i] ?? "";
          return (
            <div key={i} className="space-y-2">
              <div className="text-sm text-foreground/90 font-normal">
                <span className="text-muted-foreground/70 mr-1.5">{i + 1}.</span>
                {q}
              </div>

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
                            ? "bg-foreground/10 border-border text-foreground"
                            : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                        )}
                      >
                        {p}
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
                  placeholder="Enter your answer"
                  className="w-full rounded-full bg-background/40 border border-border/40 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-border focus:bg-background/60 transition-colors"
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
          className="rounded-full gap-2"
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
