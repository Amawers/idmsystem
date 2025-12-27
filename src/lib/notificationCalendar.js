/**
 * @file notificationCalendar.js
 * @description Utilities for grouping notifications by day and mapping notification categories to calendar badge styles.
 * @module lib/notificationCalendar
 */

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Returns a local date key in the form YYYY-MM-DD.
 * Uses local time (not UTC) so calendar grouping matches the user’s expected day.
 */
export function toLocalDateKey(value) {
  const date = value instanceof Date ? value : safeDate(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Theme-token-safe mapping for category dots (no hard-coded palette values).
 */
export const NOTIFICATION_CATEGORY_DOT_CLASS = {
  reminder: "bg-primary",
  alert: "bg-destructive",
  system: "bg-secondary",
  auth: "bg-accent",
  case: "bg-primary",
  program: "bg-accent",
  resource: "bg-secondary",
  user: "bg-accent",
  default: "bg-muted-foreground",
};

export function getNotificationCategoryDotClass(category) {
  const key = typeof category === "string" ? category.toLowerCase() : "";
  return NOTIFICATION_CATEGORY_DOT_CLASS[key] || NOTIFICATION_CATEGORY_DOT_CLASS.default;
}

/**
 * Theme-token-safe mapping for category badges.
 * Uses semantic Tailwind tokens (primary/destructive/accent/secondary/muted) instead of hard-coded colors.
 */
export const NOTIFICATION_CATEGORY_BADGE_CLASS = {
  reminder: "border-primary/25 bg-primary/10 text-primary",
  alert: "border-destructive/25 bg-destructive/10 text-destructive",
  system: "border-border bg-muted text-muted-foreground",
  auth: "border-accent/25 bg-accent/30 text-accent-foreground",
  case: "border-primary/25 bg-primary/10 text-primary",
  program: "border-accent/25 bg-accent/30 text-accent-foreground",
  resource: "border-secondary/40 bg-secondary text-secondary-foreground",
  user: "border-accent/25 bg-accent/30 text-accent-foreground",
  default: "border-border bg-muted text-muted-foreground",
};

export function getNotificationCategoryBadgeClass(category) {
  const key = typeof category === "string" ? category.toLowerCase() : "";
  return NOTIFICATION_CATEGORY_BADGE_CLASS[key] || NOTIFICATION_CATEGORY_BADGE_CLASS.default;
}

/**
 * Groups notifications by local day.
 *
 * @param {Array<{id:string, createdAt:string, category?:string}>} notifications
 * @param {{enabledCategories?: Set<string> | null}} [options]
 */
export function groupNotificationsByDay(notifications = [], { enabledCategories = null } = {}) {
  const byDay = new Map();

  (notifications || []).forEach((notification) => {
    const category = notification?.category ? String(notification.category).toLowerCase() : "system";
    if (enabledCategories && !enabledCategories.has(category)) return;

    const dateKey = toLocalDateKey(notification?.createdAt);
    if (!dateKey) return;

    const entry = byDay.get(dateKey) || { notifications: [], categories: new Set() };
    entry.notifications.push(notification);
    entry.categories.add(category);
    byDay.set(dateKey, entry);
  });

  // Stable ordering inside each day (oldest → newest)
  for (const entry of byDay.values()) {
    entry.notifications.sort((a, b) => {
      const at = safeDate(a?.createdAt)?.getTime() ?? 0;
      const bt = safeDate(b?.createdAt)?.getTime() ?? 0;
      return at - bt;
    });
  }

  return byDay;
}

export function getSortedCategoriesFromNotifications(notifications = []) {
  const set = new Set();
  (notifications || []).forEach((n) => {
    const category = n?.category ? String(n.category).toLowerCase() : "system";
    set.add(category);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function formatCategoryLabel(category) {
  if (!category) return "System";
  const value = String(category);
  return value.charAt(0).toUpperCase() + value.slice(1);
}
