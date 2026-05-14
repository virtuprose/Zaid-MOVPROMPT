import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Image as ImageIcon, Video, Music, X, Loader2 } from "lucide-react";
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

type Props = {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
};

export function AttachmentDropzone({ attachments, onChange }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || (files as FileList).length === 0) return;
      setBusy(true);
      const next = [...attachments];
      for (const f of Array.from(files)) {
        try {
          const kind = classifyFile(f);
          if (kind === "image") next.push(await ingestImage(f));
          else if (kind === "video") next.push(...(await ingestVideo(f)));
          else if (kind === "audio") {
            if (!user) throw new Error("Sign in to upload audio");
            next.push(await ingestAudio(f, user.id));
          } else if (kind === "document") next.push(await ingestDocument(f));
          else toast.error(`Unsupported file: ${f.name}`);
        } catch (e: any) {
          toast.error(e?.message || `Could not read ${f.name}`);
        }
      }
      onChange(next.slice(0, 12));
      setBusy(false);
    },
    [attachments, onChange, user],
  );

  const remove = (i: number) => onChange(attachments.filter((_, idx) => idx !== i));

  const iconFor = (a: Attachment) => {
    if (a.kind === "image" || a.kind === "video_keyframes") return <ImageIcon className="w-3.5 h-3.5" />;
    if (a.kind === "audio_transcript") return <Music className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-2">
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
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        {busy ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading attachments…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            <Upload className="w-5 h-5" />
            <div>
              <span className="text-foreground font-medium">Drop references</span> — images, video, audio, PDF, DOCX, TXT
            </div>
            <div className="flex items-center gap-3 text-[11px] opacity-70">
              <span className="inline-flex items-center gap-1"><ImageIcon className="w-3 h-3" /> images</span>
              <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" /> video</span>
              <span className="inline-flex items-center gap-1"><Music className="w-3 h-3" /> audio</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> docs</span>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.docx,.txt,.md"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs"
            >
              {iconFor(a)}
              <span className="max-w-[180px] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
