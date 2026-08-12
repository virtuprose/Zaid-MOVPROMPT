import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { consumeAuthReturnIntent, readAuthReturnIntent, safeAuthReturnPath } from "@/lib/auth/returnPath";

export default function AuthCallback() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptedRefresh = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestedPath = useMemo(
    () => safeAuthReturnPath(searchParams.get("next"), readAuthReturnIntent()),
    [searchParams],
  );

  useEffect(() => {
    if (loading || refreshing) return;
    if (user) {
      consumeAuthReturnIntent();
      navigate(requestedPath, { replace: true });
      return;
    }
    if (!attemptedRefresh.current) {
      attemptedRefresh.current = true;
      setRefreshing(true);
      void refresh().finally(() => setRefreshing(false));
      return;
    }
    navigate(`/auth?next=${encodeURIComponent(requestedPath)}`, { replace: true });
  }, [loading, navigate, refresh, refreshing, requestedPath, user]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4" role="status" aria-live="polite">
      <div className="text-center"><Loader2 aria-hidden className="mx-auto h-6 w-6 animate-spin text-primary" /><h1 className="mt-4 font-display text-lg font-semibold">Restoring your campaign</h1><p className="mt-1 text-sm text-muted-foreground">Keep this page open for a moment.</p></div>
    </main>
  );
}
