import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { WorkflowPanel } from "@/components/WorkflowPanel";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { motion } from "framer-motion";
import { User, LogOut, Library, BookOpen, PlayCircle, Sparkles, Gift, Menu, Bell, Clapperboard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationBell from "@/components/NotificationBell";
import { InstallPrompt } from "@/components/InstallPrompt";
import WelcomePopup from "@/components/WelcomePopup";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { useTour } from "@/components/tour/TourProvider";
import logoMark from "@/assets/logo-mark.svg";

const Index = () => {
  const [model, setModel] = useState("any");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { start: startTour, isDone: tourDone } = useTour();

  useEffect(() => {
    trackPageVisit("/");
  }, []);

  // If user came from Learn page asking to start the tour
  useEffect(() => {
    try {
      if (sessionStorage.getItem("movprompt.tour.requestStart") === "1") {
        sessionStorage.removeItem("movprompt.tour.requestStart");
        const t = setTimeout(() => startTour(), 600);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, [startTour]);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] sm:w-[800px] sm:h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[220px] sm:w-[600px] sm:h-[300px] bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 container max-w-[1400px] mx-auto px-4 py-3 sm:py-4">
        <AnnouncementBanner />
        {/* Top bar */}
        <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            aria-label={t("nav.goHome")}
            className="flex items-center me-auto cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-1"
          >
            <h1 className="text-[14px] sm:text-[17px] tracking-tight font-display font-bold leading-none">
              <span className="text-primary">Mov</span>Prompt
            </h1>
          </button>
          {!loading && user && !tourDone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startTour}
              className="hidden sm:inline-flex gap-1.5 shrink-0 px-2 sm:px-3 text-primary hover:text-primary"
            >
              <PlayCircle className="w-4 h-4" />
              <span className="text-sm">{t("tour.takeTourShort" as any)}</span>
            </Button>
          )}
          <div className="shrink-0 hidden sm:block"><LanguageToggle /></div>
          {!loading && user && <div className="shrink-0 hidden sm:block"><NotificationBell /></div>}
          {!loading && user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/director")}
              className="gap-1.5 shrink-0 px-2 sm:px-3 hidden sm:inline-flex relative"
            >
              <Clapperboard className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">AI Director</span>
              <span className="text-[9px] uppercase tracking-wider text-accent font-semibold">New</span>
            </Button>
          )}
          {!loading && user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/library")}
              className="gap-1.5 shrink-0 px-2 sm:px-3 hidden sm:inline-flex"
              data-tour="library-link"
            >
              <Library className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{t("library.title")}</span>
            </Button>
          )}
          {!loading && (
            user ? (
              <>
                {/* Desktop: avatar dropdown */}
                <div className="hidden sm:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 shrink-0 px-2 sm:px-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline text-sm">{user.user_metadata?.full_name || user.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={startTour}>
                        <PlayCircle className="w-4 h-4 me-2" /> {t("tour.takeTour" as any)}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/learn")}>
                        <BookOpen className="w-4 h-4 me-2" /> {t("learn.menuLabel" as any)}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/gallery")}>
                        <Sparkles className="w-4 h-4 me-2" /> Public gallery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/referrals")}>
                        <Gift className="w-4 h-4 me-2" /> Refer friends
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="w-4 h-4 me-2" /> {t("auth.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Mobile: hamburger sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="sm:hidden shrink-0 px-2" aria-label="Menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] flex flex-col gap-1">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-normal">{user.user_metadata?.full_name || user.email}</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 flex items-center justify-between px-1">
                      <span className="text-xs text-muted-foreground">Language</span>
                      <LanguageToggle />
                    </div>
                    <div className="mt-2 flex flex-col">
                      <Button variant="ghost" className="justify-start" onClick={() => navigate("/library")}>
                        <Library className="w-4 h-4 me-2" /> {t("library.title")}
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={startTour}>
                        <PlayCircle className="w-4 h-4 me-2" /> {t("tour.takeTour" as any)}
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => navigate("/director")}>
                        <Clapperboard className="w-4 h-4 me-2" /> AI Director
                        <span className="ml-auto text-[9px] uppercase tracking-wider text-accent">New</span>
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => navigate("/learn")}>
                        <BookOpen className="w-4 h-4 me-2" /> {t("learn.menuLabel" as any)}
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => navigate("/gallery")}>
                        <Sparkles className="w-4 h-4 me-2" /> Public gallery
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => navigate("/referrals")}>
                        <Gift className="w-4 h-4 me-2" /> Refer friends
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={signOut}>
                        <LogOut className="w-4 h-4 me-2" /> {t("auth.signOut")}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <div className="shrink-0 sm:hidden"><LanguageToggle /></div>
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="shrink-0 px-2 sm:px-3">
                  <User className="w-4 h-4 sm:me-1.5" />
                  <span className="hidden sm:inline">{t("auth.signIn")}</span>
                </Button>
              </>
            )
          )}
        </div>

        {/* Hero removed — slim nav above keeps focus on the tool */}

        {/* Model-First flow: pick model, then upload (ModelPicker now lives inside LeftPanel) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <WorkflowPanel selectedModel={model} onSwitchModel={setModel} />
        </motion.div>

        {/* Footer */}
        <footer className="mt-3 text-center">
          <p className="text-xs text-muted-foreground/60 font-light">
            {t("footer")}
          </p>
        </footer>
      </div>
      <InstallPrompt />
      {!loading && user && <WelcomePopup />}
      <TourOverlay />
    </div>
  );
};

export default Index;
