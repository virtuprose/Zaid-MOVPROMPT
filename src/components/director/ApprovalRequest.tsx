import { useEffect, useState } from "react";
import { Sparkles, Hand, Copy, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ApprovalAction = "image" | "video" | "enhance" | "generic";

export type ApprovalRequest = {
  id: string;
  action: ApprovalAction;
  label: string; // e.g. "Image generation", "Video render"
  question: string; // e.g. "Approve image?"
  items?: string[]; // numbered preview lines
  cost: number; // credits
  alwaysAllowKey?: string; // localStorage key for "always allow"
  onConfirm: () => void;
  onCancel: () => void;
};

const fmtCredits = (n: number) => Number((n ?? 0).toFixed(2)).toString();


const ACTION_LABEL: Record<ApprovalAction, string> = {
  image: "Image generation",
  video: "Video render",
  enhance: "Prompt enhance",
  generic: "Action",
};

export function getActionLabel(action: ApprovalAction) {
  return ACTION_LABEL[action];
}

/** Inline card that appears as a chat bubble awaiting approval. */
export function InlineApprovalCard({ request }: { request: ApprovalRequest }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-[hsl(240_5%_8%)] p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-primary">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="font-medium">{request.label}</span>
        <span className="text-muted-foreground font-normal">{request.question}</span>
      </div>

      {request.items && request.items.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-[hsl(240_5%_6%)] divide-y divide-border/40">
          {request.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 px-3 py-2.5">
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-muted/60 text-[11px] text-muted-foreground shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm text-foreground/85 leading-snug truncate">
                {item}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={request.onCancel}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={request.onConfirm}
          className="rounded-full gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
        >
          {request.action === "image" ? "Generate" : "Approve"}
          <span className="inline-flex items-center gap-0.5 text-[11px] opacity-90">
            <Sparkles className="w-3 h-3" />
            {request.cost.toFixed(3)}
          </span>
        </Button>
      </div>
    </div>
  );
}

/** Small status pill: 'Awaiting your approval'. */
export function AwaitingApprovalPill() {
  return (
    <div className="flex items-center gap-2 text-sm text-primary">
      <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-primary/10 border border-primary/25">
        <Copy className="w-3.5 h-3.5" />
      </span>
      <span className="font-medium">Awaiting your approval</span>
    </div>
  );
}

/** Sticky bar above composer — shows action + Always allow / Cancel / Approve. */
export function BottomApprovalBar({ request }: { request: ApprovalRequest }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!request.alwaysAllowKey) return;
    setAllowed(localStorage.getItem(request.alwaysAllowKey) === "1");
  }, [request.alwaysAllowKey]);

  // Auto-confirm if already always-allowed
  useEffect(() => {
    if (allowed) request.onConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const toggleAlways = () => {
    if (!request.alwaysAllowKey) return;
    const next = !allowed;
    if (next) localStorage.setItem(request.alwaysAllowKey, "1");
    else localStorage.removeItem(request.alwaysAllowKey);
    setAllowed(next);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-[hsl(240_5%_7%)] px-3 py-2.5 flex items-center gap-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.5)]">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Hand className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm text-foreground/90 truncate">
          <span className="text-muted-foreground">Needs approval to run </span>
          <span className="font-medium">{request.label}</span>
        </span>
      </div>

      {request.alwaysAllowKey && (
        <button
          type="button"
          onClick={toggleAlways}
          className={cn(
            "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors",
            allowed
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Check className="w-3.5 h-3.5" />
          Always allow
        </button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={request.onCancel}
        className="rounded-full text-muted-foreground hover:text-foreground h-8"
      >
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={request.onConfirm}
        className="rounded-full gap-1.5 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 h-8"
      >
        {request.action === "image" ? "Generate" : "Approve"}
        <span className="inline-flex items-center gap-0.5 text-[11px] opacity-90">
          <Sparkles className="w-3 h-3" />
          {request.cost.toFixed(3)}
        </span>
      </Button>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={request.onCancel}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
