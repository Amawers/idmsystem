/**
 * @file useNotifications.js
 * @description Hook for syncing audit-log notifications with offline caching
 * @module hooks/useNotifications
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAuditLogs } from "@/lib/auditLog";

const CACHE_KEY = "idm.notifications.cache.v1";
const READ_KEY = "idm.notifications.read.v1";
const MAX_CACHE_ITEMS = 50;
const POLL_INTERVAL_MS = 30_000;

const ACTION_HINTS = {
  login: "signed in",
  logout: "signed out",
  password_change: "changed their password",
  failed_login: "had a failed sign-in",
  create_case: "created a case",
  update_case: "updated a case",
  delete_case: "deleted a case",
  view_case: "viewed a case",
  export_cases: "exported cases",
  create_user: "created a user",
  update_user: "updated a user",
  delete_user: "deleted a user",
  update_role: "updated a role",
  ban_user: "suspended a user",
  unban_user: "reinstated a user",
  grant_permission: "granted permissions",
  revoke_permission: "revoked permissions",
  update_permissions: "adjusted permissions",
  create_program: "created a program",
  update_program: "updated a program",
  delete_program: "archived a program",
  create_enrollment: "enrolled a participant",
  update_enrollment: "updated an enrollment",
  delete_enrollment: "removed an enrollment",
  create_service_delivery: "logged a service delivery",
  update_service_delivery: "updated a service delivery",
  delete_service_delivery: "deleted a service delivery",
  create_partner: "added a partner",
  update_partner: "updated a partner",
  delete_partner: "removed a partner",
};

const toTitleCase = (value) =>
  value
    ?.replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") ?? "";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to parse cached notifications", error);
    return fallback;
  }
};

const buildNotification = (log) => {
  const actor = log.user_email || "System";
  const resourceLabel = log.resource_type
    ? `${toTitleCase(log.resource_type)}${log.resource_id ? ` • ${log.resource_id}` : ""}`
    : null;
  const actionText = ACTION_HINTS[log.action_type] || log.action_type?.replace(/_/g, " ") || "performed an action";
  const fallback = `${actor} ${actionText}${resourceLabel ? ` on ${resourceLabel}` : ""}`;

  return {
    id: log.id,
    title: toTitleCase(log.action_type || log.action_category || "Activity"),
    message: log.description || fallback,
    createdAt: log.created_at,
    severity: log.severity || "info",
    category: log.action_category || "system",
    actor,
    resourceLabel,
    raw: log,
  };
};

const persist = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to persist notifications", error);
  }
};

const readIdsToArray = (set) => Array.from(set);

const mergeNotifications = (incoming = [], existing = [], limitValue = MAX_CACHE_ITEMS) => {
  const combined = [...incoming, ...existing];
  const seen = new Set();
  const deduped = [];

  for (const item of combined) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  deduped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const maxItems = Math.min(limitValue, MAX_CACHE_ITEMS);
  return deduped.slice(0, maxItems);
};

/**
 * Hook that exposes notification data sourced from audit logs.
 * Handles caching, offline viewing, polling refresh, and read state.
 *
 * @param {Object} options
 * @param {number} [options.limit=20] - Max number of notifications to fetch
 */
export function useNotifications({ limit = 20 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const pollIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Boot with cached notifications + read state
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const cachedNotifications = safeParse(
      window.localStorage.getItem(CACHE_KEY),
      [],
    );
    const cachedReadIds = safeParse(window.localStorage.getItem(READ_KEY), []);

    if (cachedNotifications.length) {
      setNotifications(cachedNotifications);
    }
    if (cachedReadIds.length) {
      setReadIds(new Set(cachedReadIds));
    }

    const handleStorage = (event) => {
      if (event.key === CACHE_KEY && event.newValue) {
        setNotifications(safeParse(event.newValue, []));
      }
      if (event.key === READ_KEY && event.newValue) {
        setReadIds(new Set(safeParse(event.newValue, [])));
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const refreshNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!isOnline || isFetchingRef.current) return;

      isFetchingRef.current = true;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await fetchAuditLogs({ limit, offset: 0 });

        if (fetchError) {
          throw fetchError;
        }

        const mapped = (data || []).map(buildNotification);

        setNotifications((prev) => {
          const next = mergeNotifications(mapped, prev, limit);
          persist(CACHE_KEY, next);
          return next;
        });

        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        setError(err);
      } finally {
        if (!silent) setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [isOnline, limit],
  );

  // Sync online/offline state
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Poll when we have connectivity
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!isOnline) {
      setLoading(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return undefined;
    }

    refreshNotifications();

    const intervalId = window.setInterval(() => {
      refreshNotifications({ silent: true });
    }, POLL_INTERVAL_MS);

    pollIntervalRef.current = intervalId;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOnline, refreshNotifications]);

  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persist(READ_KEY, readIdsToArray(next));
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((notification) => next.add(notification.id));
      persist(READ_KEY, readIdsToArray(next));
      return next;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    if (!notifications.length) return 0;
    return notifications.reduce(
      (count, notification) => (readIds.has(notification.id) ? count : count + 1),
      0,
    );
  }, [notifications, readIds]);

  const hasCachedData = useMemo(() => notifications.length > 0, [notifications]);

  const isNotificationUnread = useCallback((id) => !readIds.has(id), [readIds]);

  return {
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
  };
}
