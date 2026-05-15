import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Check,
  Copy,
  Download,
  Loader2,
  Film,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export interface VideoJob {
  id: string;
  user_id: string;
  session_id: string | null;
  provider: string;
  prompt: string;
  status: string;
  video_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

const SOURCES = ["Ads Studio", "AI Director"] as const;
type Source = (typeof SOURCES)[number];
const STATUS_GROUPS = ["Completed", "In progress", "Failed"] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number];

function sourceOf(job: VideoJob): Source {
  return job.session_id ? "AI Director" : "Ads Studio";
}

function statusGroupOf(job: VideoJob): StatusGroup {
  if (job.status === "completed") return "Completed";
  if (job.status === "failed" || job.status === "error") return "Failed";
  return "In progress";
}

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

function StatusPill({ group }: { group: StatusGroup }) {
  const map = {
    Completed: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    "In progress": { icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: "bg-[hsl(35_90%_55%)]/15 text-[hsl(35_90%_70%)] border-[hsl(35_90%_55%)]/40" },
    Failed: { icon: <AlertTriangle className="w-3 h-3" />, cls: "bg-destructive/15 text-destructive border-destructive/40" },
  } as const;
  const m = map[group];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm ${m.cls}`}>
      {m.icon}
      {group}
    </span>
  );
}

function VideoJobCard({ job, onOpen }: { job: VideoJob; onOpen: () => void }) {
  const group = statusGroupOf(job);
  const source = sourceOf(job);
  return (
    <Card
      onClick={onOpen}
      className="group bg-card border-border overflow-hidden cursor-pointer transition-all hover:border-[hsl(35_90%_55%)]/50 hover:shadow-[0_0_24px_hsl(35_90%_55%/0.2)]"
    >
      <div className="relative aspect-[9/12] w-full overflow-hidden bg-gradient-to-br from-secondary/40 to-background">
        {job.video_url ? (
          <video
            src={job.video_url}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => void (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => {
              const v = e.currentTarget as HTMLVideoElement;
              v.pause();
              v.currentTime = 0;
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
            {group === "In progress" ? (
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(35_90%_55%)]" />
            ) : group === "Failed" ? (
              <AlertTriangle className="w-8 h-8 text-destructive" />
            ) : (
              <Film className="w-8 h-8" />
            )}
            <span className="text-[10px] uppercase tracking-wider">{group}</span>
          </div>
        )}

        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-foreground/90">
            {source}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <StatusPill group={group} />
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-foreground/90 border border-white/10">
            <Clock className="w-3 h-3" />
            {timeAgo(job.created_at)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2 min-h-[2.4rem]">
          {job.prompt}
        </p>
      </div>
    </Card>
  );
}

function VideoJobModal({ job, open, onClose }: { job: VideoJob | null; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!job) return null;
  const group = statusGroupOf(job);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(job.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[#0F0F11] border border-accent/20">
        <DialogClose className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-[#161618] transition-colors">
          <X className="w-4 h-4" />
        </DialogClose>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 pe-10">
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground/90">
              {sourceOf(job)}
            </span>
            <StatusPill group={group} />
            <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(job.created_at)}</span>
          </div>

          {job.video_url ? (
            <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-[60vh] mx-auto">
              <video src={job.video_url} controls autoPlay className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              {group === "Failed"
                ? job.error || "Render failed."
                : "Render in progress — check back soon."}
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">Prompt</h3>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{job.prompt}</p>
          </div>

          {job.video_url && (
            <a href={job.video_url} download target="_blank" rel="noreferrer">
              <Button className="w-full gap-2 bg-[hsl(35_90%_55%)] text-black hover:bg-[hsl(35_90%_55%)]/90">
                <Download className="w-4 h-4" />
                Download video
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VideosTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState(() => new Set<Source>());
  const [statusFilter, setStatusFilter] = useState(() => new Set<StatusGroup>());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("video_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setJobs((data || []) as VideoJob[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = jobs.filter((j) => {
    if (sourceFilter.size > 0 && !sourceFilter.has(sourceOf(j))) return false;
    if (statusFilter.size > 0 && !statusFilter.has(statusGroupOf(j))) return false;
    if (search.trim() && !j.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasActive = sourceFilter.size + statusFilter.size > 0 || !!search.trim();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[9/12] rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(35_90%_55%)]/10 flex items-center justify-center">
          <Film className="w-7 h-7 text-[hsl(35_90%_55%)]" />
        </div>
        <p className="text-muted-foreground">No video renders yet.</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => navigate("/marketing")} className="bg-[hsl(35_90%_55%)] text-black hover:bg-[hsl(35_90%_55%)]/90">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Create your first ad
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Open AI Director
          </Button>
        </div>
      </motion.div>
    );
  }

  const open = jobs.find((j) => j.id === openId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="ps-9 pe-9 bg-secondary/30 border-border"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCES.map((s) => {
          const active = sourceFilter.has(s);
          return (
            <button
              key={s}
              onClick={() =>
                setSourceFilter((prev) => {
                  const n = new Set(prev);
                  n.has(s) ? n.delete(s) : n.add(s);
                  return n;
                })
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-accent/40 text-accent bg-transparent hover:bg-accent/10"
              }`}
            >
              {active && <Check className="w-3 h-3" />}
              {s}
            </button>
          );
        })}
        {STATUS_GROUPS.map((s) => {
          const active = statusFilter.has(s);
          return (
            <button
              key={s}
              onClick={() =>
                setStatusFilter((prev) => {
                  const n = new Set(prev);
                  n.has(s) ? n.delete(s) : n.add(s);
                  return n;
                })
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-primary/40 text-primary bg-transparent hover:bg-primary/10"
              }`}
            >
              {active && <Check className="w-3 h-3" />}
              {s}
            </button>
          );
        })}
        {hasActive && (
          <button
            onClick={() => {
              setSearch("");
              setSourceFilter(new Set());
              setStatusFilter(new Set());
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No videos match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((job) => (
            <VideoJobCard key={job.id} job={job} onOpen={() => setOpenId(job.id)} />
          ))}
        </div>
      )}

      <VideoJobModal job={open} open={!!openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
