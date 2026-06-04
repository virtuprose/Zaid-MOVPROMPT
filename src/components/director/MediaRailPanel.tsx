import { useEffect, useRef, useState } from "react";
import {
  ImageIcon,
  Film,
  Play,
  Download,
  Heart,
  MoreVertical,
  Plus,
  Copy,
  FolderPlus,
  Share2,
  Trash2,
  Check,
  Layers,
  Music,
  FileText,
  ChevronDown,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMediaItems,
  useMediaRail,
  type MediaItem,
  isValidRefName,
  normalizeRefName,
} from "./MediaRailContext";

type Filter = "all" | "images" | "videos" | "audios" | "files";

const FILTERS: { id: Filter; label: string; Icon: typeof Layers }[] = [
  { id: "all", label: "All Types", Icon: Layers },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "videos", label: "Videos", Icon: Film },
  { id: "audios", label: "Audios", Icon: Music },
  { id: "files", label: "Files", Icon: FileText },
];

export function MediaRailPanel() {
  const items = useMediaItems();
  const [filter, setFilter] = useState<Filter>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [newFolderFor, setNewFolderFor] = useState<MediaItem | null>(null);
  const [folderName, setFolderName] = useState("");
  const [renameFor, setRenameFor] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const rail = useMediaRail();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWide(w >= 360);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (items.length === 0) return null;

  const filtered = items.filter((it) => {
    if (filter === "all") return true;
    if (filter === "images") return it.kind === "image";
    if (filter === "videos") return it.kind === "video";
    return false; // audios/files — not tracked yet
  });

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const ActiveIcon = active.Icon;

  const handleCreateFolder = async () => {
    const item = newFolderFor;
    const name = folderName.trim();
    if (!item || !name) return;
    const folder = await rail?.createFolder(name);
    setNewFolderFor(null);
    setFolderName("");
    if (folder) {
      await rail?.addToFolder(item, folder.id);
      toast.success(`Added to “${folder.name}”`);
    } else {
      toast.error("Couldn't create folder");
    }
  };

  return (
    <aside
      ref={containerRef}
      className="flex flex-col gap-2 h-full w-full min-w-0 bg-background/40"
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/50 text-sm font-medium text-foreground transition-colors"
              aria-label="Filter media"
            >
              <ActiveIcon className="w-4 h-4 text-muted-foreground" />
              <span className="leading-none">{active.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px] rounded-2xl p-1.5">
            {FILTERS.map(({ id, label, Icon }) => {
              const selected = filter === id;
              return (
                <DropdownMenuItem
                  key={id}
                  onSelect={() => setFilter(id)}
                  className="flex items-center gap-2.5 rounded-xl py-2 px-2.5 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{label}</span>
                  {selected && <Check className="w-4 h-4 text-foreground" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-[10px] text-muted-foreground/70">{items.length} items</span>
      </div>


      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className={cn("grid gap-2", wide ? "grid-cols-2" : "grid-cols-1")}>
          {filtered.map((it) => (
            <MediaCard
              key={it.id}
              item={it}
              onPickNewFolder={() => setNewFolderFor(it)}
              onRename={() => {
                const current = rail?.labelByKey.get(it.id) ?? "";
                setRenameValue(current);
                setRenameError(null);
                setRenameFor(it);
              }}
            />
          ))}
        </div>
      </div>

      <Dialog open={!!newFolderFor} onOpenChange={(o) => !o && setNewFolderFor(null)}>
        <DialogContent className="rounded-2xl border-border/60 bg-[hsl(240_5%_8%)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight">New folder</DialogTitle>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateFolder();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setNewFolderFor(null)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
              className="rounded-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
            >
              Create & add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

async function downloadUrl(url: string | undefined, filename: string) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    toast.success("Download started");
  } catch {
    // Fallback: open in a new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function safeFilename(label: string, ext: string) {
  const base = label.replace(/[^\w\-]+/g, "_").slice(0, 60) || "media";
  return `${base}.${ext}`;
}

function MediaCard({
  item,
  onPickNewFolder,
}: {
  item: MediaItem;
  onPickNewFolder: () => void;
}) {
  const rail = useMediaRail();
  const [menuOpen, setMenuOpen] = useState(false);
  const isFav = rail?.favorites.has(item.id) ?? false;
  const folders = rail?.folders ?? [];

  const ratioClass =
    item.kind === "image"
      ? item.aspect === "9:16"
        ? "aspect-[9/16]"
        : item.aspect === "1:1"
          ? "aspect-square"
          : "aspect-video"
      : "aspect-video";

  const isVideoReady = item.kind === "video" && item.status === "completed" && !!item.url;
  const hasUrl = !!item.url;

  const handleFavorite = () => {
    rail?.toggleFavorite(item);
    toast.success(isFav ? "Removed from favorites" : "Added to favorites");
  };

  const handleDownload = () => {
    if (!item.url) return;
    void downloadUrl(item.url, safeFilename(item.label, item.kind === "image" ? "jpg" : "mp4"));
  };

  const handleRecreate = () => {
    if (!item.url) return;
    rail?.enqueueAttachment({
      kind: item.kind === "image" ? "image" : "video_keyframes",
      name: item.label,
      url: item.url,
      role: "reference",
    } as any);
    toast.success("Reference attached — describe the new version and send");
  };

  const handlePublish = async () => {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("Public link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleDelete = async () => {
    const key = item.id;
    await rail?.hideItem(item);
    toast("Removed from media panel", {
      action: {
        label: "Undo",
        onClick: () => rail?.unhideItem(key),
      },
    });
  };

  const handleAddToFolder = async (folderId: string, name: string) => {
    await rail?.addToFolder(item, folderId);
    toast.success(`Added to “${name}”`);
  };

  const handleAddToTask = () => {
    if (!item.url) return;
    rail?.enqueueAttachment({
      kind: item.kind === "image" ? "image" : "video_keyframes",
      name: item.label,
      url: item.url,
      role: "reference",
    } as any);
    toast.success("Attached to current task");
  };

  // Top-right pill column + bottom-right "Add to task" pill, all rendered as overlays.
  const Overlays = (
    <>
      {/* Top-left badge removed for a cleaner full-image look */}


      {/* Top-right action column */}
      <div className={cn("absolute top-1.5 right-1.5 flex flex-col gap-1 transition-opacity", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFavorite();
          }}
          className={cn(
            "size-7 inline-flex items-center justify-center rounded-full bg-black/55 backdrop-blur text-white/90 hover:bg-black/75 transition-colors",
            isFav && "text-primary",
          )}
          title={isFav ? "Unfavorite" : "Favorite"}
          aria-label={isFav ? "Unfavorite" : "Favorite"}
        >
          <Heart className={cn("w-3.5 h-3.5", isFav && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDownload();
          }}
          disabled={!hasUrl}
          className="size-7 inline-flex items-center justify-center rounded-full bg-black/55 backdrop-blur text-white/90 hover:bg-black/75 disabled:opacity-40 transition-colors"
          title="Download"
          aria-label="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="size-7 inline-flex items-center justify-center rounded-full bg-black/55 backdrop-blur text-white/90 hover:bg-black/75 data-[state=open]:bg-black/75 transition-colors"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={handleRecreate} disabled={!hasUrl}>
              <Copy className="w-4 h-4 mr-2" /> Recreate
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderPlus className="w-4 h-4 mr-2" /> Add to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                {folders.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No folders yet</div>
                )}
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onSelect={() => handleAddToFolder(f.id, f.name)}
                  >
                    <Check className="w-3.5 h-3.5 mr-2 opacity-0" />
                    {f.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onPickNewFolder}>
                  <Plus className="w-4 h-4 mr-2" /> New folder…
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={handlePublish} disabled={!hasUrl}>
              <Share2 className="w-4 h-4 mr-2" /> Publish
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom-right Add to task pill */}
      {hasUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddToTask();
          }}
          className={cn("absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur px-2.5 py-1 text-[10px] font-medium text-white/95 border border-white/10 hover:bg-black/85 hover:border-primary/50 transition-all", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}
        >
          <Plus className="w-3 h-3" /> Add to task
        </button>
      )}
    </>
  );

  if (item.kind === "image") {
    return (
      <div className="group relative block rounded-xl overflow-hidden border border-border/30 bg-muted/10 hover:border-primary/40 hover:ring-1 hover:ring-primary/30 transition-all">
        <div className={cn("relative w-full bg-black/40", ratioClass)}>
          <img
            src={item.url}
            alt={item.label}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {Overlays}
        </div>
      </div>
    );
  }


  return (
    <div className="group relative block rounded-xl overflow-hidden border border-border/30 bg-muted/10 hover:border-primary/40 hover:ring-1 hover:ring-primary/30 transition-all">
      <div className={cn("relative w-full bg-black/60", ratioClass)}>
        {isVideoReady ? (
          <video
            src={item.url}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {item.status === "failed" ? "Failed" : "Rendering…"}
          </div>
        )}
        {isVideoReady && (
          <Play className="absolute inset-0 m-auto w-7 h-7 text-white/90 drop-shadow opacity-80 group-hover:opacity-0 transition-opacity pointer-events-none" />
        )}
        {Overlays}
      </div>
    </div>
  );
}

