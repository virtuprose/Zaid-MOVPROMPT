import { useState } from "react";
import { Coins } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { WalletDrawer } from "./WalletDrawer";
import { cn } from "@/lib/utils";

export function CreditBadge({ className }: { className?: string }) {
  const { balance } = useCredits();
  const [open, setOpen] = useState(false);

  if (balance === null) return null;

  const low = balance < 10;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-medium transition-colors",
          low
            ? "border-accent/40 text-accent bg-accent/10 hover:bg-accent/20"
            : "border-border/50 text-foreground/90 bg-[hsl(240_5%_9%)] hover:border-border",
          className,
        )}
        aria-label={`${balance} credits — open wallet`}
        title={`${balance} credits`}
      >
        <Coins className="w-3.5 h-3.5" />
        <span className="tabular-nums">{balance}</span>
      </button>
      <WalletDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
