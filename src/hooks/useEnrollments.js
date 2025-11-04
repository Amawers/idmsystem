/**
 * @file useEnrollments.js
 * @description Custom React hook for managing program enrollments with Supabase integration
 * @module hooks/useEnrollments
 * 
 * Features:
 * - Fetch enrollments with case and program details
 * - Filter by status, program, case type
 * - Real-time enrollment updates via Supabase subscriptions
 * - CRUD operations for enrollment management
 * - Enrollment statistics and analytics
 * - Robust error handling and fallback to dummy data
 * 
 * @returns {Object} Enrollments data, loading state, error state, and CRUD functions
 */

import { useState, useEffect } from "react";
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import { useAuthStore } from "@/store/authStore";
import SAMPLE_ENROLLMENTS from "../../SAMPLE_ENROLLMENTS.json";

/**
 * Hook for managing program enrollments
 * @param {Object} options - Configuration options
 * @param {string} options.status - Filter by status (active, completed, dropped, at_risk)
 * @param {string} options.programId - Filter by program ID
 * @param {string} options.caseType - Filter by case type (CICL/CAR, VAC, FAC, FAR, IVAC)
 * @param {string} options.caseId - Filter by specific case ID
 * @returns {Object} Enrollments data and operations
 */
export function useEnrollments(options = {}) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    dropped: 0,
    atRisk: 0,
    averageAttendance: 0,
    averageProgress: 0,
  });

  /**
   * Fetch enrollments from Supabase with full details
   * @async
   */
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build Supabase query with joins to programs and profile
      let query = supabase
        .from('program_enrollments')
        .select(`
          *,
          program:programs(
            id,
            program_name,
            program_type,
            coordinator,
            status
          ),
          assigned_by_user:profile!program_enrollments_assigned_by_fkey(
            id,
            full_name,
            role
          )
        `)
        .order('enrollment_date', { ascending: false });

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.programId) {
        query = query.eq('program_id', options.programId);
      }
      if (options.caseType) {
        query = query.eq('case_type', options.caseType);
      }
      if (options.caseId) {
        query = query.eq('case_id', options.caseId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEnrollments(data || []);
      calculateStatistics(data || []);
    } catch (err) {
      console.error("Error fetching enrollments from Supabase:", err);
      setError(err.message);
      
      // Fallback to dummy data
      console.log("Falling back to dummy data for enrollments");
      let filteredEnrollments = [...SAMPLE_ENROLLMENTS];

      // Apply filters to dummy data
      if (options.status) {
        filteredEnrollments = filteredEnrollments.filter(
          (e) => e.status === options.status
        );
      }
      if (options.programId) {
        filteredEnrollments = filteredEnrollments.filter(
          (e) => e.program_id === options.programId
        );
      }
      if (options.caseType) {
        filteredEnrollments = filteredEnrollments.filter(
          (e) => e.case_type === options.caseType
        );
      }
      if (options.caseId) {
        filteredEnrollments = filteredEnrollments.filter(
          (e) => e.case_id === options.caseId
        );
      }

      setEnrollments(filteredEnrollments);
      calculateStatistics(filteredEnrollments);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate enrollment statistics
   * @param {Array} enrollmentsData - Array of enrollment objects
   */
  const calculateStatistics = (enrollmentsData) => {
    const stats = {
      total: enrollmentsData.length,
      active: enrollmentsData.filter((e) => e.status === "active").length,
      completed: enrollmentsData.filter((e) => e.status === "completed").length,
      dropped: enrollmentsData.filter((e) => e.status === "dropped").length,
      atRisk: enrollmentsData.filter((e) => e.status === "at_risk").length,
      averageAttendance:
        enrollmentsData.length > 0
          ? enrollmentsData.reduce((sum, e) => sum + (parseFloat(e.attendance_rate) || 0), 0) /
            enrollmentsData.length
          : 0,
      averageProgress: 0,
    };

    // Calculate average progress based on percentage
    const totalProgress = enrollmentsData.reduce(
      (sum, e) => sum + (parseFloat(e.progress_percentage) || 0),
      0
    );
    stats.averageProgress =
      enrollmentsData.length > 0 ? totalProgress / enrollmentsData.length : 0;

    setStatistics(stats);
  };

  /**
   * Create a new enrollment
   * @async
   * @param {Object} enrollmentData - New enrollment data
   * @returns {Promise<Object>} Created enrollment
   */
  const createEnrollment = async (enrollmentData) => {
    try {
      const { user } = useAuthStore.getState();
      
      // Prepare enrollment data with proper formatting
      const formattedData = {
        case_id: enrollmentData.case_id,
        case_number: enrollmentData.case_number,
        case_type: enrollmentData.case_type,
        beneficiary_name: enrollmentData.beneficiary_name,
        program_id: enrollmentData.program_id,
        enrollment_date: enrollmentData.enrollment_date || new Date().toISOString().split('T')[0],
        expected_completion_date: enrollmentData.expected_completion_date || null,
        status: enrollmentData.status || 'active',
        progress_percentage: enrollmentData.progress_percentage || 0,
        progress_level: enrollmentData.progress_level || null,
        sessions_total: parseInt(enrollmentData.sessions_total) || 0,
        sessions_attended: 0,
        sessions_completed: 0,
        attendance_rate: 0,
        assigned_by: user?.id || null,
        assigned_by_name: user?.full_name || null,
        case_worker: enrollmentData.case_worker || null,
        notes: enrollmentData.notes || null,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('program_enrollments')
        .insert([formattedData])
        .select(`
          *,
          program:programs(
            id,
            program_name,
            program_type,
            coordinator,
            status
          ),
          assigned_by_user:profile!program_enrollments_assigned_by_fkey(
            id,
            full_name,
            role
          )
        `)
        .single();

      if (error) throw error;

      // Create audit log entry
      await createAuditLog({
        actionType: AUDIT_ACTIONS.CREATE_ENROLLMENT,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Enrolled ${data.beneficiary_name} in program ${data.program?.program_name || 'Unknown'}`,
        resourceType: 'enrollment',
        resourceId: data.id,
        metadata: {
          beneficiaryName: data.beneficiary_name,
          caseId: data.case_id,
          caseNumber: data.case_number,
          caseType: data.case_type,
          programId: data.program_id,
          programName: data.program?.program_name,
          enrollmentDate: data.enrollment_date,
        },
        severity: 'info',
      });

      // Refresh enrollments list
      await fetchEnrollments();

      return data;
    } catch (err) {
      console.error("Error creating enrollment:", err);
      throw err;
    }
  };

  /**
   * Update an existing enrollment
   * @async
   * @param {string} enrollmentId - Enrollment ID
   * @param {Object} updates - Updated enrollment data
   * @returns {Promise<Object>} Updated enrollment
   */
  const updateEnrollment = async (enrollmentId, updates) => {
    try {
      // Get old enrollment data for audit log
      const oldEnrollment = enrollments.find(e => e.id === enrollmentId);
      
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
        .from('program_enrollments')
        .update(formattedUpdates)
        .eq('id', enrollmentId)
        .select(`
          *,
          program:programs(
            id,
            program_name,
            program_type,
            coordinator,
            status
          ),
          assigned_by_user:profile!program_enrollments_assigned_by_fkey(
            id,
            full_name,
            role
          )
        `)
        .single();

      if (error) throw error;

      // Create audit log entry with change details
      const changes = oldEnrollment
        ? Object.keys(updates).reduce((acc, key) => {
            if (oldEnrollment[key] !== updates[key]) {
              acc[key] = { old: oldEnrollment[key], new: updates[key] };
            }
            return acc;
          }, {})
        : updates;

      await createAuditLog({
        actionType: AUDIT_ACTIONS.UPDATE_ENROLLMENT,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Updated enrollment for ${data.beneficiary_name}`,
        resourceType: 'enrollment',
        resourceId: enrollmentId,
        metadata: {
          beneficiaryName: data.beneficiary_name,
          caseId: data.case_id,
          programName: data.program?.program_name,
          changes,
        },
        severity: 'info',
      });

      // Refresh enrollments list
      await fetchEnrollments();

      return data;
    } catch (err) {
      console.error("Error updating enrollment:", err);
      throw err;
    }
  };

  /**
   * Delete an enrollment
   * @async
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<void>}
   */
  const deleteEnrollment = async (enrollmentId) => {
    try {
      // Get enrollment data for audit log
      const enrollmentToDelete = enrollments.find(e => e.id === enrollmentId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('program_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      // Create audit log entry
      if (enrollmentToDelete) {
        await createAuditLog({
          actionType: AUDIT_ACTIONS.DELETE_ENROLLMENT,
          actionCategory: AUDIT_CATEGORIES.PROGRAM,
          description: `Deleted enrollment for ${enrollmentToDelete.beneficiary_name}`,
          resourceType: 'enrollment',
          resourceId: enrollmentId,
          metadata: {
            beneficiaryName: enrollmentToDelete.beneficiary_name,
            caseId: enrollmentToDelete.case_id,
            caseNumber: enrollmentToDelete.case_number,
            programId: enrollmentToDelete.program_id,
          },
          severity: 'warning',
        });
      }

      // Refresh enrollments list
      await fetchEnrollments();
    } catch (err) {
      console.error("Error deleting enrollment:", err);
      throw err;
    }
  };

  /**
   * Get enrollment by ID
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Object|null} Enrollment object or null
   */
  const getEnrollmentById = (enrollmentId) => {
    return enrollments.find((e) => e.id === enrollmentId) || null;
  };

  /**
   * Get enrollments by case ID
   * @param {string} caseId - Case ID
   * @returns {Array} Array of enrollments
   */
  const getEnrollmentsByCaseId = (caseId) => {
    return enrollments.filter((e) => e.case_id === caseId);
  };

  /**
   * Get enrollments by program ID
   * @param {string} programId - Program ID
   * @returns {Array} Array of enrollments
   */
  const getEnrollmentsByProgramId = (programId) => {
    return enrollments.filter((e) => e.program_id === programId);
  };

  // Fetch enrollments on mount and when options change
  useEffect(() => {
    fetchEnrollments();

    // Set up Supabase realtime subscription for enrollment changes
    const subscription = supabase
      .channel('enrollments-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'program_enrollments' 
        },
        (payload) => {
          console.log('Enrollment change received:', payload);
          fetchEnrollments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.status, options.programId, options.caseType, options.caseId]);

  return {
    enrollments,
    loading,
    error,
    statistics,
    fetchEnrollments,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
    getEnrollmentById,
    getEnrollmentsByCaseId,
    getEnrollmentsByProgramId,
  };
}
