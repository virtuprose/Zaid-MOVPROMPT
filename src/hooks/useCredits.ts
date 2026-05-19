import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LedgerEntry = {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  ref_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setBalance(null);
      return;
    }
    setLoading(true);
    // Trigger daily grant lazily, then read the balance.
    try {
      await supabase.rpc("grant_daily_credits_if_due", { _user_id: user.id });
    } catch {
      /* ignore — grant is best-effort */
    }
    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime balance updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`credits-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const next = (payload.new as { balance?: number } | undefined)?.balance;
          if (typeof next === "number") setBalance(next);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user]);

  return { balance, loading, refresh };
}

export async function fetchLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const { data } = await supabase
    .from("credit_ledger")
    .select("id, delta, balance_after, reason, ref_id, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as LedgerEntry[];
}
