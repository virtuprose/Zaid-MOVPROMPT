import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, CreditCard, Gift, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/hooks/useAuth";
import { useCredits, fetchLedger, type LedgerEntry } from "@/hooks/useCredits";

const REASON_LABEL: Record<string, string> = {
  signup_bonus: "Welcome bonus",
  backfill_bonus: "Welcome bonus",
  daily_grant: "Daily free credits",
  director_chat_text: "Director chat",
  director_chat_multimodal: "Director chat (with media)",
  image_generation: "Image generation",
  image_generation_refund: "Image refund",
  write_ad_scene: "Ad scene writer",
  write_ad_scene_refund: "Ad scene refund",
  video_render: "Video render",
  video_render_refund: "Video render refund",
};

const AccountBilling = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useCredits();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    if (user) void fetchLedger(user.id, 100).then(setEntries);
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Billing · MovPrompt" description="Manage your credits and subscription." />
      <TopNav />
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-accent" /> Billing & credits
        </h1>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Credit balance</div>
              <div className="mt-1 font-display text-4xl tabular-nums flex items-center gap-2">
                <Coins className="w-7 h-7 text-accent" /> {balance ?? "—"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">+10 free credits per day, capped at 30.</div>
            </div>
            <Button disabled className="rounded-full">Top up (coming soon)</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium mb-3">Recent activity</div>
          {entries.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
          <ul className="divide-y divide-border/40">
            {entries.map((e) => {
              const positive = e.delta > 0;
              return (
                <li key={e.id} className="py-3 flex items-center gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${positive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/40 text-muted-foreground"}`}>
                    {e.reason.includes("bonus") || e.reason === "daily_grant" ? (
                      <Gift className="w-4 h-4" />
                    ) : positive ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{REASON_LABEL[e.reason] || e.reason.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`text-sm tabular-nums ${positive ? "text-emerald-400" : "text-foreground/80"}`}>
                    {positive ? "+" : ""}{e.delta}
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                    {e.balance_after}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AccountBilling;
