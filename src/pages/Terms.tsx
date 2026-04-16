import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container max-w-3xl mx-auto px-4 py-6 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("terms.back")}</span>
          </Button>
          <LanguageToggle />
        </div>

        <article className="prose prose-invert prose-sm max-w-none space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            {t("terms.title")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {t("terms.lastUpdated")}: April 16, 2026
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.acceptance.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.acceptance.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.service.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.service.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.images.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.images.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.ip.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.ip.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.privacy.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.privacy.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.disclaimer.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.disclaimer.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.changes.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.changes.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.contact.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("terms.contact.body")}</p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default Terms;
