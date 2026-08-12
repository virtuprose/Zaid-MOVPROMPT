import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { MarketingStudioSkeleton } from "@/components/marketing/MarketingStudioSkeleton";
import { OfflineFallback } from "@/components/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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

const TemplateWorkshop = lazy(() => import("./pages/TemplateWorkshop.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const Learn = lazy(() => import("./pages/Learn.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const QaMobile = lazy(() => import("./pages/QaMobile.tsx"));
const SharedPrompt = lazy(() => import("./pages/SharedPrompt.tsx"));
const Referrals = lazy(() => import("./pages/Referrals.tsx"));
const MarketingStudio = lazy(() => import("./pages/MarketingStudio.tsx"));
const CreateStudio = lazy(() =>
  import("@/features/create/CreateStudio").then((module) => ({ default: module.CreateStudio })),
);
const CreatorTemplates = lazy(() => import("./pages/CreatorTemplates.tsx"));
const CreatorProjects = lazy(() => import("./pages/CreatorProjects.tsx"));
const CreatorQa = lazy(() => import("./pages/CreatorQa.tsx"));
const AccountSettings = lazy(() => import("./pages/account/AccountSettings.tsx"));
const AccountBilling = lazy(() => import("./pages/account/AccountBilling.tsx"));
const AccountPreferences = lazy(() => import("./pages/account/AccountPreferences.tsx"));
const HeroPreview = lazy(() => import("./pages/HeroPreview.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const AdvancedStudio = lazy(() => import("./pages/AdvancedStudio.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    aria-label="Loading page"
    aria-live="polite"
    className="flex min-h-screen items-center justify-center bg-background"
    role="status"
  >
    <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
    <span className="sr-only">Loading page</span>
  </div>
);

const AppRoutes = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) return <OfflineFallback />;

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/movprompt" element={<AuthGuard><TemplateWorkshop /></AuthGuard>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
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
      </Suspense>
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
