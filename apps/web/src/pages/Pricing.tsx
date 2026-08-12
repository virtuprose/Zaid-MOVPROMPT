import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CreatorShell } from "@/features/create/CreatorShell";

export default function Pricing() {
  return (
    <CreatorShell>
      <Seo title="Pricing · MovPrompt" description="Start with one included template render, then choose credits for the videos you need." path="/pricing" />
      <div className="creator-page creator-pricing-page">
        <header className="creator-page-head creator-pricing-head">
          <div><p className="creator-kicker">Simple, usage-based pricing</p><h1 className="creator-title">Create the first one on us.</h1><p className="creator-subtitle">Every verified account includes one curated template render. After that, see the exact credit price before you generate.</p></div>
        </header>
        <section className="creator-pricing-grid" aria-label="Pricing options">
          <article className="creator-panel creator-panel-pad"><p className="creator-kicker">Starter</p><h2>One included render</h2><p>Try a curated template with your own product before buying credits.</p><ul><li><Check aria-hidden="true" /> One eligible Template Mode render</li><li><Check aria-hidden="true" /> Simple editor and project history</li><li><Check aria-hidden="true" /> 9:16 MP4 export</li></ul><Link className="creator-button creator-button-primary" to="/create"><Sparkles aria-hidden="true" /> Start creating</Link></article>
          <article className="creator-panel creator-panel-pad"><p className="creator-kicker">Credits</p><h2>Pay for what you create</h2><p>Quotes depend on duration and capability. The price is locked before submission and failures refund automatically.</p><ul><li><Check aria-hidden="true" /> Exact quote before every render</li><li><Check aria-hidden="true" /> Arabic, English and bilingual campaigns</li><li><Check aria-hidden="true" /> Multiple export formats</li></ul><span className="creator-button creator-button-secondary" aria-disabled="true">Credit bundles coming soon</span></article>
        </section>
      </div>
    </CreatorShell>
  );
}
