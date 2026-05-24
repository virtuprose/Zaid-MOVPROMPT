import { ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RailSectionProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function RailSection({ id, title, icon, badge, defaultOpen = true, children }: RailSectionProps) {
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
    <section className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="flex-1 text-[11px] font-display uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {badge}
        <ChevronDown
          className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
