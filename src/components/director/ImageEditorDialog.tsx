import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Brush, Eraser, Replace, Wand2, Undo2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { editImage, type EditMode, type EditQuality } from "@/lib/director/editImage";
import { useMediaRail } from "./MediaRailContext";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUrl: string;
  aspectRatio?: string;
  /** Optional callback after a successful edit (in addition to the chat append). */
  onEdited?: (result: { url: string; mode: EditMode; prompt: string }) => void;
};

const MODES: { id: EditMode; label: string; Icon: typeof Wand2; help: string; needsMask: boolean; needsPrompt: boolean }[] = [
  { id: "prompt", label: "Prompt", Icon: Wand2, help: "Describe a change for the whole image.", needsMask: false, needsPrompt: true },
  { id: "paint", label: "Paint", Icon: Brush, help: "Brush over a region, then describe what should appear there.", needsMask: true, needsPrompt: true },
  { id: "swap", label: "Swap", Icon: Replace, help: "Brush over a subject, then describe its replacement.", needsMask: true, needsPrompt: true },
  { id: "erase", label: "Erase", Icon: Eraser, help: "Brush over something to remove it cleanly.", needsMask: true, needsPrompt: false },
];

const MAX_LONG_EDGE = 1536;

export function ImageEditorDialog({ open, onOpenChange, sourceUrl, aspectRatio, onEdited }: Props) {
  const rail = useMediaRail();
  const [mode, setMode] = useState<EditMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [brush, setBrush] = useState(48);
  const [maskOpacity, setMaskOpacity] = useState(0.5);
  const [showMask, setShowMask] = useState(true);
  const [busy, setBusy] = useState(false);
  const [quality, setQuality] = useState<EditQuality>(() => {
    try {
      const v = localStorage.getItem("director:image_quality");
      if (v === "1K" || v === "2K" || v === "4K") return v;
    } catch {}
    return "1K";
  });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);

  // Reset when reopened / source changes.
  useEffect(() => {
    if (!open) return;
    setMode("prompt");
    setPrompt("");
    setBusy(false);
    undoStack.current = [];
  }, [open, sourceUrl]);

  // Load image to get intrinsic size.
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgEl(img);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      setImgEl(null);
      setImgSize(null);
    };
    img.src = sourceUrl;
  }, [open, sourceUrl]);

  // Initialize mask canvas (intrinsic size) whenever image loads.
  useEffect(() => {
    if (!imgSize) return;
    const c = maskCanvasRef.current;
    if (!c) return;
    c.width = imgSize.w;
    c.height = imgSize.h;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    redrawOverlay();
    undoStack.current = [];
  }, [imgSize]);

  const redrawOverlay = useCallback(() => {
    const mask = maskCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!mask || !overlay) return;
    const w = mask.width, h = mask.height;
    overlay.width = w;
    overlay.height = h;
    const octx = overlay.getContext("2d");
    if (!octx) return;
    octx.clearRect(0, 0, w, h);
    if (!showMask) return;
    // Tint white areas of mask in cyan with transparency
    const src = mask.getContext("2d")?.getImageData(0, 0, w, h);
    if (!src) return;
    const data = src.data;
    const alpha = Math.round(Math.max(0, Math.min(1, maskOpacity)) * 255);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 16) {
        // make a soft cyan with user-controlled opacity
        data[i] = 56; data[i + 1] = 220; data[i + 2] = 255; data[i + 3] = alpha;
      } else {
        data[i + 3] = 0;
      }
    }
    octx.putImageData(src, 0, 0);
  }, [showMask, maskOpacity]);

  useEffect(() => { redrawOverlay(); }, [showMask, maskOpacity, redrawOverlay]);

  const eventToMaskPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const overlay = overlayCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!overlay || !mask) return null;
    const rect = overlay.getBoundingClientRect();
    const sx = mask.width / rect.width;
    const sy = mask.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const paintStroke = (x: number, y: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    const scaledBrush = (brush / (overlayCanvasRef.current?.getBoundingClientRect().width || 1)) * mask.width;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, scaledBrush / 2), 0, Math.PI * 2);
    ctx.fill();
    redrawOverlay();
  };

  const pushUndo = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, mask.width, mask.height));
    if (undoStack.current.length > 30) undoStack.current.shift();
  };

  const updateCursor = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === "prompt") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo();
    drawingRef.current = true;
    updateCursor(e);
    const p = eventToMaskPoint(e);
    if (p) paintStroke(p.x, p.y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(e);
    if (!drawingRef.current) return;
    const p = eventToMaskPoint(e);
    if (p) paintStroke(p.x, p.y);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };
  const onPointerLeave = () => {
    setCursor((c) => ({ ...c, visible: false }));
  };
  const onPointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(e);
  };

  const handleUndo = () => {
    const last = undoStack.current.pop();
    const mask = maskCanvasRef.current;
    if (!last || !mask) return;
    mask.getContext("2d")?.putImageData(last, 0, 0);
    redrawOverlay();
  };

  const handleClear = () => {
    pushUndo();
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, mask.width, mask.height);
    redrawOverlay();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "[") { setBrush((b) => Math.max(6, b - 6)); }
      else if (e.key === "]") { setBrush((b) => Math.min(180, b + 6)); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const maskHasContent = (): boolean => {
    const mask = maskCanvasRef.current;
    if (!mask) return false;
    const ctx = mask.getContext("2d");
    if (!ctx) return false;
    const d = ctx.getImageData(0, 0, mask.width, mask.height).data;
    // sample sparse
    const step = Math.max(1, Math.floor(d.length / 4 / 4000));
    for (let i = 0; i < d.length; i += 4 * step) {
      if (d[i] > 32) return true;
    }
    return false;
  };

  const exportMaskDataUrl = (): string | null => {
    const mask = maskCanvasRef.current;
    if (!mask) return null;
    // Downscale long edge if needed.
    let w = mask.width, h = mask.height;
    const longest = Math.max(w, h);
    if (longest > MAX_LONG_EDGE) {
      const s = MAX_LONG_EDGE / longest;
      w = Math.round(w * s); h = Math.round(h * s);
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext("2d");
      if (!tctx) return null;
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(mask, 0, 0, w, h);
      return tmp.toDataURL("image/png");
    }
    return mask.toDataURL("image/png");
  };

  const activeMode = MODES.find((m) => m.id === mode)!;

  const handleSubmit = async () => {
    if (busy) return;
    if (activeMode.needsPrompt && !prompt.trim()) {
      toast.error("Add a short prompt describing the change.");
      return;
    }
    let maskDataUrl: string | undefined;
    if (activeMode.needsMask) {
      if (!maskHasContent()) {
        toast.error("Brush over the area you want to change first.");
        return;
      }
      maskDataUrl = exportMaskDataUrl() || undefined;
      if (!maskDataUrl) {
        toast.error("Couldn't read the mask. Try again.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await editImage({
        sourceUrl,
        maskDataUrl,
        mode,
        prompt: prompt.trim(),
        aspectRatio,
        quality,
      });
      const newBubble = {
        role: "generated_images",
        data: {
          mode: "single_panel",
          images: [{ url: res.url, storage_path: res.storage_path }],
          directorsNote: `Edited (${mode}${prompt.trim() ? ` · "${prompt.trim().slice(0, 80)}"` : ""})`,
          aspectRatio,
        },
      };
      rail?.appendBubble(newBubble as any);
      onEdited?.({ url: res.url, mode, prompt: prompt.trim() });
      toast.success("Edited image saved as a new version");
      onOpenChange(false);
    } catch (e: any) {
      console.error("editImage failed", e);
      toast.error(e?.message || "Image edit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,1100px)] w-fit p-0 bg-background border-border/50 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Edit image</DialogTitle>
          <DialogDescription>Refine the generated image with prompt-only edits, brush-masked inpaint, swap, or erase.</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col lg:flex-row max-h-[90vh]">
          {/* Image + mask area */}
          <div ref={containerRef} className="relative flex-1 min-w-0 bg-black/85 flex items-center justify-center p-3">
            {!imgEl ? (
              <div className="text-sm text-muted-foreground py-12">Loading image…</div>
            ) : (
              <div className="relative max-w-full max-h-[80vh]" style={{ aspectRatio: imgSize ? `${imgSize.w} / ${imgSize.h}` : undefined }}>
                <img
                  src={sourceUrl}
                  alt="Editing source"
                  className="block max-h-[80vh] max-w-full w-auto h-auto object-contain rounded select-none pointer-events-none"
                  draggable={false}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="hidden"
                  aria-hidden
                />
                <canvas
                  ref={overlayCanvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                  className={cn(
                    "absolute inset-0 w-full h-full rounded",
                    mode === "prompt" ? "cursor-default" : "cursor-none touch-none",
                  )}
                  style={{ pointerEvents: mode === "prompt" ? "none" : "auto" }}
                />
                {mode !== "prompt" && cursor.visible && (
                  <div
                    aria-hidden
                    className="absolute pointer-events-none rounded-full border-2 border-primary/90 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                    style={{
                      width: brush,
                      height: brush,
                      left: cursor.x - brush / 2,
                      top: cursor.y - brush / 2,
                      background: "hsl(var(--primary) / 0.12)",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Control rail */}
          <div className="w-full lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-border/40 bg-card/60 p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Edit image</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Saved as a new version — your original stays intact.</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors",
                    mode === id
                      ? "bg-primary/15 text-primary border-primary/50"
                      : "bg-muted/30 text-muted-foreground border-border/40 hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2 leading-relaxed">{activeMode.help}</p>

            {activeMode.needsMask && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Brush size</Label>
                  <span className="text-[10px] text-muted-foreground/70">{brush}px · [ / ]</span>
                </div>
                <input
                  type="range"
                  min={8} max={180} step={2}
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Mask opacity</Label>
                  <span className="text-[10px] text-muted-foreground/70">{Math.round(maskOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10} max={100} step={5}
                  value={Math.round(maskOpacity * 100)}
                  onChange={(e) => setMaskOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-primary"
                />
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={handleUndo}>
                    <Undo2 className="w-3 h-3 mr-1" /> Undo
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setShowMask((s) => !s)}>
                    {showMask ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {showMask ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            )}

            {activeMode.needsPrompt && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {mode === "swap" ? "Replace with…" : mode === "paint" ? "What should appear in the brushed area?" : "Describe the change"}
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "swap"
                      ? "a vintage motorcycle, matte black, same angle and lighting"
                      : mode === "paint"
                        ? "a flock of birds high in the sky"
                        : "golden hour light, warmer tone, soft haze"
                  }
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            )}

            <div className="mt-auto pt-2 flex flex-col gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Output quality</Label>
                <div
                  role="tablist"
                  aria-label="Output quality"
                  className="inline-flex w-full items-center rounded-lg border border-border/50 bg-muted/30 p-0.5"
                >
                  {(["1K", "2K", "4K"] as const).map((q) => {
                    const active = quality === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={busy}
                        onClick={() => {
                          setQuality(q);
                          try { localStorage.setItem("director:image_quality", q); } catch {}
                        }}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors",
                          active
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                Model: Gemini Nano Banana 2 · {quality === "4K" ? "~8 credits (5 + 3 upscale)" : "~5 credits"}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                  {busy ? "Editing…" : "Generate edit"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
