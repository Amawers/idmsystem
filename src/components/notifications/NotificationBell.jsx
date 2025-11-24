import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const severityStyles = {
  critical: {
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-600",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-600",
  },
  info: {
    dot: "bg-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-600",
  },
  default: {
    dot: "bg-gray-400",
    badge: "border-muted bg-muted text-muted-foreground",
  },
};

const getSeverityStyle = (severity) => severityStyles[severity] || severityStyles.default;

function NotificationItem({ notification, isUnread, onMarkRead }) {
  const style = getSeverityStyle(notification.severity);
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
    } catch {
      return "Just now";
    }
  }, [notification.createdAt]);

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-3 transition-colors",
        isUnread ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} aria-hidden />
          <div>
            <p className="text-sm font-medium leading-tight">{notification.title}</p>
            <p className="text-xs text-muted-foreground">{notification.actor}</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{relativeTime}</span>
      </div>

      <p className="text-sm text-muted-foreground">{notification.message}</p>

      {notification.resourceLabel && (
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {notification.resourceLabel}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("h-6", style.badge)}>
          {notification.category ? notification.category.toUpperCase() : "SYSTEM"}
        </Badge>
        {isUnread ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onMarkRead(notification.id)}
          >
            Mark as read
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Read</span>
        )}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isOnline,
    hasCachedData,
    lastSyncedAt,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isNotificationUnread,
  } = useNotifications({ limit: 25 });

  const syncStatus = useMemo(() => {
    if (!isOnline) return "Offline • showing cached activity";
    if (lastSyncedAt) {
      try {
        return `Updated ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`;
      } catch {
        return "Updated moments ago";
      }
    }
    return "Syncing recent activity...";
  }, [isOnline, lastSyncedAt]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        <div className="flex items-start justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{syncStatus}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refreshNotifications}
              disabled={!isOnline || loading}
              aria-label="Refresh notifications"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Mark all as read
            </Button>
          </div>
        </div>

        <Separator />

        {!isOnline && (
          <Alert variant="default" className="mx-4 mt-3">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You're offline. Reviewing cached notifications only.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mx-4 mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error.message || "Unable to load notifications."}
            </AlertDescription>
          </Alert>
        )}

        <div className="px-4 py-3">
          {loading && !hasCachedData ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Fetching recent activity...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Inbox className="h-6 w-6" />
              <div>
                <p className="font-medium">You're all caught up</p>
                <p className="text-xs">We'll let you know when there's something new.</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isUnread={isNotificationUnread(notification.id)}
                    onMarkRead={markAsRead}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
