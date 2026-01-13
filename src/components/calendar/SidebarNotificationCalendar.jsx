import * as React from "react";
import { format } from "date-fns";
import { Filter } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
  formatCategoryLabel,
  getNotificationCategoryBadgeClass,
  getNotificationCategoryDotClass,
  getSortedCategoriesFromNotifications,
  groupNotificationsByDay,
  toLocalDateKey,
} from "@/lib/notificationCalendar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

function NotificationDayButton({
  className,
  day,
  modifiers,
  byDay,
  enabledCategories,
  ...props
}) {
  const dateKey = React.useMemo(() => toLocalDateKey(day?.date), [day?.date]);
  const entry = dateKey ? byDay.get(dateKey) : null;

  const categories = React.useMemo(() => {
    if (!entry) return [];
    const list = Array.from(entry.categories);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [entry]);

  const visibleCategories = React.useMemo(() => {
    if (!categories.length) return [];
    if (!enabledCategories) return categories;
    return categories.filter((c) => enabledCategories.has(c));
  }, [categories, enabledCategories]);

  const showDots = visibleCategories.slice(0, 3);

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        className,
      )}
      {...props}
    >
      {props.children}
      {showDots.length > 0 && (
        <span className="flex items-center justify-center gap-1" aria-hidden>
          {showDots.map((category) => (
            <span
              key={category}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                getNotificationCategoryDotClass(category),
              )}
            />
          ))}
        </span>
      )}
    </Button>
  );
}

function NotificationListItem({ notification, onViewDetails }) {
  const category = notification?.category ? String(notification.category).toLowerCase() : "system";
  const createdAt = notification?.createdAt ? new Date(notification.createdAt) : null;

  return (
    <div className="space-y-1 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{notification?.title || "Notification"}</p>
          {notification?.actor && (
            <p className="truncate text-xs text-muted-foreground">{notification.actor}</p>
          )}
        </div>
        {createdAt && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {format(createdAt, "p")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("h-6", getNotificationCategoryBadgeClass(category))}>
          {formatCategoryLabel(category)}
        </Badge>
        <div className="flex items-center gap-2">
          {notification?.resourceLabel && (
            <span className="max-w-[180px] truncate text-[11px] text-muted-foreground">
              {notification.resourceLabel}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onViewDetails?.(notification)}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationDetailsDialog({ open, onOpenChange, notification }) {
  const createdAt = notification?.createdAt ? new Date(notification.createdAt) : null;
  const category = notification?.category ? String(notification.category).toLowerCase() : "system";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{notification?.title || "Notification details"}</DialogTitle>
          <DialogDescription>
            {createdAt ? format(createdAt, "PPP p") : "Details"}
          </DialogDescription>
        </DialogHeader>

        {!notification ? (
          <p className="text-sm text-muted-foreground">No notification selected.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("h-6", getNotificationCategoryBadgeClass(category))}>
                {formatCategoryLabel(category)}
              </Badge>
              {notification?.severity && (
                <Badge variant="outline" className="h-6">
                  {String(notification.severity).toUpperCase()}
                </Badge>
              )}
            </div>

            {notification?.actor && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Actor</p>
                <p className="text-sm">{notification.actor}</p>
              </div>
            )}

            {notification?.message && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Message</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notification.message}</p>
              </div>
            )}

            {notification?.resourceLabel && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Resource</p>
                <p className="text-sm">{notification.resourceLabel}</p>
              </div>
            )}

            {notification?.id && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notification ID</p>
                <p className="text-sm break-all">{notification.id}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SidebarNotificationCalendar() {
  const { notifications } = useNotifications({ limit: 50 });

  const categories = React.useMemo(
    () => getSortedCategoriesFromNotifications(notifications),
    [notifications],
  );

  const [enabled, setEnabled] = React.useState(() => ({}));

  React.useEffect(() => {
    setEnabled((prev) => {
      const next = { ...prev };
      categories.forEach((category) => {
        if (typeof next[category] !== "boolean") next[category] = true;
      });
      return next;
    });
  }, [categories]);

  const enabledCategories = React.useMemo(() => {
    const set = new Set();
    Object.entries(enabled).forEach(([category, isEnabled]) => {
      if (isEnabled) set.add(category);
    });
    return set;
  }, [enabled]);

  const byDay = React.useMemo(
    () => groupNotificationsByDay(notifications, { enabledCategories }),
    [notifications, enabledCategories],
  );

  const [selectedDateKey, setSelectedDateKey] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedNotification, setSelectedNotification] = React.useState(null);

  const dayNotifications = React.useMemo(() => {
    if (!selectedDateKey) return [];
    return byDay.get(selectedDateKey)?.notifications || [];
  }, [byDay, selectedDateKey]);

  const selectedDateLabel = React.useMemo(() => {
    if (!selectedDateKey) return null;
    try {
      const [y, m, d] = selectedDateKey.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return format(date, "PPP");
    } catch {
      return selectedDateKey;
    }
  }, [selectedDateKey]);

  const handleDayClick = React.useCallback(
    (date) => {
      const key = toLocalDateKey(date);
      if (!key) return;

      if (byDay.has(key)) {
        setSelectedDateKey(key);
        setModalOpen(true);
      }
    },
    [byDay],
  );

  const handleViewDetails = React.useCallback((notification) => {
    setSelectedNotification(notification || null);
    setDetailsOpen(true);
  }, []);

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <div className="flex items-center justify-between px-3 pb-2">
          <p className="text-xs font-medium text-muted-foreground">Notifications</p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                aria-label="Filter notification categories"
              >
                <Filter className="mr-1 h-3.5 w-3.5" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show categories</DropdownMenuLabel>
              <Separator />
              <div className="space-y-2 p-2">
                {categories.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-muted-foreground">No notifications yet.</p>
                ) : (
                  categories.map((category) => (
                    <label
                      key={category}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            getNotificationCategoryDotClass(category),
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-sm">{formatCategoryLabel(category)}</span>
                      </span>
                      <Checkbox
                        checked={enabled[category] ?? true}
                        onCheckedChange={(checked) => {
                          setEnabled((prev) => ({
                            ...prev,
                            [category]: checked === true,
                          }));
                        }}
                        aria-label={`Toggle ${category}`}
                      />
                    </label>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Calendar
          className="[--cell-size:31px] [&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground [&_[role=gridcell]]:w-[31px]"
          onDayClick={handleDayClick}
          components={{
            DayButton: (props) => (
              <NotificationDayButton
                {...props}
                byDay={byDay}
                enabledCategories={enabledCategories}
              />
            ),
          }}
        />

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
              <DialogDescription>
                {selectedDateLabel ? `For ${selectedDateLabel}` : "For selected day"}
              </DialogDescription>
            </DialogHeader>

            {dayNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications for this day.</p>
            ) : (
              <ScrollArea className="max-h-[420px] pr-3">
                <div className="space-y-3">
                  {dayNotifications.map((notification) => (
                    <NotificationListItem
                      key={notification.id}
                      notification={notification}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        <NotificationDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          notification={selectedNotification}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
