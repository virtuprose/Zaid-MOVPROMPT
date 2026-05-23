import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { TopNav } from "@/components/TopNav";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}


export const AuthGuard = ({ children, requireAdmin = false, fallback }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const [roleResolved, setRoleResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const checkedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requireAdmin) {
      setRoleResolved(true);
      return;
    }

    // Auth still loading — don't resolve yet
    if (loading) return;

    // No user after auth finished — mark resolved so redirect fires
    if (!user) {
      setRoleResolved(true);
      setIsAdmin(false);
      return;
    }

    // Already checked this exact user
    if (checkedUserRef.current === user.id && roleResolved) return;

    // New user or first check — reset and fetch
    setRoleResolved(false);
    setIsAdmin(false);
    const userId = user.id;

    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role", { _role: "admin" });
      // Ignore stale result if user changed
      if (checkedUserRef.current !== userId) {
        checkedUserRef.current = userId;
      }
      checkedUserRef.current = userId;
      setIsAdmin(!!data);
      setRoleResolved(true);
    };

    checkAdmin();
  }, [user, loading, requireAdmin]);

  // Still loading auth or role check
  if (loading || (requireAdmin && !roleResolved)) {
    if (fallback) {
      return (
        <>
          <TopNav />
          {fallback}
        </>
      );
    }
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }


  if (!user) {
    return <Navigate to={requireAdmin ? "/admin/login" : "/auth"} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
