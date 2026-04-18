import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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

const Index = () => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [model, setModel] = useState("any");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    trackPageVisit("/");
  }, []);

  const GUIDE_STEPS = [
    { icon: Sparkles, title: t("guide.step1.title"), desc: t("guide.step1.desc") },
    { icon: Upload, title: t("guide.step2.title"), desc: t("guide.step2.desc") },
    { icon: Copy, title: t("guide.step3.title"), desc: t("guide.step3.desc") },
  ];

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-6 sm:py-12">
        <AnnouncementBanner />
        {/* Top bar */}
        <div className="flex justify-end gap-1.5 mb-4">
          <LanguageToggle />
          {!loading && user && <NotificationBell />}
          {!loading && user && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-1.5">
              <Library className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{t("library.title")}</span>
            </Button>
          )}
          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
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
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <User className="w-4 h-4 me-1.5" />
                {t("auth.signIn")}
              </Button>
            )
          )}
        </div>

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
            <h1 className="text-3xl tracking-tight font-mono sm:text-5xl font-bold">
              Mov<span className="text-primary">Prompt</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </motion.header>

        {/* Model-First flow: pick model, then upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <ModelPicker model={model} onModelChange={setModel} />
          <WorkflowPanel selectedModel={model} />
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
