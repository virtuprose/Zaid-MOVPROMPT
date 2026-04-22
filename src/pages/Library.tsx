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
import { ArrowLeft, Copy, ChevronDown, Sparkles, Check, Trash2, Search, X, Film } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HistoryEntry {
  id: string;
  workflow_type: string;
  target_model: string;
  results: any;
  created_at: string;
  image_paths?: string[] | null;
}

function getWorkflowLabels(t: (k: string) => string): Record<string, { label: string; color: string }> {
  return {
    single: { label: t("library.singleFrame"), color: "bg-primary/20 text-primary border-primary/30" },
    twoframe: { label: t("library.twoFrames"), color: "bg-accent/20 text-accent border-accent/30" },
    multishot: { label: t("library.multiShot"), color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  };
}

function timeAgo(dateStr: string, t: (k: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("library.justNow");
  if (mins < 60) return `${mins}${t("library.minsAgo")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t("library.hrsAgo")}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}${t("library.daysAgo")}`;
  return new Date(dateStr).toLocaleDateString();
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

function HistoryCard({ entry, t, onDelete }: { entry: HistoryEntry; t: (k: string) => string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const workflowLabels = getWorkflowLabels(t);
  const wf = workflowLabels[entry.workflow_type] || workflowLabels.single;
  const results: any[] = Array.isArray(entry.results) ? entry.results : [entry.results];
  const preview = results[0]?.mainPrompt?.slice(0, 200) || "";

  // Eagerly resolve a thumbnail for the first reference image (if any).
  useEffect(() => {
    const firstPath = entry.image_paths?.[0];
    if (!firstPath) return;
    let cancelled = false;
    supabase.storage
      .from("generation-images")
      .createSignedUrl(firstPath, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setThumbUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [entry.image_paths]);

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
      let s = `${t("library.shot")} ${i + 1}\n${r.mainPrompt || ""}`;
      if (r.negativePrompt) s += `\n${t("library.negative")}: ${r.negativePrompt}`;
      if (r.cameraSuggestions) s += `\n${t("library.camera")}: ${r.cameraSuggestions}`;
      if (r.modelNotes) s += `\n${t("library.notes")}: ${r.modelNotes}`;
      return s;
    })
    .join("\n\n");

  return (
    <Card className="bg-card border-border overflow-hidden h-full flex flex-col">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start p-3 sm:p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors flex-1"
      >
        {/* Thumbnail (64x64) */}
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={t("library.referenceThumb" as any) || "Reference"}
            className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border"
            loading="lazy"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center bg-secondary/40"
            style={{ border: "1px solid rgba(0,212,255,0.2)" }}
            aria-label="No reference image"
          >
            <Film className="w-5 h-5 text-primary/60" />
          </div>
        )}

        {/* Right side: badge + preview + meta */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 self-stretch">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-foreground/85 line-clamp-2 leading-snug flex-1 min-w-0">
              {preview}{preview.length >= 200 ? "…" : ""}
            </p>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${wf.color}`}>{wf.label}</Badge>
          </div>
          <div className="mt-auto flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground truncate">{entry.target_model}</span>
            <span className="text-[11px] text-muted-foreground/60">·</span>
            <span className="text-[11px] text-muted-foreground/60">{timeAgo(entry.created_at, t)}</span>
            <ChevronDown className={`w-4 h-4 ms-auto shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
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
                <CopyButton text={allText} label={t("library.copyAll")} copiedLabel={t("library.copied")} />
              </div>
              {results.map((shot: any, i: number) => (
                <div key={i} className="space-y-2">
                  {results.length > 1 && (
                    <p className="text-xs font-medium text-primary">{t("library.shot")} {i + 1}</p>
                  )}
                  {shot.mainPrompt && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("results.mainPrompt")}</span>
                        <CopyButton text={shot.mainPrompt} label={t("library.copy")} copiedLabel={t("library.copied")} />
                      </div>
                      <p className="text-sm bg-secondary/40 rounded-md p-2.5 leading-relaxed">{shot.mainPrompt}</p>
                    </div>
                  )}
                  {shot.negativePrompt && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("results.negativePrompt")}</span>
                        <CopyButton text={shot.negativePrompt} label={t("library.copy")} copiedLabel={t("library.copied")} />
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

      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-6 sm:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <img src="/logo-mark.svg" alt="" className="w-5 h-5" />
            <span className="hidden sm:inline font-mono font-semibold">MOVPROMPT</span>
          </Button>
          <LanguageToggle />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
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
              {Object.entries(getWorkflowLabels(t)).map(([key, wf]) => {
                const active = workflowFilter.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => setWorkflowFilter(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
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
                      if (next.has(model)) next.delete(model); else next.add(model);
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
            <div className="gap-3 [column-fill:_balance] columns-1 md:columns-2 lg:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
              {filtered.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} t={t} onDelete={handleDelete} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Library;
