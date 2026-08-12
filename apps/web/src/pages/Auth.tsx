import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, History, Layers, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { isFeatureEnabled } from "@/config/features";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/portableAuthClient";
import { portableAuthActions } from "@/lib/auth/portableAuthActions";
import { authCallbackUrl, rememberAuthReturnIntent, safeAuthReturnPath } from "@/lib/auth/returnPath";

const portableAuth = isFeatureEnabled("portableAuth");

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeAuthReturnPath(searchParams.get("next"));
  const callbackURL = useMemo(
    () => portableAuth ? authCallbackUrl(nextPath) : `${window.location.origin}${nextPath}`,
    [nextPath],
  );
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "apple" | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const features = [
    { icon: Camera, title: t("auth.feat.dop.title"), description: t("auth.feat.dop.desc") },
    { icon: Layers, title: t("auth.feat.workflows.title"), description: t("auth.feat.workflows.desc") },
    { icon: History, title: t("auth.feat.save.title"), description: t("auth.feat.save.desc") },
  ];

  useEffect(() => {
    if (user) navigate(nextPath, { replace: true });
  }, [navigate, nextPath, user]);

  async function emailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    if (portableAuth) {
      const result = await portableAuthActions.signInEmail({ email, password, callbackURL });
      setBusy(null);
      if ((result as { error?: unknown }).error) {
        toast({ title: t("toast.signInFailed"), description: authErrorMessage((result as { error?: unknown }).error), variant: "destructive" });
      } else {
        navigate(nextPath, { replace: true });
      }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) toast({ title: t("toast.signInFailed"), description: error.message, variant: "destructive" });
  }

  async function emailSignUp(event: React.FormEvent) {
    event.preventDefault();
    if (!agreedToTerms) {
      toast({ title: t("auth.mustAgreeTerms"), variant: "destructive" });
      return;
    }
    setBusy("email");
    if (portableAuth) {
      const displayName = name.trim() || email.split("@")[0] || "Creator";
      const result = await portableAuthActions.signUpEmail({ email, password, name: displayName, callbackURL });
      setBusy(null);
      if ((result as { error?: unknown }).error) {
        toast({ title: t("toast.signUpFailed"), description: authErrorMessage((result as { error?: unknown }).error), variant: "destructive" });
      } else {
        try { localStorage.setItem("first_signup_pending", "1"); } catch { /* optional welcome state */ }
        toast({ title: "Check your email", description: "Verify your email to finish creating your account. Your campaign is saved in this browser." });
      }
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackURL } });
    setBusy(null);
    if (error) toast({ title: t("toast.signUpFailed"), description: error.message, variant: "destructive" });
  }

  async function forgotPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    const redirectTo = `${window.location.origin}/reset-password`;
    const result = portableAuth
      ? await portableAuthActions.requestPasswordReset({ email, redirectTo }) as { error?: unknown }
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(null);
    if (result.error) {
      toast({ title: t("toast.resetFailed"), description: authErrorMessage(result.error), variant: "destructive" });
    } else {
      toast({ title: t("toast.checkEmail"), description: "If an account exists, a secure reset link is on its way." });
      setForgotMode(false);
    }
  }

  async function socialSignIn(provider: "google" | "apple") {
    setBusy(provider);
    rememberAuthReturnIntent(nextPath);
    if (portableAuth) {
      const result = await portableAuthActions.signInSocial({ provider, callbackURL });
      if ((result as { error?: unknown }).error) {
        setBusy(null);
        toast({ title: `Could not continue with ${provider === "google" ? "Google" : "Apple"}`, description: `${authErrorMessage((result as { error?: unknown }).error)} Your campaign is still saved in this browser.`, variant: "destructive" });
      }
      return;
    }
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: callbackURL });
    if (result.error) {
      setBusy(null);
      toast({ title: `Could not continue with ${provider === "google" ? "Google" : "Apple"}`, description: String(result.error), variant: "destructive" });
    }
  }

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite"><Loader2 aria-hidden className="w-6 h-6 animate-spin text-primary" /><span className="sr-only">Checking your session</span></div>;
  }

  const fieldClass = "bg-background/65 border-border text-foreground placeholder:text-muted-foreground rounded-lg px-4 py-[14px] h-auto focus-visible:border-primary/60";
  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      <Seo title="Sign in or create an account — MovPrompt" description="Save your campaign and start creating with MovPrompt." path="/auth" />
      <div className="fixed inset-0 pointer-events-none" aria-hidden><div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[140px]" /><div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-accent/6 rounded-full blur-[120px]" /></div>
      <Link to="/" className="absolute top-4 start-4 z-20 font-display font-bold text-sm tracking-tight rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-primary">Mov</span><span className="text-foreground">Prompt</span></Link>
      <div className="absolute top-3 end-3 z-20"><LanguageToggle /></div>

      <div className="relative z-10 grid md:grid-cols-2 min-h-screen">
        <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex flex-col justify-center px-8 lg:px-16" aria-labelledby="auth-benefits-title">
          <h1 id="auth-benefits-title" className="text-3xl lg:text-5xl font-display font-bold leading-tight mb-3">{t("auth.heroTitle")} <span className="text-primary">{t("auth.heroCinema")}</span></h1>
          <p className="text-muted-foreground text-base lg:text-lg mb-8 max-w-md">{t("auth.heroDesc")}</p>
          <div className="space-y-3 max-w-lg">{features.map((feature) => <Card key={feature.title} className="bg-card/60 border-border/60"><CardContent className="flex items-start gap-3 p-4"><feature.icon aria-hidden className="w-5 h-5 mt-0.5 text-primary" /><div><p className="font-medium text-sm">{feature.title}</p><p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p></div></CardContent></Card>)}</div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center px-4 py-20 md:py-8" aria-labelledby="auth-title">
          <div className="w-full max-w-sm">
            <div className="mb-5"><h1 id="auth-title" className="text-2xl font-display font-bold">Continue to MovPrompt</h1><p className="mt-1 text-sm text-muted-foreground">Your unfinished campaign stays in this browser and returns after sign-in.</p></div>
            <Card className="bg-card border-border shadow-[inset_0_0_40px_0_hsl(var(--primary)/0.07)]"><CardContent className="p-5 sm:p-6 space-y-5">
              <Button variant="outline" className="w-full h-11" onClick={() => void socialSignIn("google")} disabled={busy !== null}>{busy === "google" && <Loader2 aria-hidden className="w-4 h-4 animate-spin me-2" />}Continue with Google</Button>
              <Button variant="outline" className="w-full h-11" onClick={() => void socialSignIn("apple")} disabled={busy !== null}>{busy === "apple" && <Loader2 aria-hidden className="w-4 h-4 animate-spin me-2" />}Continue with Apple</Button>
              <div className="relative" aria-hidden><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span></div></div>
              <Tabs defaultValue="signin">
                <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger><TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger></TabsList>
                <TabsContent value="signin">
                  {forgotMode ? <form onSubmit={forgotPassword} className="space-y-3 mt-4"><p className="text-sm text-muted-foreground">{t("auth.resetDesc")}</p><div className="space-y-1.5"><Label htmlFor="forgot-email">{t("auth.email")}</Label><Input className={fieldClass} id="forgot-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><Button className="w-full h-11" disabled={busy !== null}>{busy === "email" && <Loader2 aria-hidden className="w-4 h-4 animate-spin me-2" />}{t("auth.sendResetLink")}</Button><button type="button" onClick={() => setForgotMode(false)} className="min-h-11 text-xs text-primary hover:underline w-full">{t("auth.backToSignIn")}</button></form> : <form onSubmit={emailSignIn} className="space-y-3 mt-4"><div className="space-y-1.5"><Label htmlFor="signin-email">{t("auth.email")}</Label><Input className={fieldClass} id="signin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-1.5"><Label htmlFor="signin-password">{t("auth.password")}</Label><Input className={fieldClass} id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} /></div><Button className="w-full h-11" disabled={busy !== null}>{busy === "email" ? <Loader2 aria-hidden className="w-4 h-4 animate-spin me-2" /> : <Mail aria-hidden className="w-4 h-4 me-2" />}{t("auth.signIn")}</Button><button type="button" onClick={() => setForgotMode(true)} className="min-h-11 text-xs text-muted-foreground hover:text-primary w-full">{t("auth.forgotPassword")}</button></form>}
                </TabsContent>
                <TabsContent value="signup"><form onSubmit={emailSignUp} className="space-y-3 mt-4"><div className="space-y-1.5"><Label htmlFor="signup-name">Name</Label><Input className={fieldClass} id="signup-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div><div className="space-y-1.5"><Label htmlFor="signup-email">{t("auth.email")}</Label><Input className={fieldClass} id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-1.5"><Label htmlFor="signup-password">{t("auth.password")}</Label><Input className={fieldClass} id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} aria-describedby="password-help" /><p id="password-help" className="text-xs text-muted-foreground">Use at least 10 characters.</p></div><div className="flex items-start gap-2"><Checkbox id="agree-terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked === true)} className="mt-0.5" /><label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed">{t("auth.agreeTerms")} <Link to="/terms" className="text-primary underline-offset-4 hover:underline" target="_blank">{t("auth.termsLink")}</Link> &amp; <Link to="/privacy" className="text-primary underline-offset-4 hover:underline" target="_blank">{t("auth.privacyLink")}</Link></label></div><Button className="w-full h-11" disabled={busy !== null || !agreedToTerms}>{busy === "email" ? <Loader2 aria-hidden className="w-4 h-4 animate-spin me-2" /> : <Mail aria-hidden className="w-4 h-4 me-2" />}{t("auth.createAccount")}</Button></form></TabsContent>
              </Tabs>
            </CardContent></Card>
            <p className="mt-4 text-center text-xs text-muted-foreground" aria-live="polite">You’ll be asked to confirm the final render price after authentication.</p>
          </div>
        </motion.section>
      </div>
      <InstallPrompt />
    </main>
  );
}
