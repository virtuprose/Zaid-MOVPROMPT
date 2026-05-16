import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, X, Music, FileText } from "lucide-react";
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
import { acceptAttrFor, type MediaAsk } from "@/lib/director/questionIntent";
import { cn } from "@/lib/utils";

type Props = {
  ask: MediaAsk;
  attachments: Attachment[];
  onAttach: (next: Attachment[]) => void;
  onCountChange?: (count: number) => void;
  disabled?: boolean;
};

const isImageLike = (a: Attachment) =>
  a.kind === "image" || a.kind === "video_keyframes";

export function QuestionUploadSlot({ ask, attachments, onAttach, onCountChange, disabled }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [mineIds, setMineIds] = useState<Set<string>>(new Set());

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      setBusy(true);
      const fresh: Attachment[] = [];
      for (const f of arr) {
        try {
          const kind = classifyFile(f);
          if (kind === "image") fresh.push(await ingestImage(f));
          else if (kind === "video") fresh.push(...(await ingestVideo(f)));
          else if (kind === "audio") {
            if (!user) throw new Error("Sign in to upload audio");
            fresh.push(await ingestAudio(f, user.id));
          } else if (kind === "document") fresh.push(await ingestDocument(f));
          else toast.error(`Unsupported file: ${f.name}`);
        } catch (e: any) {
          toast.error(e?.message || `Could not read ${f.name}`);
        }
      }
      const next = [...attachments, ...fresh].slice(0, 12);
      onAttach(next);
      setMineIds((prev) => {
        const copy = new Set(prev);
        fresh.forEach((a) => copy.add(a.name + a.kind));
        return copy;
      });
      setBusy(false);
    },
    [attachments, onAttach, user],
  );

  const accept = acceptAttrFor(ask.kinds);
  const buttonLabel = `Upload ${ask.label}`;

  const mine = attachments.filter((a) => mineIds.has(a.name + a.kind));

  useEffect(() => {
    onCountChange?.(mine.length);
  }, [mine.length, onCountChange]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-background/30 px-3 py-2 transition-colors",
          drag
            ? "border-primary bg-primary/5"
            : "border-border/40 hover:border-primary/40",
          disabled && "opacity-60",
        )}
      >
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 text-xs font-medium",
            "hover:bg-primary/25 hover:border-primary/50 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          )}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {buttonLabel}
        </button>
        <span className="text-[11px] text-muted-foreground/70">
          or drop here · max 12 attachments
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {mine.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mine.map((a, i) => {
            const realIndex = attachments.indexOf(a);
            const remove = () =>
              onAttach(attachments.filter((_, idx) => idx !== realIndex));
            return (
              <div
                key={i}
                className="group relative h-14 w-14 overflow-hidden rounded-md bg-muted ring-1 ring-border"
              >
                {isImageLike(a) && "url" in a ? (
                  <img
                    src={(a as any).url}
                    alt={a.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground">
                    {a.kind === "audio_transcript" ? (
                      <Music className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span className="w-full truncate text-center text-[9px] leading-tight">
                      {a.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={remove}
                  aria-label="Remove"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
