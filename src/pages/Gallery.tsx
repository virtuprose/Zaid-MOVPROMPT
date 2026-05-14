import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, Sparkles, Search, ArrowRight, Heart, Copy, ChevronDown, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchGallery, type GalleryItem } from "@/lib/sharePrompt";
import { getModelLabel } from "@/lib/models";
import { MODEL_FAMILIES } from "@/lib/seoModels";
import { useAuth } from "@/hooks/useAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import NotificationBell from "@/components/NotificationBell";
import exampleTokyo from "@/assets/example-tokyo.jpg";
import exampleDesert from "@/assets/example-desert.jpg";
import examplePortrait from "@/assets/example-portrait.jpg";
import exampleKitchen from "@/assets/example-kitchen.jpg";
import exampleCyberpunk from "@/assets/example-cyberpunk.jpg";
import exampleUnderwater from "@/assets/example-underwater.jpg";
import loopTokyo from "@/assets/loop-tokyo.mp4.asset.json";
import loopDesert from "@/assets/loop-desert.mp4.asset.json";
import loopPortrait from "@/assets/loop-portrait.mp4.asset.json";
import loopKitchen from "@/assets/loop-kitchen.mp4.asset.json";
import loopCyberpunk from "@/assets/loop-cyberpunk.mp4.asset.json";
import loopUnderwater from "@/assets/loop-underwater.mp4.asset.json";
import { toast } from "@/hooks/use-toast";

interface GalleryPageProps {
  family?: typeof MODEL_FAMILIES[number];
}

// ─────────────────────────────────────── Wordmark
const Wordmark = () => (
  <Link to="/" className="font-display font-bold text-lg tracking-tight">
    <span className="text-primary">Mov</span>
    <span className="text-foreground">Prompt</span>
  </Link>
);

// ─────────────────────────────────────── Browse-by-model data (all 8 providers)
type ProviderCard = {
  key: string;
  name: string;
  vendor: string;
  description: string;
  count: number; // 0 = Coming soon
  slug?: string;
  initial: string;
};

const PROVIDER_CARDS: ProviderCard[] = [
  { key: "veo", name: "Veo", vendor: "Google DeepMind", description: "Cinematic prompts for Veo 3 and Veo 3.1.", count: 142, slug: "google-veo", initial: "Ve" },
  { key: "kling", name: "Kling", vendor: "Kuaishou", description: "Director-grade prompts for Kling 2.5 → 3.0 Omni.", count: 98, slug: "kling", initial: "Kl" },
  { key: "seedance", name: "Seedance", vendor: "ByteDance", description: "Fast, punchy prompts for Seedance Pro and 2.0.", count: 76, slug: "seedance", initial: "Se" },
  { key: "sora", name: "Sora", vendor: "OpenAI", description: "Long-form, story-driven prompts for Sora.", count: 0, initial: "So" },
  { key: "runway", name: "Runway", vendor: "Runway ML", description: "Motion-focused prompts for Gen-3 Alpha.", count: 0, initial: "Ru" },
  { key: "wan", name: "Wan", vendor: "Alibaba", description: "Stylised prompts for Wan 2.1.", count: 0, initial: "Wa" },
  { key: "hailuo", name: "Hailuo", vendor: "MiniMax", description: "Character animation prompts for Hailuo.", count: 0, initial: "Ha" },
  { key: "pika", name: "Pika", vendor: "Pika Labs", description: "Quick experimental prompts for Pika 2.0.", count: 0, initial: "Pi" },
];

// Flagship models get amber-FILLED pills; older variants get amber-OUTLINE pills.
const FLAGSHIP_MODELS = new Set(["Veo 3.1", "Kling 3.0 Omni", "Seedance Pro"]);

// ─────────────────────────────────────── Sample showcase data
const SAMPLE_CARDS = [
  {
    image: exampleTokyo,
    model: "Veo 3.1",
    title: "Neon-soaked Tokyo alley at dawn",
    snippet: "Slow dolly-in through rain-slick neon alley, anamorphic lens flares, steam rising from manhole, lone figure in trench coat backlit by sodium streetlamps…",
    likes: 248, copies: 132,
  },
  {
    image: exampleDesert,
    model: "Kling 3.0 Omni",
    title: "Lone traveller crossing dunes at golden hour",
    snippet: "Wide tracking shot, sun-flared silhouette walking the ridge of an amber dune, wind-driven sand particles, 70mm grain, cinematic letterbox…",
    likes: 189, copies: 94,
  },
  {
    image: examplePortrait,
    model: "Seedance Pro",
    title: "Studio portrait turn — Rembrandt to profile",
    snippet: "Subject begins facing camera in soft Rembrandt key, slow rotational head turn to a sharp side profile, shallow depth, 85mm look…",
    likes: 167, copies: 72,
  },
  {
    image: exampleKitchen,
    model: "Veo 3",
    title: "Steam-lit kitchen, sizzling pan close-up",
    snippet: "Macro push-in on a sizzling pan, billowing steam catching warm tungsten light, shallow focus, anamorphic flare grazing the rim, amber/teal grade…",
    likes: 134, copies: 58,
  },
  {
    image: exampleCyberpunk,
    model: "Kling 2.5 Turbo",
    title: "Cyberpunk rooftop, neon skyline reveal",
    snippet: "Slow crane-up behind a lone figure on a rain-slick rooftop, magenta and cyan holographic billboards bloom across the skyline, anamorphic widescreen…",
    likes: 121, copies: 49,
  },
  {
    image: exampleUnderwater,
    model: "Seedance 2.0",
    title: "Underwater diver, god-rays piercing the deep",
    snippet: "Wide silhouette of a scuba diver suspended mid-water, volumetric god-rays slicing through deep blue, particles drifting, IMAX-style framing…",
    likes: 98, copies: 41,
  },
];

