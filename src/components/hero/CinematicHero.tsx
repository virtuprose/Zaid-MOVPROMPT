import { useEffect } from "react";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroTopNav } from "./HeroTopNav";
import { RotatingWordColumn } from "./RotatingWordColumn";
import { TrustLogos } from "./TrustLogos";

const VIDEO_URL =
  "/__l5e/assets-v1/c9872701-904c-47f7-a371-e98a3a8f6f66/loop-portrait.mp4";

const HEADLINE_LINES = [
  ["The", "director's", "platform", "to"],
  ["shoot", "your", "best", "work"],
];

export const CinematicHero = () => {
  return (
    <section className="relative w-full h-screen min-h-[780px] overflow-hidden bg-[#1a0a08]">
      {/* Background video */}
      <video
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105 hero-kenburns"
      />

      {/* Warm color-grade overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3a1a18]/40 via-[#6b2820]/25 to-[#1a0808]/70" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#c44a2e]/20 via-transparent to-[#2a0e0c]/40" />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Grain */}
      <div className="absolute inset-0 bg-grain opacity-[0.08] mix-blend-overlay pointer-events-none" />

      <HeroTopNav />

      <div className="relative z-20 h-full container max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-12 items-center pt-20">
        {/* Left: headline + CTAs */}
        <div className="col-span-12 lg:col-span-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 bg-black/35 backdrop-blur-md border border-white/15 rounded-full pl-4 pr-2 py-2 mb-8"
          >
            <span className="text-sm text-white font-medium">
              Ranked #1 AI video director
            </span>
            <Link
              to="/learn"
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white bg-white/10 rounded-full px-3 py-1 transition"
            >
              Read the docs
              <ArrowRight className="w-3 h-3 text-[hsl(var(--magnific-accent))]" />
            </Link>
          </motion.div>

          <h1 className="font-magnific text-white font-bold leading-[0.95] tracking-[-0.02em]">
            {HEADLINE_LINES.map((line, li) => (
              <span key={li} className="block text-[clamp(48px,7.5vw,108px)]">
                {line.map((w, wi) => (
                  <motion.span
                    key={`${li}-${wi}`}
                    initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 + (li * line.length + wi) * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block mr-[0.25em]"
                  >
                    {w}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-7 text-white/85 text-base md:text-lg max-w-xl leading-relaxed"
          >
            Every AI video model. Intelligent storyboards. Frame-perfect prompts.
            On-brand cinematography at any scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-9 flex items-center gap-3"
          >
            <Link
              to="/director"
              className="bg-white text-black font-medium px-6 py-3.5 rounded-xl hover:scale-[1.02] hover:shadow-2xl transition-all"
            >
              Start creating
            </Link>
            <button
              className="flex items-center gap-2 bg-black/40 backdrop-blur-md text-white border border-white/15 font-medium px-6 py-3.5 rounded-xl hover:bg-black/55 transition-all"
            >
              <Play className="w-4 h-4 fill-white" strokeWidth={0} />
              Why VidoPrompt?
            </button>
          </motion.div>
        </div>

        {/* Right: rotating word column */}
        <div className="hidden lg:flex col-span-4 justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-full max-w-md"
          >
            <RotatingWordColumn />
          </motion.div>
        </div>
      </div>

      <TrustLogos />
    </section>
  );
};
