import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  title: string;
  title_ar: string | null;
  message: string;
  message_ar: string | null;
  type: string;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user.id),
    ]);

    setNotifications(notifs || []);
    setReadIds(new Set((reads || []).map((r) => r.notification_id)));
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user || readIds.has(notificationId)) return;
    await supabase.from("notification_reads").insert({
      notification_id: notificationId,
      user_id: user.id,
    });
    setReadIds((prev) => new Set([...prev, notificationId]));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !readIds.has(n.id));
    if (unread.length === 0) return;

    const inserts = unread.map((n) => ({
      notification_id: n.id,
      user_id: user.id,
    }));

    await supabase.from("notification_reads").insert(inserts);
    setReadIds((prev) => {
      const next = new Set(prev);
      unread.forEach((n) => next.add(n.id));
      return next;
    });
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const getTitle = (n: Notification) => (locale === "ar" && n.title_ar) ? n.title_ar : n.title;
  const getMessage = (n: Notification) => (locale === "ar" && n.message_ar) ? n.message_ar : n.message;

  const typeColor = (type: string) => {
    switch (type) {
      case "alert": return "text-destructive";
      case "update": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">{t("notifications.title")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[320px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("notifications.empty")}</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                      !isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      {!isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className={!isRead ? "" : "ml-4"}>
                        <p className="text-sm font-medium leading-tight">{getTitle(n)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{getMessage(n)}</p>
                        <p className={`text-[10px] mt-1 ${typeColor(n.type)}`}>
                          {new Date(n.created_at).toLocaleDateString()} · {n.type}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
