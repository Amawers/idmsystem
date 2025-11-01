/**
 * @file usePrograms.js
 * @description Custom React hook for managing programs data with Supabase integration
 * @module hooks/usePrograms
 * 
 * Features:
 * - Fetch all programs with filtering and pagination
 * - Real-time program updates via Supabase subscriptions
 * - CRUD operations for program management
 * - Program statistics and analytics
 * - Error handling and loading states
 * 
 * @returns {Object} Programs data, loading state, error state, and CRUD functions
 */

import { useState, useEffect } from "react";
// import { supabase } from "@/config/supabase";
import SAMPLE_PROGRAMS from "../../SAMPLE_PROGRAMS.json";

/**
 * Hook for managing programs data
 * @param {Object} options - Configuration options
 * @param {string} options.status - Filter by status (active, inactive, completed)
 * @param {string} options.programType - Filter by program type
 * @param {Array<string>} options.targetBeneficiary - Filter by target beneficiary
 * @returns {Object} Programs data and operations
 */
export function usePrograms(options = {}) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    inactive: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalEnrollment: 0,
    averageSuccessRate: 0,
  });

  /**
   * Fetch programs from Supabase
   * @async
   */
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      // SUPABASE QUERY (commented for now - using dummy data)
      /*
      let query = supabase
        .from('programs')
        .select(`
          *,
          coordinator:profile!programs_coordinator_id_fkey(id, role, avatar_url),
          enrollments:program_enrollments(count)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.programType) {
        query = query.eq('program_type', options.programType);
      }
      if (options.targetBeneficiary && options.targetBeneficiary.length > 0) {
        query = query.contains('target_beneficiary', options.targetBeneficiary);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPrograms(data || []);
      calculateStatistics(data || []);
      */

      // Using dummy data
      let filteredPrograms = [...SAMPLE_PROGRAMS];

      // Apply filters to dummy data
      if (options.status) {
        filteredPrograms = filteredPrograms.filter(
          (p) => p.status === options.status
        );
      }
      if (options.programType) {
        filteredPrograms = filteredPrograms.filter(
          (p) => p.program_type === options.programType
        );
      }
      if (options.targetBeneficiary && options.targetBeneficiary.length > 0) {
        filteredPrograms = filteredPrograms.filter((p) =>
          options.targetBeneficiary.some((beneficiary) =>
            p.target_beneficiary.includes(beneficiary)
          )
        );
      }

      setPrograms(filteredPrograms);
      calculateStatistics(filteredPrograms);
    } catch (err) {
      console.error("Error fetching programs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate program statistics
   * @param {Array} programsData - Array of program objects
   */
  const calculateStatistics = (programsData) => {
    const stats = {
      total: programsData.length,
      active: programsData.filter((p) => p.status === "active").length,
      completed: programsData.filter((p) => p.status === "completed").length,
      inactive: programsData.filter((p) => p.status === "inactive").length,
      totalBudget: programsData.reduce((sum, p) => sum + (p.budget_allocated || 0), 0),
      totalSpent: programsData.reduce((sum, p) => sum + (p.budget_spent || 0), 0),
      totalEnrollment: programsData.reduce((sum, p) => sum + (p.current_enrollment || 0), 0),
      averageSuccessRate:
        programsData.length > 0
          ? programsData.reduce((sum, p) => sum + (p.success_rate || 0), 0) /
            programsData.length
          : 0,
    };
    setStatistics(stats);
  };

  /**
   * Create a new program
   * @async
   * @param {Object} programData - New program data
   * @returns {Promise<Object>} Created program
   */
  const createProgram = async (programData) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('programs')
        .insert([{
          ...programData,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh programs list
      await fetchPrograms();

      return data;
      */

      // Dummy implementation
      const newProgram = {
        id: `prog-${Date.now()}`,
        ...programData,
        current_enrollment: 0,
        budget_spent: 0,
        success_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setPrograms((prev) => [newProgram, ...prev]);
      return newProgram;
    } catch (err) {
      console.error("Error creating program:", err);
      throw err;
    }
  };

  /**
   * Update an existing program
   * @async
   * @param {string} programId - Program ID
   * @param {Object} updates - Updated program data
   * @returns {Promise<Object>} Updated program
   */
  const updateProgram = async (programId, updates) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { data, error } = await supabase
        .from('programs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', programId)
        .select()
        .single();

      if (error) throw error;

      // Refresh programs list
      await fetchPrograms();

      return data;
      */

      // Dummy implementation
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === programId
            ? { ...p, ...updates, updated_at: new Date().toISOString() }
            : p
        )
      );

      return { id: programId, ...updates };
    } catch (err) {
      console.error("Error updating program:", err);
      throw err;
    }
  };

  /**
   * Delete a program
   * @async
   * @param {string} programId - Program ID
   * @returns {Promise<void>}
   */
  const deleteProgram = async (programId) => {
    try {
      // SUPABASE MUTATION (commented for now)
      /*
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      // Refresh programs list
      await fetchPrograms();
      */

      // Dummy implementation
      setPrograms((prev) => prev.filter((p) => p.id !== programId));
    } catch (err) {
      console.error("Error deleting program:", err);
      throw err;
    }
  };

  /**
   * Get program by ID
   * @param {string} programId - Program ID
   * @returns {Object|null} Program object or null
   */
  const getProgramById = (programId) => {
    return programs.find((p) => p.id === programId) || null;
  };

  // Fetch programs on mount and when options change
  useEffect(() => {
    fetchPrograms();

    // SUPABASE REALTIME SUBSCRIPTION (commented for now)
    /*
    const subscription = supabase
      .channel('programs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'programs' },
        (payload) => {
          console.log('Program change received:', payload);
          fetchPrograms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.status, options.programType, options.targetBeneficiary]);

  return {
    programs,
    loading,
    error,
    statistics,
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
    getProgramById,
  };
}
