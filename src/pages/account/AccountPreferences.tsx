import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { TopNav } from "@/components/TopNav";

const AccountPreferences = () => {
  const navigate = useNavigate();
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
