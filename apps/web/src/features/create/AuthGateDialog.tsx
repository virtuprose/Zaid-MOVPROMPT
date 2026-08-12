import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { lovable } from "@/integrations/lovable";
import { isFeatureEnabled } from "@/config/features";
import { portableAuthActions } from "@/lib/auth/portableAuthActions";
import { authCallbackUrl, rememberAuthReturnIntent, safeAuthReturnPath } from "@/lib/auth/returnPath";
import { authErrorMessage } from "@/lib/auth/portableAuthClient";

export function AuthGateDialog({ open, onOpenChange, returnPath }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
}) {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<"google" | "apple" | null>(null);
  const safeReturnPath = safeAuthReturnPath(returnPath);
  const portableAuth = isFeatureEnabled("portableAuth");
  const redirectUri = portableAuth ? authCallbackUrl(safeReturnPath) : `${window.location.origin}${safeReturnPath}`;

  const startOAuth = async (nextProvider: "google" | "apple") => {
    setProvider(nextProvider);
    rememberAuthReturnIntent(safeReturnPath);
    const result = portableAuth
      ? await portableAuthActions.signInSocial({ provider: nextProvider, callbackURL: redirectUri }) as { error?: unknown }
      : await lovable.auth.signInWithOAuth(nextProvider, { redirect_uri: redirectUri });
    if (result.error) {
      setProvider(null);
      toast.error(`Could not continue with ${nextProvider === "google" ? "Google" : "Apple"}. ${authErrorMessage(result.error)} Your campaign is still saved in this browser.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="creator-auth-gate sm:max-w-[440px]">
        <div className="creator-auth-gate-icon"><LockKeyhole aria-hidden="true" /></div>
        <DialogTitle>Your campaign is ready to create</DialogTitle>
        <DialogDescription>
          Create an account to start the render. Your product, template and campaign settings will return exactly as you left them on this browser.
        </DialogDescription>
        <div className="creator-auth-gate-actions">
          <button className="creator-button creator-button-primary" type="button" onClick={() => void startOAuth("google")} disabled={provider !== null}>
            {provider === "google" && <Loader2 className="animate-spin" aria-hidden="true" />} Continue with Google
          </button>
          <button className="creator-button creator-button-secondary" type="button" onClick={() => void startOAuth("apple")} disabled={provider !== null}>
            {provider === "apple" && <Loader2 className="animate-spin" aria-hidden="true" />} Continue with Apple
          </button>
          <button className="creator-button creator-button-quiet" type="button" onClick={() => navigate(`/auth?next=${encodeURIComponent(safeReturnPath)}`)} disabled={provider !== null}>
            Continue with email
          </button>
        </div>
        <p className="creator-auth-gate-note">No charge is made until the final price is confirmed. Cancel to keep editing.</p>
      </DialogContent>
    </Dialog>
  );
}
