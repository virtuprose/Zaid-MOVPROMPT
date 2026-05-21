import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Disc,
  FolderOpen,
  Menu,
  Settings,
  CreditCard,
  Globe,
  ChevronRight,
  
  GraduationCap,
  Gift,
  LogOut,
  Sun,
  Moon,
  User,
  Sparkles,
  Coins,
  Megaphone,
} from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/i18n/LanguageContext";

import { LanguageToggle } from "@/components/LanguageToggle";
import NotificationBell from "@/components/NotificationBell";
import { CreditBadge } from "@/components/credits/CreditBadge";
import logoMark from "@/assets/logo-mark.svg";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; badge?: string };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "MovPrompt" },
  { to: "/director", label: "AI Director" },
  { to: "/marketing", label: "Ads" },
  
];

export function TopNav() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 sm:px-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center group-hover:border-accent/40 transition-colors">
            <img src={logoMark} alt="MovPrompt" className="w-5 h-5" />
          </div>
        </Link>

        <div className="hidden lg:block h-6 w-px bg-border/60 mx-1" />

        {/* Center nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
            const isAds = item.to === "/marketing";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && !isAds && <Sparkles className="w-3.5 h-3.5" />}
                {isAds && <Megaphone className={cn("w-3.5 h-3.5", active ? "text-accent" : "")} />}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase tracking-wider border border-accent/25">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Search */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2 h-9 w-[220px] xl:w-[280px] px-3 rounded-full bg-muted border border-border/50 text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[13px] flex-1 text-left truncate">Search tasks, prompts, references...</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-mono">
              <span className="text-sm leading-none">⌘</span>K
            </kbd>
          </button>

          {!loading && user && location.pathname.startsWith("/director") && (
            <Button
              size="sm"
              onClick={() => navigate("/account/billing")}
              className="hidden sm:inline-flex h-9 rounded-full px-3.5 gap-2 text-[13px] font-medium bg-transparent text-accent border border-accent/40 hover:bg-accent/10 hover:border-accent/60 transition-colors"
            >
              <Coins className="w-4 h-4" />
              Buy Credits
            </Button>
          )}

          {!loading && user && (
            <>
              {/* Assets — neutral */}
              <Button
                size="sm"
                onClick={() => navigate("/library")}
                className="hidden sm:inline-flex h-9 rounded-full px-3 gap-1.5 text-[13px] bg-transparent text-foreground border border-border hover:bg-muted hover:border-border"
              >
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                Library
              </Button>

              <div className="hidden sm:block">
                <CreditBadge />
              </div>
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
            </>
          )}

          {!loading &&
            (user ? (
              <>
                {/* Avatar dropdown — desktop */}
                <div className="hidden sm:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="relative shrink-0 rounded-full p-[2px] bg-gradient-to-br from-accent via-accent/60 to-primary hover:scale-105 transition-transform"
                        aria-label="Account menu"
                      >
                        <Avatar className="w-8 h-8 border-2 border-background">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl border-accent/10 bg-popover">
                      <button
                        type="button"
                        onClick={() => navigate("/account/settings")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">
                            {user.user_metadata?.full_name || "Account"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      </button>
                      <DropdownMenuSeparator className="my-1.5 bg-muted" />
                      <DropdownMenuItem
                        onClick={() => navigate("/account/settings")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Account settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/account/billing")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        <CreditCard className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Billing & subscription</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/account/preferences")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        <Globe className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Language & preferences</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5 bg-muted" />
                      <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); toggleTheme(); }}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        {theme === "dark"
                          ? <Sun className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                          : <Moon className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />}
                        <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5 bg-muted" />
                      <DropdownMenuItem
                        onClick={() => navigate("/learn")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Learn</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/referrals")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-muted focus:text-foreground group"
                      >
                        <Gift className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight">Refer friends</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">Earn rewards</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5 bg-muted" />
                      <DropdownMenuItem
                        onClick={signOut}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer text-muted-foreground focus:bg-destructive/10 focus:text-destructive group"
                      >
                        <LogOut className="w-4 h-4 group-focus:text-destructive transition-colors" />
                        <span className="text-sm">Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile menu */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="lg:hidden h-11 w-11 px-0" aria-label="Open navigation menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] flex flex-col gap-1">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-normal">
                          {user.user_metadata?.full_name || user.email}
                        </span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex flex-col">
                      {NAV_ITEMS.map((item) => (
                        <Button
                          key={item.to}
                          variant="ghost"
                          className="justify-start"
                          onClick={() => {
                            setMobileOpen(false);
                            navigate(item.to);
                          }}
                        >
                          {item.label}
                          {item.badge && (
                            <span className="ml-auto text-[9px] uppercase tracking-wider text-accent">
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      ))}
                      <div className="my-2 h-px bg-border/40" />
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setMobileOpen(false);
                          navigate("/account/billing");
                        }}
                      >
                        <Disc className="w-4 h-4 me-2 text-destructive" /> Buy Credits
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setMobileOpen(false);
                          navigate("/library");
                        }}
                      >
                        <FolderOpen className="w-4 h-4 me-2" /> Library
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setMobileOpen(false);
                          navigate("/learn");
                        }}
                      >
                        <GraduationCap className="w-4 h-4 me-2" /> Learn
                      </Button>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-muted-foreground">Language</span>
                        <LanguageToggle />
                      </div>
                      <Button variant="ghost" className="justify-start" onClick={signOut}>
                        <LogOut className="w-4 h-4 me-2" /> {t("auth.signOut")}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
                className="h-11 sm:h-9 rounded-full px-3 min-w-11"
                aria-label={t("auth.signIn")}
              >
                <User className="w-4 h-4 sm:me-1.5" />
                <span className="hidden sm:inline">{t("auth.signIn")}</span>
              </Button>
            ))}
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
   </header>
  );
}

export default TopNav;
