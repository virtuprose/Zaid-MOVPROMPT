import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TOUR_DONE_KEY_PREFIX, TOUR_STEPS, WELCOME_DISMISSED_FLAG } from "./tourSteps";

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  stop: (markDone?: boolean) => void;
  next: () => void;
  prev: () => void;
  isDone: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

const doneKeyFor = (userId?: string | null) =>
  userId ? `${TOUR_DONE_KEY_PREFIX}.${userId}` : `${TOUR_DONE_KEY_PREFIX}.anon`;

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const autoStartedRef = useRef(false);

  // Load done flag whenever user changes
  useEffect(() => {
    if (loading) return;
    try {
      const done = localStorage.getItem(doneKeyFor(user?.id));
      setIsDone(done === "1");
    } catch {
      setIsDone(false);
    }
  }, [user, loading]);

  const stop = useCallback(
    (markDone: boolean = true) => {
      setActive(false);
      setStepIndex(0);
      if (markDone) {
        try {
          localStorage.setItem(doneKeyFor(user?.id), "1");
          setIsDone(true);
        } catch {
          /* ignore */
        }
      }
    },
    [user],
  );

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        // Finish: mark done, open Learn page
        try {
          localStorage.setItem(doneKeyFor(user?.id), "1");
          setIsDone(true);
        } catch {
          /* ignore */
        }
        setActive(false);
        try {
          window.open("/learn", "_blank", "noopener,noreferrer");
        } catch {
          /* ignore */
        }
        return 0;
      }
      return i + 1;
    });
  }, [user]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-start once after WelcomePopup is dismissed (or immediately if no popup)
  useEffect(() => {
    if (loading || !user || autoStartedRef.current) return;
    if (isDone) return;
    let cancelled = false;

    const tryStart = () => {
      if (cancelled || autoStartedRef.current) return;
      const dismissed = sessionStorage.getItem(WELCOME_DISMISSED_FLAG) === "1";
      const popupOpen = !!document.querySelector('[role="dialog"]');
      if (dismissed || !popupOpen) {
        autoStartedRef.current = true;
        // Tiny delay to ensure DOM is settled
        setTimeout(() => !cancelled && start(), 400);
      }
    };

    // Wait briefly for WelcomePopup to mount, then poll
    const initial = setTimeout(tryStart, 1500);
    const poll = setInterval(tryStart, 800);
    const cap = setTimeout(() => clearInterval(poll), 30000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(poll);
      clearTimeout(cap);
    };
  }, [user, loading, isDone, start]);

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      stepIndex,
      totalSteps: TOUR_STEPS.length,
      start,
      stop,
      next,
      prev,
      isDone,
    }),
    [active, stepIndex, start, stop, next, prev, isDone],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};
