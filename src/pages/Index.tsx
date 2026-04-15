import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Camera, Layers, Film, BookOpen, ChevronDown, Upload, Copy, User, LogOut } from "lucide-react";

const WORKFLOWS = [
  {
    value: "single",
    label: "Single Frame",
    icon: Camera,
    description: "Upload one image. AI writes the perfect camera movement prompt.",
  },
  {
    value: "twoframe",
    label: "Two Frames",
    icon: Layers,
    description: "Upload start & end frames. AI crafts a seamless transition.",
  },
  {
    value: "multishot",
    label: "Multi-Shot",
    icon: Film,
    description: "Upload one concept. AI generates a full storyboard sequence.",
  },
];

const GUIDE_STEPS = [
  { icon: Layers, title: "Choose a Workflow", desc: "Pick Single Frame, Two Frames, or Multi-Shot depending on your project." },
  { icon: Upload, title: "Upload Your Image", desc: "Drag & drop or click to upload your reference frame(s)." },
  { icon: Copy, title: "Generate & Copy", desc: "Hit generate, review your cinematic prompt, and copy it to your clipboard." },
];

const Index = () => {
  const [guideOpen, setGuideOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackPageVisit("/");
  }, []);

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
        {/* Top bar */}
        <div className="flex justify-end mb-4">
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
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <User className="w-4 h-4 mr-1.5" />
                Sign In
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
            Your AI Director of Photography. Turn any still image into a director-grade cinematic video prompt.
          </p>
        </motion.header>

        {/* How-To Guide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8"
        >
          <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition-colors">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                How to Use
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${guideOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 mt-3 sm:grid-cols-3">
                {GUIDE_STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">{i + 1}</span>
                      <step.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* Workflow Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Tabs defaultValue="single" className="space-y-8">
            <TabsList className="grid grid-cols-3 w-full bg-secondary/50 border border-border p-1 h-auto">
              {WORKFLOWS.map((w) => (
                <TabsTrigger
                  key={w.value}
                  value={w.value}
                  className="flex flex-col gap-1 sm:gap-1.5 py-2 sm:py-3 px-1.5 sm:px-2 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border-primary/30 rounded-lg transition-all"
                >
                  <w.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-[11px] sm:text-sm font-medium font-display">{w.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {WORKFLOWS.map((w) => (
              <TabsContent key={w.value} value={w.value} className="space-y-6">
                <p className="text-center text-sm text-muted-foreground">{w.description}</p>
                <WorkflowPanel type={w.value as "single" | "twoframe" | "multishot"} />
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-muted-foreground/60">
            MovPrompt — AI-powered cinematic prompts
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
