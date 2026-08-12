import { FormEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Film,
  Grid2X2,
  Link2,
  LockKeyhole,
  Moon,
  Play,
  Search,
  Sun,
} from "lucide-react";
import { HeroTopNav } from "./HeroTopNav";
import { Seo } from "@/components/Seo";
import { useTheme } from "@/components/ThemeProvider";
import logoMark from "@/assets/logo-mark-white.svg";
import "./cinematic-hero.css";

type TemplateCategory = "All" | "Product" | "UGC" | "Fashion" | "Food" | "Apps";

const heroReels = [
  { label: "Creator ad", image: "/homepage/hero-creator.png", className: "mp-reel-side" },
  { label: "Product film", image: "/homepage/hero-product.png", className: "mp-reel-main" },
  { label: "Lifestyle cut", image: "/homepage/hero-lifestyle.png", className: "mp-reel-side" },
];

const templates = [
  { name: "The Product Reveal", category: "Product", duration: "08s", image: "/homepage/template-product-reveal.png" },
  { name: "Creator Proof", category: "UGC", duration: "12s", image: "/homepage/template-creator-proof.png" },
  { name: "Texture Study", category: "Product", duration: "06s", image: "/homepage/template-texture-study.png" },
  { name: "In Motion", category: "Fashion", duration: "10s", image: "/homepage/template-in-motion.png" },
  { name: "Clean Demo", category: "Apps", duration: "15s", image: "/homepage/template-clean-demo.png" },
  { name: "Launch Story", category: "Food", duration: "12s", image: "/homepage/template-launch-story.png" },
] as const;

const campaignFrames = [
  { name: "Hero film", ratio: "16:9", duration: "10s", image: "/homepage/hero-product.png", className: "mp-campaign-hero" },
  { name: "Creator review", ratio: "9:16", duration: "15s", image: "/homepage/hero-creator.png", className: "mp-campaign-creator" },
  { name: "Product detail", ratio: "1:1", duration: "06s", image: "/homepage/template-texture-study.png", className: "mp-campaign-detail" },
  { name: "Social cut", ratio: "4:5", duration: "08s", image: "/homepage/hero-lifestyle.png", className: "mp-campaign-social" },
  { name: "Launch teaser", ratio: "9:16", duration: "05s", image: "/homepage/hero-lifestyle.png", className: "mp-campaign-launch" },
] as const;

const footerFrames = [
  { label: "Product", image: "/homepage/hero-product.png" },
  { label: "Creator", image: "/homepage/hero-creator.png" },
  { label: "Lifestyle", image: "/homepage/hero-lifestyle.png" },
] as const;

const categories: TemplateCategory[] = ["All", "Product", "UGC", "Fashion", "Food", "Apps"];

const normalizeProductUrl = (value: string) => {
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const parsed = new URL(candidate);
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error("Invalid URL");
  return parsed.toString();
};

