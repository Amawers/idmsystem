/**
 * @file useServiceDelivery.js
 * @description Custom React hook for managing service delivery logs with Supabase integration
 * @module hooks/useServiceDelivery
 * 
 * Features:
 * - Fetch service delivery records with enrollment details
 * - Filter by date range, enrollment, service type
 * - Real-time service delivery updates
 * - CRUD operations for service delivery management
 * - Service delivery statistics and analytics
 * 
 * @returns {Object} Service delivery data, loading state, error state, and CRUD functions
 */

import { useState, useEffect } from "react";
// import { supabase } from "@/config/supabase";
import SAMPLE_SERVICE_DELIVERY from "../../SAMPLE_SERVICE_DELIVERY.json";

/**
 * Hook for managing service delivery logs
 * @param {Object} options - Configuration options
 * @param {string} options.enrollmentId - Filter by enrollment ID
 * @param {string} options.serviceType - Filter by service type
 * @param {string} options.dateFrom - Filter from date (YYYY-MM-DD)
 * @param {string} options.dateTo - Filter to date (YYYY-MM-DD)
 * @param {string} options.attendanceStatus - Filter by attendance (present, absent, late)
 * @returns {Object} Service delivery data and operations
 */
export function useServiceDelivery(options = {}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    totalDuration: 0,
    averageDuration: 0,
  });

  /**
   * Fetch service delivery records from Supabase
   * @async
   */
  const fetchServiceDelivery = async () => {
    try {
      setLoading(true);
      setError(null);

      // SUPABASE QUERY (commented for now - using dummy data)
      /*
      let query = supabase
        .from('service_delivery')
        .select(`
          *,
          enrollment:program_enrollments(
            id,
            case_id,
            case:cases(id, case_name),
            program:programs(id, program_name)
          ),
          service_provider:profile!service_delivery_service_provider_id_fkey(id, role)
        `)
        .order('service_date', { ascending: false });

      // Apply filters
      if (options.enrollmentId) {
        query = query.eq('enrollment_id', options.enrollmentId);
      }
      if (options.serviceType) {
        query = query.eq('service_type', options.serviceType);
      }
      if (options.dateFrom) {
        query = query.gte('service_date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('service_date', options.dateTo);
      }
      if (options.attendanceStatus) {
        query = query.eq('attendance_status', options.attendanceStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setServices(data || []);
      calculateStatistics(data || []);
      */

      // Using dummy data
      let filteredServices = [...SAMPLE_SERVICE_DELIVERY];

      // Apply filters to dummy data
      if (options.enrollmentId) {
        filteredServices = filteredServices.filter(
          (s) => s.enrollment_id === options.enrollmentId
        );
      }
      if (options.serviceType) {
        filteredServices = filteredServices.filter(
          (s) => s.service_type === options.serviceType
        );
      }
      if (options.dateFrom) {
        filteredServices = filteredServices.filter(
          (s) => s.service_date >= options.dateFrom
        );
      }
      if (options.dateTo) {
        filteredServices = filteredServices.filter(
          (s) => s.service_date <= options.dateTo
        );
      }
      if (options.attendanceStatus) {
        filteredServices = filteredServices.filter(
          (s) => s.attendance_status === options.attendanceStatus
        );
      }

      setServices(filteredServices);
      calculateStatistics(filteredServices);
    } catch (err) {
      console.error("Error fetching service delivery:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate service delivery statistics
   * @param {Array} servicesData - Array of service delivery objects
   */
  const calculateStatistics = (servicesData) => {
    const stats = {
      total: servicesData.length,
      present: servicesData.filter((s) => s.attendance_status === "present").length,
      absent: servicesData.filter((s) => s.attendance_status === "absent").length,
      late: servicesData.filter((s) => s.attendance_status === "late").length,
      totalDuration: servicesData.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0
      ),
      averageDuration: 0,
    };

    stats.averageDuration =
      servicesData.length > 0 ? stats.totalDuration / servicesData.length : 0;

    setStatistics(stats);
  };

  /**
   * Create a new service delivery record
   * @async
   * @param {Object} serviceData - New service delivery data
   * @returns {Promise<Object>} Created service delivery record
   */
  const createServiceDelivery = async (serviceData) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('service_delivery')
        .insert([{
          ...serviceData,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchServiceDelivery();

      return data;
      */

      // Dummy implementation
      const newService = {
        id: `service-${Date.now()}`,
        ...serviceData,
        created_at: new Date().toISOString(),
      };

      setServices((prev) => [newService, ...prev]);
      return newService;
    } catch (err) {
      console.error("Error creating service delivery:", err);
      throw err;
    }
  };

  /**
   * Update an existing service delivery record
   * @async
   * @param {string} serviceId - Service delivery ID
   * @param {Object} updates - Updated service delivery data
   * @returns {Promise<Object>} Updated service delivery record
   */
  const updateServiceDelivery = async (serviceId, updates) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('service_delivery')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single();

      if (error) throw error;

      await fetchServiceDelivery();

      return data;
      */

      // Dummy implementation
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, ...updates } : s))
      );

      return { id: serviceId, ...updates };
    } catch (err) {
      console.error("Error updating service delivery:", err);
      throw err;
    }
  };

  /**
   * Delete a service delivery record
   * @async
   * @param {string} serviceId - Service delivery ID
   * @returns {Promise<void>}
   */
  const deleteServiceDelivery = async (serviceId) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { error } = await supabase
        .from('service_delivery')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      await fetchServiceDelivery();
      */

      // Dummy implementation
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (err) {
      console.error("Error deleting service delivery:", err);
      throw err;
    }
  };

  /**
   * Get service delivery by ID
   * @param {string} serviceId - Service delivery ID
   * @returns {Object|null} Service delivery object or null
   */
  const getServiceDeliveryById = (serviceId) => {
    return services.find((s) => s.id === serviceId) || null;
  };

  /**
   * Get service delivery by enrollment ID
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Array} Array of service delivery records
   */
  const getServiceDeliveryByEnrollmentId = (enrollmentId) => {
    return services.filter((s) => s.enrollment_id === enrollmentId);
  };

  // Fetch service delivery on mount and when options change
  useEffect(() => {
    fetchServiceDelivery();

    // SUPABASE REALTIME SUBSCRIPTION (commented for now)
    /*
    const subscription = supabase
      .channel('service-delivery-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_delivery' },
        (payload) => {
          console.log('Service delivery change received:', payload);
          fetchServiceDelivery();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.enrollmentId,
    options.serviceType,
    options.dateFrom,
    options.dateTo,
    options.attendanceStatus,
  ]);

  return {
    services,
    loading,
    error,
    statistics,
    fetchServiceDelivery,
    createServiceDelivery,
    updateServiceDelivery,
    deleteServiceDelivery,
    getServiceDeliveryById,
    getServiceDeliveryByEnrollmentId,
  };
}
