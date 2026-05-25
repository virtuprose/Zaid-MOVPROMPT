import { useEffect, useMemo, useState } from "react";
import { ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { QuickActionsCard } from "./rail/QuickActionsCard";
import { ReferenceTrayCard } from "./rail/ReferenceTrayCard";
import { StoryboardOutlineCard, StoryboardPanel } from "./rail/StoryboardOutlineCard";


interface RightRailProps {
  sessionId?: string;
}

type Asset = { url: string; source: "uploaded" | "generated"; label?: string };

function deriveAssets(messages: any[]): Asset[] {
  const out: Asset[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    if (!m) continue;
    if (Array.isArray(m.attachments)) {
      for (const a of m.attachments) {
        if (a?.url && (a.kind === "image" || a.kind === "video_keyframes") && !seen.has(a.url)) {
          seen.add(a.url);
          const source: Asset["source"] = a.role === "uploaded" || !a.role ? "uploaded" : "generated";
          out.push({ url: a.url, source, label: a.role || "uploaded" });
        }
      }
    }
    if (m.role === "generated_images" && m.data?.images) {
      for (const img of m.data.images) {
        const u = img?.url || img?.signedUrl;
        if (u && !seen.has(u)) {
          seen.add(u);
          out.push({ url: u, source: "generated", label: m.data.mode || "generated" });
        }
      }
    }
  }
  return out;
}

function derivePanels(messages: any[]): StoryboardPanel[] {
  const out: StoryboardPanel[] = [];
  let shot = 1;
  for (const m of messages) {
    if (m?.role === "generated_images" && m.data?.mode === "storyboard_panels") {
      const imgs = Array.isArray(m.data.images) ? m.data.images : [];
      for (const img of imgs) {
        const u = img?.url || img?.signedUrl;
        if (!u) continue;
        out.push({
          url: u,
          shot: shot++,
          caption: img?.prompt?.slice(0, 60) || m.data.per_shot_prompts?.[shot - 2]?.slice(0, 60),
          status: img?.failed ? "failed" : "done",
        });
      }
    }
    if (m?.attachments) {
      for (const a of m.attachments) {
        if (a?.role === "storyboard" && a.url) {
          out.push({ shot: shot++, url: a.url, status: "done" });
        }
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

function useSessionMessages(sessionId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("director_sessions")
        .select("messages")
        .eq("id", sessionId)
        .maybeSingle();
      if (active && data && Array.isArray(data.messages)) setMessages(data.messages);
    };
    load();
    const t = setInterval(load, 6000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [sessionId]);
  return messages;
}

function RailContent({ messages }: { messages: any[] }) {
  const assets = useMemo(() => deriveAssets(messages), [messages]);
  const panels = useMemo(() => derivePanels(messages), [messages]);
  const hasImages = assets.length > 0;
  const hasMessages = messages.length > 1;
  const hasStoryboard = panels.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/5">
        <h2 className="text-[10px] tracking-[0.2em] text-[hsl(var(--brand))] font-bold uppercase">
          Director Sidebar
        </h2>
        <div
          className="h-2 w-2 rounded-full bg-[hsl(var(--brand))] animate-pulse"
          aria-label="Session live"
        />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6 py-3">
        <QuickActionsCard
          hasMessages={hasMessages}
          hasImages={hasImages}
          hasStoryboard={hasStoryboard}
          messages={messages}
        />
        <StoryboardOutlineCard panels={panels} />
        <ReferenceTrayCard assets={assets} />
      </div>

      {/* Footer stats */}
      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Shots</p>
            <p className="text-xs font-bold text-foreground tabular-nums">{panels.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Assets</p>
            <p className="text-xs font-bold text-foreground tabular-nums">{assets.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--brand)/0.1)] border border-[hsl(var(--brand)/0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))] animate-pulse" />
          <span className="text-[9px] font-bold text-[hsl(var(--brand))] uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}


export function RightRail({ sessionId }: RightRailProps) {
  const messages = useSessionMessages(sessionId);
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("director-rail-collapsed") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const handlePrefill = (e: any) => {
      if (e.detail?.text) {
        const input = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
        if (input) {
          input.value = e.detail.text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }
    };
    window.addEventListener("director:quick-action", handlePrefill);
    return () => window.removeEventListener("director:quick-action", handlePrefill);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("director-rail-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col gap-2 transition-all duration-200 sticky top-4 self-start max-h-[calc(100vh-100px)]",
          collapsed
            ? "w-12 px-1 py-2 items-center border-l border-white/5 bg-card/30"
            : "w-[360px] rounded-2xl border border-white/5 bg-[hsl(var(--background))] shadow-2xl shadow-[hsl(var(--brand)/0.05)] overflow-hidden",
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
            collapsed ? "self-center" : "absolute top-3 right-3 z-10",
          )}
          aria-label={collapsed ? "Expand rail" : "Collapse rail"}
        >
          {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
        </button>
        {!collapsed && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-5 w-full">
            <RailContent messages={messages} />
          </div>
        )}
      </aside>


      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="lg:hidden fixed bottom-24 right-3 z-30 rounded-full shadow-lg gap-1 bg-card/90 backdrop-blur"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Tools
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[340px] sm:w-[380px] p-3 overflow-y-auto bg-card/95">
          <RailContent messages={messages} />
        </SheetContent>
      </Sheet>
    </>
  );
}
