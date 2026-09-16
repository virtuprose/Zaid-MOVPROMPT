import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Film, Grid2X2, Play, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/config/features";
import { portableCreatorApi } from "@/lib/api/portableApiClient";
import { CREATOR_TEMPLATES } from "./templates";
import type { CreatorTemplate } from "./types";
import { creatorTemplateFromCatalog } from "./templateCatalogMapper";
import { templateGoalLabel } from "./templateMedia";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";
import { useLanguage } from "@/i18n/LanguageContext";

type VisibleTemplateGroups = {
  selectedDirection: CreatorTemplate | null;
  readyPreviews: CreatorTemplate[];
  campaignDirections: CreatorTemplate[];
};

function groupVisibleTemplates(
  templates: CreatorTemplate[],
  selectedId?: string | null,
): VisibleTemplateGroups {
  const selectedDirection = templates.find((template) => template.id === selectedId && !template.previewVideo) ?? null;
  return {
    selectedDirection,
    readyPreviews: templates.filter((template) => template.previewVideo),
    campaignDirections: templates.filter((template) => !template.previewVideo && template.id !== selectedDirection?.id),
  };
}

export function TemplateGrid({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (templateId: string) => void;
}) {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const [templates, setTemplates] = useState<CreatorTemplate[]>(CREATOR_TEMPLATES);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "fallback">(
    isFeatureEnabled("portableAuth") ? "loading" : "fallback",
  );
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState<"all" | "salon" | "clinic" | "retail" | "ecommerce">("all");
  const [visibleCount, setVisibleCount] = useState(12);
  const [previewTemplate, setPreviewTemplate] = useState<CreatorTemplate | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTemplates = templates.filter((template) => {
    const matchesVertical = vertical === "all" || template.verticals.includes(vertical);
    const haystack = [template.name, template.nameAr, template.eyebrow, template.description, template.descriptionAr, template.bestFor, ...template.tags]
      .join(" ")
      .toLocaleLowerCase();
    return matchesVertical && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
  const selectedTemplate = selectedId
    ? filteredTemplates.find((template) => template.id === selectedId) ?? null
    : null;
  const remainingTemplates = selectedTemplate
    ? filteredTemplates.filter((template) => template.id !== selectedTemplate.id)
    : filteredTemplates;
  const readyPreviews = remainingTemplates.filter((template) => template.previewVideo);
  const campaignDirections = remainingTemplates.filter((template) => !template.previewVideo);
  const orderedTemplates = selectedTemplate
    ? [selectedTemplate, ...readyPreviews, ...campaignDirections]
    : [...readyPreviews, ...campaignDirections];
  const minimumGroupedLimit = (selectedTemplate ? 1 : 0)
    + readyPreviews.length
    + (campaignDirections.length ? 1 : 0);
  const visibleLimit = Math.max(
    visibleCount + (selectedTemplate && !selectedTemplate.previewVideo ? 1 : 0),
    minimumGroupedLimit,
  );
  const visibleTemplates = orderedTemplates.slice(0, visibleLimit);
  const visibleGroups = groupVisibleTemplates(visibleTemplates, selectedId);
  const selectionEnabled = catalogState !== "fallback" || !isFeatureEnabled("portableAuth");

  const loadPublishedCatalog = useCallback(() => {
    if (!isFeatureEnabled("portableAuth")) return;
    setCatalogState("loading");
    let active = true;
    void portableCreatorApi.listTemplates().then((published) => {
      if (!active || !published.length) {
        if (active) setCatalogState("fallback");
        return;
      }
      const merged = published.map(creatorTemplateFromCatalog);
      setTemplates(merged);
      setCatalogState("ready");
    }).catch(() => {
      if (active) setCatalogState("fallback");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => loadPublishedCatalog(), [loadPublishedCatalog]);

  useEffect(() => {
    if (selectedId && !templates.some((template) => template.id === selectedId)) {
      void portableCreatorApi.getTemplate(selectedId).then((published) => {
        setTemplates((current) => [creatorTemplateFromCatalog(published), ...current]);
      }).catch(() => undefined);
    }
  }, [selectedId, templates]);

  return (
    <>
      {catalogState === "loading" && <p className="creator-catalog-status" role="status">{ar ? "جاري تحميل القوالب المنشورة…" : "Loading published templates…"}</p>}
      {catalogState === "fallback" && isFeatureEnabled("portableAuth") && (
        <div className="creator-catalog-status" role="status">
          <span>{ar ? "معاينات القوالب المحلية متاحة للعرض فقط إلى أن يرجع كتالوج القوالب المنشورة." : "Local template previews are available to view only while the published catalog reconnects."}</span>
          <button type="button" className="creator-review-edit" onClick={loadPublishedCatalog}>{ar ? "أعد المحاولة" : "Retry catalog"}</button>
        </div>
      )}
      <div className="creator-template-discovery">
        <div className="creator-template-discovery-main">
          <label className="creator-template-search">
            <span className="sr-only">{ar ? "ابحث في قوالب الفيديو" : "Search video templates"}</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }}
              placeholder={ar ? "ابحث عن هدف أو فئة أو نوع فيديو" : "Search an outcome, category or format"}
            />
          </label>
          <p className="creator-template-count" aria-live="polite">
            {ar
              ? `نعرض ${visibleTemplates.length} من ${filteredTemplates.length} قالب`
              : `Showing ${visibleTemplates.length} of ${filteredTemplates.length}`}
          </p>
        </div>
        <div className="creator-template-filters" role="group" aria-label={ar ? "تصفية القوالب حسب نوع النشاط" : "Filter templates by business type"}>
          {([
            ["all", ar ? "الكل" : "All"],
            ["retail", ar ? "المحلات" : "Shops"],
            ["ecommerce", ar ? "المتاجر الإلكترونية" : "Ecommerce"],
            ["salon", ar ? "الصالونات" : "Salons"],
            ["clinic", ar ? "العيادات" : "Clinics"],
          ] as const).filter(([value]) => value === "all" || templates.some((template) => template.verticals.includes(value))).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn("creator-template-filter", vertical === value && "is-active")}
              aria-pressed={vertical === value}
              onClick={() => { setVertical(value); setVisibleCount(12); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="creator-template-groups" aria-busy={catalogState === "loading"} aria-live="polite">
        {visibleGroups.selectedDirection && (
          <TemplateGroup
            id="selected-direction"
            title={ar ? "الاتجاه المحدد" : "Selected direction"}
            description={ar ? "اختيارك الحالي محفوظ في الأعلى بينما تستكشف الخيارات الجاهزة." : "Your current choice stays first while you compare ready options."}
            icon="direction"
            templates={[visibleGroups.selectedDirection]}
            selectedId={selectedId}
            onSelect={onSelect}
            onPreview={setPreviewTemplate}
            locale={locale}
            selectionEnabled={selectionEnabled}
          />
        )}
        <TemplateGroup
          id="ready-previews"
          title={ar ? "معاينات جاهزة" : "Ready previews"}
          description={ar ? "معاينات حركة حقيقية تم التحقق منها ويمكن تشغيلها قبل الاختيار." : "Verified motion previews you can play before choosing."}
          icon="preview"
          templates={visibleGroups.readyPreviews}
          selectedId={selectedId}
          onSelect={onSelect}
          onPreview={setPreviewTemplate}
          locale={locale}
          selectionEnabled={selectionEnabled}
        />
        <TemplateGroup
          id="campaign-directions"
          title={ar ? "اتجاهات حملات إضافية" : "More campaign directions"}
          description={ar ? "فيديوهات المعاينة غير متوفرة بعد. تقدر تختار قالب وتجهز حملتك." : "Preview videos are not available yet. You can still choose a template and prepare your campaign."}
          icon="direction"
          templates={visibleGroups.campaignDirections}
          selectedId={selectedId}
          onSelect={onSelect}
          onPreview={setPreviewTemplate}
          locale={locale}
          selectionEnabled={selectionEnabled}
        />
      </div>
      {selectionEnabled && selectedId && filteredTemplates.some((template) => template.id === selectedId) && (
        <div className="creator-template-continue">
          <button type="button" className="creator-button creator-button-primary" onClick={() => onSelect(selectedId)}>
            {ar ? "المتابعة بالقالب المحدد" : "Continue with selected template"}
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      )}
      {visibleTemplates.length < filteredTemplates.length && (
        <div className="creator-template-more">
          <button type="button" className="creator-button creator-button-secondary" onClick={() => setVisibleCount((count) => count + 12)}>
            {ar ? `عرض المزيد (${filteredTemplates.length - visibleTemplates.length})` : `Show more (${filteredTemplates.length - visibleTemplates.length})`}
          </button>
        </div>
      )}
      {!filteredTemplates.length && (
        <div className="creator-template-empty" role="status">
          <strong>{ar ? "ما لقينا قالب مطابق" : "No matching templates"}</strong>
          <span>{ar ? "جرّب بحث أوسع أو اختر نوع نشاط ثاني." : "Try a broader search or choose another business type."}</span>
          <button type="button" className="creator-button creator-button-secondary" onClick={() => { setQuery(""); setVertical("all"); setVisibleCount(12); }}>
            {ar ? "مسح التصفية" : "Clear filters"}
          </button>
        </div>
      )}
      <TemplatePreviewDialog template={previewTemplate} locale={locale} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }} />
    </>
  );
}

function TemplateGroup({
  id,
  title,
  description,
  icon,
  templates,
  selectedId,
  onSelect,
  onPreview,
  locale,
  selectionEnabled,
}: {
  id: string;
  title: string;
  description: string;
  icon: "preview" | "direction";
  templates: CreatorTemplate[];
  selectedId?: string | null;
  onSelect: (templateId: string) => void;
  onPreview: (template: CreatorTemplate) => void;
  locale: "en" | "ar";
  selectionEnabled: boolean;
}) {
  if (!templates.length) return null;
  const headingId = `creator-template-group-${id}`;
  return (
    <section className="creator-template-group" aria-labelledby={headingId}>
      <div className="creator-template-group-heading">
        <span className="creator-template-group-icon" aria-hidden="true">
          {icon === "preview" ? <Film /> : <Grid2X2 />}
        </span>
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="creator-template-group-count">
          {locale === "ar" ? `${templates.length} قالب` : `${templates.length} ${templates.length === 1 ? "template" : "templates"}`}
        </span>
      </div>
      <div className="creator-template-grid">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            onSelect={onSelect}
            onPreview={onPreview}
            locale={locale}
            selectionEnabled={selectionEnabled}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ template, selected, onSelect, onPreview, locale, selectionEnabled }: { template: CreatorTemplate; selected: boolean; onSelect: (templateId: string) => void; onPreview: (template: CreatorTemplate) => void; locale: "en" | "ar"; selectionEnabled: boolean; }) {
  const ar = locale === "ar";
  const goal = template.goals[0] ?? "launch";
  return (
      <article className={cn("creator-template-card", selected && "is-selected")}>
        <button
          type="button"
          className="creator-template-select"
          onClick={() => onSelect(template.id)}
          disabled={!selectionEnabled}
          aria-pressed={selected}
          aria-label={selectionEnabled ? (ar ? `اختر قالب ${template.nameAr}` : `Choose ${template.name} template`) : (ar ? `معاينة قالب ${template.nameAr} فقط` : `${template.name} template preview only`)}
        >
          <div className="creator-template-media" data-media-tone={template.mediaTone}>
            {template.poster ? <img src={template.poster} alt="" loading="lazy" style={{ objectPosition: template.posterPosition }} /> : <span className="creator-template-placeholder" aria-hidden="true" />}
            <span className="creator-template-direction" aria-hidden="true"><b>{template.mediaCode}</b><span>{templateGoalLabel(goal, locale)}</span></span>
            <span className="creator-template-media-kind" aria-hidden="true">{template.previewVideo ? (ar ? "معاينة حركة" : "Motion preview") : (ar ? "اتجاه القالب" : "Template direction")}</span>
            {template.previewVideo ? <span className="creator-template-duration">{template.duration}s</span> : null}
          </div>
          <div className="creator-template-copy">
            <span className="creator-template-eyebrow">{template.eyebrow}</span>
            <h3>{locale === "ar" ? template.nameAr : template.name}</h3>
            <p>{locale === "ar" ? template.descriptionAr : template.description}</p>
            <div className="creator-template-meta">
              <span><strong>{ar ? `${template.scenes.length} مشاهد` : `${template.scenes.length} scenes`}</strong> · {ar ? "كويتي + إنجليزي" : "Kuwaiti Arabic + English"}</span>
              <span className="creator-template-state">
                {selected
                  ? (ar ? "محدد" : "Selected")
                  : selectionEnabled
                    ? (ar ? "اختر" : "Choose")
                    : (ar ? "للمعاينة" : "Preview only")}
                {selected ? <Check aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
              </span>
            </div>
          </div>
        </button>
        {template.previewVideo ? (
          <button
            className="creator-template-preview-link"
            type="button"
            onClick={() => onPreview(template)}
            aria-label={ar ? `شغّل معاينة قالب ${template.nameAr}` : `Play ${template.name} preview`}
          >
            <Play aria-hidden="true" />
            <span>{ar ? "شغّل المعاينة" : "Play preview"}</span>
          </button>
        ) : (
          <Link
            className="creator-template-preview-link"
            to={`/templates/${encodeURIComponent(template.id)}`}
            aria-label={ar ? `شاهد تفاصيل قالب ${template.nameAr}` : `View ${template.name} details`}
          >
            <ArrowUpRight aria-hidden="true" />
            <span>{ar ? "شاهد الاتجاه" : "View direction"}</span>
          </Link>
        )}
      </article>
  );
}
