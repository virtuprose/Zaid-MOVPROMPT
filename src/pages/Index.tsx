import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { ModelPicker } from "@/components/ModelPicker";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { motion } from "framer-motion";
import { User, LogOut, Library } from "lucide-react";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NotificationBell from "@/components/NotificationBell";
import { InstallPrompt } from "@/components/InstallPrompt";
import WelcomePopup from "@/components/WelcomePopup";
import logoMark from "@/assets/logo-mark.svg";

const Index = () => {
  const [model, setModel] = useState("any");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    trackPageVisit("/");
  }, []);

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

      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-4 sm:py-12">
        <AnnouncementBanner />
        {/* Top bar */}
        <div className="flex flex-nowrap justify-end items-center gap-1 sm:gap-1.5 mb-4">
          <div className="shrink-0"><LanguageToggle /></div>
          {!loading && user && <div className="shrink-0"><NotificationBell /></div>}
          {!loading && user && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-1.5 shrink-0 px-2 sm:px-3">
              <Library className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{t("library.title")}</span>
            </Button>
          )}
          {!loading && (
            user ? (
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
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 me-2" /> {t("auth.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="shrink-0 px-2 sm:px-3">
                <User className="w-4 h-4 sm:me-1.5" />
                <span className="hidden sm:inline">{t("auth.signIn")}</span>
              </Button>
            )
          )}
        </div>

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-12"
        >
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            aria-label={t("nav.goHome")}
            className="flex items-center justify-center gap-2.5 sm:gap-3 mb-3 sm:mb-4 mx-auto cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <img src={logoMark} alt="MovPrompt" className="w-9 h-9 sm:w-14 sm:h-14" />
            <h1 className="text-[26px] tracking-tight font-mono sm:text-5xl font-bold">
              Mov<span className="text-primary">Prompt</span>
            </h1>
          </button>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-[20rem] sm:max-w-xl mx-auto px-2">
            {t("hero.subtitle")}
          </p>
        </motion.header>

        {/* Model-First flow: pick model, then upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <ModelPicker model={model} onModelChange={setModel} />
          <WorkflowPanel selectedModel={model} onSwitchModel={setModel} />
        </motion.div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-muted-foreground/60 font-light">
            {t("footer")}
          </p>
        </footer>
      </div>
      <InstallPrompt />
      {!loading && user && <WelcomePopup />}
    </div>
  );
};

export default Index;
