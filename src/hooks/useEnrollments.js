/**
 * @file useEnrollments.js
 * @description Custom React hook for managing program enrollments with Supabase integration
 * @module hooks/useEnrollments
 * 
 * Features:
 * - Fetch enrollments with case and program details
 * - Filter by status, program, case type
 * - Real-time enrollment updates
 * - CRUD operations for enrollment management
 * - Enrollment statistics and analytics
 * 
 * @returns {Object} Enrollments data, loading state, error state, and CRUD functions
 */

import { useState, useEffect } from "react";
// import { supabase } from "@/config/supabase";
import SAMPLE_ENROLLMENTS from "../../SAMPLE_ENROLLMENTS.json";

/**
 * Hook for managing program enrollments
 * @param {Object} options - Configuration options
 * @param {string} options.status - Filter by status (active, completed, dropped)
 * @param {string} options.programId - Filter by program ID
 * @param {string} options.caseType - Filter by case type (CICL, VAC, FAC, FAR, IVAC)
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
    averageAttendance: 0,
    averageProgress: 0,
  });

  /**
   * Fetch enrollments from Supabase
   * @async
   */
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      // SUPABASE QUERY (commented for now - using dummy data)
      /*
      let query = supabase
        .from('program_enrollments')
        .select(`
          *,
          case:cases(id, case_name, case_type),
          program:programs(id, program_name, program_type),
          assigned_by_profile:profile!program_enrollments_assigned_by_fkey(id, role)
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
        query = query.eq('case.case_type', options.caseType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEnrollments(data || []);
      calculateStatistics(data || []);
      */

      // Using dummy data
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

      setEnrollments(filteredEnrollments);
      calculateStatistics(filteredEnrollments);
    } catch (err) {
      console.error("Error fetching enrollments:", err);
      setError(err.message);
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
      averageAttendance:
        enrollmentsData.length > 0
          ? enrollmentsData.reduce((sum, e) => sum + (e.attendance_rate || 0), 0) /
            enrollmentsData.length
          : 0,
      averageProgress: 0,
    };

    // Calculate average progress
    const progressMap = { excellent: 100, good: 75, fair: 50, poor: 25 };
    const totalProgress = enrollmentsData.reduce(
      (sum, e) => sum + (progressMap[e.progress_level] || 0),
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
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('program_enrollments')
        .insert([{
          ...enrollmentData,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchEnrollments();

      return data;
      */

      // Dummy implementation
      const newEnrollment = {
        id: `enroll-${Date.now()}`,
        ...enrollmentData,
        sessions_completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setEnrollments((prev) => [newEnrollment, ...prev]);
      return newEnrollment;
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
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('program_enrollments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (error) throw error;

      await fetchEnrollments();

      return data;
      */

      // Dummy implementation
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? { ...e, ...updates, updated_at: new Date().toISOString() }
            : e
        )
      );

      return { id: enrollmentId, ...updates };
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
      // SUPABASE MUTATION (commented for now)
      /*
      const { error } = await supabase
        .from('program_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      await fetchEnrollments();
      */

      // Dummy implementation
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
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

    // SUPABASE REALTIME SUBSCRIPTION (commented for now)
    /*
    const subscription = supabase
      .channel('enrollments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'program_enrollments' },
        (payload) => {
          console.log('Enrollment change received:', payload);
          fetchEnrollments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.status, options.programId, options.caseType]);

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
