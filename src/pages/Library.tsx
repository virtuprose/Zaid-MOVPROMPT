import { useState, useEffect } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { VideosTab } from "@/components/library/VideosTab";
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
import { motion } from "framer-motion";
import { ArrowLeft, Copy, ChevronDown, Sparkles, Check, Trash2, Search, X, Film, MoreVertical, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Seo } from "@/components/Seo";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getModelLabel } from "@/lib/models";
import { TopNav } from "@/components/TopNav";

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
    single: { label: t("library.singleFrame"), color: "text-primary" },
    twoframe: { label: t("library.twoFrames"), color: "text-accent" },
    multishot: { label: t("library.multiShot"), color: "text-emerald-400" },
  };
}

function normalizeModelLabel(model: string): string {
  if (!model) return "Any";
  if (model === "any" || model.toLowerCase() === "any model") return "Any";
  return getModelLabel(model);
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

function CopyButton({ text, label, copiedLabel, variant = "ghost" }: { text: string; label: string; copiedLabel: string; variant?: "ghost" | "outline" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-xs gap-1 hover:bg-[#161618] hover:border-accent/40 hover:text-accent"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

// Detect sequence-style headers in the prompt body so we can amber-style them in the modal.
const SEQUENCE_RE = /^\s*\[?\s*(SEQUENCE|SCENE|SHOT)\b[^\]\n]*\]?\s*$/i;
function renderPromptWithSequenceHeaders(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (SEQUENCE_RE.test(line)) {
      return (
        <div
          key={i}
          className="text-accent font-semibold uppercase tracking-wider text-xs mt-2 first:mt-0"
        >
          {line.trim()}
        </div>
      );
    }
    return <div key={i}>{line || "\u00A0"}</div>;
  });
}

function HistoryCard({
  entry,
  t,
  onDelete,
  isExpanded,
  onToggle,
}: {
  entry: HistoryEntry;
  t: (k: string) => string;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [thumbUrls, setThumbUrls] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const workflowLabels = getWorkflowLabels(t);
  const wf = workflowLabels[entry.workflow_type] || workflowLabels.single;
  const results: any[] = Array.isArray(entry.results) ? entry.results : [entry.results];
  const preview = results[0]?.mainPrompt?.slice(0, 200) || "";
  const modelLabel = normalizeModelLabel(entry.target_model);

  // Resolve up to 4 thumbnails for a 2x2 composite when multiple references exist.
  useEffect(() => {
    const paths = entry.image_paths?.slice(0, 4) || [];
    if (paths.length === 0) return;
    let cancelled = false;
    Promise.all(
      paths.map((p) =>
        supabase.storage.from("generation-images").createSignedUrl(p, 3600).then(({ data }) => data?.signedUrl || null),
      ),
    ).then((urls) => {
      if (!cancelled) setThumbUrls(urls.filter((u): u is string => !!u));
    });
    return () => { cancelled = true; };
  }, [entry.image_paths]);

  const allText = results
    .map((r: any, i: number) => {
      let s = `${t("library.shot")} ${i + 1}\n${r.mainPrompt || ""}`;
      if (r.negativePrompt) s += `\n${t("library.negative")}: ${r.negativePrompt}`;
      if (r.cameraSuggestions) s += `\n${t("library.camera")}: ${r.cameraSuggestions}`;
      if (r.modelNotes) s += `\n${t("library.notes")}: ${r.modelNotes}`;
      return s;
    })
    .join("\n\n");

  const totalRefs = entry.image_paths?.length ?? 0;
  const showComposite = thumbUrls.length > 1;

  return (
    <Card
      className={`bg-card border-border overflow-hidden flex flex-col group transition-shadow ${
        isExpanded ? "ring-2 ring-primary/40 shadow-lg" : ""
      }`}
    >
      {/* Media banner */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/40 to-accent/10">
        {showComposite ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full bg-border/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-background/40 overflow-hidden">
                {thumbUrls[i] ? (
                  <img src={thumbUrls[i]} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </div>
            ))}
          </div>
        ) : thumbUrls[0] ? (
          <img
            src={thumbUrls[0]}
            alt={t("library.referenceThumb" as any) || "Reference"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
            <Film className="w-8 h-8" />
            <span className="text-[10px] uppercase tracking-wider">{t("library.noReference" as any)}</span>
          </div>
        )}

        {/* Workflow pill — dark backdrop for legibility */}
        <div className="absolute top-2 start-2">
          <span
            className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 ${wf.color}`}
          >
            {wf.label}
          </span>
        </div>

        {/* Time pill + kebab top-right */}
        <div className="absolute top-2 end-2 flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-foreground/90 border border-white/10">
            {timeAgo(entry.created_at, t)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-foreground/90 hover:text-foreground hover:bg-black/80 transition-colors"
                aria-label="More options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 me-2" />
                {t("library.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {totalRefs > 4 && (
          <div className="absolute bottom-2 end-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-foreground border border-white/10">
              +{totalRefs - 4}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
          {modelLabel}
        </span>
        <p className="text-sm text-foreground/85 leading-relaxed line-clamp-2 min-h-[2.6rem]">
          {preview}{preview.length >= 200 ? "…" : ""}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-secondary/20">
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-7 px-2 text-xs gap-1">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          {isExpanded ? "Close" : t("library.viewPrompts" as any)}
        </Button>
        <CopyButton text={allText} label={t("library.copyAll")} copiedLabel={t("library.copied")} />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("library.delete")}?</AlertDialogTitle>
            <AlertDialogDescription>
              This prompt will be permanently removed from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(entry.id); setConfirmOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("library.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PromptSection({
  title,
  body,
  variant = "default",
  copyLabel,
  copiedLabel,
  renderHeaders = false,
}: {
  title: string;
  body: string;
  variant?: "default" | "notes";
  copyLabel: string;
  copiedLabel: string;
  renderHeaders?: boolean;
}) {
  const isNotes = variant === "notes";
  return (
    <section
      className={`rounded-lg border p-6 ${
        isNotes
          ? "bg-[#0F0E0C] border-t border-[#27272A] border-accent/15"
          : "bg-secondary/30 border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            isNotes ? "text-muted-foreground" : "text-foreground/80"
          }`}
        >
          {title}
        </h3>
        <CopyButton text={body} label={copyLabel} copiedLabel={copiedLabel} />
      </div>
      <div
        className={`text-sm leading-relaxed whitespace-pre-wrap ${
          isNotes ? "text-muted-foreground italic" : "text-foreground/90"
        }`}
      >
        {renderHeaders ? renderPromptWithSequenceHeaders(body) : body}
      </div>
    </section>
  );
}

function ExpandedPromptModal({
  entry,
  t,
  open,
  onClose,
}: {
  entry: HistoryEntry | null;
  t: (k: string) => string;
  open: boolean;
  onClose: () => void;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const results: any[] = entry ? (Array.isArray(entry.results) ? entry.results : [entry.results]) : [];

  useEffect(() => {
    if (!entry?.image_paths?.length) {
      setImageUrls([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      entry.image_paths.map((p) =>
        supabase.storage.from("generation-images").createSignedUrl(p, 3600).then(({ data }) => data?.signedUrl || null),
      ),
    ).then((urls) => {
      if (!cancelled) setImageUrls(urls.filter((u): u is string => !!u));
    });
    return () => { cancelled = true; };
  }, [entry?.id]);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[#0F0F11] border border-accent/20"
      >
        <DialogClose className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-[#161618] transition-colors">
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="p-6 sm:p-8 space-y-4">
          <div className="space-y-1 pe-10">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
              {normalizeModelLabel(entry.target_model)}
            </p>
            <h2 className="text-lg font-semibold font-display">{t("library.viewPrompts" as any)}</h2>
          </div>

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

          {results.map((shot: any, i: number) => {
            const charLimit = shot.charLimit as number | undefined;
            const originalLength = shot.originalLength as number | undefined;
            const trimmedLength = (shot.mainPrompt || "").length;
            const wasTrimmed =
              typeof charLimit === "number" &&
              typeof originalLength === "number" &&
              originalLength > trimmedLength;

            return (
              <div key={i} className="space-y-4">
                {results.length > 1 && (
                  <p className="text-accent font-semibold uppercase tracking-wider text-xs">
                    {t("library.shot")} {i + 1}
                  </p>
                )}

                {wasTrimmed && (
                  <div className="rounded-md border border-accent/30 bg-accent/10 p-3 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-xs text-accent-foreground/90 leading-relaxed">
                      Auto-trimmed from {originalLength} to {charLimit} chars to fit{" "}
                      {normalizeModelLabel(entry.target_model)} input limit.
                    </p>
                  </div>
                )}

                {shot.mainPrompt && (
                  <PromptSection
                    title={t("results.mainPrompt")}
                    body={shot.mainPrompt}
                    copyLabel={t("library.copy")}
                    copiedLabel={t("library.copied")}
                    renderHeaders
                  />
                )}
                {shot.negativePrompt && (
                  <PromptSection
                    title={t("results.negativePrompt")}
                    body={shot.negativePrompt}
                    copyLabel={t("library.copy")}
                    copiedLabel={t("library.copied")}
                  />
                )}
                {shot.cameraSuggestions && (
                  <PromptSection
                    title={t("results.cameraSuggestions")}
                    body={shot.cameraSuggestions}
                    copyLabel={t("library.copy")}
                    copiedLabel={t("library.copied")}
                  />
                )}
                {shot.modelNotes && (
                  <PromptSection
                    title={t("results.modelNotes")}
                    body={shot.modelNotes}
                    variant="notes"
                    copyLabel={t("library.copy")}
                    copiedLabel={t("library.copied")}
                  />
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Tailwind: grid-cols-1 (mobile), sm:grid-cols-2 (>=640), lg:grid-cols-3 (>=1024)
  const [cols, setCols] = useState(3);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "copied" | "liked">("newest");
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setCols(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

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

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // newest, copied, liked: fallback to newest (copy/like counts not yet tracked)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeFilterCount = workflowFilter.size + modelFilter.size;
  const hasActiveFilters = activeFilterCount > 0 || !!search.trim();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Seo
        title="Your prompt library — MovPrompt"
        description="Browse, search, and reuse every cinematic AI video prompt you've generated with MovPrompt."
        path="/library"
        noindex
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-4 sm:py-6">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 space-y-1"
        >
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t("library.title")}
          </h1>
          {!loading && history.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("library.subtitle" as any).replace("{count}", String(history.length))}
            </p>
          )}
        </motion.div>

        {/* Search & Filters */}
        {!loading && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 mb-6"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0 h-10">
                    {sortBy === "newest" && "Newest first"}
                    {sortBy === "oldest" && "Oldest first"}
                    {sortBy === "copied" && "Most copied"}
                    {sortBy === "liked" && "Most liked"}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest first</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest first</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("copied")}>Most copied</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("liked")}>Most liked</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filter chips — horizontal scroll on mobile, wrap on larger screens */}
            <div className="flex sm:flex-wrap flex-nowrap gap-2 overflow-x-auto sm:overflow-x-visible -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none [&>*]:shrink-0 sm:[&>*]:shrink">
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
                        ? "bg-accent text-accent-foreground border-accent"
                        : "border-accent/40 text-accent bg-transparent hover:bg-accent/10"
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
                        ? "bg-accent text-accent-foreground border-accent"
                        : "border-accent/40 text-accent bg-transparent hover:bg-accent/10"
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {normalizeModelLabel(model)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sorted.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    t={t}
                    onDelete={handleDelete}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : entry.id)}
                  />
                );
              })}
            </div>

            <ExpandedPromptModal
              entry={sorted.find((e) => e.id === expandedId) || null}
              t={t}
              open={!!expandedId}
              onClose={() => setExpandedId(null)}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Library;
