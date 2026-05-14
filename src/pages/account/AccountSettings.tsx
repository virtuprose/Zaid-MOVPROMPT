import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Seo } from "@/components/Seo";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Account settings · MovPrompt" description="Manage your profile, email, and password." />
      <TopNav />
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-accent" /> Account settings
        </h1>
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Profile</h2>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input defaultValue={user?.user_metadata?.full_name || ""} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label>
              <Input defaultValue={user?.email || ""} disabled />
            </div>
            <Button variant="default" size="sm" disabled>Save changes</Button>
          </Card>
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </h2>
            <p className="text-sm text-muted-foreground">Send yourself a reset link to change your password.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/reset-password")}>Reset password</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
