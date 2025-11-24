/**
 * @file usePartners.js
 * @description Custom React hook for managing partner organizations with Supabase integration
 * @module hooks/usePartners
 * 
 * Features:
 * - Fetch partner organizations with filtering
 * - Filter by status, organization type, services offered
 * - Real-time partner updates via Supabase subscriptions
 * - CRUD operations for partner management
 * - Partner statistics and analytics
 * - MOU expiry tracking and alerts
 * - Error handling and loading states
 * 
 * Dependencies:
 * - @/config/supabase - Supabase client
 * - @/lib/partnerSubmission - Partner submission helpers
 * - @/lib/auditLog - Audit logging utilities
 * 
 * @returns {Object} Partners data, loading state, error state, and CRUD functions
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatPartnerData,
  getExpiringSoonPartners,
  getMOUStatus,
  isMOUExpired,
  isMOUExpiringSoon,
  validatePartnerData,
} from "@/lib/partnerSubmission";
import {
  partnersLiveQuery,
  loadRemoteSnapshotIntoCache,
  createOrUpdateLocalPartner,
  getPendingOperationCount,
  markLocalDelete,
  syncPartnersQueue,
} from "@/services/partnersOfflineService";
import useNetworkStatus from "@/hooks/useNetworkStatus";

export const PARTNERS_FORCE_SYNC_KEY = "partners.forceSync";

const baseStatistics = {
  total: 0,
  active: 0,
  inactive: 0,
  pending: 0,
  expired: 0,
  totalServices: 0,
  averageSuccessRate: 0,
  totalBudgetAllocation: 0,
  mouExpired: 0,
  mouExpiringSoon: 0,
};

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const triggerForceSyncReload = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PARTNERS_FORCE_SYNC_KEY, "true");
  window.location.reload();
};

function calculateStatistics(partnersData = []) {
  if (!Array.isArray(partnersData) || !partnersData.length) {
    return { ...baseStatistics };
  }

  const expiredCount = partnersData.filter((p) => p.mou_expiry_date && isMOUExpired(p.mou_expiry_date)).length;
  const expiringSoonCount = partnersData.filter(
    (p) =>
      p.mou_expiry_date &&
      isMOUExpiringSoon(p.mou_expiry_date) &&
      !isMOUExpired(p.mou_expiry_date),
  ).length;

  const allServices = partnersData.reduce((acc, partner) => {
    if (Array.isArray(partner.services_offered)) {
      partner.services_offered.forEach((service) => acc.add(service));
    }
    return acc;
  }, new Set());

  return {
    total: partnersData.length,
    active: partnersData.filter((p) => p.partnership_status === "active").length,
    inactive: partnersData.filter((p) => p.partnership_status === "inactive").length,
    pending: partnersData.filter((p) => p.partnership_status === "pending").length,
    expired: partnersData.filter((p) => p.partnership_status === "expired").length,
    totalServices: allServices.size,
    averageSuccessRate:
      partnersData.length > 0
        ? partnersData.reduce((sum, p) => sum + toNumber(p.success_rate, 0), 0) /
          partnersData.length
        : 0,
    totalBudgetAllocation: partnersData.reduce(
      (sum, p) => sum + toNumber(p.budget_allocation, 0),
      0,
    ),
    mouExpired: expiredCount,
    mouExpiringSoon: expiringSoonCount,
  };
}

/**
 * Hook for managing partner organizations
 * @param {Object} options - Configuration options
 * @param {string} options.status - Filter by status (active, inactive, pending)
 * @param {string} options.organizationType - Filter by organization type
 * @param {Array<string>} options.servicesOffered - Filter by services offered
 * @returns {Object} Partners data and operations
 */
