import { useState } from "react";
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
  PlayCircle,
  GraduationCap,
  Gift,
  LogOut,
  User,
  Sparkles,
  Coins,
} from "lucide-react";
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
import { useLanguage } from "@/i18n/LanguageContext";
import { useTour } from "@/components/tour/TourProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import NotificationBell from "@/components/NotificationBell";
import logoMark from "@/assets/logo-mark.svg";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; badge?: string };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Studio" },
  { to: "/director", label: "AI Director", badge: "New" },
  { to: "/gallery", label: "Gallery" },
];

export function TopNav() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { start: startTour, isDone: tourDone } = useTour();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="w-8 h-8 rounded-lg bg-[hsl(240_5%_10%)] border border-border/60 flex items-center justify-center group-hover:border-accent/40 transition-colors">
            <img src={logoMark} alt="MovPrompt" className="w-5 h-5" />
          </div>
        </Link>

        <div className="hidden lg:block h-6 w-px bg-border/60 mx-1" />

        {/* Center nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
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
                {active && <Sparkles className="w-3.5 h-3.5" />}
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search */}
          <button
            type="button"
            className="hidden md:inline-flex items-center gap-2 h-9 w-[200px] xl:w-[260px] px-3 rounded-full bg-[hsl(240_5%_9%)] border border-border/50 text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[13px] flex-1 text-left">Search</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-mono">
              <span className="text-sm leading-none">⌘</span>K
            </kbd>
          </button>

          {!loading && user && location.pathname.startsWith("/director") && (
            <Button
              size="sm"
              onClick={() => navigate("/account/billing")}
              className="hidden sm:inline-flex h-9 rounded-full px-3 gap-1.5 text-[13px] bg-accent/10 text-accent border border-accent/30 hover:bg-accent/15"
            >
              <Coins className="w-3.5 h-3.5" />
              Buy Credits
            </Button>
          )}

          {!loading && user && (
            <>
              {/* Assets */}
              <Button
                size="sm"
                onClick={() => navigate("/library")}
                className="hidden sm:inline-flex h-9 rounded-full px-3 gap-1.5 text-[13px] bg-[hsl(150_45%_12%)] text-[hsl(150_70%_70%)] border border-[hsl(150_50%_25%)] hover:bg-[hsl(150_45%_15%)]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Assets
              </Button>

              <div className="hidden sm:block">
                <NotificationBell />
              </div>
              <div className="hidden md:block">
                <LanguageToggle />
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
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl border-accent/10 bg-popover">
                      <button
                        type="button"
                        onClick={() => navigate("/account/settings")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(240_5%_11%)] transition-colors group"
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
                      <DropdownMenuSeparator className="my-1.5 bg-[hsl(240_5%_12%)]" />
                      <DropdownMenuItem
                        onClick={() => navigate("/account/settings")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-[hsl(240_5%_11%)] focus:text-foreground group"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Account settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/account/billing")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-[hsl(240_5%_11%)] focus:text-foreground group"
                      >
                        <CreditCard className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Billing & subscription</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/account/preferences")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-[hsl(240_5%_11%)] focus:text-foreground group"
                      >
                        <Globe className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Language & preferences</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5 bg-[hsl(240_5%_12%)]" />
                      <DropdownMenuItem
                        onClick={startTour}
                        className={cn(
                          "gap-3 px-4 py-3 rounded-lg cursor-pointer group",
                          !tourDone
                            ? "bg-accent/10 text-accent focus:bg-accent/20 focus:text-accent"
                            : "focus:bg-[hsl(240_5%_11%)] focus:text-foreground",
                        )}
                      >
                        <PlayCircle
                          className={cn(
                            "w-4 h-4 transition-colors",
                            !tourDone
                              ? "text-accent"
                              : "text-muted-foreground group-hover:text-accent group-focus:text-accent",
                          )}
                        />
                        <span className="text-sm">Take the tour</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/learn")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-[hsl(240_5%_11%)] focus:text-foreground group"
                      >
                        <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <span className="text-sm">Learn</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/referrals")}
                        className="gap-3 px-4 py-3 rounded-lg cursor-pointer focus:bg-[hsl(240_5%_11%)] focus:text-foreground group"
                      >
                        <Gift className="w-4 h-4 text-muted-foreground group-hover:text-accent group-focus:text-accent transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight">Refer friends</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">Earn rewards</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5 bg-[hsl(240_5%_12%)]" />
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
                    <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9 px-0" aria-label="Menu">
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
                        <FolderOpen className="w-4 h-4 me-2" /> Assets
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
                className="h-9 rounded-full px-3"
              >
                <User className="w-4 h-4 sm:me-1.5" />
                <span className="hidden sm:inline">{t("auth.signIn")}</span>
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
