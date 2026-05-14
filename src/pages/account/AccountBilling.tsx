import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { TopNav } from "@/components/TopNav";

const AccountBilling = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Billing · MovPrompt" description="Manage your subscription and payment method." />
      <TopNav />
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-accent" /> Billing & subscription
        </h1>
        <Card className="p-6 text-center space-y-3">
          <p className="text-lg font-medium">You're on the Free plan</p>
          <p className="text-sm text-muted-foreground">Paid plans are coming soon. Stay tuned for premium features and higher limits.</p>
          <Button variant="outline" size="sm" disabled>Manage subscription</Button>
        </Card>
      </div>
    </div>
  );
};

export default AccountBilling;
