import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Film,
  Layers,
  Clapperboard,
  Lock,
  Wand2,
  Sparkles,
  Copy,
  Check,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { AperturalLogo } from "@/components/AperturalLogo";
import exampleDesert from "@/assets/example-desert.jpg";
import examplePortrait from "@/assets/example-portrait.jpg";
import exampleTokyo from "@/assets/example-tokyo.jpg";

const MODELS = ["Kling", "Veo", "Runway", "Seedance", "Sora", "Wan", "Hailuo", "Pika"];

// Cinematography keywords highlighted in amber inside prompt snippets.
const CINE_KEYWORDS = [
  "dolly-in", "dolly-out", "tracking shot", "handheld", "anamorphic",
  "35mm", "50mm", "85mm", "rim light", "key light", "golden hour",
  "shallow", "film grain", "neon", "catchlights", "push", "rack focus",
];

const PROOFS = [
  {
    img: exampleDesert,
    model: "Kling 2.1",
    snippet:
      "Wide desert dolly-in at golden hour, warm rim light on dunes, slow camera push toward lone figure on the ridge…",
  },
  {
    img: examplePortrait,
    model: "Veo 3",
    snippet:
      "Soft window key light, shallow 50mm, subject turns toward camera as catchlights bloom, subtle film grain…",
  },
  {
    img: exampleTokyo,
    model: "Seedance Pro",
    snippet:
      "Neon-soaked Tokyo alley, anamorphic flares, handheld tracking shot weaving through pedestrians, rain mist…",
  },
];

const TESTIMONIALS = [
  {
    name: "Lina Ortega",
    handle: "@linafilms",
    quote: "MovPrompt cut my prep time in half. I drop a still and ship a Kling shot in minutes.",
    avatar: "from-amber-500 to-orange-600",
  },
  {
    name: "Daichi Mori",
    handle: "@dmori.cinema",
    quote: "It actually understands cinematography. The negative prompt alone is worth it.",
    avatar: "from-cyan-500 to-blue-600",
  },
  {
    name: "Aria Patel",
    handle: "@ariadirects",
    quote: "Storyboards in one click. My whole team uses it now for AI ad concepts.",
    avatar: "from-rose-500 to-pink-600",
  },
];

