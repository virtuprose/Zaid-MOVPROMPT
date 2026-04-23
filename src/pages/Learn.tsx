import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, PlayCircle, Sparkles, Lock, Move, AtSign, Image as ImageIcon, Lightbulb, HelpCircle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackPageVisit } from "@/lib/analytics";
import { LearnSection } from "@/components/learn/LearnSection";
import { ExampleCard } from "@/components/learn/ExampleCard";
import { LEARN_TOC } from "@/components/learn/learnContent";
import exampleTokyo from "@/assets/example-tokyo.jpg";
import exampleDesert from "@/assets/example-desert.jpg";
import examplePortrait from "@/assets/example-portrait.jpg";

const Learn = () => {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const [activeId, setActiveId] = useState<string>(LEARN_TOC[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    trackPageVisit("/learn");
  }, []);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    LEARN_TOC.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const proTips = useMemo(
    () => [
      t("learn.tips.t1" as any),
      t("learn.tips.t2" as any),
      t("learn.tips.t3" as any),
      t("learn.tips.t4" as any),
      t("learn.tips.t5" as any),
      t("learn.tips.t6" as any),
      t("learn.tips.t7" as any),
      t("learn.tips.t8" as any),
    ],
    [t],
  );

  const faqs = useMemo(
    () => [
      { q: t("learn.faq.q1" as any), a: t("learn.faq.a1" as any) },
      { q: t("learn.faq.q2" as any), a: t("learn.faq.a2" as any) },
      { q: t("learn.faq.q3" as any), a: t("learn.faq.a3" as any) },
      { q: t("learn.faq.q4" as any), a: t("learn.faq.a4" as any) },
    ],
    [t],
  );

  const startTour = () => {
    // Navigate home and trigger tour via storage flag
    sessionStorage.setItem("movprompt.tour.requestStart", "1");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="text-sm">{t("wp.back" as any)}</span>
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-sm">
              MovPrompt · <span className="text-primary">{t("learn.title" as any)}</span>
            </span>
          </div>
          <LanguageToggle />
        </div>

        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary mb-4">
            <Compass className="w-3 h-3" />
            {t("learn.heroEyebrow" as any)}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-3">
            {t("learn.heroTitle" as any)}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("learn.heroSubtitle" as any)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button onClick={startTour} className="gap-1.5">
              <PlayCircle className="w-4 h-4" />
              {t("learn.takeTour" as any)}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              {t("learn.openApp" as any)}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-12">
          {/* TOC */}
          <aside className="lg:sticky lg:top-6 self-start">
            {/* Mobile select */}
            <div className="lg:hidden mb-4">
              <select
                value={activeId}
                onChange={(e) => scrollTo(e.target.value)}
                className="w-full rounded-md border border-border bg-card text-foreground text-sm px-3 py-2"
                aria-label={t("learn.toc.label" as any)}
              >
                {LEARN_TOC.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelKey as any)}
                  </option>
                ))}
              </select>
            </div>
            {/* Desktop list */}
            <nav className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("learn.toc.label" as any)}
              </p>
              <ul className="space-y-1">
                {LEARN_TOC.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={`block w-full text-start text-sm px-3 py-1.5 rounded-md transition-colors ${
                        activeId === s.id
                          ? "bg-primary/10 text-primary font-medium border-s-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {t(s.labelKey as any)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <LearnSection
              id="getting-started"
              eyebrow={t("learn.toc.gettingStarted" as any)}
              title={t("learn.gs.title" as any)}
            >
              <p>{t("learn.gs.intro" as any)}</p>
              <ol className="space-y-3 list-none p-0">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex gap-3 rounded-lg border border-border/50 bg-card/40 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary text-sm font-semibold">
                      {n}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t(`learn.gs.step${n}.title` as any)}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{t(`learn.gs.step${n}.desc` as any)}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="pt-2">
                <Button size="sm" variant="outline" onClick={startTour} className="gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" />
                  {t("learn.takeTour" as any)}
                </Button>
              </div>
            </LearnSection>

            <LearnSection id="workflows" eyebrow={t("learn.toc.workflows" as any)} title={t("learn.wf.title" as any)}>
              <p>{t("learn.wf.intro" as any)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { img: exampleTokyo, key: "single" },
                  { img: exampleDesert, key: "multishot" },
                  { img: examplePortrait, key: "twoframe" },
                ].map((wf) => (
                  <Card key={wf.key} className="overflow-hidden bg-card/60">
                    <div className="aspect-video">
                      <img src={wf.img} alt={t(`workflow.${wf.key}` as any)} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold text-foreground mb-1">{t(`workflow.${wf.key}` as any)}</div>
                      <div className="text-xs text-muted-foreground">{t(`workflow.${wf.key}.desc` as any)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </LearnSection>

            <LearnSection id="models" eyebrow={t("learn.toc.models" as any)} title={t("learn.models.title" as any)}>
              <p>{t("learn.models.intro" as any)}</p>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-foreground">
                    <tr>
                      <th className="text-start px-3 py-2 font-semibold">{t("learn.models.col.family" as any)}</th>
                      <th className="text-start px-3 py-2 font-semibold">{t("learn.models.col.strength" as any)}</th>
                      <th className="text-start px-3 py-2 font-semibold">{t("learn.models.col.use" as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {(["kling", "veo", "seedance", "any"] as const).map((row) => (
                      <tr key={row} className="border-t border-border/40">
                        <td className="px-3 py-2 font-medium text-foreground">{t(`learn.models.row.${row}.name` as any)}</td>
                        <td className="px-3 py-2">{t(`learn.models.row.${row}.strength` as any)}</td>
                        <td className="px-3 py-2">{t(`learn.models.row.${row}.use` as any)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LearnSection>

            <LearnSection
              id="scene-analysis"
              eyebrow={t("learn.toc.sceneAnalysis" as any)}
              title={t("learn.scene.title" as any)}
            >
              <p>{t("learn.scene.intro" as any)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Move className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t("scene.move" as any)}</div>
                    <div className="text-xs text-muted-foreground">{t("learn.scene.moveDesc" as any)}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                    <Lock className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t("scene.lock" as any)}</div>
                    <div className="text-xs text-muted-foreground">{t("learn.scene.lockDesc" as any)}</div>
                  </div>
                </div>
              </div>
              <p className="text-xs italic">{t("learn.scene.reset" as any)}</p>
            </LearnSection>

            <LearnSection
              id="descriptions"
              eyebrow={t("learn.toc.descriptions" as any)}
              title={t("learn.desc.title" as any)}
            >
              <p>{t("learn.desc.intro" as any)}</p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <AtSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">{t("learn.desc.mentions.title" as any)}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{t("learn.desc.mentions.body" as any)}</div>
                </div>
              </div>
              <ul className="list-disc ps-5 space-y-1.5 marker:text-primary/60">
                <li>{t("learn.desc.tip1" as any)}</li>
                <li>{t("learn.desc.tip2" as any)}</li>
                <li>{t("learn.desc.tip3" as any)}</li>
              </ul>
            </LearnSection>

            <LearnSection
              id="references"
              eyebrow={t("learn.toc.references" as any)}
              title={t("learn.refs.title" as any)}
            >
              <p>{t("learn.refs.intro" as any)}</p>
              <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-start gap-3">
                <ImageIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs sm:text-sm text-muted-foreground">{t("learn.refs.body" as any)}</div>
              </div>
            </LearnSection>

            <LearnSection id="examples" eyebrow={t("learn.toc.examples" as any)} title={t("learn.examples.title" as any)}>
              <p>{t("learn.examples.intro" as any)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ExampleCard
                  image={exampleTokyo}
                  alt="Neon Tokyo alley"
                  model="Kling 3.0"
                  prompt={t("learn.examples.ex1.prompt" as any)}
                />
                <ExampleCard
                  image={exampleDesert}
                  alt="Desert at golden hour"
                  model="Seedance Pro"
                  prompt={t("learn.examples.ex2.prompt" as any)}
                />
                <ExampleCard
                  image={examplePortrait}
                  alt="Rainy window portrait"
                  model="Veo 3.1"
                  prompt={t("learn.examples.ex3.prompt" as any)}
                />
              </div>
            </LearnSection>

            <LearnSection id="pro-tips" eyebrow={t("learn.toc.proTips" as any)} title={t("learn.tips.title" as any)}>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
                {proTips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 rounded-lg border border-border/50 bg-card/40 p-3">
                    <Lightbulb className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground/90">{tip}</span>
                  </li>
                ))}
              </ul>
            </LearnSection>

            <LearnSection id="faq" eyebrow={t("learn.toc.faq" as any)} title={t("learn.faq.title" as any)}>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-start gap-3">
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                        {f.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </LearnSection>

            <div className="mt-12 text-center text-xs text-muted-foreground/60">{t("footer" as any)}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Learn;
