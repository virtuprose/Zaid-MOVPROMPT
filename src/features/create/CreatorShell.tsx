import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Bell, Check, ChevronDown, Download, FolderOpen, Globe2, LayoutTemplate, Menu, Moon, SlidersHorizontal, Sparkles, Star, Sun, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { CreditBadge } from "@/components/credits/CreditBadge";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo-mark.svg";
import "./creator.css";
import { useLanguage } from "@/i18n/LanguageContext";

const NAVIGATION = [
  { to: "/create", label: "Create", icon: Sparkles },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/advanced", label: "Advanced", icon: SlidersHorizontal },
];

type StudioChrome = {
  title: string;
  templatePath: string;
  onExport?: () => void;
};

export function CreatorShell({ children, qaMode = false, studio }: { children: ReactNode; qaMode?: boolean; studio?: StudioChrome }) {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const qaPrefix = qaMode ? "/qa/create" : "";

  const routeFor = (to: string) => {
    if (!qaMode) return to;
    if (to === "/create") return "/qa/create";
    if (to === "/templates") return "/qa/create?view=templates";
    if (to === "/projects") return "/qa/create?view=projects";
    return to;
  };

  const isActive = (to: string) => {
    if (qaMode) {
      const view = new URLSearchParams(location.search).get("view");
      if (to === "/templates") return view === "templates";
      if (to === "/projects") return view === "projects";
      if (to === "/create") return !view;
      return false;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="creator-app min-h-screen bg-background text-foreground">
      <a className="creator-skip-link" href="#creator-main">Skip to workspace</a>
      <header className={cn("creator-header", studio && "creator-studio-header")}>
        <div className="creator-header-inner">
          <Link to={qaPrefix || "/"} className="creator-brand" aria-label="MovPrompt home">
            <span className="creator-brand-mark"><img src={logoMark} alt="" /></span>
            <span>MovPrompt</span>
          </Link>

          {studio ? (
            <>
              <div className="creator-studio-project">
                <span>{studio.title}</span><ChevronDown aria-hidden="true" />
                <button type="button" aria-label="Add project to favourites"><Star aria-hidden="true" /></button>
              </div>
              <nav className="creator-mode-tabs" aria-label="Creation mode">
                <Link to={studio.templatePath}>Template</Link>
                <span aria-current="page">Advanced</span>
              </nav>
              <span className="creator-saved-state"><Check aria-hidden="true" /> Saved</span>
            </>
          ) : (
            <nav className="creator-desktop-nav" aria-label="Creator workspace">
              {NAVIGATION.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={routeFor(item.to)}
                    className={cn("creator-nav-link", isActive(item.to) && "is-active")}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          )}

          <div className="creator-header-actions">
            {qaMode && <span className="creator-demo-badge">Local preview</span>}
            {!qaMode && user && <CreditBadge className="creator-credit-pill" />}
            {studio?.onExport && <button className="creator-studio-export" type="button" onClick={studio.onExport}><Download aria-hidden="true" /> Export</button>}
            {studio && <button className="creator-icon-button creator-studio-only-action" type="button" aria-label="Notifications"><Bell aria-hidden="true" /></button>}
            <button className="creator-language-button" type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={locale === "en" ? "Use Arabic interface" : "Use English interface"}><Globe2 aria-hidden="true" /><span>{locale === "en" ? "العربية" : "English"}</span></button>
            <button className="creator-icon-button" type="button" onClick={toggleTheme} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}>
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <button className="creator-icon-button creator-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="creator-mobile-nav" aria-label={menuOpen ? "Close menu" : "Open menu"}>
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
            {!qaMode && !user ? <Link className="creator-button creator-button-secondary creator-sign-in" to={studio ? `/auth?next=${encodeURIComponent(location.pathname + location.search)}` : "/auth?next=/create"}>Sign in</Link> : (
              <div className="creator-avatar" aria-label={user?.email ? `Signed in as ${user.email}` : "Preview user"}>
                {(user?.email || "MP").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav id="creator-mobile-nav" className="creator-mobile-nav" aria-label="Mobile creator workspace">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={routeFor(item.to)} onClick={() => setMenuOpen(false)} className={cn("creator-nav-link", isActive(item.to) && "is-active")}>
                  <Icon aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </header>
      <main id="creator-main">{children}</main>
    </div>
  );
}
