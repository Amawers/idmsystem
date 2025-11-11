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
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import { useAuthStore } from "@/store/authStore";
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

      // Build Supabase query
      let query = supabase
        .from('programs')
        .select('*')
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
    } catch (err) {
      console.error("Error fetching programs:", err);
      setError(err.message);
      
      // Fallback to dummy data if Supabase fails
      console.log("Falling back to dummy data");
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
      // Get current user for coordinator_id
      const { user } = useAuthStore.getState();
      
      // Prepare program data with proper formatting
      const formattedData = {
        ...programData,
        // Ensure target_beneficiary is an array as per DB schema
        target_beneficiary: Array.isArray(programData.target_beneficiary) 
          ? programData.target_beneficiary 
          : [programData.target_beneficiary],
        // Set coordinator_id if user exists
        coordinator_id: user?.id || null,
        // Initialize default values
        current_enrollment: 0,
        budget_spent: 0,
        success_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('programs')
        .insert([formattedData])
        .select()
        .single();

      if (error) throw error;

      // Create audit log entry
      await createAuditLog({
        actionType: AUDIT_ACTIONS.CREATE_PROGRAM,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Created new program: ${data.program_name}`,
        resourceType: 'program',
        resourceId: data.id,
        metadata: {
          programName: data.program_name,
          programType: data.program_type,
          targetBeneficiary: data.target_beneficiary,
          budgetAllocated: data.budget_allocated,
          capacity: data.capacity,
          coordinator: data.coordinator,
        },
        severity: 'info',
      });

      // Refresh programs list
      await fetchPrograms();

      return data;
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
      // Get the old program data for audit log
      const oldProgram = programs.find(p => p.id === programId);
      
      // Prepare updated data
      const formattedUpdates = {
        ...updates,
        // Ensure target_beneficiary is an array
        target_beneficiary: Array.isArray(updates.target_beneficiary) 
          ? updates.target_beneficiary 
          : [updates.target_beneficiary],
        updated_at: new Date().toISOString(),
      };

      // Update in Supabase
      const { data, error } = await supabase
        .from('programs')
        .update(formattedUpdates)
        .eq('id', programId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log entry
      await createAuditLog({
        actionType: AUDIT_ACTIONS.UPDATE_PROGRAM,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Updated program: ${data.program_name}`,
        resourceType: 'program',
        resourceId: programId,
        metadata: {
          programName: data.program_name,
          changes: Object.keys(updates).reduce((acc, key) => {
            if (oldProgram && oldProgram[key] !== updates[key]) {
              acc[key] = { old: oldProgram[key], new: updates[key] };
            }
            return acc;
          }, {}),
        },
        severity: 'info',
      });

      // Refresh programs list
      await fetchPrograms();

      return data;
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
      // Get the program data for audit log
      const programToDelete = programs.find(p => p.id === programId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      // Create audit log entry
      if (programToDelete) {
        await createAuditLog({
          actionType: AUDIT_ACTIONS.DELETE_PROGRAM,
          actionCategory: AUDIT_CATEGORIES.PROGRAM,
          description: `Deleted program: ${programToDelete.program_name}`,
          resourceType: 'program',
          resourceId: programId,
          metadata: {
            programName: programToDelete.program_name,
            programType: programToDelete.program_type,
          },
          severity: 'warning',
        });
      }

      // Refresh programs list
      await fetchPrograms();
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

  /**
   * Refresh success rate for a specific program
   * Calls the database function to recalculate success rate based on enrollments
   * @async
   * @param {string} programId - Program ID
   * @returns {Promise<number>} Updated success rate
   */
  const refreshProgramSuccessRate = async (programId) => {
    try {
      // Call the database function to refresh success rate
      const { data, error } = await supabase
        .rpc('refresh_program_success_rate', { program_id_param: programId });

      if (error) throw error;

      // Refresh programs list to show updated success rate
      await fetchPrograms();

      return data;
    } catch (err) {
      console.error("Error refreshing program success rate:", err);
      throw err;
    }
  };

  /**
   * Refresh success rates for all programs
   * Useful for manual recalculation after bulk enrollment updates
   * @async
   * @returns {Promise<void>}
   */
  const refreshAllSuccessRates = async () => {
    try {
      // Refresh each program's success rate
      const refreshPromises = programs.map((program) =>
        supabase.rpc('refresh_program_success_rate', { program_id_param: program.id })
      );

      await Promise.all(refreshPromises);

      // Refresh programs list to show updated success rates
      await fetchPrograms();
    } catch (err) {
      console.error("Error refreshing all program success rates:", err);
      throw err;
    }
  };

  // Fetch programs on mount and when options change
  useEffect(() => {
    fetchPrograms();
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
    refreshProgramSuccessRate,
    refreshAllSuccessRates,
  };
}
