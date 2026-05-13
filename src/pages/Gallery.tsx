import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Clapperboard, Eye, Loader2, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchGallery, type GalleryItem } from "@/lib/sharePrompt";
import { getModelLabel } from "@/lib/models";
import { MODEL_FAMILIES } from "@/lib/seoModels";

interface GalleryPageProps {
  family?: typeof MODEL_FAMILIES[number];
}

const GalleryGrid = ({ items }: { items: GalleryItem[] }) => {
  if (items.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No public prompts here yet — be the first to submit one from your share page.
        </CardContent>
      </Card>
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
            className="group rounded-lg border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-colors p-4 flex flex-col gap-3"
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

export const GalleryView = ({ family }: GalleryPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const modelFilter = searchParams.get("model") || "";
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effective model filter: family page narrows by family.modelValues; manual filter overrides.
  const effectiveModel = modelFilter || undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGallery({ model: effectiveModel, limit: 90 })
      .then((data) => {
        if (cancelled) return;
        // If we're on a family page, additionally filter client-side to only the family's model values.
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
    : "A curated, public gallery of cinematic video prompts crafted by MovPrompt's AI Director of Photography. Copy any prompt, then paste it into Veo, Kling, Seedance and more.";
  const canonical = family
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/models/${family.slug}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/gallery`;

  const filterOptions = useMemo(() => {
    if (family) {
      return family.modelValues.map((v) => ({ value: v, label: getModelLabel(v) }));
    }
    return Array.from(new Set(items.map((i) => i.target_model))).map((v) => ({ value: v, label: getModelLabel(v) }));
  }, [family, items]);

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 25% 4%)" }}>
      <Helmet>
        <title>{heading} · MovPrompt</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={`${heading} · MovPrompt`} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header className="border-b border-border/40 sticky top-0 z-10 backdrop-blur" style={{ backgroundColor: "hsl(220 25% 4% / 0.85)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <Clapperboard className="w-5 h-5 text-brand group-hover:scale-110 transition-transform" />
            <span className="font-display font-semibold text-sm">MovPrompt</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost"><Link to="/gallery">Gallery</Link></Button>
            <Button asChild size="sm" variant="default">
              <Link to="/"><Sparkles className="w-3.5 h-3.5 me-1.5" />Make your own</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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
          {family && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-1.5">
                  <div className="text-[11px] font-display uppercase tracking-wider text-primary">Best for</div>
                  <ul className="text-sm text-foreground/85 list-disc ps-4 space-y-0.5">
                    {family.bestFor.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-1.5">
                  <div className="text-[11px] font-display uppercase tracking-wider text-accent">Prompting tips</div>
                  <ul className="text-sm text-foreground/85 list-disc ps-4 space-y-0.5">
                    {family.tips.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {filterOptions.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <button
              onClick={() => setSearchParams({})}
              className={`text-[11px] uppercase tracking-wider font-display px-2.5 py-1 rounded-full border transition-colors ${
                !modelFilter ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSearchParams({ model: opt.value })}
                className={`text-[11px] uppercase tracking-wider font-display px-2.5 py-1 rounded-full border transition-colors ${
                  modelFilter === opt.value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading gallery…</p>
          </div>
        )}
        {error && !loading && (
          <Card className="border-destructive/30"><CardContent className="py-10 text-center text-sm">{error}</CardContent></Card>
        )}
        {!loading && !error && <GalleryGrid items={items} />}

        {!family && (
          <section className="pt-4 border-t border-border/40">
            <h2 className="font-display text-lg font-semibold mb-3">Browse by model</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {MODEL_FAMILIES.map((f) => (
                <Link key={f.slug} to={`/models/${f.slug}`} className="rounded-lg border border-border/60 hover:border-primary/40 bg-card/40 hover:bg-card/70 transition-colors p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">{f.vendor}</div>
                  <div className="font-display font-semibold text-base mt-0.5">{f.name}</div>
                  <p className="text-xs text-muted-foreground mt-1.5">{f.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-base font-semibold">Make a prompt that lands here.</h2>
              <p className="text-xs text-muted-foreground">Upload any frame, generate, then submit your share page to the gallery.</p>
            </div>
            <Button asChild><Link to="/"><Sparkles className="w-4 h-4 me-1.5" />Try MovPrompt</Link></Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const Gallery = () => <GalleryView />;
export default Gallery;
