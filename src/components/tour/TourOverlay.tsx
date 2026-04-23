import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTour } from "./TourProvider";
import { TOUR_STEPS } from "./tourSteps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 14;

export const TourOverlay = () => {
  const { active, stepIndex, totalSteps, next, prev, stop } = useTour();
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Resolve anchor position
  useLayoutEffect(() => {
    if (!active || !step) return;
    let raf = 0;
    let attempts = 0;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!el) {
        attempts += 1;
        if (attempts > 8) {
          setMissing(true);
          setRect(null);
          return;
        }
        raf = window.requestAnimationFrame(measure);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      // Re-measure after scroll settles
      window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setMissing(false);
      }, 250);
    };

    measure();

    const onResize = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, stepIndex, step]);

  // Keyboard nav
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        isAr ? prev() : next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        isAr ? next() : prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop, isAr]);

  // Focus card on step change
  useEffect(() => {
    if (active && cardRef.current) cardRef.current.focus();
  }, [active, stepIndex]);

  if (!active || !step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  // Compute tooltip position
  let tipTop = vh / 2 - 80;
  let tipLeft = vw / 2 - TOOLTIP_W / 2;

  if (rect) {
    const placement = step.placement ?? "bottom";
    const spotTop = rect.top - PADDING;
    const spotLeft = rect.left - PADDING;
    const spotW = rect.width + PADDING * 2;
    const spotH = rect.height + PADDING * 2;

    if (placement === "bottom") {
      tipTop = spotTop + spotH + TOOLTIP_GAP;
      tipLeft = spotLeft + spotW / 2 - TOOLTIP_W / 2;
    } else if (placement === "top") {
      tipTop = spotTop - TOOLTIP_GAP - 200;
      tipLeft = spotLeft + spotW / 2 - TOOLTIP_W / 2;
    } else if (placement === "right") {
      tipTop = spotTop + spotH / 2 - 80;
      tipLeft = spotLeft + spotW + TOOLTIP_GAP;
    } else if (placement === "left") {
      tipTop = spotTop + spotH / 2 - 80;
      tipLeft = spotLeft - TOOLTIP_W - TOOLTIP_GAP;
    }

    // If tipTop falls offscreen at top, flip below
    if (tipTop < 12) tipTop = spotTop + spotH + TOOLTIP_GAP;
    // If tipTop overflows bottom, flip above
    if (tipTop + 220 > vh - 12) tipTop = Math.max(12, spotTop - TOOLTIP_GAP - 200);
    // Clamp horizontally
    tipLeft = Math.max(12, Math.min(tipLeft, vw - TOOLTIP_W - 12));
  }

  const isLast = stepIndex === totalSteps - 1;

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[2000]"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Spotlight or full dim */}
        {rect ? (
          <motion.div
            key={`spot-${stepIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed",
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              borderRadius: 14,
              boxShadow: "0 0 0 9999px hsl(var(--background) / 0.82)",
              outline: "2px solid hsl(var(--primary))",
              outlineOffset: 2,
              pointerEvents: "none",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => stop(true)} />
        )}

        {/* Tooltip card */}
        <motion.div
          key={`card-${stepIndex}`}
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="tour-step-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: "fixed",
            top: tipTop,
            left: tipLeft,
            width: TOOLTIP_W,
            maxWidth: "calc(100vw - 24px)",
          }}
          className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-primary/20 p-4 outline-none"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t("tour.stepOf" as any).replace("{n}", String(stepIndex + 1)).replace("{total}", String(totalSteps))}
            </span>
            <button
              type="button"
              onClick={() => stop(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("tour.skip" as any)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 id="tour-step-title" className="text-base font-semibold font-display text-foreground mb-1.5">
            {t(step.titleKey as any)}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {missing ? t("tour.anchorMissing" as any) : t(step.bodyKey as any)}
          </p>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => stop(true)} className="text-xs">
              {t("tour.skip" as any)}
            </Button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button variant="outline" size="sm" onClick={prev} className="text-xs gap-1">
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  {t("tour.back" as any)}
                </Button>
              )}
              <Button size="sm" onClick={next} className="text-xs gap-1">
                {isLast ? t("tour.finish" as any) : t("tour.next" as any)}
                {!isLast && <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};
