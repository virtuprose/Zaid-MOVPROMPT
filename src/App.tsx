import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { OfflineFallback } from "@/components/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { TourProvider } from "@/components/tour/TourProvider";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Analytics from "./pages/Analytics.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import Library from "./pages/Library.tsx";
import Learn from "./pages/Learn.tsx";
import Terms from "./pages/Terms.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import QaMobile from "./pages/QaMobile.tsx";
import SharedPrompt from "./pages/SharedPrompt.tsx";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) return <OfflineFallback />;

  return (
    <BrowserRouter>
      <TourProvider>
        <Routes>
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AuthGuard requireAdmin><Analytics /></AuthGuard>} />
          <Route path="/library" element={<AuthGuard><Library /></AuthGuard>} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/qa/mobile" element={<QaMobile />} />
          <Route path="/p/:slug" element={<SharedPrompt />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TourProvider>
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
