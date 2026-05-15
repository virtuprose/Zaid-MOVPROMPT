import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clapperboard, Plus, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trackPageVisit } from "@/lib/analytics";
import { DirectorChat } from "@/components/director/DirectorChat";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SessionRow = { id: string; title: string | null; updated_at: string };

export default function Director() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

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
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (active && data) setSessions(data as SessionRow[]);
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
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-1.5"
            title="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Studio
          </Button>
          <div className="flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold">
              AI <span className="text-primary">Director</span>
            </h1>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
              New
            </span>
          </div>
          <div className="w-[64px]" />
        </div>

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
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2">
              Recent
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {sessions.length === 0 && (
                <div className="text-xs text-muted-foreground px-2">No sessions yet.</div>
              )}
              {sessions.map((s) => {
                const active = s.id === sessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/director/${s.id}`)}
                    className={cn(
                      "w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "hover:bg-[hsl(240_5%_10%)] text-muted-foreground hover:text-foreground border border-transparent",
                    )}
                  >
                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="truncate">{s.title || "Untitled brief"}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="max-w-3xl w-full mx-auto lg:mx-0">
            <DirectorChat key={sessionId || "new"} />
          </div>
        </div>
      </div>
    </div>
  );
}