export const CinematicHero = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const productInputRef = useRef<HTMLInputElement>(null);
  const footerProductInputRef = useRef<HTMLInputElement>(null);
  const [productUrl, setProductUrl] = useState("");
  const [productError, setProductError] = useState("");
  const [footerProductUrl, setFooterProductUrl] = useState("");
  const [footerProductError, setFooterProductError] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("All");
  const [query, setQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("The Product Reveal");
  const [activeCampaignFrame, setActiveCampaignFrame] = useState("Hero film");

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesCategory = category === "All" || template.category === category;
      const matchesQuery = !normalizedQuery || `${template.name} ${template.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const rememberCreation = (templateName?: string, url?: string) => {
    try {
      if (templateName) {
        const templateId: Record<string, string> = {
          "Product Reveal": "luxury-product-reveal",
          "The Product Reveal": "luxury-product-reveal",
          "Creator Proof": "ugc-review",
          "Lifestyle Cut": "fashion",
          "Texture Study": "beauty-perfume",
          "In Motion": "fashion",
          "Clean Demo": "app-service",
          "Launch Story": "food-beverage",
        };
        localStorage.setItem("movprompt.home.templateId", templateId[templateName] || "luxury-product-reveal");
      }
      if (url) localStorage.setItem("movprompt.home.productUrl", url);
    } catch {
      // Local storage is optional; navigation should still work.
    }
  };

  const goToStudio = (templateName?: string) => {
    rememberCreation(templateName);
    navigate("/create");
  };

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const normalizedUrl = normalizeProductUrl(productUrl);
      setProductError("");
      rememberCreation(undefined, normalizedUrl);
      navigate("/create");
    } catch {
      setProductError("Enter a complete product URL, such as yourstore.com/product.");
      productInputRef.current?.focus();
    }
  };

  const handleFooterProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const normalizedUrl = normalizeProductUrl(footerProductUrl);
      setFooterProductError("");
      rememberCreation(undefined, normalizedUrl);
      navigate("/create");
    } catch {
      setFooterProductError("Enter a complete product URL, such as yourstore.com/product.");
      footerProductInputRef.current?.focus();
    }
  };

  const focusProductInput = () => {
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => productInputRef.current?.focus(), 350);
  };

  return (
    <div id="top" className="mp-home">
      <Seo
        title="MovPrompt — Create campaign-ready videos from templates"
        description="Add a product, choose a proven video format, and create polished product, creator, and social videos with MovPrompt."
        path="/"
      />
      <a className="mp-skip-link" href="#main-content">Skip to main content</a>
      <HeroTopNav />

      <main id="main-content">
        <section className="mp-hero" aria-labelledby="hero-title">
          <div className="mp-container mp-hero-grid">
            <div className="mp-hero-copy">
              <p className="mp-eyebrow"><span aria-hidden="true" />Template-first AI video</p>
              <h1 id="hero-title">Create campaign-ready video from one product link.</h1>
              <p className="mp-hero-description">
                Bring your product. Choose a proven format. Generate polished product, creator and social videos without a shoot or editing timeline.
              </p>

              <form className="mp-product-form" onSubmit={handleProductSubmit} noValidate>
                <label htmlFor="hero-product-link">Product link</label>
                <div className="mp-product-field" data-error={Boolean(productError)}>
                  <Link2 aria-hidden="true" />
                  <input
                    ref={productInputRef}
                    id="hero-product-link"
                    name="productUrl"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://yourstore.com/product"
                    value={productUrl}
                    aria-describedby={productError ? "product-url-error" : "product-url-help"}
                    aria-invalid={Boolean(productError)}
                    onChange={(event) => {
                      setProductUrl(event.target.value);
                      if (productError) setProductError("");
                    }}
                  />
                  <button className="mp-button mp-button-primary" type="submit">
                    Create my video <ArrowUpRight aria-hidden="true" />
                  </button>
                </div>
                {productError ? (
                  <p id="product-url-error" className="mp-form-error" role="alert">{productError}</p>
                ) : (
                  <span id="product-url-help" className="sr-only">Paste the public URL of the product you want to promote.</span>
                )}
              </form>

              <div className="mp-hero-links">
                <a href="#templates">Browse templates <ArrowRight aria-hidden="true" /></a>
                <span>No prompt required · No credit card required</span>
              </div>
            </div>

            <div className="mp-hero-visual" aria-label="Three campaign directions generated from one product">
              <div className="mp-reel-row">
                {heroReels.map((reel) => (
                  <figure key={reel.label} className={`mp-reel ${reel.className}`}>
                    <img src={reel.image} alt={`${reel.label} preview featuring the same dark perfume bottle`} />
                    <figcaption>
                      <Play aria-hidden="true" fill="currentColor" />
                      <span>{reel.label}</span>
                    </figcaption>
                    {reel.className === "mp-reel-main" && <span className="mp-reel-progress" aria-hidden="true" />}
                  </figure>
                ))}
              </div>
              <div className="mp-ready-chip"><span aria-hidden="true" />3 directions ready</div>
            </div>
          </div>
        </section>

        <section id="templates" className="mp-section mp-templates" aria-labelledby="templates-title">
          <div className="mp-container">
            <div className="mp-section-heading mp-template-heading">
              <div>
                <p className="mp-eyebrow">Proven video formats</p>
                <h2 id="templates-title">Choose the result—not the model.</h2>
                <p>Start with a format built for the way people watch, shop and share. MovPrompt handles the technical decisions.</p>
              </div>
              <a href="#template-browser">View all templates <ArrowRight aria-hidden="true" /></a>
            </div>

            <div id="template-browser" className="mp-template-toolbar">
              <label className="mp-template-search">
                <span>Search templates</span>
                <div><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product, style or goal" /></div>
              </label>
              <div className="mp-category-tabs" role="group" aria-label="Filter templates by category">
                {categories.map((item) => (
                  <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
              <label className="mp-sort-select">
                <span className="sr-only">Sort templates</span>
                <select defaultValue="recommended"><option value="recommended">Sort: Recommended</option><option value="duration">Sort: Duration</option></select>
                <ChevronDown aria-hidden="true" />
              </label>
            </div>

            {visibleTemplates.length ? (
              <div className="mp-template-grid" aria-live="polite">
                {visibleTemplates.map((template) => {
                  const selected = selectedTemplate === template.name;
                  return (
                    <article key={template.name} className="mp-template-card" data-selected={selected}>
                      <button
                        className="mp-template-choice"
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Select ${template.name} template`}
                        onClick={() => setSelectedTemplate(template.name)}
                      >
                        <img src={template.image} alt={`${template.name} video preview`} loading="lazy" />
                        <span className="mp-template-info">
                          <strong>{template.name}</strong>
                          <i><span>{template.category}</span><span aria-hidden="true">•</span><span>{template.duration}</span></i>
                          {!selected && <ArrowRight aria-hidden="true" />}
                        </span>
                      </button>
                      {selected && (
                        <button className="mp-use-template" type="button" onClick={() => goToStudio(template.name)}>
                          Use template
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mp-template-empty" role="status">
                <strong>No matching templates</strong>
                <span>Try another search or choose a different category.</span>
                <button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Show all templates</button>
              </div>
            )}

            <div className="mp-template-footer">
              <span>Templates include shot direction, pacing and format. Your product stays yours.</span>
              <Link to="/docs">How templates work <ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section id="campaign-system" className="mp-section mp-campaign" aria-labelledby="campaign-title">
          <div className="mp-container">
            <div className="mp-campaign-heading">
              <div>
                <p className="mp-eyebrow">Campaign system</p>
                <h2 id="campaign-title">One product. Every format.</h2>
              </div>
              <p>Generate a coordinated set of product, creator and social cuts while your brand stays consistent.</p>
              <button type="button" onClick={focusProductInput}>Create variations <ArrowRight aria-hidden="true" /></button>
            </div>

            <div className="mp-campaign-grid" aria-label="Five coordinated video formats from one product">
              {campaignFrames.map((frame) => (
                <figure
                  key={frame.name}
                  className={`mp-campaign-frame ${frame.className}`}
                  data-active={activeCampaignFrame === frame.name}
                >
                  <img src={frame.image} alt={`${frame.name} preview for the Northfield perfume campaign`} loading="lazy" />
                  <figcaption>
                    <button
                      type="button"
                      aria-label={`Preview ${frame.name}`}
                      aria-pressed={activeCampaignFrame === frame.name}
                      onClick={() => setActiveCampaignFrame(frame.name)}
                    >
                      <Play aria-hidden="true" fill="currentColor" />
                    </button>
                    <strong>{frame.name}</strong>
                    <span>{frame.ratio} · {frame.duration}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mp-review-strip">
              <div className="mp-campaign-timeline" role="group" aria-label="Select campaign variation">
                {campaignFrames.map((frame) => (
                  <button
                    key={frame.name}
                    type="button"
                    aria-label={`Select ${frame.name}`}
                    aria-pressed={activeCampaignFrame === frame.name}
                    onClick={() => setActiveCampaignFrame(frame.name)}
                  >
                    <img src={frame.image} alt="" loading="lazy" />
                  </button>
                ))}
                <span aria-hidden="true" />
              </div>
              <div className="mp-campaign-facts" aria-label="Campaign details">
                <span><Film aria-hidden="true" />5 videos</span>
                <span><Grid2X2 aria-hidden="true" />3 ratios</span>
                <span><LockKeyhole aria-hidden="true" />Brand locked</span>
              </div>
              <button className="mp-button mp-button-primary" type="button" onClick={() => goToStudio()}>
                Review campaign <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
            <p className="sr-only" aria-live="polite">{activeCampaignFrame} selected for preview.</p>
          </div>
        </section>

        <section id="start-creating" className="mp-final-cta" aria-labelledby="final-cta-title">
          <div className="mp-container mp-final-cta-grid">
            <div className="mp-final-copy">
              <p className="mp-eyebrow">Start creating</p>
              <h2 id="final-cta-title">Your next campaign starts with a link.</h2>
              <p>Bring the product. Choose the format. MovPrompt handles the production.</p>

              <form className="mp-footer-product-form" onSubmit={handleFooterProductSubmit} noValidate>
                <label htmlFor="footer-product-link">Product link</label>
                <input
                  ref={footerProductInputRef}
                  id="footer-product-link"
                  name="footerProductUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://yourstore.com/product"
                  value={footerProductUrl}
                  aria-describedby={footerProductError ? "footer-product-error" : "footer-product-help"}
                  aria-invalid={Boolean(footerProductError)}
                  onChange={(event) => {
                    setFooterProductUrl(event.target.value);
                    if (footerProductError) setFooterProductError("");
                  }}
                />
                {footerProductError ? (
                  <p id="footer-product-error" className="mp-form-error" role="alert">{footerProductError}</p>
                ) : (
                  <span id="footer-product-help" className="sr-only">Paste the public URL of the product you want to promote.</span>
                )}
                <button className="mp-button mp-button-primary" type="submit">Start creating <ArrowUpRight aria-hidden="true" /></button>
              </form>

              <a className="mp-final-template-link" href="#templates">Browse templates first <ArrowRight aria-hidden="true" /></a>
              <p className="mp-final-reassurance">No credit card required · Your product stays private</p>
            </div>

            <div className="mp-final-media" aria-label="Product, creator and lifestyle campaign previews">
              {footerFrames.map((frame) => (
                <figure key={frame.label}>
                  <span>{frame.label}</span>
                  <img src={frame.image} alt={`${frame.label} campaign preview`} loading="lazy" />
                </figure>
              ))}
              <div className="mp-final-progress" aria-hidden="true"><span /></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mp-site-footer">
        <div className="mp-container">
          <div className="mp-footer-grid">
            <div className="mp-footer-brand">
              <a href="#top" className="mp-brand" aria-label="MovPrompt home">
                <img className="mp-footer-mark" src={logoMark} alt="" width="34" height="48" />
                <span>MovPrompt</span>
              </a>
              <p>Template-first AI video for modern campaigns.</p>
            </div>

            <nav aria-label="Create">
              <h2>Create</h2>
              <a href="#templates">Templates</a>
              <a href="#campaign-system">Product ads</a>
              <a href="#templates">UGC</a>
              <Link to="/advanced">Advanced Studio</Link>
            </nav>

            <nav aria-label="Explore">
              <h2>Explore</h2>
              <a href="#campaign-system">Showcase</a>
              <Link to="/auth?next=/account/billing">Pricing</Link>
              <Link to="/learn">Learn</Link>
            </nav>

            <nav aria-label="Company">
              <h2>Company</h2>
              <Link to="/about">About</Link>
              <a href="mailto:hello@movprompt.com">Contact</a>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
            </nav>

            <div className="mp-footer-appearance">
              <h2>Appearance</h2>
              <div role="group" aria-label="Choose color theme">
                <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                  <Sun aria-hidden="true" /><span className="sr-only">Use light mode</span>
                </button>
                <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
                  <Moon aria-hidden="true" /><span className="sr-only">Use dark mode</span>
                </button>
              </div>
              <p>{theme === "light" ? "Light" : "Dark"}</p>
            </div>
          </div>

          <div className="mp-footer-bottom">
            <span>© 2026 MovPrompt</span>
            <div><span>English <ChevronDown aria-hidden="true" /></span><span>USD <ChevronDown aria-hidden="true" /></span></div>
          </div>
        </div>
      </footer>
    </div>
  );
};
