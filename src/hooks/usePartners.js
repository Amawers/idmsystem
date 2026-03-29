import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import {
  formatPartnerData,
  getExpiringSoonPartners,
  getMOUStatus,
  isMOUExpired,
  isMOUExpiringSoon,
  validatePartnerData,
} from "@/lib/partnerSubmission";

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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function calculateStatistics(partnersData = []) {
  if (!partnersData.length) return { ...baseStatistics };

  const expiredCount = partnersData.filter((p) => p.mou_expiry_date && isMOUExpired(p.mou_expiry_date)).length;
  const expiringSoonCount = partnersData.filter(
    (p) => p.mou_expiry_date && isMOUExpiringSoon(p.mou_expiry_date) && !isMOUExpired(p.mou_expiry_date),
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
    averageSuccessRate: partnersData.length
      ? partnersData.reduce((sum, p) => sum + toNumber(p.success_rate, 0), 0) / partnersData.length
      : 0,
    totalBudgetAllocation: partnersData.reduce((sum, p) => sum + toNumber(p.budget_allocation, 0), 0),
    mouExpired: expiredCount,
    mouExpiringSoon: expiringSoonCount,
  };
}

export function usePartners(options = {}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(baseStatistics);
  const [pendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("partners")
        .select("*")
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setPartners(data ?? []);
      return { success: true };
    } catch (e) {
      setError(e);
      return { success: false, error: e };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPartners = useMemo(() => {
    let data = Array.isArray(partners) ? partners : [];
    if (options.status) data = data.filter((p) => p.partnership_status === options.status);
    if (options.organizationType) data = data.filter((p) => p.organization_type === options.organizationType);
    if (options.servicesOffered?.length) {
      data = data.filter((p) => {
        const services = Array.isArray(p.services_offered) ? p.services_offered : [];
        return options.servicesOffered.some((service) => services.includes(service));
      });
    }
    return data;
  }, [partners, options.status, options.organizationType, options.servicesOffered]);

  useEffect(() => {
    setStatistics(calculateStatistics(filteredPartners));
  }, [filteredPartners]);

  const fetchPartners = useCallback(async () => load(), [load]);

  const createPartner = useCallback(async (partnerData) => {
    const validation = validatePartnerData(partnerData);
    if (!validation.isValid) {
      throw { message: validation.errors.join(", "), validationErrors: validation.errors };
    }

    const payload = {
      ...formatPartnerData(partnerData),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error: err } = await supabase.from("partners").insert(payload).select("*").single();
    if (err) throw err;
    await load();
    return data;
  }, [load]);

  const updatePartner = useCallback(async (partnerId, updates) => {
    const payload = { ...formatPartnerData(updates), updated_at: new Date().toISOString() };
    const { data, error: err } = await supabase.from("partners").update(payload).eq("id", partnerId).select("*").single();
    if (err) throw err;
    await load();
    return data;
  }, [load]);

  const deletePartner = useCallback(async (partnerId) => {
    const { error: err } = await supabase.from("partners").delete().eq("id", partnerId);
    if (err) throw err;
    await load();
    return { success: true, queued: false };
  }, [load]);

  const getPartnerById = useCallback((partnerId) => filteredPartners.find((p) => p.id === partnerId) || null, [filteredPartners]);
  const getPartnersByService = useCallback(
    (service) => filteredPartners.filter((p) => Array.isArray(p.services_offered) && p.services_offered.includes(service)),
    [filteredPartners],
  );
  const getExpiringSoon = useCallback(async (daysThreshold = 90) => getExpiringSoonPartners(filteredPartners, daysThreshold), [filteredPartners]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("Refreshing...");
    try {
      const result = await load();
      setSyncStatus("Up to date");
      return result;
    } finally {
      setTimeout(() => setSyncStatus(null), 1200);
      setSyncing(false);
    }
  }, [load]);

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
    offline: false,
  };
}
