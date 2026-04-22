import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Send welcome email for first-time OAuth signups
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          const isOAuth = u.app_metadata?.provider !== "email";
          const createdAt = new Date(u.created_at).getTime();
          const isNew = Date.now() - createdAt < 60_000; // created within last 60s
          if (isOAuth && isNew) {
            try { localStorage.setItem("first_signup_pending", "1"); } catch {}
            const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "";
            supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "welcome",
                recipientEmail: u.email,
                idempotencyKey: `welcome-${u.id}`,
                templateData: { name },
              },
            });
          }
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
};
