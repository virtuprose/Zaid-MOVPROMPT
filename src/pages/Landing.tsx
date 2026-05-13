import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, Film, Layers, Clapperboard, Lock, Wand2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import logoMark from "@/assets/logo-mark.svg";
import exampleDesert from "@/assets/example-desert.jpg";
import examplePortrait from "@/assets/example-portrait.jpg";
import exampleTokyo from "@/assets/example-tokyo.jpg";

const MODELS = ["Kling", "Veo", "Runway", "Seedance", "Sora", "Wan", "Hailuo", "Pika"];

const PROOFS = [
  {
    img: exampleDesert,
    model: "Kling 2.1",
    snippet: [
      "Wide desert dolly-in at golden hour,",
      "warm rim light on dunes, slow camera",
      "push toward lone figure on the ridge…",
    ],
  },
  {
    img: examplePortrait,
    model: "Veo 3",
    snippet: [
      "Soft window key light, shallow 50mm,",
      "subject turns toward camera as catch-",
      "lights bloom, subtle film grain…",
    ],
  },
  {
    img: exampleTokyo,
    model: "Seedance Pro",
    snippet: [
      "Neon-soaked Tokyo alley, anamorphic",
      "flares, handheld tracking shot weaving",
      "through pedestrians, rain mist…",
    ],
  },
];

const WORKFLOWS = [
  { icon: Film, title: "Single Frame", desc: "One image. One cinematic shot." },
  { icon: Layers, title: "Start + End", desc: "Two frames. A seamless transition." },
  { icon: Clapperboard, title: "Multi-Shot", desc: "One image. A full 10-shot storyboard." },
];

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
          <Link to="/" className="flex items-center gap-2">
            <img src={logoMark} alt="" className="w-7 h-7" />
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="text-primary">Mov</span>Prompt
            </span>
          </Link>
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
        <section className="container max-w-[1200px] mx-auto px-4 pt-16 sm:pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display font-bold tracking-tight text-foreground text-4xl sm:text-6xl md:text-7xl leading-[1.05]">
              Turn Stills Into Cinema
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
              Drop a frame. Pick a model. Get a director-grade video prompt ready to paste into Kling, Veo, Runway, Seedance, or any AI video tool.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="min-w-[180px]">
                Try It Free
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate("/gallery")}
                className="min-w-[180px]"
              >
                See Examples
              </Button>
            </div>
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
        <section className="container max-w-[1200px] mx-auto px-4 py-20">
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
                <div className="flex justify-center">
                  <ArrowDown className="w-5 h-5 text-primary" />
                </div>
                <pre className="rounded-lg border border-border bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap">
{p.snippet.join("\n")}{"\n…"}
                </pre>
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
        <section className="container max-w-[1200px] mx-auto px-4 py-20">
          <div className="grid sm:grid-cols-3 gap-6">
            {WORKFLOWS.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card/40 p-6 flex flex-col gap-4 hover:border-border/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
                <div className="aspect-video w-full rounded-md overflow-hidden border border-border bg-muted">
                  <img
                    src={[exampleDesert, examplePortrait, exampleTokyo][i]}
                    alt=""
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SCENE ELEMENTS BLOCK */}
        <section className="container max-w-[1200px] mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="rounded-xl border border-border bg-card/60 p-5 order-2 md:order-1">
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
        <section className="container max-w-[1200px] mx-auto px-4 py-20">
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

        {/* FOOTER CTA */}
        <section className="container max-w-[1000px] mx-auto px-4 py-24 text-center">
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
        <div className="container max-w-[1200px] mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoMark} alt="" className="w-5 h-5" />
            <span className="font-display font-semibold">
              <span className="text-primary">Mov</span>Prompt
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/learn" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a
              href="https://twitter.com/movprompt"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://instagram.com/movprompt"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Instagram
            </a>
          </nav>
          <p className="text-xs">© {new Date().getFullYear()} MovPrompt</p>
        </div>
      </footer>
    </div>
  );
}
