/**
 * @file enrollmentSubmission.js
 * @description Helper functions for enrollment submission and data formatting
 * @module lib/enrollmentSubmission
 * 
 * Features:
 * - Format enrollment data for Supabase insertion
 * - Validate enrollment data before submission
 * - Handle case and program lookups
 * - Calculate attendance and progress metrics
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * Validates enrollment data before submission
 * @param {Object} enrollmentData - Enrollment data to validate
 * @returns {Object} { isValid: boolean, errors: Array<string> }
 */
export function validateEnrollmentData(enrollmentData) {
  const errors = [];

  // Required fields
  if (!enrollmentData.case_id) {
    errors.push("Case ID is required");
  }
  if (!enrollmentData.case_number) {
    errors.push("Case number is required");
  }
  if (!enrollmentData.case_type) {
    errors.push("Case type is required");
  }
  if (!enrollmentData.beneficiary_name || enrollmentData.beneficiary_name.trim().length < 2) {
    errors.push("Beneficiary name must be at least 2 characters");
  }
  if (!enrollmentData.program_id) {
    errors.push("Program is required");
  }
  if (!enrollmentData.enrollment_date) {
    errors.push("Enrollment date is required");
  }

  // Validate case type
  const validCaseTypes = ['CICL/CAR', 'VAC', 'FAC', 'FAR', 'IVAC'];
  if (enrollmentData.case_type && !validCaseTypes.includes(enrollmentData.case_type)) {
    errors.push(`Case type must be one of: ${validCaseTypes.join(', ')}`);
  }

  // Numeric validations
  if (enrollmentData.sessions_total && parseInt(enrollmentData.sessions_total) < 0) {
    errors.push("Total sessions must be a non-negative number");
  }
  if (enrollmentData.progress_percentage !== undefined) {
    const progress = parseFloat(enrollmentData.progress_percentage);
    if (progress < 0 || progress > 100) {
      errors.push("Progress percentage must be between 0 and 100");
    }
  }
  if (enrollmentData.attendance_rate !== undefined) {
    const attendance = parseFloat(enrollmentData.attendance_rate);
    if (attendance < 0 || attendance > 100) {
      errors.push("Attendance rate must be between 0 and 100");
    }
  }

  // Date validations
  if (enrollmentData.expected_completion_date && enrollmentData.enrollment_date) {
    const enrollDate = new Date(enrollmentData.enrollment_date);
    const completionDate = new Date(enrollmentData.expected_completion_date);
    if (completionDate < enrollDate) {
      errors.push("Expected completion date must be after enrollment date");
    }
  }
  if (enrollmentData.completion_date && enrollmentData.enrollment_date) {
    const enrollDate = new Date(enrollmentData.enrollment_date);
    const completionDate = new Date(enrollmentData.completion_date);
    if (completionDate < enrollDate) {
      errors.push("Completion date must be after enrollment date");
    }
  }

  // Session validations
  if (enrollmentData.sessions_attended && enrollmentData.sessions_total) {
    if (parseInt(enrollmentData.sessions_attended) > parseInt(enrollmentData.sessions_total)) {
      errors.push("Sessions attended cannot exceed total sessions");
    }
  }
  if (enrollmentData.sessions_completed && enrollmentData.sessions_total) {
    if (parseInt(enrollmentData.sessions_completed) > parseInt(enrollmentData.sessions_total)) {
      errors.push("Sessions completed cannot exceed total sessions");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats enrollment data for Supabase insertion
 * @param {Object} enrollmentData - Raw enrollment data from form
 * @param {string} userId - Current user ID for assigned_by
 * @param {string} userName - Current user's full name
 * @returns {Object} Formatted enrollment data
 */
export function formatEnrollmentData(enrollmentData, userId = null, userName = null) {
  return {
    case_id: enrollmentData.case_id,
    case_number: enrollmentData.case_number?.trim(),
    case_type: enrollmentData.case_type,
    beneficiary_name: enrollmentData.beneficiary_name?.trim(),
    program_id: enrollmentData.program_id,
    enrollment_date: enrollmentData.enrollment_date,
    expected_completion_date: enrollmentData.expected_completion_date || null,
    completion_date: enrollmentData.completion_date || null,
    status: enrollmentData.status || 'active',
    progress_percentage: parseInt(enrollmentData.progress_percentage) || 0,
    progress_level: enrollmentData.progress_level || null,
    sessions_total: parseInt(enrollmentData.sessions_total) || 0,
    sessions_attended: parseInt(enrollmentData.sessions_attended) || 0,
    sessions_completed: parseInt(enrollmentData.sessions_completed) || 0,
    attendance_rate: parseFloat(enrollmentData.attendance_rate) || 0,
    assigned_by: userId,
    assigned_by_name: userName,
    case_worker: enrollmentData.case_worker?.trim() || null,
    notes: enrollmentData.notes?.trim() || null,
  };
}

/**
 * Calculate attendance rate from sessions data
 * @param {number} sessionsAttended - Number of sessions attended
 * @param {number} sessionsTotal - Total number of sessions
 * @returns {number} Attendance rate percentage (0-100)
 */
export function calculateAttendanceRate(sessionsAttended, sessionsTotal) {
  if (!sessionsTotal || sessionsTotal === 0) return 0;
  return Math.round((sessionsAttended / sessionsTotal) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate progress percentage from completed sessions
 * @param {number} sessionsCompleted - Number of sessions completed
 * @param {number} sessionsTotal - Total number of sessions
 * @returns {number} Progress percentage (0-100)
 */
export function calculateProgressPercentage(sessionsCompleted, sessionsTotal) {
  if (!sessionsTotal || sessionsTotal === 0) return 0;
  return Math.round((sessionsCompleted / sessionsTotal) * 100);
}

/**
 * Determine progress level based on percentage
 * @param {number} progressPercentage - Progress percentage (0-100)
 * @returns {string} Progress level (excellent, good, fair, poor)
 */
export function determineProgressLevel(progressPercentage) {
  if (progressPercentage >= 90) return 'excellent';
  if (progressPercentage >= 70) return 'good';
  if (progressPercentage >= 50) return 'fair';
  return 'poor';
}

/**
 * Submits a new enrollment to Supabase with audit logging
 * @param {Object} enrollmentData - Enrollment data to submit
 * @param {string} userId - Current user ID
 * @param {string} userName - Current user's full name
 * @returns {Promise<{enrollmentId: string|null, data: Object|null, error: any}>}
 * 
 * @example
 * const result = await submitEnrollment(formData, user.id, user.full_name);
 * if (result.error) {
 *   console.error('Failed to create enrollment:', result.error);
 * } else {
 *   console.log('Enrollment created with ID:', result.enrollmentId);
 * }
 */
export async function submitEnrollment(enrollmentData, userId = null, userName = null) {
  try {
    // Validate data
    const validation = validateEnrollmentData(enrollmentData);
    if (!validation.isValid) {
      return {
        enrollmentId: null,
        data: null,
        error: {
          message: validation.errors.join(', '),
          validationErrors: validation.errors,
        },
      };
    }

    // Format data
    const formattedData = formatEnrollmentData(enrollmentData, userId, userName);

    // Insert into Supabase with program details
    const { data, error } = await supabase
      .from('program_enrollments')
      .insert([formattedData])
      .select(`
        *,
        program:programs(
          id,
          program_name,
          program_type,
          coordinator
        )
      `)
      .single();

    if (error) {
      return { enrollmentId: null, data: null, error };
    }

    // Create audit log
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
        sessionsTotal: data.sessions_total,
      },
      severity: 'info',
    });

    return { enrollmentId: data.id, data, error: null };
  } catch (err) {
    console.error('Error in submitEnrollment:', err);
    return { enrollmentId: null, data: null, error: err };
  }
}

/**
 * Updates an existing enrollment in Supabase
 * @param {string} enrollmentId - Enrollment ID to update
 * @param {Object} updates - Updated enrollment data
 * @param {Object} oldData - Previous enrollment data for audit comparison
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function updateEnrollment(enrollmentId, updates, oldData = null) {
  try {
    // Prepare formatted updates
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

    // Update in Supabase with program details
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
          coordinator
        )
      `)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Create audit log with change details
    const changes = oldData
      ? Object.keys(updates).reduce((acc, key) => {
          if (oldData[key] !== updates[key]) {
            acc[key] = { old: oldData[key], new: updates[key] };
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

    return { data, error: null };
  } catch (err) {
    console.error('Error in updateEnrollment:', err);
    return { data: null, error: err };
  }
}

/**
 * Deletes an enrollment from Supabase
 * @param {string} enrollmentId - Enrollment ID to delete
 * @param {Object} enrollmentData - Enrollment data for audit log
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function deleteEnrollment(enrollmentId, enrollmentData = null) {
  try {
    // Delete from Supabase
    const { error } = await supabase
      .from('program_enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      return { success: false, error };
    }

    // Create audit log
    if (enrollmentData) {
      await createAuditLog({
        actionType: AUDIT_ACTIONS.DELETE_ENROLLMENT,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Deleted enrollment for ${enrollmentData.beneficiary_name}`,
        resourceType: 'enrollment',
        resourceId: enrollmentId,
        metadata: {
          beneficiaryName: enrollmentData.beneficiary_name,
          caseId: enrollmentData.case_id,
          caseNumber: enrollmentData.case_number,
          programId: enrollmentData.program_id,
        },
        severity: 'warning',
      });
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in deleteEnrollment:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetch case details for enrollment
 * @param {string} caseId - Case ID
 * @param {string} caseType - Case type (CICL/CAR, VAC, FAC, FAR, IVAC)
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function fetchCaseDetails(caseId, caseType) {
  try {
    let tableName;
    let selectFields = 'id';

    // Determine table and fields based on case type
    switch (caseType) {
      case 'CICL/CAR':
        tableName = 'ciclcar_case';
        selectFields = 'id, profile_name, case_manager, status';
        break;
      case 'VAC':
        tableName = 'case';
        selectFields = 'id, identifying_name, case_manager, status';
        break;
      case 'FAC':
        tableName = 'fac_case';
        selectFields = 'id, head_first_name, head_last_name, case_manager, status';
        break;
      case 'FAR':
        tableName = 'far_case';
        selectFields = 'id, receiving_member, case_manager, status';
        break;
      case 'IVAC':
        tableName = 'ivac_cases';
        selectFields = 'id, records, status';
        break;
      default:
        return { 
          data: null, 
          error: { message: `Invalid case type: ${caseType}` } 
        };
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq('id', caseId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching case details:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch available programs for enrollment
 * @param {string} caseType - Case type to filter programs
 * @returns {Promise<{data: Array|null, error: any}>}
 */
export async function fetchAvailablePrograms(caseType = null) {
  try {
    let query = supabase
      .from('programs')
      .select('id, program_name, program_type, capacity, current_enrollment, status')
      .eq('status', 'active')
      .order('program_name');

    // Filter by target beneficiary if case type provided
    if (caseType) {
      query = query.contains('target_beneficiary', [caseType]);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Filter out programs at full capacity
    const availablePrograms = (data || []).filter(
      program => program.current_enrollment < program.capacity
    );

    return { data: availablePrograms, error: null };
  } catch (err) {
    console.error('Error fetching available programs:', err);
    return { data: null, error: err };
  }
}
