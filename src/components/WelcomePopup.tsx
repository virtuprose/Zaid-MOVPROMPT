import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Popup {
  id: string;
  title: string;
  title_ar: string | null;
  message: string;
  message_ar: string | null;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  link_text_ar: string | null;
}

const WelcomePopup = () => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const { locale, t } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("welcome_popups")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const key = `welcome_popup_seen_${data.id}`;
      if (sessionStorage.getItem(key)) return;
      setPopup(data as Popup);
      setOpen(true);
    })();
  }, []);

  const handleClose = () => {
    if (popup) sessionStorage.setItem(`welcome_popup_seen_${popup.id}`, "1");
    setOpen(false);
  };

  if (!popup) return null;

  const isAr = locale === "ar";
  const title = (isAr && popup.title_ar) || popup.title;
  const message = (isAr && popup.message_ar) || popup.message;
  const linkText = (isAr && popup.link_text_ar) || popup.link_text || t("welcomePopup.learnMore");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        {popup.image_url && (
          /\.(mp4|webm|mov|ogg)(\?|$)/i.test(popup.image_url) ? (
            <video src={popup.image_url} className="w-full rounded-md max-h-48 object-cover" controls autoPlay muted loop />
          ) : (
            <img src={popup.image_url} alt="" className="w-full rounded-md max-h-48 object-cover" />
          )
        )}
        <DialogDescription className="text-sm whitespace-pre-wrap">{message}</DialogDescription>
        <div className="flex justify-end gap-2 mt-2">
          {popup.link_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={popup.link_url} target="_blank" rel="noopener noreferrer">{linkText}</a>
            </Button>
          )}
          <Button size="sm" onClick={handleClose}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
