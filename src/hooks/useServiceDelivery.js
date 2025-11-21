/**
 * @file useServiceDelivery.js
 * @description Custom React hook for managing service delivery logs with Supabase integration
 * @module hooks/useServiceDelivery
 * 
 * Features:
 * - Fetch service delivery records with enrollment details
 * - Filter by date range, enrollment, service type
 * - Real-time service delivery updates via Supabase subscriptions
 * - CRUD operations for service delivery management
 * - Service delivery statistics and analytics
 * - Robust error handling and fallback to dummy data
 * 
 * @returns {Object} Service delivery data, loading state, error state, and CRUD functions
 */

import { useState, useEffect } from "react";
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import { useAuthStore } from "@/store/authStore";
// import SAMPLE_SERVICE_DELIVERY from "../../SAMPLE_SERVICE_DELIVERY.json"; // File not found

/**
 * Hook for managing service delivery logs
 * @param {Object} options - Configuration options
 * @param {string} options.enrollmentId - Filter by enrollment ID
 * @param {string} options.programId - Filter by program ID
 * @param {string} options.caseId - Filter by case ID
 * @param {string} options.dateFrom - Filter from date (YYYY-MM-DD)
 * @param {string} options.dateTo - Filter to date (YYYY-MM-DD)
 * @param {boolean} options.attendance - Filter by attendance (true/false)
 * @param {string} options.attendanceStatus - Filter by attendance status (present, absent, excused)
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
    excused: 0,
    totalDuration: 0,
    averageDuration: 0,
    uniqueBeneficiaries: 0,
  });

  /**
   * Fetch service delivery records from Supabase with full details
   * @async
   */
  const fetchServiceDelivery = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build Supabase query with joins to enrollments and programs
      let query = supabase
        .from('service_delivery')
        .select(`
          *,
          enrollment:program_enrollments(
            id,
            case_id,
            case_number,
            case_type,
            beneficiary_name,
            status
          ),
          program:programs(
            id,
            program_name,
            program_type,
            coordinator
          )
        `)
        .order('service_date', { ascending: false });

      // Apply filters
      if (options.enrollmentId) {
        query = query.eq('enrollment_id', options.enrollmentId);
      }
      if (options.programId) {
        query = query.eq('program_id', options.programId);
      }
      if (options.caseId) {
        query = query.eq('case_id', options.caseId);
      }
      if (options.dateFrom) {
        query = query.gte('service_date', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('service_date', options.dateTo);
      }
      if (options.attendance !== undefined) {
        query = query.eq('attendance', options.attendance);
      }
      if (options.attendanceStatus) {
        query = query.eq('attendance_status', options.attendanceStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setServices(data || []);
      calculateStatistics(data || []);
    } catch (err) {
      console.error("Error fetching service delivery from Supabase:", err);
      setError(err.message);
      
      // Fallback to empty data
      console.log("Falling back to empty data for service delivery");
      let filteredServices = [];

      // Apply filters to dummy data
      if (options.enrollmentId) {
        filteredServices = filteredServices.filter(
          (s) => s.enrollment_id === options.enrollmentId
        );
      }
      if (options.programId) {
        filteredServices = filteredServices.filter(
          (s) => s.program_id === options.programId
        );
      }
      if (options.caseId) {
        filteredServices = filteredServices.filter(
          (s) => s.case_id === options.caseId
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
      excused: servicesData.filter((s) => s.attendance_status === "excused").length,
      totalDuration: servicesData.reduce(
        (sum, s) => sum + (parseInt(s.duration_minutes) || 0),
        0
      ),
      averageDuration: 0,
      uniqueBeneficiaries: new Set(servicesData.map(s => s.beneficiary_name)).size,
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
      const { user } = useAuthStore.getState();
      
      // Prepare service delivery data with proper formatting
      const formattedData = {
        enrollment_id: serviceData.enrollment_id,
        case_id: serviceData.case_id,
        case_number: serviceData.case_number,
        beneficiary_name: serviceData.beneficiary_name,
        program_id: serviceData.program_id,
        program_name: serviceData.program_name,
        program_type: serviceData.program_type,
        service_date: serviceData.service_date || new Date().toISOString().split('T')[0],
        attendance: serviceData.attendance || false,
        attendance_status: serviceData.attendance_status || 'absent',
        duration_minutes: parseInt(serviceData.duration_minutes) || null,
        progress_notes: serviceData.progress_notes || null,
        milestones_achieved: serviceData.milestones_achieved || [],
        next_steps: serviceData.next_steps || null,
        delivered_by_name: serviceData.delivered_by_name || null,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('service_delivery')
        .insert([formattedData])
        .select(`
          *,
          enrollment:program_enrollments(
            id,
            case_id,
            case_number,
            case_type,
            beneficiary_name,
            status
          ),
          program:programs(
            id,
            program_name,
            program_type,
            coordinator
          )
        `)
        .single();

      if (error) throw error;

      // Create audit log entry
      await createAuditLog({
        actionType: AUDIT_ACTIONS.CREATE_SERVICE_DELIVERY,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Logged service delivery for ${data.beneficiary_name}`,
        resourceType: 'service_delivery',
        resourceId: data.id,
        metadata: {
          beneficiaryName: data.beneficiary_name,
          caseId: data.case_id,
          caseNumber: data.case_number,
          programName: data.program_name,
          serviceDate: data.service_date,
          attendance: data.attendance,
          attendanceStatus: data.attendance_status,
          deliveredBy: data.delivered_by_name,
        },
        severity: 'info',
      });

      // Refresh service delivery list
      await fetchServiceDelivery();

      return data;
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
      // Get old service data for audit log
      const oldService = services.find(s => s.id === serviceId);
      
      // Prepare updated data
      const formattedUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(formattedUpdates).forEach(key => {
        if (formattedUpdates[key] === undefined) {
          delete formattedUpdates[key];
        }
      });

      // Update in Supabase
      const { data, error } = await supabase
        .from('service_delivery')
        .update(formattedUpdates)
        .eq('id', serviceId)
        .select(`
          *,
          enrollment:program_enrollments(
            id,
            case_id,
            case_number,
            case_type,
            beneficiary_name,
            status
          ),
          program:programs(
            id,
            program_name,
            program_type,
            coordinator
          )
        `)
        .single();

      if (error) throw error;

      // Create audit log entry with change details
      const changes = oldService
        ? Object.keys(updates).reduce((acc, key) => {
            if (oldService[key] !== updates[key]) {
              acc[key] = { old: oldService[key], new: updates[key] };
            }
            return acc;
          }, {})
        : updates;

      await createAuditLog({
        actionType: AUDIT_ACTIONS.UPDATE_SERVICE_DELIVERY,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Updated service delivery for ${data.beneficiary_name}`,
        resourceType: 'service_delivery',
        resourceId: serviceId,
        metadata: {
          beneficiaryName: data.beneficiary_name,
          caseId: data.case_id,
          programName: data.program_name,
          serviceDate: data.service_date,
          deliveredBy: data.delivered_by_name,
          changes,
        },
        severity: 'info',
      });

      // Refresh service delivery list
      await fetchServiceDelivery();

      return data;
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
      // Get service data for audit log
      const serviceToDelete = services.find(s => s.id === serviceId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('service_delivery')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      // Create audit log entry
      if (serviceToDelete) {
        await createAuditLog({
          actionType: AUDIT_ACTIONS.DELETE_SERVICE_DELIVERY,
          actionCategory: AUDIT_CATEGORIES.PROGRAM,
          description: `Deleted service delivery for ${serviceToDelete.beneficiary_name}`,
          resourceType: 'service_delivery',
          resourceId: serviceId,
          metadata: {
            beneficiaryName: serviceToDelete.beneficiary_name,
            caseId: serviceToDelete.case_id,
            caseNumber: serviceToDelete.case_number,
            programName: serviceToDelete.program_name,
            serviceDate: serviceToDelete.service_date,
            deliveredBy: serviceToDelete.delivered_by_name,
          },
          severity: 'warning',
        });
      }

      // Refresh service delivery list
      await fetchServiceDelivery();
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

    // Set up Supabase realtime subscription for service delivery changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.enrollmentId,
    options.programId,
    options.caseId,
    options.dateFrom,
    options.dateTo,
    options.attendance,
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
