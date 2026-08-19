import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { enabledSocialAuthProviders } from "@/config/authProviders";
import { lovable } from "@/integrations/lovable";
import { isFeatureEnabled } from "@/config/features";
import { portableAuthActions } from "@/lib/auth/portableAuthActions";
import { authCallbackUrl, rememberAuthReturnIntent, safeAuthReturnPath } from "@/lib/auth/returnPath";
import { authErrorMessage } from "@/lib/auth/portableAuthClient";
import { useLanguage } from "@/i18n/LanguageContext";

export function AuthGateDialog({ open, onOpenChange, returnPath }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<"google" | "apple" | null>(null);
  const safeReturnPath = safeAuthReturnPath(returnPath);
  const portableAuth = isFeatureEnabled("portableAuth");
  const socialProviders = enabledSocialAuthProviders();
  const redirectUri = portableAuth ? authCallbackUrl(safeReturnPath) : `${window.location.origin}${safeReturnPath}`;

  const startOAuth = async (nextProvider: "google" | "apple") => {
    setProvider(nextProvider);
    rememberAuthReturnIntent(safeReturnPath);
    const result = portableAuth
      ? await portableAuthActions.signInSocial({ provider: nextProvider, callbackURL: redirectUri }) as { error?: unknown }
      : await lovable.auth.signInWithOAuth(nextProvider, { redirect_uri: redirectUri });
    if (result.error) {
      setProvider(null);
      toast.error(`${t("auth.socialFailed").replace("{provider}", nextProvider === "google" ? "Google" : "Apple")}. ${authErrorMessage(result.error)} ${t("auth.draftStillSaved")}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="creator-auth-gate sm:max-w-[440px]"
        overlayClassName="bg-black/55 backdrop-blur-md"
        closeLabel={t("auth.close")}
      >
        <div className="creator-auth-gate-icon"><LockKeyhole aria-hidden="true" /></div>
        <DialogTitle>{t("auth.gateTitle")}</DialogTitle>
        <DialogDescription>
          {t("auth.gateDescription")}
        </DialogDescription>
        <div className="creator-auth-gate-actions">
          {socialProviders.map((nextProvider, index) => (
            <button key={nextProvider} className={`creator-button ${index === 0 ? "creator-button-primary" : "creator-button-secondary"}`} type="button" onClick={() => void startOAuth(nextProvider)} disabled={provider !== null}>
              {provider === nextProvider && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t(nextProvider === "google" ? "auth.continueGoogle" : "auth.continueApple")}
            </button>
          ))}
          <button className={`creator-button ${socialProviders.length === 0 ? "creator-button-primary" : "creator-button-quiet"}`} type="button" onClick={() => navigate(`/auth?next=${encodeURIComponent(safeReturnPath)}`)} disabled={provider !== null}>
            {t("auth.continueEmail")}
          </button>
        </div>
        <p className="creator-auth-gate-note">{t("auth.gatePriceNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
