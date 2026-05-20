import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import {
  Camera,
  ArrowLeftRight,
  LayoutGrid,
  Menu,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";

/* ============================================================
   MovPrompt — Cinematic 3D Parallax Landing
   Dark theme · Space Grotesk display · Signal Amber accent
   ============================================================ */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  
];

const MODELS = ["Kling", "Veo", "Seedance", "Pika", "Luma", "Hailuo", "Wan"];

const FEATURES = [
  {
    icon: Camera,
    title: "Single Frame",
    body:
      "One image. One cinematic shot. Upload a still and get a complete video prompt with camera direction, motion cues, and negative prompts.",
  },
  {
    icon: ArrowLeftRight,
    title: "Start + End",
    body:
      "Two frames. A seamless transition. Define your opening and closing shots — MovPrompt writes the motion between them.",
  },
  {
    icon: LayoutGrid,
    title: "Multi-Shot",
    body:
      "One image. A full storyboard. Generate an entire sequence of shots from a single frame — ready for batch generation.",
  },
];

const TESTIMONIALS = [
  {
    quote: "MovPrompt cut my prep time in half. I drop a still and ship a Kling shot in minutes.",
    name: "Lina Ortega",
    handle: "@linafilms",
  },
  {
    quote: "It actually understands cinematography. The negative prompt alone is worth it.",
    name: "Daichi Mori",
    handle: "@dmori.cinema",
  },
  {
    quote: "Storyboards in one click. My whole team uses it now for AI ad concepts.",
    name: "Aria Patel",
    handle: "@ariadirects",
  },
];

/* ---------------- Wordmark ---------------- */

function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight text-foreground select-none",
        className,
      )}
    >
      <span className="text-accent">Mov</span>Prompt
    </span>
  );
}

/* ---------------- Count-up hook ---------------- */

function useCountUp(target: number, durationMs = 2000, start = false) {
  const [value, setValue] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start, reduce]);
  return value;
}

/* ---------------- Section primitives ---------------- */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
      {children}
    </span>
  );
}

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   Navbar
   ============================================================ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 backdrop-blur-xl transition-all duration-300",
        scrolled
          ? "bg-card/80 border-b border-border"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#top" className="flex items-center">
          <Wordmark className="text-xl" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/auth"
            className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-foreground shadow-[0_0_0_rgba(240,168,42,0)] transition-all hover:shadow-[0_0_24px_hsl(var(--accent)/0.35)]"
          >
            Try It Free
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      <motion.div
        initial={false}
        animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
      >
        <div className="flex flex-col gap-4 px-6 py-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-foreground"
          >
            Try It Free
          </Link>
        </div>
      </motion.div>
    </header>
  );
}

/* ============================================================
   Hero with mouse parallax + layered depth
   ============================================================ */

