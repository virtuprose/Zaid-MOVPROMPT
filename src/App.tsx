import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { OfflineFallback } from "@/components/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import Index from "./pages/Index.tsx";
import { CinematicHero } from "@/components/hero/CinematicHero";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { onboardingDoneKey, ONBOARDING_PENDING_KEY } from "@/components/onboarding/OnboardingContext";

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
    try {
      const pending = localStorage.getItem(ONBOARDING_PENDING_KEY) === "1";
      const done = localStorage.getItem(onboardingDoneKey(user.id)) === "1";
      if (pending && !done) return <Navigate to="/onboarding" replace />;
    } catch {
      /* ignore */
    }
    return <Index />;
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
import QaMobile from "./pages/QaMobile.tsx";
import SharedPrompt from "./pages/SharedPrompt.tsx";
import Referrals from "./pages/Referrals.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Director from "./pages/Director.tsx";
import MarketingStudio from "./pages/MarketingStudio.tsx";
import { MarketingStudioSkeleton } from "@/components/marketing/MarketingStudioSkeleton";

import AccountSettings from "./pages/account/AccountSettings.tsx";
import AccountBilling from "./pages/account/AccountBilling.tsx";
import AccountPreferences from "./pages/account/AccountPreferences.tsx";
import HeroPreview from "./pages/HeroPreview.tsx";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) return <OfflineFallback />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AuthGuard requireAdmin><Analytics /></AuthGuard>} />
        <Route path="/library" element={<AuthGuard><Library /></AuthGuard>} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/qa/mobile" element={<QaMobile />} />
        <Route path="/p/:slug" element={<SharedPrompt />} />
        <Route path="/referrals" element={<AuthGuard><Referrals /></AuthGuard>} />
        <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />
        <Route path="/director" element={<AuthGuard><Director /></AuthGuard>} />
        <Route path="/director/:sessionId" element={<AuthGuard><Director /></AuthGuard>} />
        <Route path="/marketing" element={<AuthGuard><MarketingStudio /></AuthGuard>} />
        <Route path="/account/settings" element={<AuthGuard><AccountSettings /></AuthGuard>} />
        <Route path="/account/billing" element={<AuthGuard><AccountBilling /></AuthGuard>} />
        <Route path="/account/preferences" element={<AuthGuard><AccountPreferences /></AuthGuard>} />
        <Route path="/hero-preview" element={<HeroPreview />} />
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
