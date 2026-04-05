/**
 * Partners hook (online-only).
 *
 * Responsibilities:
 * - Load partners directly from Supabase.
 * - Perform create/update/delete operations directly against Supabase.
 * - Provide derived partnership and MOU statistics.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import {
  formatPartnerData,
  getMOUStatus,
  isMOUExpired,
  isMOUExpiringSoon,
  validatePartnerData,
} from "@/lib/partnerSubmission";

const PARTNERS_REQUEST_TIMEOUT_MS = 20000;

const withTimeout = async (promise, timeoutMs, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

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

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sortPartnersByName = (rows = []) => {
  return [...rows].sort((left, right) => {
    const leftName = (left?.organization_name || "").toLowerCase();
    const rightName = (right?.organization_name || "").toLowerCase();
    return leftName.localeCompare(rightName);
  });
};

const calculateStatistics = (partnersData = []) => {
  if (!Array.isArray(partnersData) || !partnersData.length) {
    return { ...baseStatistics };
  }

  const mouExpired = partnersData.filter(
    (p) => p.mou_expiry_date && isMOUExpired(p.mou_expiry_date),
  ).length;
  const mouExpiringSoon = partnersData.filter(
    (p) =>
      p.mou_expiry_date &&
      isMOUExpiringSoon(p.mou_expiry_date) &&
      !isMOUExpired(p.mou_expiry_date),
  ).length;

  const allServices = partnersData.reduce((acc, partner) => {
    const services = Array.isArray(partner.services_offered)
      ? partner.services_offered
      : [];
    services.forEach((service) => acc.add(service));
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
        ? partnersData.reduce(
            (sum, p) => sum + toNumber(p.success_rate, 0),
            0,
          ) / partnersData.length
        : 0,
    totalBudgetAllocation: partnersData.reduce(
      (sum, p) => sum + toNumber(p.budget_allocation, 0),
      0,
    ),
    mouExpired,
    mouExpiringSoon,
  };
};

export function usePartners(options = {}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPartners = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: queryError } = await withTimeout(
        supabase
          .from("partners")
          .select("*")
          .order("organization_name", { ascending: true }),
        PARTNERS_REQUEST_TIMEOUT_MS,
        "Loading partners",
      );

      if (queryError) throw queryError;

      let rows = Array.isArray(data) ? data : [];

      if (options.status) {
        rows = rows.filter((partner) => partner.partnership_status === options.status);
      }
      if (options.organizationType) {
        rows = rows.filter(
          (partner) => partner.organization_type === options.organizationType,
        );
      }
      if (options.servicesOffered && options.servicesOffered.length > 0) {
        rows = rows.filter((partner) => {
          const services = Array.isArray(partner.services_offered)
            ? partner.services_offered
            : [];
          return options.servicesOffered.some((service) =>
            services.includes(service),
          );
        });
      }

      setPartners(sortPartnersByName(rows));
      if (showLoading) {
        setLoading(false);
      }
      return rows;
    } catch (err) {
      console.error("Error fetching partners:", err);
      setError(err.message || "Failed to load partners");
      if (showLoading) {
        setLoading(false);
      }
      return [];
    }
  }, [options.organizationType, options.servicesOffered, options.status]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const createPartner = useCallback(
    async (partnerData) => {
      const validation = validatePartnerData(partnerData);
      if (!validation.isValid) {
        const validationError = new Error(validation.errors.join(", "));
        validationError.validationErrors = validation.errors;
        throw validationError;
      }

      const payload = {
        ...formatPartnerData(partnerData),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await withTimeout(
        supabase
          .from("partners")
          .insert([payload])
          .select("*")
          .single(),
        PARTNERS_REQUEST_TIMEOUT_MS,
        "Creating partner",
      );

      if (insertError) throw insertError;

      setPartners((current) => sortPartnersByName([...current, data]));
      void fetchPartners({ showLoading: false });
      return data;
    },
    [fetchPartners],
  );

  const updatePartner = useCallback(
    async (partnerId, updates) => {
      const payload = {
        ...formatPartnerData(updates),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await withTimeout(
        supabase
          .from("partners")
          .update(payload)
          .eq("id", partnerId)
          .select("*")
          .single(),
        PARTNERS_REQUEST_TIMEOUT_MS,
        "Updating partner",
      );

      if (updateError) throw updateError;

      setPartners((current) =>
        sortPartnersByName(
          current.map((partner) =>
            partner.id === partnerId ? { ...partner, ...data } : partner,
          ),
        ),
      );
      void fetchPartners({ showLoading: false });
      return data;
    },
    [fetchPartners],
  );

  const deletePartner = useCallback(
    async (partnerId) => {
      if (!partnerId) return { success: false };

      const { error: deleteError } = await withTimeout(
        supabase
          .from("partners")
          .delete()
          .eq("id", partnerId),
        PARTNERS_REQUEST_TIMEOUT_MS,
        "Deleting partner",
      );

      if (deleteError) throw deleteError;

      setPartners((current) =>
        current.filter((partner) => partner.id !== partnerId),
      );
      void fetchPartners({ showLoading: false });
      return { success: true };
    },
    [fetchPartners],
  );

  const getPartnerById = useCallback(
    (partnerId) => partners.find((partner) => partner.id === partnerId) || null,
    [partners],
  );

  const getPartnersByService = useCallback(
    (service) =>
      partners.filter((partner) =>
        (partner.services_offered || []).includes(service),
      ),
    [partners],
  );

  const getExpiringSoon = useCallback(
    async (daysThreshold = 30) => {
      const now = new Date();
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + daysThreshold);

      return partners.filter((partner) => {
        if (!partner.mou_expiry_date) return false;
        const expiry = new Date(partner.mou_expiry_date);
        return expiry >= now && expiry <= threshold;
      });
    },
    [partners],
  );

  const statistics = useMemo(() => calculateStatistics(partners), [partners]);

  return {
    partners,
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
    pendingCount: 0,
    syncing: false,
    syncStatus: null,
    runSync: async () => ({ success: true, onlineOnly: true }),
    offline: false,
  };
}
