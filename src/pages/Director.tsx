import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trackPageVisit } from "@/lib/analytics";
import { DirectorChat } from "@/components/director/DirectorChat";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SessionRow = {
  id: string;
  title: string | null;
  updated_at: string;
  needsReply: boolean;
  pinned: boolean;
};

export default function Director() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tasksOpen, setTasksOpen] = useState(true);

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
        .select("id, title, updated_at, messages")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (active && data) {
        setSessions(
          data.map((s: any) => {
            const msgs = Array.isArray(s.messages) ? s.messages : [];
            const last = msgs[msgs.length - 1];
            const needsReply = !!last && last.role === "assistant";
            return { id: s.id, title: s.title, updated_at: s.updated_at, needsReply };
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Director — MovPrompt</title>
        <meta
          name="description"
          content="Drop a brief — text, images, video, audio or PDF — and the AI Director builds a cinematic prompt ready for any video model."
        />
      </Helmet>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[250px] bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <TopNav />

      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <aside className="hidden lg:flex flex-col gap-2 max-h-[calc(100vh-160px)]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/director")}
              className="gap-1.5 justify-start"
            >
              <Plus className="w-4 h-4" /> New brief
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
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "group relative flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-full border text-xs transition-colors cursor-pointer",
                        active
                          ? "bg-muted/60 border-border text-foreground"
                          : "border-border/40 text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                      )}
                      onClick={() => navigate(`/director/${s.id}`)}
                    >
                      <span className="truncate flex-1">{s.title || "Untitled brief"}</span>
                      {s.needsReply && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 whitespace-nowrap">
                          Needs reply
                        </span>
                      )}
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
                          <DropdownMenuItem onSelect={() => toast("Rename coming soon")}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast("Pin coming soon")}>
                            <Pin className="w-4 h-4 mr-2" /> Pin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => toast("Delete coming soon")}
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

          <div className="max-w-3xl w-full mx-auto lg:mx-0">
            <DirectorChat key={sessionId || "new"} />
          </div>
        </div>
      </div>
    </div>
  );
}
