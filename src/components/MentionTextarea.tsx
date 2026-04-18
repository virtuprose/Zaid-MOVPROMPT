import { useRef, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AtSign, ImageIcon, Film, Music } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ElementItem } from "./ElementGrid";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MentionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  elements: ElementItem[];
  placeholder?: string;
}

export const MentionTextarea = ({ value, onChange, elements, placeholder }: MentionTextareaProps) => {
  const { t } = useLanguage();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  const insertMention = (n: number) => {
    const el = ref.current;
    const token = `@${n} `;
    if (!el) {
      onChange(value + token);
      setOpen(false);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // Highlight overlay: render a mirrored div behind the textarea showing @Element N as chips
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !overlayRef.current) return;
    overlayRef.current.scrollTop = ref.current.scrollTop;
  }, [value]);

  const renderHighlighted = () => {
    const parts = value.split(/(@Element \d+|@\d+)/g);
    return parts.map((part, i) => {
      const m = /^@(?:Element )?(\d+)$/.exec(part);
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
      <div className="relative">
        {/* Highlight overlay */}
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
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="relative bg-transparent min-h-[120px] leading-relaxed"
          onScroll={(e) => {
            if (overlayRef.current) overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
          }}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={elements.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <AtSign className="w-3 h-3" /> {t("elements.title" as any)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1" align="start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
              {t("elements.mentionHint" as any)}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {elements.map((el, idx) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => insertMention(idx + 1)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary text-left text-sm"
                >
                  <div className="w-8 h-8 rounded bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                    {el.kind === "image" && el.preview && <img src={el.preview} alt="" className="w-full h-full object-cover" />}
                    {el.kind === "video" && el.preview && <video src={el.preview} className="w-full h-full object-cover" muted />}
                    {el.kind === "audio" && <Music className="w-3.5 h-3.5 text-accent" />}
                  </div>
                  <span className="font-mono text-xs text-primary">@Element {idx + 1}</span>
                  <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
                    {el.kind === "image" && <ImageIcon className="w-3 h-3" />}
                    {el.kind === "video" && <Film className="w-3 h-3" />}
                    {el.kind === "audio" && <Music className="w-3 h-3" />}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-[11px] text-muted-foreground">{t("elements.mentionHint" as any)}</span>
      </div>
    </div>
  );
};
