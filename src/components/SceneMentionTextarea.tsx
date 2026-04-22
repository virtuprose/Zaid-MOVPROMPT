import { useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AtSign } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { useState } from "react";

export interface SceneMentionElement {
  index: number; // 1-based
  category: string;
  description: string;
}

interface SceneMentionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  elements: SceneMentionElement[];
  placeholder?: string;
}

export interface SceneMentionTextareaHandle {
  insertMention: (n: number) => void;
}

const categoryEmoji: Record<string, string> = {
  Subject: "🎯",
  Background: "🏙",
  Lighting: "💡",
  Atmosphere: "🌤",
  Objects: "📦",
  Colors: "🎨",
};

export const SceneMentionTextarea = forwardRef<SceneMentionTextareaHandle, SceneMentionTextareaProps>(
  ({ value, onChange, elements, placeholder }, fwdRef) => {
    const { t } = useLanguage();
    const ref = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const triggerPosRef = useRef<number | null>(null);
    const lastCaretRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    const recordCaret = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      lastCaretRef.current = {
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
      };
    };

    const insertMention = (n: number) => {
      const el = ref.current;
      const token = `@${n} `;
      if (!el) {
        onChange(value + token);
        setOpen(false);
        triggerPosRef.current = null;
        return;
      }
      const trigger = triggerPosRef.current;
      const fallbackStart = lastCaretRef.current.start ?? value.length;
      const fallbackEnd = lastCaretRef.current.end ?? fallbackStart;
      let next: string;
      let newCaret: number;
      if (trigger !== null && trigger >= 0 && value[trigger] === "@") {
        next = value.slice(0, trigger) + token + value.slice(trigger + 1);
        newCaret = trigger + token.length;
      } else {
        next = value.slice(0, fallbackStart) + token + value.slice(fallbackEnd);
        newCaret = fallbackStart + token.length;
      }
      onChange(next);
      setOpen(false);
      triggerPosRef.current = null;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      });
    };

    useImperativeHandle(fwdRef, () => ({ insertMention }), [value, elements]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      onChange(next);
      recordCaret(e.target);
      if (elements.length === 0) {
        triggerPosRef.current = null;
        if (open) setOpen(false);
        return;
      }
      const caret = e.target.selectionStart ?? next.length;
      const prev = next[caret - 1];
      const after = next[caret];
      const before = next[caret - 2];
      const isFreshAt =
        prev === "@" &&
        !/\d/.test(after ?? "") &&
        (caret === 1 || !/\w/.test(before ?? "") || before === "\n");
      if (isFreshAt && !open) {
        triggerPosRef.current = caret - 1;
        setOpen(true);
      } else if (triggerPosRef.current !== null) {
        // Only clear trigger if user destroyed the @ or typed a digit after it
        const tp = triggerPosRef.current;
        if (next[tp] !== "@" || /\d/.test(next[tp + 1] ?? "")) {
          triggerPosRef.current = null;
          if (open) setOpen(false);
        }
      }
    };

    const handleOpenChange = (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) triggerPosRef.current = null;
    };

    useEffect(() => {
      if (!ref.current || !overlayRef.current) return;
      overlayRef.current.scrollTop = ref.current.scrollTop;
    }, [value]);

    const renderHighlighted = () => {
      const parts = value.split(/(@\d+)/g);
      return parts.map((part, i) => {
        const m = /^@(\d+)$/.exec(part);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n >= 1 && n <= elements.length) {
            return (
              <span
                key={i}
                className="bg-primary/25 text-primary rounded px-0.5 -mx-0.5"
              >
                {part}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      });
    };

    return (
      <div className="space-y-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <div className="relative">
            <div
              ref={overlayRef}
              aria-hidden
              className="absolute inset-0 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words pointer-events-none text-transparent overflow-hidden"
            >
              {renderHighlighted()}
              {"\u200b"}
            </div>
            <Textarea
              ref={ref}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className="relative bg-transparent min-h-[120px] leading-relaxed"
              onScroll={(e) => {
                if (overlayRef.current)
                  overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
              }}
              onBlur={() => {
                triggerPosRef.current = null;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && open) {
                  setOpen(false);
                  triggerPosRef.current = null;
                }
              }}
            />
          </div>
          <PopoverContent
            className="w-[min(20rem,calc(100vw-2rem))] p-1"
            align="start"
            side="bottom"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {elements.length === 0 ? (
              <div className="flex flex-col items-center text-center px-3 py-4 gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <AtSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-sm font-medium text-foreground">
                  {t("scene.mentionEmptyTitle" as any)}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {t("scene.mentionEmptyHint" as any)}
                </div>
                <button
                  type="button"
                  onClick={() => insertMention(1)}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <AtSign className="w-3 h-3" />
                  {t("scene.mentionEmptyCta" as any)}
                </button>
              </div>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                  {t("scene.mentionPickerTitle" as any)}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {elements.map((el) => (
                    <button
                      key={el.index}
                      type="button"
                      onClick={() => insertMention(el.index)}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left"
                    >
                      <span className="font-mono text-xs text-primary mt-0.5 shrink-0">
                        @{el.index}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {categoryEmoji[el.category] ?? ""} {el.category}
                        </div>
                        <div className="text-xs text-foreground truncate">{el.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </PopoverContent>

          <div className="flex items-center gap-2 flex-wrap">
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  triggerPosRef.current = null;
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <AtSign className="w-3 h-3" /> {t("scene.insertMention" as any)}
              </button>
            </PopoverTrigger>
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              {t("scene.mentionHint" as any)}
            </span>
          </div>
        </Popover>
      </div>
    );
  },
);

SceneMentionTextarea.displayName = "SceneMentionTextarea";
