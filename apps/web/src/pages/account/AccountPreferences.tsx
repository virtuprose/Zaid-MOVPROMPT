import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { TopNav } from "@/components/TopNav";
import { useTheme } from "@/components/ThemeProvider";



const AccountPreferences = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Preferences · MovPrompt" description="Language and notification preferences." />
      <TopNav />
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-6">Preferences</h1>
        <div className="space-y-4">
          <Card className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-accent" />
              <div>
                <p className="font-medium text-sm">Language</p>
                <p className="text-xs text-muted-foreground">Choose your interface language</p>
              </div>
            </div>
            <LanguageToggle />
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-accent" />}
              <div>
                <p className="font-medium text-sm">Appearance</p>
                <p className="text-xs text-muted-foreground">Choose dark or light mode</p>
              </div>
            </div>
            <div className="inline-flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-3 py-1.5 text-xs rounded-[4px] transition-colors ${theme === "dark" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-3 py-1.5 text-xs rounded-[4px] transition-colors ${theme === "light" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Light
              </button>
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-accent" />
              <div>
                <p className="font-medium text-sm">Notifications</p>
                <p className="text-xs text-muted-foreground">Email and in-app alerts (coming soon)</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>Configure</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountPreferences;