export function usePartners(options = {}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(baseStatistics);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [usingOfflineData, setUsingOfflineData] = useState(!isBrowserOnline());
  const isOnline = useNetworkStatus();

  const hydratePendingCount = useCallback(async () => {
    const count = await getPendingOperationCount();
    setPendingCount(count);
  }, []);

  const enqueueAndReloadWhenOnline = useCallback(
    async (operation) => {
      await operation();
      await hydratePendingCount();
      triggerForceSyncReload();
      return { success: true };
    },
    [hydratePendingCount],
  );

  const refreshFromServer = useCallback(async () => {
    setError(null);
    try {
      const result = await loadRemoteSnapshotIntoCache();
      setUsingOfflineData(Boolean(result.offline));
      await hydratePendingCount();
      return result;
    } catch (err) {
      console.error("Failed to refresh partners snapshot", err);
      setError(err);
      setUsingOfflineData(true);
      return { success: false, error: err };
    }
  }, [hydratePendingCount]);

  useEffect(() => {
    const subscription = partnersLiveQuery().subscribe({
      next: (rows) => {
        setPartners(Array.isArray(rows) ? rows : []);
        setLoading(false);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    hydratePendingCount();
    refreshFromServer();

    return () => subscription.unsubscribe();
  }, [hydratePendingCount, refreshFromServer]);

  useEffect(() => {
    if (!isOnline) {
      setUsingOfflineData(true);
    }
  }, [isOnline]);

  const filteredPartners = useMemo(() => {
    let data = Array.isArray(partners) ? partners : [];
    data = data.filter((partner) => (partner.pendingAction ?? null) !== "delete");

    if (options.status) {
      data = data.filter((p) => p.partnership_status === options.status);
    }
    if (options.organizationType) {
      data = data.filter((p) => p.organization_type === options.organizationType);
    }
    if (options.servicesOffered && options.servicesOffered.length > 0) {
      data = data.filter((p) => {
        const services = Array.isArray(p.services_offered) ? p.services_offered : [];
        return options.servicesOffered.some((service) => services.includes(service));
      });
    }

    return data;
  }, [partners, options.organizationType, options.servicesOffered, options.status]);

  useEffect(() => {
    setStatistics(calculateStatistics(filteredPartners));
  }, [filteredPartners]);

  const fetchPartners = useCallback(async () => {
    const result = await refreshFromServer();
    return result;
  }, [refreshFromServer]);

  /**
   * Create a new partner
   * @async
   * @param {Object} partnerData - New partner data
   * @returns {Promise<Object>} Created partner
   */
  const createPartner = useCallback(
    async (partnerData) => {
      const validation = validatePartnerData(partnerData);
      if (!validation.isValid) {
        const error = {
          message: validation.errors.join(", "),
          validationErrors: validation.errors,
        };
        throw error;
      }

      const payload = {
        ...formatPartnerData(partnerData),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isBrowserOnline()) {
        return enqueueAndReloadWhenOnline(() => createOrUpdateLocalPartner(payload));
      }

      await createOrUpdateLocalPartner(payload);
      await hydratePendingCount();
      setSyncStatus("Partner queued for sync");
      return { success: true, offline: true };
    },
    [enqueueAndReloadWhenOnline, hydratePendingCount],
  );

  /**
   * Update an existing partner
   * @async
   * @param {string} partnerId - Partner ID
   * @param {Object} updates - Updated partner data
   * @returns {Promise<Object>} Updated partner
   */
  const updatePartner = useCallback(
    async (partnerId, updates, { localId = null } = {}) => {
      const payload = {
        ...formatPartnerData(updates),
        updated_at: new Date().toISOString(),
      };
      if (isBrowserOnline()) {
        return enqueueAndReloadWhenOnline(() =>
          createOrUpdateLocalPartner(payload, { partnerId, localId }),
        );
      }

      await createOrUpdateLocalPartner(payload, { partnerId, localId });
      await hydratePendingCount();
      setSyncStatus("Partner update queued");
      return { success: true };
    },
    [enqueueAndReloadWhenOnline, hydratePendingCount],
  );

  /**
   * Delete a partner
   * @async
   * @param {string} partnerId - Partner ID
   * @returns {Promise<void>}
   */
  const deletePartner = useCallback(
    async (partnerId, { localId = null } = {}) => {
      if (!partnerId && !localId) return;
      const queueDelete = () => markLocalDelete({ partnerId, localId });

      if (isBrowserOnline()) {
        return enqueueAndReloadWhenOnline(async () => {
          await queueDelete();
          setSyncStatus("Partner delete queued");
        });
      }

      await queueDelete();
      await hydratePendingCount();
      setSyncStatus("Partner delete queued");
      return { success: true };
    },
    [enqueueAndReloadWhenOnline, hydratePendingCount],
  );

  /**
   * Get partner by ID
   * @param {string} partnerId - Partner ID
   * @returns {Object|null} Partner object or null
   */
  const getPartnerById = useCallback(
    (partnerId) => partners.find((p) => p.id === partnerId) || null,
    [partners],
  );

  /**
   * Get partners by service offered
   * @param {string} service - Service type
   * @returns {Array} Array of partners offering the service
   */
  const getPartnersByService = useCallback(
    (service) => partners.filter((p) => (p.services_offered || []).includes(service)),
    [partners],
  );

  /**
   * Get partners with expiring MOUs
   * @async
   * @param {number} daysThreshold - Days threshold for expiry warning
   * @returns {Promise<Array>} Array of expiring partners
   */
  const getExpiringSoon = useCallback(async (daysThreshold = 30) => {
    try {
      const result = await getExpiringSoonPartners(daysThreshold);
      if (result.error) throw result.error;
      if (Array.isArray(result.partners) && !result.partners.length && !isOnline) {
        return partners.filter((partner) =>
          partner.mou_expiry_date &&
          isMOUExpiringSoon(partner.mou_expiry_date) &&
          !isMOUExpired(partner.mou_expiry_date),
        );
      }
      return result.partners || [];
    } catch (err) {
      console.error("Error fetching expiring partners:", err);
      return [];
    }
  }, [isOnline, partners]);

  const runSync = useCallback(async () => {
    if (syncing) return { success: false };
    setSyncing(true);
    setSyncStatus("Preparing sync…");
    try {
      const result = await syncPartnersQueue((message) => setSyncStatus(message));
      await refreshFromServer();
      await hydratePendingCount();
      setSyncStatus(result.success ? "All changes synced" : "Sync completed with errors");
      return result;
    } catch (err) {
      setSyncStatus(err?.message ?? "Sync failed");
      throw err;
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
      setSyncing(false);
    }
  }, [hydratePendingCount, refreshFromServer, syncing]);

  return {
    partners: filteredPartners,
    loading,
    error,
    statistics,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
    getPartnerById,
    getPartnersByService,
    getExpiringSoon,
    isMOUExpired,
    isMOUExpiringSoon,
    getMOUStatus,
    pendingCount,
    syncing,
    syncStatus,
    runSync,
    offline: usingOfflineData,
  };
}
