import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CreatorShell } from "@/features/create/CreatorShell";
import { TemplateGrid } from "@/features/create/TemplateGrid";
import { creatorTemplateFromCatalog } from "@/features/create/templateCatalogMapper";
import { getCreatorTemplate } from "@/features/create/templates";
import type { CreatorTemplate } from "@/features/create/types";
import { isFeatureEnabled } from "@/config/features";
import { portableCreatorApi } from "@/lib/api/portableApiClient";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function CreatorTemplates({ qaMode = false }: { qaMode?: boolean }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [template, setTemplate] = useState<CreatorTemplate>(() => getCreatorTemplate(slug));
  const [detailState, setDetailState] = useState<"loading" | "ready" | "missing">(
    slug && isFeatureEnabled("portableAuth") ? "loading" : "ready",
  );
  useEffect(() => {
    if (!slug || !isFeatureEnabled("portableAuth")) {
      setTemplate(getCreatorTemplate(slug));
      setDetailState("ready");
      return;
    }
    let active = true;
    void portableCreatorApi.getTemplate(slug).then((published) => {
      if (!active) return;
      setTemplate(creatorTemplateFromCatalog(published));
      setDetailState("ready");
    }).catch(() => {
      if (active) setDetailState("missing");
    });
    return () => { active = false; };
  }, [slug]);
  if (slug) {
    if (detailState === "loading") {
      return <CreatorShell qaMode={qaMode}><div className="creator-page"><p className="creator-catalog-status" role="status">Loading the published template…</p></div></CreatorShell>;
    }
    if (detailState === "missing") {
      return <CreatorShell qaMode={qaMode}><div className="creator-page creator-empty"><div><h1>Template unavailable</h1><p>This template is not currently published. Choose another campaign format.</p><Link className="creator-button creator-button-primary" to="/templates">Browse templates</Link></div></div></CreatorShell>;
    }
    return (
      <CreatorShell qaMode={qaMode}>
        <Seo title={`${template.name} template · MovPrompt`} description={template.description} path={`/templates/${template.id}`} />
        <div className="creator-page creator-template-detail">
          <Link className="creator-button creator-button-quiet" to="/templates"><ArrowLeft aria-hidden="true" /> All templates</Link>
          <div className="creator-template-detail-grid">
            <div className="creator-template-detail-media"><video src={template.previewVideo} poster={template.poster} controls playsInline preload="metadata" /></div>
            <section><p className="creator-kicker">{template.eyebrow} · {template.duration} seconds</p><h1 className="creator-title creator-title-sm">{template.name}</h1><p className="creator-subtitle">{template.description}</p><div className="creator-summary-list"><div className="creator-summary-row"><span>Best for</span><strong>{template.bestFor}</strong></div><div className="creator-summary-row"><span>Languages</span><strong>Arabic, English, bilingual</strong></div><div className="creator-summary-row"><span>Formats</span><strong>{template.aspectRatios.join(" · ")}</strong></div><div className="creator-summary-row"><span>Structure</span><strong>{template.scenes.length} guided scenes</strong></div></div><Link className="creator-button creator-button-primary" to={`/create?template=${template.id}`}><Sparkles aria-hidden="true" /> Use this template</Link></section>
          </div>
        </div>
      </CreatorShell>
    );
  }
  return (
    <CreatorShell qaMode={qaMode}>
      <Seo title="Video templates · MovPrompt" description="Choose a guided product-video template for your next campaign." path="/templates" />
      <div className="creator-page">
        <header className="creator-page-head">
          <div>
            <p className="creator-kicker">Curated campaign formats</p>
            <h1 className="creator-title creator-title-sm">Choose by outcome, not editing skill.</h1>
            <p className="creator-subtitle">Every template controls composition, pacing and safe zones while keeping the product, message and brand editable.</p>
          </div>
        </header>
        <TemplateGrid onSelect={(templateId) => navigate(`${qaMode ? "/qa/create" : "/create"}?template=${templateId}`)} />
      </div>
    </CreatorShell>
  );
}
