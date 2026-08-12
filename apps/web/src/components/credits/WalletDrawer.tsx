import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Coins, ArrowDownRight, ArrowUpRight, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits, fetchLedger, type LedgerEntry } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

function formatReason(r: string) {
  return REASON_LABEL[r] || r.replace(/_/g, " ");
}

export function WalletDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    if (open && user) void fetchLedger(user.id, 50).then(setEntries);
  }, [open, user]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" /> Credits
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 rounded-2xl border border-border/60 bg-[hsl(240_5%_8%)] p-5">
          <div className="text-xs uppercase text-muted-foreground tracking-wider">Balance</div>
          <div className="mt-1 font-display text-4xl tabular-nums">{balance ?? "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">+10 free credits per day, capped at 30.</div>
          <Button
            className="mt-4 w-full rounded-full"
            onClick={() => {
              onOpenChange(false);
              navigate("/account/billing");
            }}
          >
            Get more credits
          </Button>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Recent activity</div>
          <ul className="space-y-1">
            {entries.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
            {entries.map((e) => {
              const positive = e.delta > 0;
              return (
                <li key={e.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <div
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      positive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {e.reason.includes("bonus") || e.reason === "daily_grant" ? (
                      <Gift className="w-3.5 h-3.5" />
                    ) : positive ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{formatReason(e.reason)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className={`text-sm tabular-nums ${positive ? "text-emerald-400" : "text-foreground/80"}`}>
                    {positive ? "+" : ""}
                    {e.delta}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