// ─────────────────────────────────────── Card grid
const GalleryGrid = ({ items, sampleMode }: { items: GalleryItem[]; sampleMode: boolean }) => {
  if (sampleMode) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        {SAMPLE_CARDS.map((c, i) => {
          const isFlagship = FLAGSHIP_MODELS.has(c.model);
          return (
            <article
              key={i}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-colors flex flex-col min-h-[420px] h-full"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <img src={c.image} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                  Featured
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-display">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      isFlagship
                        ? "bg-primary text-primary-foreground border border-primary"
                        : "border border-primary/40 text-primary bg-transparent"
                    }`}
                  >
                    {c.model}
                  </span>
                  <span className="text-muted-foreground normal-case tracking-normal">@movprompt</span>
                </div>
                <h3 className="font-display text-sm font-semibold leading-snug line-clamp-2 text-foreground">
                  {c.title}
                </h3>
                <p
                  className="font-mono leading-relaxed flex-1 break-words"
                  style={{ fontSize: "12px", color: "#A1A1AA", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "normal", overflowWrap: "break-word" }}
                >
                  {c.snippet}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-2 mt-auto border-t border-border/40">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {c.likes} likes</span>
                  <span className="opacity-50">·</span>
                  <span className="inline-flex items-center gap-1"><Copy className="w-3 h-3" /> {c.copies} copies</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => {
        const shotCount = Array.isArray(it.results) ? it.results.length : 0;
        const preview = Array.isArray(it.results) && it.results[0]?.mainPrompt
          ? String(it.results[0].mainPrompt).slice(0, 160)
          : "";
        return (
          <Link
            key={it.slug}
            to={`/p/${it.slug}`}
            className="group rounded-xl border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-colors p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wider font-display">
              <span className="rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5">
                {getModelLabel(it.target_model)}
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                {shotCount} {shotCount === 1 ? "shot" : "shots"}
              </span>
              <span className="ms-auto inline-flex items-center gap-1 text-muted-foreground normal-case tracking-normal">
                <Eye className="w-3 h-3" /> {it.view_count}
              </span>
            </div>
            <h3 className="font-display text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {it.title || `Cinematic prompt set for ${getModelLabel(it.target_model)}`}
            </h3>
            {preview && (
              <p className="text-xs text-muted-foreground line-clamp-3 font-mono leading-relaxed">{preview}…</p>
            )}
            {it.agent_name && (
              <div className="text-[10px] inline-flex items-center gap-1 text-accent">
                <Sparkles className="w-3 h-3" /> {it.agent_name}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────── Footer
const SiteFooter = () => (
  <footer className="relative z-10 border-t border-border/40 mt-16">
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 text-center sm:text-left">
        <div className="md:col-span-2 flex flex-col items-center sm:items-start">
          <Wordmark />
          <p className="text-xs text-muted-foreground mt-3 max-w-xs">
            The AI Director of Photography for generative video prompts.
          </p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Product</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Studio</Link></li>
            <li><Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors">Gallery</Link></li>
            <li><Link to="/learn" className="text-muted-foreground hover:text-foreground transition-colors">Tutorials</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Company</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/learn" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
            <li><Link to="/learn" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
            <li><Link to="/learn" className="text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
            <li><a href="mailto:hello@movprompt.com" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Legal</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
            <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MovPrompt. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <a href="https://twitter.com/movprompt" target="_blank" rel="noreferrer" aria-label="X" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Z" /></svg>
          </a>
          <a href="https://instagram.com/movprompt" target="_blank" rel="noreferrer" aria-label="Instagram" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
          </a>
          <a href="https://youtube.com/@movprompt" target="_blank" rel="noreferrer" aria-label="YouTube" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.58A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.9.58 9.4.58 9.4.58s7.5 0 9.4-.58a3 3 0 0 0 2.1-2.12 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" /></svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────── Main view
const FORMAT_FILTERS = ["All", "Single shot", "Start + End", "Multi-shot", "Portrait", "Landscape", "Square"];
const SORT_OPTIONS = ["Most popular", "Newest", "Most copied"];

export const GalleryView = ({ family }: GalleryPageProps) => {
  const [searchParams] = useSearchParams();
  const modelFilter = searchParams.get("model") || "";
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("All");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const effectiveModel = modelFilter || undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGallery({ model: effectiveModel, limit: 90 })
      .then((data) => {
        if (cancelled) return;
        const filtered = family
          ? data.filter((d) => family.modelValues.includes(d.target_model))
          : data;
        setItems(filtered);
      })
      .catch((e) => !cancelled && setError(e?.message || "Could not load gallery"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [effectiveModel, family]);

  const heading = family ? `${family.name} prompt gallery` : "Public prompt gallery";
  const desc = family
    ? `Curated cinematic video prompts written for ${family.name} (${family.vendor}). Browse, copy, and remix shots crafted with MovPrompt's AI Director of Photography.`
    : "A curated gallery of cinematic video prompts crafted with MovPrompt's AI Director of Photography. Copy any prompt, then paste it into Veo, Kling, Seedance, or any AI video tool.";
  const canonical = family
    ? `https://movprompt.com/models/${family.slug}`
    : "https://movprompt.com/gallery";

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.title || "").toLowerCase().includes(q));
  }, [items, search]);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220 25% 4%)" }}>
      <Helmet>
        <title>{heading} · MovPrompt</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={`${heading} · MovPrompt`} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://movprompt.com/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${heading} · MovPrompt`} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content="https://movprompt.com/og-image.jpg" />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: heading,
            description: desc,
            url: canonical,
            isPartOf: { "@type": "WebSite", name: "MovPrompt", url: "https://movprompt.com" },
          })}
        </script>
      </Helmet>

      {/* NAV */}
      <header className="border-b border-border/40 sticky top-0 z-20 backdrop-blur" style={{ backgroundColor: "hsl(220 25% 4% / 0.85)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Wordmark />
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button asChild size="sm" variant="ghost"><Link to="/">Studio</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link to="/gallery">Gallery</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link to="/library">Prompt Library</Link></Button>
              <NotificationBell />
              <LanguageToggle />
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full focus:outline-none">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/library")}>Prompt Library</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost"><Link to="/gallery">Gallery</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link to="/auth">Sign In</Link></Button>
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 w-full flex-1">
        {/* HERO */}
        <section className="space-y-3">
          {family && (
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-display">
              <Link to="/gallery" className="hover:text-primary">Gallery</Link>
              <span className="mx-2 opacity-40">/</span>
              <span>{family.vendor}</span>
            </div>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">{family?.intro ?? desc}</p>
        </section>

        {/* SEARCH + FILTERS */}
        <section className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="w-full bg-card/60 border border-border rounded-lg text-sm pl-10 pr-3 py-2.5 outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FORMAT_FILTERS.map((f) => {
                const active = formatFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFormatFilter(f)}
                    className={`text-[11px] uppercase tracking-wider font-display px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/40 bg-transparent text-primary hover:bg-primary/10"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  {sortBy} <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SORT_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setSortBy(s)}>{s}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* GRID */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading gallery…</p>
          </div>
        )}
        {error && !loading && (
          <Card className="border-destructive/30"><CardContent className="py-10 text-center text-sm">{error}</CardContent></Card>
        )}
        {!loading && !error && (
          <GalleryGrid items={visibleItems} sampleMode={visibleItems.length === 0} />
        )}

        {/* BROWSE BY MODEL — split into Available / Coming soon */}
        {!family && (() => {
          const available = PROVIDER_CARDS.filter((p) => p.count > 0);
          const upcoming = PROVIDER_CARDS.filter((p) => p.count === 0);
          return (
            <section className="pt-6 border-t border-border/40 space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold mb-4">Available now</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {available.map((p) => (
                    <Link key={p.key} to={`/models/${p.slug}`}>
                      <div className="rounded-xl border border-border/60 hover:border-primary/40 bg-card/40 hover:bg-card/70 transition-colors p-4 flex items-center gap-3 h-full">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-display font-bold text-xs">
                          {p.initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display truncate">{p.vendor}</div>
                          <div className="font-display font-semibold text-sm truncate">{p.name}</div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                          <div className="text-[10px] text-primary mt-1 font-medium">{p.count} prompts</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {upcoming.length > 0 && (
                <div>
                  <h3 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3">Coming soon</h3>
                  <div className="flex flex-wrap gap-2 opacity-60">
                    {upcoming.map((p) => (
                      <div
                        key={p.key}
                        className="rounded-full border border-border/60 bg-card/40 px-3 py-1.5 flex items-center gap-2 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[9px] font-display font-bold">
                          {p.initial}
                        </span>
                        <span className="font-display font-medium">{p.name}</span>
                        <span className="text-muted-foreground text-[10px]">· {p.vendor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-8 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <h2 className="font-display text-base font-semibold">Make a prompt that lands here.</h2>
              <p className="text-xs text-muted-foreground mt-1">Upload any frame, generate, then submit your share page to the gallery.</p>
            </div>
            <Button asChild className="ms-auto">
              <Link to="/"><Sparkles className="w-4 h-4 me-1.5" />Open the studio</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
};

const Gallery = () => <GalleryView />;
export default Gallery;
