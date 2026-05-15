import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ApprovalRequest } from "./ApprovalRequest";

type RequestArgs = Omit<ApprovalRequest, "id" | "onConfirm" | "onCancel"> & {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
};

type Ctx = {
  pending: ApprovalRequest | null;
  request: (args: RequestArgs) => void;
  clear: () => void;
};

const ApprovalContext = createContext<Ctx | null>(null);

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ApprovalRequest | null>(null);

  const clear = useCallback(() => setPending(null), []);

  const request = useCallback((args: RequestArgs) => {
    // If user previously chose "always allow" for this key, auto-confirm.
    if (args.alwaysAllowKey && localStorage.getItem(args.alwaysAllowKey) === "1") {
      void args.onConfirm();
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setPending({
      ...args,
      id,
      onConfirm: () => {
        setPending(null);
        void args.onConfirm();
      },
      onCancel: () => {
        setPending(null);
        args.onCancel?.();
      },
    });
  }, []);

  return (
    <ApprovalContext.Provider value={{ pending, request, clear }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApproval() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error("useApproval must be used within ApprovalProvider");
  return ctx;
}