function highlight(text: string) {
  // Split on word boundaries while preserving delimiters.
  const parts = text.split(/(\s+|[.,…])/);
  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    const hit = CINE_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
    if (hit) return <span key={i} className="text-primary">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

function CodeSnippet({ children, text }: { children: React.ReactNode; text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-lg border border-border bg-card/60 p-4 pe-9">
      <button
        onClick={onCopy}
        aria-label="Copy prompt"
        className="absolute top-2 end-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre
        className="whitespace-pre-wrap text-[12px] leading-[1.6] m-0"
        style={{ fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace", color: "#A1A1AA" }}
      >
        {children}
      </pre>
    </div>
  );
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <AperturalLogo size={size} />
      <span className="font-display font-bold text-lg tracking-tight">
        <span className="text-primary">Mov</span>Prompt
      </span>
    </Link>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="MovPrompt — Turn stills into cinematic AI video prompts"
        description="Drop a frame, pick a model, get a director-grade video prompt for Kling, Veo, Runway, Seedance, Sora, and more."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MovPrompt",
            url: "https://movprompt.com",
            logo: "https://movprompt.com/logo.png",
            sameAs: [
              "https://twitter.com/movprompt",
              "https://instagram.com/movprompt",
              "https://youtube.com/@movprompt",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MovPrompt",
            url: "https://movprompt.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://movprompt.com/gallery?model={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-brand/5 rounded-full blur-[100px]" />
      </div>

      {/* NAV */}
      <header className="relative z-20 border-b border-border/40">
        <div className="container max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/gallery" className="hover:text-foreground transition-colors">Examples</Link>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="container max-w-[1200px] mx-auto px-4 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="font-display font-bold tracking-tight text-foreground leading-[1.05]"
              style={{ fontSize: "clamp(44px, 7vw, 76px)" }}
            >
              Turn Stills Into Cinema
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
              Drop a frame. Pick a model. Get a director-grade video prompt ready to paste into Kling, Veo, Runway, Seedance, or any AI video tool.
            </p>
            {/* 32px gap to CTA row */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Button size="lg" onClick={() => navigate("/auth")} className="min-w-[180px]">
                Try It Free
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate("/gallery")}
                className="min-w-[180px] bg-transparent text-foreground border border-foreground/30 hover:bg-foreground/5 hover:border-foreground/50"
              >
                See Examples
              </Button>
            </div>
            {/* 16px gap to microcopy */}
            <p className="mt-4 text-xs text-muted-foreground/70">No credit card required</p>
          </motion.div>
        </section>

        {/* MODEL LOGOS STRIP */}
        <section className="border-y border-border/40 bg-card/30">
          <div className="container max-w-[1200px] mx-auto px-4 py-8">
            <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
              Works with every major AI video model
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-8 sm:gap-x-12 gap-y-3 opacity-60">
              {MODELS.map((m) => (
                <span
                  key={m}
                  className="font-display font-semibold text-foreground text-base sm:text-lg tracking-wide"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* BEFORE/AFTER PROOF */}
        <section className="container max-w-[1200px] mx-auto px-4 py-16 sm:py-24">
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl mb-12 tracking-tight">
            From one image to a full cinematic prompt
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {PROOFS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-3"
              >
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={p.img} alt="" className="w-full h-full object-cover" />
                </div>
                <CodeSnippet text={p.snippet}>{highlight(p.snippet)}</CodeSnippet>
                <div className="flex justify-center">
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-border bg-muted/40 text-muted-foreground">
                    Generated for {p.model}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* THREE WORKFLOWS */}
        <section className="container max-w-[1200px] mx-auto px-4 py-16 sm:py-24">
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Single Frame */}
            <div className="rounded-xl border border-border bg-card/40 p-6 flex flex-col gap-4 hover:border-border/80 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                <Film className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">Single Frame</h3>
                <p className="text-sm text-muted-foreground mt-1">One image. One cinematic shot.</p>
              </div>
              <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-muted">
                <img src={exampleDesert} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Start + End */}
            <div className="rounded-xl border border-border bg-card/40 p-6 flex flex-col gap-4 hover:border-border/80 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                <Layers className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">Start + End</h3>
                <p className="text-sm text-muted-foreground mt-1">Two frames. A seamless transition.</p>
              </div>
              <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-muted/40 flex items-center gap-2 p-2">
                <div className="flex-1 h-full rounded overflow-hidden">
                  <img src={examplePortrait} alt="" className="w-full h-full object-cover" />
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 h-full rounded overflow-hidden">
                  <img src={exampleTokyo} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Multi-Shot */}
            <div className="rounded-xl border border-border bg-card/40 p-6 flex flex-col gap-4 hover:border-border/80 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                <Clapperboard className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">Multi-Shot</h3>
                <p className="text-sm text-muted-foreground mt-1">One image. A full storyboard.</p>
              </div>
              <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-muted/40 p-2 flex items-center gap-1">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="flex-1 h-full rounded-sm overflow-hidden">
                    <img
                      src={[exampleDesert, examplePortrait, exampleTokyo][idx % 3]}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: `hue-rotate(${idx * 12}deg) brightness(${0.85 + (idx % 3) * 0.05})` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SCENE ELEMENTS BLOCK */}
        <section className="container max-w-[1200px] mx-auto px-4 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="rounded-xl border border-border bg-card/60 p-5 order-2 md:order-1">
              {/* Source thumbnail */}
              <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-muted mb-4">
                <img src={exampleDesert} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
                Scene Elements
              </div>
              <div className="space-y-2">
                {["Subject", "Background", "Lighting", "Atmosphere"].map((label, idx) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {idx % 2 === 0 ? "Lock" : "Move"}
                      </span>
                      <Lock className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
                Direct every element in your shot
              </h2>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
                MovPrompt breaks your scene into subject, background, lighting, and atmosphere.
                Lock what stays. Move what animates. Full directorial control.
              </p>
            </div>
          </div>
        </section>

        {/* DIRECTOR'S PICK BLOCK */}
        <section className="container max-w-[1200px] mx-auto px-4 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
                Your AI Director picks the right model
              </h2>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
                Every prompt comes with a recommended model, a negative prompt, and camera direction.
                One click to copy. Ready to paste.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Director's Pick
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-foreground">Kling 2.1 Master</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Best for cinematic camera moves, soft lighting, and rich atmospheric depth.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1">Copy prompt</Button>
                  <Button size="sm" variant="outline" className="flex-1">Use this model</Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-border bg-background/40 px-2.5 py-2 text-muted-foreground">
                  <span className="text-foreground">Camera:</span> slow dolly-in, 35mm
                </div>
                <div className="rounded-md border border-border bg-background/40 px-2.5 py-2 text-muted-foreground">
                  <span className="text-foreground">Negative:</span> static, flat, washed-out
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="container max-w-[1200px] mx-auto px-4 py-16 sm:py-24">
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl mb-12 tracking-tight">
            Loved by directors and AI creators
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.handle}
                className="rounded-xl border border-border bg-card/40 p-6 flex flex-col gap-4"
              >
                <p className="text-foreground text-sm leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatar} shrink-0`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.handle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section id="pricing" className="container max-w-[1000px] mx-auto px-4 py-20 sm:py-32 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-5" />
          <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight">
            Stop writing prompts. Start directing.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Join filmmakers and AI creators using MovPrompt every day.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => navigate("/auth")} className="min-w-[200px]">
              Get Started Free
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border/40">
        <div className="container max-w-[1200px] mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Logo size={24} />
              <p className="text-xs text-muted-foreground mt-3 max-w-xs">
                The AI Director of Photography for generative video prompts.
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Product</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors">Examples</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Company</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/learn" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
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
              <a href="https://twitter.com/movprompt" target="_blank" rel="noreferrer" aria-label="X / Twitter" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/movprompt" target="_blank" rel="noreferrer" aria-label="Instagram" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://youtube.com/@movprompt" target="_blank" rel="noreferrer" aria-label="YouTube" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
