import { Link, useNavigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CreatorShell } from "@/features/create/CreatorShell";
import { TemplateGrid } from "@/features/create/TemplateGrid";
import { getCreatorTemplate } from "@/features/create/templates";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function CreatorTemplates({ qaMode = false }: { qaMode?: boolean }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  if (slug) {
    const template = getCreatorTemplate(slug);
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
