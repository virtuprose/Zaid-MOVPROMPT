import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackPageVisit } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, ChevronDown, Library as LibraryIcon, Sparkles, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HistoryEntry {
  id: string;
  workflow_type: string;
  target_model: string;
  results: any;
  created_at: string;
}

const WORKFLOW_LABELS: Record<string, { label: string; color: string }> = {
  single: { label: "Single Frame", color: "bg-primary/20 text-primary border-primary/30" },
  twoframe: { label: "Two Frames", color: "bg-accent/20 text-accent border-accent/30" },
  multishot: { label: "Multi-Shot", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function HistoryCard({ entry, t }: { entry: HistoryEntry; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const wf = WORKFLOW_LABELS[entry.workflow_type] || WORKFLOW_LABELS.single;
  const results: any[] = Array.isArray(entry.results) ? entry.results : [entry.results];
  const preview = results[0]?.mainPrompt?.slice(0, 120) || "";

  const allText = results
    .map((r: any, i: number) => {
      let s = `Shot ${i + 1}\n${r.mainPrompt || ""}`;
      if (r.negativePrompt) s += `\nNegative: ${r.negativePrompt}`;
      if (r.cameraSuggestions) s += `\nCamera: ${r.cameraSuggestions}`;
      if (r.modelNotes) s += `\nNotes: ${r.modelNotes}`;
      return s;
    })
    .join("\n\n");

  return (
    <Card className="bg-card border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${wf.color}`}>{wf.label}</Badge>
            <span className="text-[11px] text-muted-foreground">{entry.target_model}</span>
            <span className="text-[11px] text-muted-foreground/60">·</span>
            <span className="text-[11px] text-muted-foreground/60">{timeAgo(entry.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2">{preview}{preview.length >= 120 ? "…" : ""}</p>
        </div>
        <ChevronDown className={`w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
              <div className="flex justify-end">
                <CopyButton text={allText} />
              </div>
              {results.map((shot: any, i: number) => (
                <div key={i} className="space-y-2">
                  {results.length > 1 && (
                    <p className="text-xs font-medium text-primary">Shot {i + 1}</p>
                  )}
                  {shot.mainPrompt && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("results.mainPrompt")}</span>
                        <CopyButton text={shot.mainPrompt} />
                      </div>
                      <p className="text-sm bg-secondary/40 rounded-md p-2.5 leading-relaxed">{shot.mainPrompt}</p>
                    </div>
                  )}
                  {shot.negativePrompt && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("results.negativePrompt")}</span>
                        <CopyButton text={shot.negativePrompt} />
                      </div>
                      <p className="text-xs bg-secondary/40 rounded-md p-2.5 text-muted-foreground">{shot.negativePrompt}</p>
                    </div>
                  )}
                  {shot.cameraSuggestions && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{t("results.cameraSuggestions")}</span>
                      <p className="text-xs bg-secondary/40 rounded-md p-2.5 text-muted-foreground">{shot.cameraSuggestions}</p>
                    </div>
                  )}
                  {shot.modelNotes && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{t("results.modelNotes")}</span>
                      <p className="text-xs bg-secondary/40 rounded-md p-2.5 text-muted-foreground">{shot.modelNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

const Library = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageVisit("/library");
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("prompt_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setHistory((data as HistoryEntry[]) || []);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 container max-w-3xl mx-auto px-4 py-6 sm:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">MovPrompt</span>
          </Button>
          <LanguageToggle />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold font-mono">
            {t("library.title")}
          </h1>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <p className="text-muted-foreground">{t("library.empty")}</p>
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              {t("library.generate")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {history.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} t={t} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Library;
