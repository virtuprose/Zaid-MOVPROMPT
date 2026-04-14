import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { motion } from "framer-motion";
import { Camera, Layers, Film } from "lucide-react";

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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
              Mov<span className="text-primary">Prompt</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Your AI Director of Photography. Turn any still image into a director-grade cinematic video prompt.
          </p>
        </motion.header>

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
                  className="flex flex-col gap-1.5 py-3 px-2 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:border-primary/30 rounded-lg transition-all"
                >
                  <w.icon className="w-5 h-5" />
                  <span className="text-xs sm:text-sm font-medium font-display">{w.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Workflow descriptions */}
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
