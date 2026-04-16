import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackPageVisit } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, ChevronDown, Sparkles, Check, Trash2, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HistoryEntry {
  id: string;
  workflow_type: string;
  target_model: string;
  results: any;
  created_at: string;
  image_paths?: string[] | null;
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

function CopyButton({ text, label = "نسخ" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "تم النسخ" : label}
    </Button>
  );
}

function HistoryCard({ entry, t, onDelete }: { entry: HistoryEntry; t: (k: string) => string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const wf = WORKFLOW_LABELS[entry.workflow_type] || WORKFLOW_LABELS.single;
  const results: any[] = Array.isArray(entry.results) ? entry.results : [entry.results];
  const preview = results[0]?.mainPrompt?.slice(0, 120) || "";

  useEffect(() => {
    if (!expanded || !entry.image_paths?.length) return;
    const loadUrls = async () => {
      const urls: string[] = [];
      for (const path of entry.image_paths!) {
        const { data } = await supabase.storage.from("generation-images").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setImageUrls(urls);
    };
    loadUrls();
  }, [expanded, entry.image_paths]);

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
              {/* Reference images */}
              {imageUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Reference frame ${i + 1}`}
                      className="w-20 h-20 rounded-md object-cover border border-border shrink-0"
                    />
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                  {t("library.delete")}
                </Button>
                <CopyButton text={allText} label="نسخ-الكل" />
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
  const [search, setSearch] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState(() => new Set<string>());
  const [modelFilter, setModelFilter] = useState(() => new Set<string>());

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("prompt_history").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setHistory((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // Derive unique models from data
  const uniqueModels = [...new Set(history.map((e) => e.target_model))].sort();

  // Filter logic
  const filtered = history.filter((entry) => {
    if (workflowFilter.size > 0 && !workflowFilter.has(entry.workflow_type)) return false;
    if (modelFilter.size > 0 && !modelFilter.has(entry.target_model)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const results: any[] = Array.isArray(entry.results) ? entry.results : [entry.results];
      const text = results.map((r: any) => r.mainPrompt || "").join(" ").toLowerCase();
      if (!text.includes(q) && !entry.target_model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeFilterCount = workflowFilter.size + modelFilter.size;
  const hasActiveFilters = activeFilterCount > 0 || !!search.trim();

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
            <span className="hidden sm:inline">MOVPROMPT</span>
          </Button>
          <LanguageToggle />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold font-mono">
            {t("library.title")}
          </h1>
        </motion.div>

        {/* Search & Filters */}
        {!loading && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 mb-6"
          >
            {/* Search input */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("library.searchPlaceholder")}
                className="ps-9 pe-9 bg-secondary/30 border-border"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {/* Workflow chips */}
              {Object.entries(WORKFLOW_LABELS).map(([key, wf]) => {
                const active = workflowFilter.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => setWorkflowFilter(prev => {
                      const next = new Set(prev);
                      next.has(key) ? next.delete(key) : next.add(key);
                      return next;
                    })}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? `${wf.color} border-current`
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {wf.label}
                  </button>
                );
              })}

              {/* Model chips */}
              {uniqueModels.map((model) => {
                const active = modelFilter.has(model);
                return (
                  <button
                    key={model}
                    onClick={() => setModelFilter(prev => {
                      const next = new Set(prev);
                      next.has(model) ? next.delete(model) : next.add(model);
                      return next;
                    })}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-foreground/10 text-foreground border-foreground/30"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {model}
                  </button>
                );
              })}

              {/* Active filter count + Clear all */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearch(""); setWorkflowFilter(new Set()); setModelFilter(new Set()); }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t("library.clearFilters")}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{activeFilterCount}</Badge>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}

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
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-3"
          >
            <p className="text-muted-foreground">{t("library.noResults")}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setWorkflowFilter(new Set()); setModelFilter(new Set()); }}
            >
              {t("library.clearFilters")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted-foreground/60">
              {filtered.length} {t("library.resultsCount")}
            </p>
            {filtered.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} t={t} onDelete={handleDelete} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Library;
