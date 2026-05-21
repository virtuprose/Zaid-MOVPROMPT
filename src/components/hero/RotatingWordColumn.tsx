import { useEffect, useState } from "react";
import { Play } from "lucide-react";

const WORDS = [
  "Scale campaigns",
  "Generate prompts",
  "Shoot cinematic shots",
  "Build storyboards",
  "Stitch scenes",
  "Lock characters",
  "Direct shots",
  "Cast subjects",
  "Stay on brand",
];

const ITEM_HEIGHT = 72; // px per word
const INTERVAL = 1800;

export const RotatingWordColumn = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % WORDS.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative h-[504px] overflow-hidden select-none pointer-events-none"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
      }}
    >
      {/* Pink play marker pinned at vertical center */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center">
        <Play
          className="w-4 h-4 fill-[hsl(var(--magnific-accent))] text-[hsl(var(--magnific-accent))]"
          strokeWidth={0}
        />
      </div>

      <div
        className="absolute left-8 right-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{
          top: "50%",
          transform: `translateY(calc(-50% - ${active * ITEM_HEIGHT}px + ${ITEM_HEIGHT / 2}px))`,
        }}
      >
        {WORDS.map((w, i) => {
          const isActive = i === active;
          return (
            <div
              key={w}
              className="flex items-center"
              style={{ height: ITEM_HEIGHT }}
            >
              <span
                className={`font-magnific text-[44px] leading-none tracking-tight transition-all duration-500 ${
                  isActive
                    ? "text-white opacity-100"
                    : "text-white/25 opacity-60"
                }`}
                style={{
                  transform: isActive ? "translateX(0)" : "translateX(-4px)",
                }}
              >
                {w}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
