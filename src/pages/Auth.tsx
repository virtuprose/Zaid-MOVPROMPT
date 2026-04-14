import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, Camera, Layers, History } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Camera,
    title: "AI Director of Photography",
    description: "Upload any frame and get cinematic video prompts tuned for top AI models.",
    color: "text-primary",
  },
  {
    icon: Layers,
    title: "3 Powerful Workflows",
    description: "Single Frame, Two Frames, or Multi-Shot Storyboard — pick your creative path.",
    color: "text-accent",
  },
  {
    icon: History,
    title: "Save & Reuse",
    description: "Sign in to keep your prompt history and revisit your best cinematic directions.",
    color: "text-primary",
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a password reset link." });
      setForgotMode(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-accent/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 grid md:grid-cols-2 min-h-screen">
        {/* Left — Marketing */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center px-6 py-10 md:px-12 lg:px-16"
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </button>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight mb-3">
            Turn Stills Into{" "}
            <span className="text-primary">Cinema</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md">
            AI-powered cinematic prompt generation. Upload a frame, choose your workflow, and get production-ready prompts for any video model.
          </p>

          <div className="space-y-4 mb-8">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
              >
                <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                  <CardContent className="flex items-start gap-3 p-4">
                    <feat.icon className={`w-5 h-5 mt-0.5 shrink-0 ${feat.color}`} />
                    <div>
                      <p className="font-medium text-sm text-foreground">{feat.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feat.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60 hidden md:block">
            Trusted by filmmakers and creators worldwide
          </p>
        </motion.div>

        {/* Right — Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center px-4 py-8 md:py-0"
        >
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-mono font-bold mb-1 md:hidden">
              Mov<span className="text-primary">Prompt</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-5 md:mb-6">
              Sign in to save your prompts & unlock full access
            </p>

            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-5">
                {/* Google */}
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                {/* Email tabs */}
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    {forgotMode ? (
                      <form onSubmit={handleForgotPassword} className="space-y-3 mt-3">
                        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                        <div className="space-y-1.5">
                          <Label htmlFor="forgot-email">Email</Label>
                          <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                          Send Reset Link
                        </Button>
                        <button type="button" onClick={() => setForgotMode(false)} className="text-xs text-primary hover:underline w-full text-center">
                          Back to sign in
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleEmailSignIn} className="space-y-3 mt-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="signin-email">Email</Label>
                          <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signin-password">Password</Label>
                          <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                          Sign In
                        </Button>
                        <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-muted-foreground hover:text-primary w-full text-center transition-colors">
                          Forgot your password?
                        </button>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleEmailSignUp} className="space-y-3 mt-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                        Create Account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
