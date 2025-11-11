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

import { useState, useEffect } from "react";
import supabase from "@/../config/supabase";
import { 
  submitPartner as submitPartnerLib, 
  updatePartner as updatePartnerLib, 
  deletePartner as deletePartnerLib,
  getExpiringSoonPartners,
  isMOUExpired,
  isMOUExpiringSoon,
  getMOUStatus,
} from "@/lib/partnerSubmission";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import SAMPLE_PARTNERS from "../../SAMPLE_PARTNERS.json";

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
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    averageSuccessRate: 0,
    totalBudgetAllocation: 0,
  });

  /**
   * Fetch partners from Supabase
   * @async
   */
  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build Supabase query
      let query = supabase
        .from('partners')
        .select('*')
        .order('organization_name', { ascending: true });

      // Apply filters
      if (options.status) {
        query = query.eq('partnership_status', options.status);
      }
      if (options.organizationType) {
        query = query.eq('organization_type', options.organizationType);
      }
      if (options.servicesOffered && options.servicesOffered.length > 0) {
        query = query.contains('services_offered', options.servicesOffered);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPartners(data || []);
      calculateStatistics(data || []);
    } catch (err) {
      console.error("Error fetching partners:", err);
      setError(err.message);
      
      // Fallback to dummy data if Supabase fails
      console.log("Falling back to dummy data");
      let filteredPartners = [...SAMPLE_PARTNERS];

      // Apply filters to dummy data
      if (options.status) {
        filteredPartners = filteredPartners.filter(
          (p) => p.partnership_status === options.status
        );
      }
      if (options.organizationType) {
        filteredPartners = filteredPartners.filter(
          (p) => p.organization_type === options.organizationType
        );
      }
      if (options.servicesOffered && options.servicesOffered.length > 0) {
        filteredPartners = filteredPartners.filter((p) =>
          options.servicesOffered.some((service) =>
            p.services_offered.includes(service)
          )
        );
      }

      setPartners(filteredPartners);
      calculateStatistics(filteredPartners);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate partner statistics
   * @param {Array} partnersData - Array of partner objects
   */
  const calculateStatistics = (partnersData) => {
    // Calculate MOU status counts
    const expiredCount = partnersData.filter((p) => 
      p.mou_expiry_date && isMOUExpired(p.mou_expiry_date)
    ).length;
    
    const expiringSoonCount = partnersData.filter((p) => 
      p.mou_expiry_date && isMOUExpiringSoon(p.mou_expiry_date) && !isMOUExpired(p.mou_expiry_date)
    ).length;

    // Calculate total unique services offered across all partners
    const allServices = partnersData.reduce((acc, partner) => {
      if (Array.isArray(partner.services_offered)) {
        partner.services_offered.forEach(service => acc.add(service));
      }
      return acc;
    }, new Set());

    const stats = {
      total: partnersData.length,
      active: partnersData.filter((p) => p.partnership_status === "active").length,
      inactive: partnersData.filter((p) => p.partnership_status === "inactive").length,
      pending: partnersData.filter((p) => p.partnership_status === "pending").length,
      expired: partnersData.filter((p) => p.partnership_status === "expired").length,
      totalServices: allServices.size, // Count of unique services offered
      averageSuccessRate:
        partnersData.length > 0
          ? partnersData.reduce((sum, p) => sum + (p.success_rate || 0), 0) /
            partnersData.length
          : 0,
      totalBudgetAllocation: partnersData.reduce(
        (sum, p) => sum + (p.budget_allocation || 0),
        0
      ),
      mouExpired: expiredCount,
      mouExpiringSoon: expiringSoonCount,
    };
    setStatistics(stats);
  };

  /**
   * Create a new partner
   * @async
   * @param {Object} partnerData - New partner data
   * @returns {Promise<Object>} Created partner
   */
  const createPartner = async (partnerData) => {
    try {
      // Use the submission helper which includes validation and audit logging
      const result = await submitPartnerLib(partnerData);

      if (result.error) {
        throw result.error;
      }

      // Refresh partners list
      await fetchPartners();

      return result.data;
    } catch (err) {
      console.error("Error creating partner:", err);
      throw err;
    }
  };

  /**
   * Update an existing partner
   * @async
   * @param {string} partnerId - Partner ID
   * @param {Object} updates - Updated partner data
   * @returns {Promise<Object>} Updated partner
   */
  const updatePartner = async (partnerId, updates) => {
    try {
      // Get the old partner data for audit log comparison
      const oldPartner = partners.find(p => p.id === partnerId);
      
      // Use the submission helper which includes audit logging
      const result = await updatePartnerLib(partnerId, updates, oldPartner);

      if (result.error) {
        throw result.error;
      }

      // Refresh partners list
      await fetchPartners();

      return result.data;
    } catch (err) {
      console.error("Error updating partner:", err);
      throw err;
    }
  };

  /**
   * Delete a partner
   * @async
   * @param {string} partnerId - Partner ID
   * @returns {Promise<void>}
   */
  const deletePartner = async (partnerId) => {
    try {
      // Get the partner data for audit log
      const partnerToDelete = partners.find(p => p.id === partnerId);
      
      // Use the submission helper which includes audit logging
      const result = await deletePartnerLib(partnerId, partnerToDelete);

      if (result.error) {
        throw result.error;
      }

      // Refresh partners list
      await fetchPartners();
    } catch (err) {
      console.error("Error deleting partner:", err);
      throw err;
    }
  };

  /**
   * Get partner by ID
   * @param {string} partnerId - Partner ID
   * @returns {Object|null} Partner object or null
   */
  const getPartnerById = (partnerId) => {
    return partners.find((p) => p.id === partnerId) || null;
  };

  /**
   * Get partners by service offered
   * @param {string} service - Service type
   * @returns {Array} Array of partners offering the service
   */
  const getPartnersByService = (service) => {
    return partners.filter((p) => p.services_offered.includes(service));
  };

  /**
   * Get partners with expiring MOUs
   * @async
   * @param {number} daysThreshold - Days threshold for expiry warning
   * @returns {Promise<Array>} Array of expiring partners
   */
  const getExpiringSoon = async (daysThreshold = 30) => {
    try {
      const result = await getExpiringSoonPartners(daysThreshold);
      
      if (result.error) {
        throw result.error;
      }

      return result.partners || [];
    } catch (err) {
      console.error("Error fetching expiring partners:", err);
      return [];
    }
  };

  // Fetch partners on mount and when options change
  useEffect(() => {
    fetchPartners();

    // Set up Supabase realtime subscription
    const subscription = supabase
      .channel('partners-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partners' },
        (payload) => {
          console.log('Partner change received:', payload);
          fetchPartners();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.status, options.organizationType, options.servicesOffered]);

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
    // Utility functions
    isMOUExpired,
    isMOUExpiringSoon,
    getMOUStatus,
  };
}
