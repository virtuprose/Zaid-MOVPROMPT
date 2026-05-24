import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Coins, Cpu, MessageSquare } from "lucide-react";
import { RailSection } from "./RailSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SessionHealthCardProps {
  messages: any[];
}

export function SessionHealthCard({ messages }: SessionHealthCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setCredits(data?.balance ?? 0);
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [user?.id]);

  const chars = messages.reduce(
    (n, m) => n + (typeof m?.content === "string" ? m.content.length : 0),
    0,
  );
  const tokens = Math.ceil(chars / 4);

  const stats = [
    { icon: Coins, label: "Credits", value: credits == null ? "…" : credits.toLocaleString() },
    { icon: Cpu, label: "Model", value: "Gemini 3.1 Pro" },
    { icon: MessageSquare, label: "Messages", value: messages.length },
    { icon: Activity, label: "~Tokens", value: tokens.toLocaleString() },
  ];

  return (
    <RailSection id="session-health" title="Session Health" icon={<Activity className="w-3.5 h-3.5" />}>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5"
          >
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon className="w-3 h-3" />
              {label}
            </div>
            <div className="text-[12px] font-medium text-foreground truncate">{value}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate("/account/billing")}
        className="mt-2 w-full text-[11px] text-primary hover:underline"
      >
        Manage credits →
      </button>
    </RailSection>
  );
}
