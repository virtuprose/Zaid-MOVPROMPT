import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  ChevronDown,
  MoreVertical,
  Pencil,
  Pin,
  Trash2,
  MessageSquare,
  Megaphone,
  PanelLeft,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { trackPageVisit } from "@/lib/analytics";
import { DirectorChat } from "@/components/director/DirectorChat";
import { PlanPanel } from "@/components/director/PlanPanel";
import { MediaRailProvider, useMediaItems } from "@/components/director/MediaRailContext";
import { MediaRailPanel } from "@/components/director/MediaRailPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { GripVertical } from "lucide-react";

import { DirectorErrorBoundary } from "@/components/director/DirectorErrorBoundary";
import { SendDebugReportButton } from "@/components/SendDebugReportButton";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SessionStatus = "completed" | "in_progress" | "draft";

type SessionRow = {
  id: string;
  title: string | null;
  updated_at: string;
  needsReply: boolean;
  pinned: boolean;
  status: SessionStatus;
  thumbnail: string | null;
};

export default function Director() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("movprompt.tasks-sidebar-collapsed") === "1";
  });
  const toggleNav = () => {
    setNavCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("movprompt.tasks-sidebar-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };
  const [renameTarget, setRenameTarget] = useState<SessionRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);

  useEffect(() => {
    trackPageVisit("/director");
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("director_sessions")
        .select("id, title, updated_at, messages, pinned, final_prompt")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(30);
      if (active && data) {
        setSessions(
          data.map((s: any) => {
            const msgs = Array.isArray(s.messages) ? s.messages : [];
            const last = msgs[msgs.length - 1];
            const needsReply = !!last && last.role === "assistant";
            let thumbnail: string | null = null;
            for (const m of msgs) {
              if (m?.role === "user" && Array.isArray(m.attachments)) {
                const img = m.attachments.find(
                  (a: any) => a?.url && (a.kind === "image" || a.kind === "video_keyframes"),
                );
                if (img?.url) {
                  thumbnail = img.url;
                  break;
                }
              }
            }
            const status: SessionStatus = s.final_prompt
              ? "completed"
              : needsReply
                ? "in_progress"
                : "draft";
            return {
              id: s.id,
              title: s.title,
              updated_at: s.updated_at,
              needsReply,
              pinned: !!s.pinned,
              status,
              thumbnail,
            };
          }),
        );
      }
    };
    load();
    // refresh when leaving / arriving on a session
    const t = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [user, sessionId]);

  const openRename = (s: SessionRow) => {
    setRenameValue(s.title || "");
    setRenameTarget(s);
  };

  const confirmRename = async () => {
    const s = renameTarget;
    if (!s) return;
    const trimmed = renameValue.trim().slice(0, 120);
    setRenameTarget(null);
    if (!trimmed || trimmed === s.title) return;
    setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: trimmed } : x)));
    const { error } = await supabase
      .from("director_sessions")
      .update({ title: trimmed })
      .eq("id", s.id);
    if (error) toast.error("Couldn't rename brief");
    else toast.success("Brief renamed");
  };

  const handleTogglePin = async (s: SessionRow) => {
    const next = !s.pinned;
    setSessions((prev) =>
      [...prev.map((x) => (x.id === s.id ? { ...x, pinned: next } : x))].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.updated_at < b.updated_at ? 1 : -1;
      }),
    );
    const { error } = await supabase
      .from("director_sessions")
      .update({ pinned: next })
      .eq("id", s.id);
    if (error) toast.error("Couldn't update pin");
    else toast.success(next ? "Pinned" : "Unpinned");
  };

  const confirmDelete = async () => {
    const s = deleteTarget;
    if (!s) return;
    setDeleteTarget(null);
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    const { error } = await supabase.from("director_sessions").delete().eq("id", s.id);
    if (error) {
      toast.error("Couldn't delete brief");
      return;
    }
    toast.success("Brief deleted");
    if (sessionId === s.id) navigate("/director");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Director — MovPrompt</title>
        <meta
          name="description"
          content="Drop a brief — text, images, video, audio or PDF — and the AI Director builds a cinematic prompt ready for any video model."
        />
      </Helmet>


      <TopNav />

      <MediaRailProvider>
      <div className="relative z-10 container max-w-[1760px] mx-auto px-4 py-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-[grid-template-columns] duration-300 ease-out",
            navCollapsed ? "lg:grid-cols-[56px_1fr]" : "lg:grid-cols-[240px_1fr]",
          )}
        >
          <aside className="hidden lg:flex flex-col gap-2 max-h-[calc(100vh-160px)] min-w-0 overflow-hidden">
            {navCollapsed ? (
              <TooltipProvider delayDuration={150}>
                <div className="flex flex-col items-stretch gap-2 py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleNav}
                        className="self-center size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        aria-label="Expand sidebar"
                      >
                        <PanelLeft className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Expand sidebar</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            ) : (
              <>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/director")}
              className="gap-1.5 justify-start"
            >
              <Plus className="w-4 h-4" /> New Task
            </Button>
            <button
              type="button"
              onClick={() => setTasksOpen((v) => !v)}
              className="flex items-center justify-between w-full px-2 pt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Tasks</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  tasksOpen ? "" : "-rotate-90",
                )}
              />
            </button>
            {tasksOpen && (
              <div className="flex-1 overflow-y-auto">
                {sessions.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2">No sessions yet.</div>
                )}
                {sessions.map((s) => {
                  const active = s.id === sessionId;
                  return (
                    <ContextMenu key={s.id}>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => navigate(`/director/${s.id}`)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs leading-snug transition-colors border-l-2 break-words",
                            active
                              ? "text-accent font-semibold bg-accent/5 border-accent"
                              : "text-foreground/65 hover:text-foreground hover:bg-muted/20 border-transparent",
                          )}
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {s.title || "Untitled brief"}
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => openRename(s)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleTogglePin(s)}>
                          <Pin className={cn("w-4 h-4 mr-2", s.pinned && "fill-current text-accent")} />
                          {s.pinned ? "Unpin" : "Pin"}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onSelect={() => setDeleteTarget(s)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            )}
              </>
            )}
          </aside>

          <DirectorWorkspace sessionId={sessionId} navCollapsed={navCollapsed} onToggleNav={toggleNav} />

        </div>

      </div>
      </MediaRailProvider>


      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="rounded-2xl border-border/60 bg-[hsl(240_5%_8%)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight">Rename Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Give this task a clearer name to find it faster later.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Untitled brief"
            maxLength={120}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmRename();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setRenameTarget(null)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={!renameValue.trim()}
              className="rounded-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl border-border/60 bg-[hsl(240_5%_8%)] sm:max-w-md">
          <DialogHeader>
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-destructive/15 text-destructive mb-2">
              <Trash2 className="w-4 h-4" />
            </div>
            <DialogTitle className="font-display text-2xl tracking-tight">
              Delete this task?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              <span className="text-foreground/90 font-medium">
                {deleteTarget?.title || "Untitled brief"}
              </span>{" "}
              and its full conversation will be removed permanently. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="rounded-full">
              Keep
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              className="rounded-full"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DirectorWorkspace({
  sessionId,
  navCollapsed,
  onToggleNav,
}: {
  sessionId?: string;
  navCollapsed?: boolean;
  onToggleNav?: () => void;
}) {
  const items = useMediaItems();
  const hasMedia = items.length > 0;

  // IMPORTANT: keep the ResizablePanelGroup mounted at all times. Swapping the
  // wrapper between a bare div and a ResizablePanelGroup when media appears
  // unmounts/remounts DirectorChat, which restarts hydration and causes the
  // session view to flash back to the empty "new task" view.
  return (
    <div className="relative w-full min-w-0 h-[calc(100vh-140px)]">
      {onToggleNav && !navCollapsed && (
        <button
          type="button"
          onClick={onToggleNav}
          aria-label="Collapse tasks sidebar"
          className="hidden lg:inline-flex absolute top-2 left-2 z-20 size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="director-media-split"
        className="h-full w-full"
      >
        <ResizablePanel defaultSize={hasMedia ? 70 : 100} minSize={35}>
          <div className="h-full overflow-auto pr-1 pl-10">
            <PlanPanel sessionId={sessionId} />
            <DirectorErrorBoundary key={sessionId || "new"} sessionId={sessionId}>
              <DirectorChat />
            </DirectorErrorBoundary>
          </div>
        </ResizablePanel>

        {hasMedia && (
          <>
            <ResizableHandle className="group relative !w-px bg-border/70 hover:bg-primary/60 data-[resize-handle-state=drag]:bg-primary cursor-col-resize transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 after:content-['']">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-9 w-5 items-center justify-center rounded-full border border-border/60 bg-background/95 backdrop-blur shadow-md group-hover:border-primary/60 group-hover:bg-background group-data-[resize-handle-state=drag]:border-primary group-data-[resize-handle-state=drag]:bg-background transition-colors">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-data-[resize-handle-state=drag]:text-primary" />
              </div>
            </ResizableHandle>
            <ResizablePanel defaultSize={30} minSize={18}>
              <div className="h-full pl-1">
                <MediaRailPanel />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

function TaskTile({
  session,
  active,
  onClick,
}: {
  session: SessionRow;
  active: boolean;
  onClick: () => void;
}) {
  const label = session.title || "Untitled";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "group w-full text-left pl-2 pr-1 py-2 text-[11px] leading-tight font-normal truncate transition-colors border-l",
            active
              ? "text-accent border-accent/70"
              : "text-foreground/55 hover:text-foreground hover:bg-white/5 border-transparent",
          )}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
