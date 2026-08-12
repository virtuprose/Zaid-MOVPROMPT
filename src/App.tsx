import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { OfflineFallback } from "@/components/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import TemplateWorkshop from "./pages/TemplateWorkshop.tsx";
import { CinematicHero } from "@/components/hero/CinematicHero";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) {
    return <Navigate to="/create" replace />;
  }
  return <CinematicHero />;
};
import NotFound from "./pages/NotFound.tsx";
import Analytics from "./pages/Analytics.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import Library from "./pages/Library.tsx";
import Learn from "./pages/Learn.tsx";
import Docs from "./pages/Docs.tsx";
import Terms from "./pages/Terms.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import About from "./pages/About.tsx";
import QaMobile from "./pages/QaMobile.tsx";
import SharedPrompt from "./pages/SharedPrompt.tsx";
import Referrals from "./pages/Referrals.tsx";
import Onboarding from "./pages/Onboarding.tsx";

import MarketingStudio from "./pages/MarketingStudio.tsx";
import { MarketingStudioSkeleton } from "@/components/marketing/MarketingStudioSkeleton";
import { CreateStudio } from "@/features/create/CreateStudio";
import CreatorTemplates from "./pages/CreatorTemplates.tsx";
import CreatorProjects from "./pages/CreatorProjects.tsx";
import CreatorQa from "./pages/CreatorQa.tsx";

import AccountSettings from "./pages/account/AccountSettings.tsx";
import AccountBilling from "./pages/account/AccountBilling.tsx";
import AccountPreferences from "./pages/account/AccountPreferences.tsx";
import HeroPreview from "./pages/HeroPreview.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import Pricing from "./pages/Pricing.tsx";
import AdvancedStudio from "./pages/AdvancedStudio.tsx";
import Notifications from "./pages/Notifications.tsx";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) return <OfflineFallback />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/movprompt" element={<AuthGuard><TemplateWorkshop /></AuthGuard>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AuthGuard requireAdmin><Analytics /></AuthGuard>} />
        <Route path="/library" element={<AuthGuard><Library /></AuthGuard>} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/docs" element={<Navigate to="/learn" replace />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/about" element={<About />} />
        <Route path="/qa/mobile" element={<QaMobile />} />
        <Route path="/p/:slug" element={<SharedPrompt />} />
        <Route path="/referrals" element={<AuthGuard><Referrals /></AuthGuard>} />
        <Route path="/onboarding" element={<Navigate to="/create" replace />} />
        <Route path="/create" element={<CreateStudio />} />
        <Route path="/create/:draftId" element={<CreateStudio />} />
        <Route path="/templates" element={<CreatorTemplates />} />
        <Route path="/templates/:slug" element={<CreatorTemplates />} />
        <Route path="/projects" element={<AuthGuard><CreatorProjects /></AuthGuard>} />
        <Route path="/projects/:projectId" element={<AuthGuard><CreateStudio /></AuthGuard>} />
        <Route path="/director" element={<Navigate to="/ads" replace />} />
        <Route path="/director/:sessionId" element={<Navigate to="/ads" replace />} />
        <Route path="/marketing" element={<Navigate to="/ads" replace />} />
        <Route path="/advanced" element={<AdvancedStudio />} />
        <Route path="/advanced/templates" element={<AuthGuard><TemplateWorkshop /></AuthGuard>} />
        <Route path="/advanced/history" element={<AuthGuard><Library /></AuthGuard>} />
        <Route path="/ads" element={<AuthGuard fallback={<MarketingStudioSkeleton />}><MarketingStudio /></AuthGuard>} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
        <Route path="/account/settings" element={<AuthGuard><AccountSettings /></AuthGuard>} />
        <Route path="/account/billing" element={<AuthGuard><AccountBilling /></AuthGuard>} />
        <Route path="/account/preferences" element={<AuthGuard><AccountPreferences /></AuthGuard>} />
        <Route path="/hero-preview" element={<HeroPreview />} />
        {import.meta.env.DEV && <Route path="/qa/create" element={<CreatorQa />} />}
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
