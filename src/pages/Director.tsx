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
  Plus,
  ChevronDown,
  MoreVertical,
  Pencil,
  Pin,
  Trash2,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trackPageVisit } from "@/lib/analytics";
import { DirectorChat } from "@/components/director/DirectorChat";
import { PlanPanel } from "@/components/director/PlanPanel";
import { MediaRailProvider } from "@/components/director/MediaRailContext";
import { MediaRailPanel } from "@/components/director/MediaRailPanel";

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
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_320px] gap-4">
          <aside className="hidden lg:flex flex-col gap-2 max-h-[calc(100vh-160px)]">
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
              <div className="flex-1 overflow-y-auto space-y-1">
                {sessions.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2">No sessions yet.</div>
                )}
                {sessions.map((s) => {
                  const active = s.id === sessionId;
                  const dotColor =
                    s.status === "completed"
                      ? "bg-emerald-500"
                      : s.status === "in_progress"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-muted-foreground/40";
                  const ts = new Date(s.updated_at);
                  const tsLabel = ts.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={s.id}
                      title={tsLabel}
                      className={cn(
                        "group relative flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer",
                        active
                          ? "bg-[#1a1a1f] border-l-2 border-l-accent border-y-border/40 border-r-border/40 text-foreground"
                          : "border-border/30 text-foreground/80 hover:bg-muted/30 hover:text-foreground",
                      )}
                      onClick={() => navigate(`/director/${s.id}`)}
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0 w-6 h-6 rounded overflow-hidden bg-muted/40 border border-border/40 flex items-center justify-center">
                        {s.thumbnail && !s.thumbnail.startsWith("blob:") ? (
                          <img
                            src={s.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = "none";
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <span
                          className="w-full h-full items-center justify-center"
                          style={{ display: s.thumbnail && !s.thumbnail.startsWith("blob:") ? "none" : "flex" }}
                        >
                          <MessageSquare className="w-3 h-3 text-muted-foreground/60" />
                        </span>
                      </div>
                      {/* Status dot */}
                      <span
                        className={cn("shrink-0 w-1.5 h-1.5 rounded-full", dotColor)}
                        aria-label={s.status}
                      />
                      {s.pinned && (
                        <Pin className="w-3 h-3 shrink-0 text-accent fill-current -rotate-45" />
                      )}
                      <span className="truncate flex-1">{s.title || "Untitled brief"}</span>
                      <span className="hidden group-hover:inline shrink-0 text-[10px] text-muted-foreground/70 whitespace-nowrap">
                        {tsLabel}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 size-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                            aria-label="Task actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem onSelect={() => openRename(s)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleTogglePin(s)}>
                            <Pin className={cn("w-4 h-4 mr-2", s.pinned && "fill-current text-accent")} />
                            {s.pinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="w-full min-w-0">
            <PlanPanel sessionId={sessionId} />
            <DirectorErrorBoundary key={sessionId || "new"} sessionId={sessionId}>
              <DirectorChat />
            </DirectorErrorBoundary>
          </div>

          <MediaRailPanel />
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
