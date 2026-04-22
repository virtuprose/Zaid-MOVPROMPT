import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ResultsSkeletonProps {
  modelLabel?: string;
}

export const ResultsSkeleton = ({ modelLabel }: ResultsSkeletonProps) => {
  const { t } = useLanguage();
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    t("loading.step1" as any),
    t("loading.step2" as any),
    t("loading.step3" as any),
    (t("loading.step4" as any) as string).replace("{model}", modelLabel || "model"),
    t("loading.step5" as any),
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 1500);
    return () => clearInterval(id);
  }, [steps.length]);

  useEffect(() => {
    // Animate progress to 90% over ~8s using ease-out curve
    const start = performance.now();
    const duration = 8000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased * 90);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Top progress bar */}
      <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full transition-[width] duration-200 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: "#00D4FF",
            boxShadow: "0 0 8px rgba(0,212,255,0.7)",
          }}
        />
      </div>

      {/* Cycling status label */}
      <div className="flex items-center justify-center gap-2 min-h-[24px]">
        <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: "#00D4FF" }} />
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ fontSize: 14, color: "#8888AA", fontStyle: "italic" }}
          >
            {steps[stepIdx]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="rounded-lg p-4 bg-primary/5 border border-primary/20 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="rounded-lg p-4 bg-secondary/50 border border-border space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg p-4 bg-secondary/50 border border-border space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="rounded-lg p-4 bg-secondary/50 border border-border space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