function Hero({ scrollY }: { scrollY: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Mouse-driven motion values
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 80, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mx.set((e.clientX / w - 0.5) * 2); // -1..1
      my.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  // Scroll parallax for each depth layer
  const layer1Y = useTransform(scrollY, [0, 800], [0, -240]);
  const layer2Y = useTransform(scrollY, [0, 800], [0, -160]);

  // Mouse parallax (in px) — different ranges per layer
  const orbX = useTransform(sx, [-1, 1], [-12, 12]);
  const gridX = useTransform(sx, [-1, 1], [-6, 6]);
  const gridY = useTransform(sy, [-1, 1], [-6, 6]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24"
    >
      {/* Layer 0: ambient background video */}
      {!reduce && (
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src="/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      )}
      {/* Dimming overlay over the video for legibility */}
      <div
        className="pointer-events-none absolute inset-0 bg-background/70"
        aria-hidden
      />

      {/* Layer 1: base amber wash anchoring the light source (top-right) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 88% -10%, hsl(var(--accent) / 0.18), transparent 60%)",
        }}
      />

      {/* Layer 2: volumetric god-rays shafts from top-right */}
      <motion.div
        style={{ y: reduce ? 0 : layer1Y, x: reduce ? 0 : orbX }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className={`absolute -top-[40%] -right-[20%] h-[180%] w-[140%] origin-top-right ${
            reduce ? "" : "animate-god-rays-drift"
          }`}
          style={{
            transform: "rotate(22deg)",
            mixBlendMode: "screen",
            backgroundImage: [
              "linear-gradient(90deg, transparent 0%, transparent 8%, hsl(var(--accent) / 0.10) 9%, hsl(var(--accent) / 0.10) 11%, transparent 12%)",
              "linear-gradient(90deg, transparent 0%, transparent 18%, hsl(var(--accent) / 0.06) 19%, hsl(var(--accent) / 0.06) 23%, transparent 24%)",
              "linear-gradient(90deg, transparent 0%, transparent 30%, hsl(var(--accent) / 0.09) 31%, hsl(var(--accent) / 0.09) 33%, transparent 34%)",
              "linear-gradient(90deg, transparent 0%, transparent 42%, hsl(var(--accent) / 0.05) 43%, hsl(var(--accent) / 0.05) 47%, transparent 48%)",
              "linear-gradient(90deg, transparent 0%, transparent 56%, hsl(var(--accent) / 0.08) 57%, hsl(var(--accent) / 0.08) 59%, transparent 60%)",
              "linear-gradient(90deg, transparent 0%, transparent 68%, hsl(var(--accent) / 0.04) 69%, hsl(var(--accent) / 0.04) 72%, transparent 73%)",
              "linear-gradient(90deg, transparent 0%, transparent 80%, hsl(var(--accent) / 0.07) 81%, hsl(var(--accent) / 0.07) 83%, transparent 84%)",
            ].join(","),
            filter: "blur(24px)",
          }}
        />
      </motion.div>

      {/* Layer 3: perspective grid */}
      <motion.div
        style={{ y: reduce ? 0 : layer2Y, x: reduce ? 0 : gridX, translateY: reduce ? 0 : gridY }}
        className="pointer-events-none absolute inset-0 [perspective:800px]"
        aria-hidden
      >
        <div
          className="absolute inset-x-[-20%] bottom-[-10%] h-[80%] opacity-[0.05] [transform:rotateX(60deg)]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </motion.div>

      {/* Layer 4: atmospheric haze + dust grain */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 110%, hsl(var(--background)) 0%, transparent 70%)",
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04] mix-blend-overlay"
        aria-hidden
      >
        <filter id="hero-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>

      {/* Layer 5: vignette darkening bottom-left for headline contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 15% 95%, hsl(var(--background) / 0.85), transparent 60%)",
        }}
      />


      {/* Layer 4: content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <FadeUp>
          <SectionEyebrow>AI Director</SectionEyebrow>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h1 className="mt-6 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground md:text-[56px]">
            Turn Stills Into Cinema
          </h1>
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            Drop a frame. Pick a model. Get a director-grade video prompt ready to paste into
            Kling, Veo, Seedance, or any AI video tool.
          </p>
        </FadeUp>
        <FadeUp delay={0.3}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-[15px] font-semibold text-accent-foreground transition-all hover:shadow-[0_0_28px_hsl(var(--accent)/0.4)]"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-transparent px-8 text-[15px] font-semibold text-foreground transition-all hover:bg-card"
            >
              See Examples
            </a>
          </div>
        </FadeUp>
        <FadeUp delay={0.4}>
          <p className="mt-5 text-[13px] text-muted-foreground">No credit card required</p>
        </FadeUp>
      </div>
    </section>
  );
}

/* ============================================================
   Stats Bar
   ============================================================ */

function StatItem({
  value,
  suffix,
  label,
  inView,
}: {
  value: number;
  suffix?: string;
  label: string;
  inView: boolean;
}) {
  const n = useCountUp(value, 2000, inView);
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-4 text-center">
      <div
        className="font-display text-[36px] font-bold tracking-tight text-foreground md:text-[40px]"
        style={{ textShadow: "0 0 40px hsl(var(--accent) / 0.15)" }}
      >
        {n.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <section className="relative px-6 py-16 md:py-24">
      <FadeUp className="mx-auto max-w-4xl">
        <div
          ref={ref}
          className="rounded-2xl border border-border bg-card p-2 md:p-4"
        >
          <div className="flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
            <StatItem value={2400} suffix="+" label="Creators" inView={inView} />
            <StatItem value={47000} suffix="+" label="Prompts Generated" inView={inView} />
            <StatItem value={8} label="AI Video Models" inView={inView} />
          </div>
        </div>
      </FadeUp>
    </section>
  );
}

/* ============================================================
   Features ("How It Works")
   ============================================================ */

function Features() {
  return (
    <section id="features" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <FadeUp className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Workflow</SectionEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            From Frame to Film in Seconds
          </h2>
          <p className="mt-4 text-[16px] text-muted-foreground">
            Three modes. One goal. Cinematic prompts that actually work.
          </p>
        </FadeUp>

        <div id="how" className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-[0_4px_32px_hsl(var(--accent)/0.08)]"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
                  <Icon className="h-6 w-6 text-accent" strokeWidth={2} />
                </div>
                <h3 className="font-display text-[20px] font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Scene Control (split layout with 3D mock)
   ============================================================ */

function SceneControl({ scrollY }: { scrollY: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const tilt = useTransform(scrollYProgress, [0, 1], [-3, 6]);
  const leftY = useTransform(scrollY, [600, 1800], [40, -40]);
  const rightY = useTransform(scrollY, [600, 1800], [0, -80]);

  const chips = ["Subject", "Background", "Lighting", "Atmosphere"];
  const rows = [
    { label: "Subject", locked: true, fill: 0.7 },
    { label: "Background", locked: false, fill: 0.45 },
    { label: "Lighting", locked: true, fill: 0.85 },
    { label: "Atmosphere", locked: false, fill: 0.3 },
  ];

  return (
    <section ref={ref} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
        {/* Left */}
        <motion.div style={{ y: reduce ? 0 : leftY }}>
          <SectionEyebrow>Full Control</SectionEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            Direct Every Element
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
            MovPrompt breaks your scene into subject, background, lighting, and atmosphere. Lock
            what stays. Move what animates. Full directorial control.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {c}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right — mock card */}
        <motion.div
          style={{ y: reduce ? 0 : rightY, rotateX: reduce ? 0 : tilt }}
          className="relative [perspective:1200px]"
        >
          <div
            className="relative rounded-2xl border border-border bg-card p-6 shadow-[0_0_60px_hsl(var(--accent)/0.06)]"
            style={{ transform: reduce ? undefined : "rotateY(-5deg) rotateX(3deg)" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Scene Breakdown
              </span>
              <span className="text-[11px] text-muted-foreground">v1</span>
            </div>
            <div className="space-y-4">
              {rows.map((r) => {
                const LockIcon = r.locked ? Lock : Unlock;
                return (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-24 text-[13px] font-medium text-foreground">{r.label}</span>
                    <LockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${r.fill * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Models
   ============================================================ */

function Models() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <FadeUp>
          <SectionEyebrow>Compatibility</SectionEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            Works With Every Major AI Video Model
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] text-muted-foreground">
            Every prompt comes with a recommended model, a negative prompt, and camera direction.
            One click to copy. Ready to paste.
          </p>
        </FadeUp>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {MODELS.map((m, i) => (
            <motion.span
              key={m}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground transition-all hover:border-accent/20 hover:shadow-[0_0_18px_hsl(var(--accent)/0.12)]"
            >
              {m}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Testimonials
   ============================================================ */

function Testimonials() {
  return (
    <section id="testimonials" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <FadeUp className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Creators</SectionEyebrow>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-foreground md:text-[40px]">
            Trusted by Filmmakers and AI Creators
          </h2>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => {
            // middle card slightly ahead
            const delay = i === 1 ? 0 : 0.15;
            const offset = i === 1 ? 40 : 70;
            return (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: offset }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl border border-border bg-card p-8"
              >
                <div
                  aria-hidden
                  className="absolute left-6 top-3 font-display text-[64px] leading-none text-accent/30"
                >
                  “
                </div>
                <blockquote className="relative mt-6 text-[16px] italic leading-relaxed text-foreground">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6">
                  <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                  <div className="text-[13px] text-muted-foreground">{t.handle}</div>
                </figcaption>
              </motion.figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA
   ============================================================ */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--accent) / 0.08) 0%, hsl(var(--background)) 70%)",
        }}
      />
      <FadeUp className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground md:text-[56px]">
          Stop Writing Prompts. Start Directing.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] text-muted-foreground">
          Join 2,400+ creators using MovPrompt to generate cinematic AI video prompts.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            to="/auth"
            className="relative inline-flex h-14 items-center justify-center rounded-full bg-accent px-10 text-[16px] font-semibold text-accent-foreground"
            style={{ animation: "cta-pulse 3s ease-in-out infinite" }}
          >
            Get Started Free
          </Link>
          <p className="text-[13px] text-muted-foreground">No credit card required</p>
        </div>
      </FadeUp>

      <style>{`
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 0 24px hsl(var(--accent) / 0.15); }
          50% { box-shadow: 0 0 48px hsl(var(--accent) / 0.4); }
        }
      `}</style>
    </section>
  );
}

/* ============================================================
   Footer
   ============================================================ */

function Footer() {
  return (
    <footer className="border-t border-border bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <Wordmark className="text-lg" />
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {["Privacy", "Terms", "About", "Examples"].map((l) => (
            <a
              key={l}
              href="#"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l}
            </a>
          ))}
        </nav>
        <a
          href="mailto:hello@movprompt.com"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          hello@movprompt.com
        </a>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-border pt-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
          © 2026 MovPrompt. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function Landing() {
  const { scrollY } = useScroll();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Seo
        title="MovPrompt — AI Director for Generative Video"
        description="Drop a frame. Pick a model. Get director-grade AI video prompts for Kling, Veo, Runway, Seedance and more."
      />

      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <Navbar />

      <main className="relative z-10">
        <Hero scrollY={scrollY} />
        <Features />
        <SceneControl scrollY={scrollY} />
        <Models />
        
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
