import { useRef } from "react";
import { Plus, X, ImageIcon, Film, Music } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import type { ReferenceKind } from "./ReferenceItem";

export interface ElementItem {
  id: string;
  file: File;
  kind: ReferenceKind;
  preview?: string; // image/video object URL
  note?: string;
}

interface ElementGridProps {
  items: ElementItem[];
  onChange: (items: ElementItem[]) => void;
  max?: number;
}

const detectKind = (file: File): ReferenceKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
};

const MAX_BYTES = 10 * 1024 * 1024;

export const ElementGrid = ({ items, onChange, max = 10 }: ElementGridProps) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - items.length;
    if (remaining <= 0) {
      toast.error(t("elements.limitReached" as any));
      return;
    }
    const next: ElementItem[] = [...items];
    for (let i = 0; i < files.length && next.length < max; i++) {
      const file = files[i];
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: ${t("references.tooLarge")}`);
        continue;
      }
      const kind = detectKind(file);
      const preview = kind === "audio" ? undefined : URL.createObjectURL(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind,
        preview,
      });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeItem = (id: string) => {
    const target = items.find((it) => it.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    onChange(items.filter((it) => it.id !== id));
  };

  const isFull = items.length >= max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t("elements.title" as any)}</span>
        <span className="text-xs text-muted-foreground">{items.length}/{max}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg border border-border bg-secondary/40 overflow-hidden group"
          >
            {item.kind === "image" && item.preview && (
              <img src={item.preview} alt="" className="w-full h-full object-cover" />
            )}
            {item.kind === "video" && item.preview && (
              <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
            )}
            {item.kind === "audio" && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary/20">
                <Music className="w-6 h-6 text-accent" />
              </div>
            )}

            {/* Number badge */}
            <span className="absolute top-1 left-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground shadow">
              #{idx + 1}
            </span>

            {/* Kind icon */}
            <span className="absolute bottom-1 left-1 p-1 rounded bg-background/70 backdrop-blur-sm text-foreground">
              {item.kind === "image" && <ImageIcon className="w-3 h-3" />}
              {item.kind === "video" && <Film className="w-3 h-3" />}
              {item.kind === "audio" && <Music className="w-3 h-3" />}
            </span>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={t("references.remove")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!isFull && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("elements.add" as any)}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
