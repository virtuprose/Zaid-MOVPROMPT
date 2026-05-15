import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2, X, FileText, Image as ImageIcon, Music } from "lucide-react";
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

type Props = {
  value: string;
  onChange: (v: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  onSend: () => void;
  busy: boolean;
  showHelper?: boolean;
};

export function Composer({ value, onChange, attachments, onAttachmentsChange, onSend, busy, showHelper }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [ingesting, setIngesting] = useState(false);

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

      onAttachmentsChange([...attachments, ...fresh].slice(0, 12));
      setPendingCount((c) => Math.max(0, c - arr.length));
      setIngesting(false);
    },
    [attachments, onAttachmentsChange, user],
  );

  const remove = (i: number) => onAttachmentsChange(attachments.filter((_, idx) => idx !== i));

  const isImageLike = (a: Attachment) => a.kind === "image" || a.kind === "video_keyframes";
  const iconFor = (a: Attachment) => {
    if (a.kind === "audio_transcript") return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
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
          className={`relative rounded-2xl border bg-card transition-colors ${
            highlight ? "border-dashed border-accent bg-accent/5" : "border-border"
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
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (!busy) onSend();
              }
            }}
            placeholder="What are you making? Describe the mood, action, and setting — or drop your references."
            rows={2}
            disabled={busy}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none min-h-[64px]"
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {attachments.map((a, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
                  {iconFor(a)}
                  <span className="max-w-[160px] truncate">{a.name}</span>
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

          <div className="flex items-center justify-between px-2 pb-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              disabled={busy || ingesting}
              aria-label="Attach files"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onSend} disabled={busy} size="sm" className="h-9 px-4">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">⌘/Ctrl + Enter to send · Max 12 attachments</TooltipContent>
            </Tooltip>

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
        {showHelper && (
          <div className="text-[11px] text-muted-foreground text-center">
            Tip: drop files anywhere in this input
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
