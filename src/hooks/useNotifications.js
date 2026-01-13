/**
 * @file useNotifications.js
 * @description Hook for syncing audit-log notifications with offline caching
 * @module hooks/useNotifications
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAuditLogs } from "@/lib/auditLog";
import supabase from "@/../config/supabase";

const CACHE_KEY = "idm.notifications.cache.v1";
const READ_KEY = "idm.notifications.read.v1";
const MAX_CACHE_ITEMS = 50;
const POLL_INTERVAL_MS = 30_000;

const REMINDER_LOOKAHEAD_DAYS = 7;

const CASE_STALE_THRESHOLDS_DAYS = {
  high: 1,
  medium: 3,
  low: 7,
  default: 3,
};

const ACTIVE_CASE_STATUSES = new Set(["Filed", "Assessed", "In Process"]);

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

const normalizeSeverity = (value) => {
  const severity = typeof value === "string" ? value.toLowerCase() : "";
  if (severity === "critical") return "critical";
  if (severity === "warning" || severity === "high") return "warning";
  if (severity === "info" || severity === "medium" || severity === "low") return "info";
  return "info";
};

const differenceInDays = (later, earlier) => {
  const ms = later.getTime() - earlier.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const todayISODate = () => new Date().toISOString().slice(0, 10);

const buildReminderId = (parts) => `reminder:${parts.filter(Boolean).join(":")}`;

const formatCaseDisplay = (row) => {
  const name = row.identifying_name || row.identifying2_name || null;
  if (name) return name;
  return row.id ? `Case ${String(row.id).slice(0, 8)}` : "Case";
};

const chooseCaseThreshold = (priority) => {
  const key = typeof priority === "string" ? priority.toLowerCase() : "";
  return CASE_STALE_THRESHOLDS_DAYS[key] ?? CASE_STALE_THRESHOLDS_DAYS.default;
};

const shouldScanCase = (row) => {
  if (!row) return false;
  if (!row.status) return true;
  return ACTIVE_CASE_STATUSES.has(row.status);
};

const computeEnrollmentReminderBucket = (daysToDue) => {
  if (daysToDue < 0) return "overdue";
  if (daysToDue <= 1) return "due1";
  if (daysToDue <= 3) return "due3";
  if (daysToDue <= 7) return "due7";
  return null;
};

const getProfileContext = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return { user: null, fullName: null, role: null };

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    user,
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? null,
  };
};

const fetchInventoryAlerts = async ({ limit = 15 } = {}) => {
  const { data, error } = await supabase
    .from("inventory_alerts")
    .select("*")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

const mapInventoryAlertToNotification = (alert) => {
  const createdAt = alert.created_at || new Date().toISOString();
  return {
    id: `alert:inventory:${alert.id}`,
    title: alert.title || "Inventory Alert",
    message: alert.message || "Inventory alert requires attention.",
    createdAt,
    severity: normalizeSeverity(alert.severity),
    category: "alert",
    actor: "Inventory System",
    resourceLabel: alert.item_name ? `Inventory • ${alert.item_name}` : "Inventory",
    raw: alert,
  };
};

const fetchDeadlineReminders = async ({
  lookaheadDays = REMINDER_LOOKAHEAD_DAYS,
  profileContext,
} = {}) => {
  const now = new Date();
  const context = profileContext ?? (await getProfileContext());
  if (!context.user) return [];

  const isSocialWorker = context.role === "social_worker";
  const fullName = context.fullName;

  const reminders = [];

  // --- Case inactivity reminders (Option 1) ---
  // Only scan scoped cases for case managers to avoid leaking other staff cases.
  if (isSocialWorker || fullName) {
    let casesQuery = supabase
      .from("case")
      .select(
        "id, identifying_name, identifying2_name, case_manager, status, priority, updated_at, created_at, identifying_intake_date",
      )
      .order("updated_at", { ascending: false })
      .limit(250);

    if (!isSocialWorker && fullName) {
      casesQuery = casesQuery.eq("case_manager", fullName);
    }

    const { data: caseRows, error: caseError } = await casesQuery;
    if (caseError) throw caseError;

    (caseRows || []).forEach((row) => {
      if (!shouldScanCase(row)) return;

      const updatedAt =
        safeDate(row.updated_at) || safeDate(row.identifying_intake_date) || safeDate(row.created_at);
      if (!updatedAt) return;

      const daysStale = differenceInDays(now, updatedAt);
      const base = chooseCaseThreshold(row.priority);

      if (daysStale < base) return;

      const caseLabel = formatCaseDisplay(row);
      const status = row.status || "Unspecified";

      const staleId = buildReminderId([
        "case",
        row.id,
        "stale",
        String(base),
      ]);
      reminders.push({
        id: staleId,
        title: "Case needs follow-up",
        message: `${caseLabel} has not been updated in ${daysStale} day(s). Status: ${status}.`,
        createdAt: now.toISOString(),
        severity: daysStale >= base * 2 ? "warning" : "info",
        category: "reminder",
        actor: "System",
        resourceLabel: row.id ? `Case • ${String(row.id).slice(0, 8)}` : "Case",
        raw: { kind: "case_stale", case_id: row.id, daysStale, base },
      });

      if (daysStale >= base * 2) {
        const overdueId = buildReminderId([
          "case",
          row.id,
          "overdue",
          String(base * 2),
        ]);
        reminders.push({
          id: overdueId,
          title: "Overdue case update",
          message: `${caseLabel} has been inactive for ${daysStale} day(s). Please update or resolve the case.`,
          createdAt: now.toISOString(),
          severity: "critical",
          category: "alert",
          actor: "System",
          resourceLabel: row.id ? `Case • ${String(row.id).slice(0, 8)}` : "Case",
          raw: { kind: "case_overdue", case_id: row.id, daysStale, base },
        });
      }
    });
  }

  // --- Enrollment deadline reminders (expected completion date) ---
  // These are true deadline dates and map well to reminders/alerts.
  {
    let enrollmentsQuery = supabase
      .from("program_enrollments")
      .select(
        "id, case_id, case_number, beneficiary_name, expected_completion_date, status, case_worker, assigned_by",
      )
      .order("expected_completion_date", { ascending: true })
      .limit(300);

    if (!isSocialWorker) {
      if (fullName) {
        enrollmentsQuery = enrollmentsQuery.or(
          `case_worker.eq.${fullName},assigned_by.eq.${context.user.id}`,
        );
      } else {
        enrollmentsQuery = enrollmentsQuery.eq("assigned_by", context.user.id);
      }
    }

    const { data: enrollments, error: enrollError } = await enrollmentsQuery;
    if (enrollError) throw enrollError;

    (enrollments || []).forEach((row) => {
      if (!row.expected_completion_date) return;
      if (row.status && ["completed", "dropped"].includes(String(row.status).toLowerCase())) return;

      const dueDate = safeDate(row.expected_completion_date);
      if (!dueDate) return;
      const daysToDue = differenceInDays(dueDate, new Date(todayISODate()));
      if (daysToDue > lookaheadDays) return;

      const bucket = computeEnrollmentReminderBucket(daysToDue);
      if (!bucket) return;

      const id = buildReminderId(["enrollment", row.id, bucket]);
      const beneficiary = row.beneficiary_name || "Participant";
      const caseNumber = row.case_number ? `Case ${row.case_number}` : "Case";

      const severity = bucket === "overdue" ? "critical" : bucket === "due1" ? "warning" : "info";
      const category = bucket === "overdue" ? "alert" : "reminder";

      const label = daysToDue < 0 ? `${Math.abs(daysToDue)} day(s) overdue` : `${daysToDue} day(s) remaining`;

      reminders.push({
        id,
        title: bucket === "overdue" ? "Enrollment overdue" : "Enrollment deadline approaching",
        message: `${beneficiary} • ${caseNumber} expected completion: ${row.expected_completion_date} (${label}).`,
        createdAt: now.toISOString(),
        severity,
        category,
        actor: "System",
        resourceLabel: row.case_id ? `Enrollment • ${String(row.case_id).slice(0, 8)}` : "Enrollment",
        raw: { kind: "enrollment_deadline", enrollment_id: row.id, daysToDue },
      });
    });
  }

  return reminders;
};

const filterAuditLogsForRole = (logs, role) => {
  const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";
  if (normalizedRole === "social_worker") return logs;

  // Non-social-worker roles should not see auth notifications.
  return (logs || []).filter((log) => {
    if (!log) return false;
    const category = typeof log.action_category === "string" ? log.action_category.toLowerCase() : "";
    return category !== "auth";
  });
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
        const profileContext = await getProfileContext();

        const [{ data, error: fetchError }, alertsResult, remindersResult] = await Promise.all([
          fetchAuditLogs({ limit, offset: 0 }),
          fetchInventoryAlerts({ limit: 15 }).then(
            (data) => ({ data, error: null }),
            (error) => ({ data: [], error }),
          ),
          fetchDeadlineReminders({
            lookaheadDays: REMINDER_LOOKAHEAD_DAYS,
            profileContext,
          }).then(
            (data) => ({ data, error: null }),
            (error) => ({ data: [], error }),
          ),
        ]);

        if (fetchError) throw fetchError;

        const filteredAudit = filterAuditLogsForRole(data || [], profileContext.role);
        const mapped = filteredAudit.map(buildNotification);
        const alertNotifications = (alertsResult?.data || []).map(mapInventoryAlertToNotification);
        const reminders = Array.isArray(remindersResult?.data) ? remindersResult.data : [];

        setNotifications((prev) => {
          const next = mergeNotifications([...mapped, ...alertNotifications, ...reminders], prev, limit);
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
