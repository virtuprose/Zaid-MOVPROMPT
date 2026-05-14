import { useCallback, useRef, useState } from "react";
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
};

export function Composer({ value, onChange, attachments, onAttachmentsChange, onSend, busy }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || (files as FileList).length === 0) return;
      setIngesting(true);
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
      onAttachmentsChange(next.slice(0, 12));
      setIngesting(false);
    },
    [attachments, onAttachmentsChange, user],
  );

  const remove = (i: number) => onAttachmentsChange(attachments.filter((_, idx) => idx !== i));

  const iconFor = (a: Attachment) => {
    if (a.kind === "image" || a.kind === "video_keyframes") return <ImageIcon className="w-3 h-3" />;
    if (a.kind === "audio_transcript") return <Music className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <TooltipProvider>
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
        className={`rounded-2xl border bg-card transition-colors ${
          drag ? "border-dashed border-primary bg-primary/5" : "border-border"
        }`}
      >
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
    </TooltipProvider>
  );
}
