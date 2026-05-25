import { ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RailSectionProps {
  id: string;
  title: string;
  accent?: "brand" | "primary" | "muted";
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  /** kept for backwards-compat; ignored in flat layout */
  icon?: ReactNode;
}

const ACCENT_BAR: Record<NonNullable<RailSectionProps["accent"]>, string> = {
  brand: "bg-[hsl(var(--brand))]",
  primary: "bg-[hsl(var(--primary))]",
  muted: "bg-foreground/20",
};

export function RailSection({
  id,
  title,
  accent = "brand",
  badge,
  defaultOpen = true,
  children,
}: RailSectionProps) {
  const storageKey = `director-rail-${id}-open`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v != null) setOpen(v === "1");
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 text-left group"
      >
        <span className={cn("w-1 h-3 rounded-full", ACCENT_BAR[accent])} />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 group-hover:text-foreground transition-colors">
          {title}
        </span>
        {badge}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground/60 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
