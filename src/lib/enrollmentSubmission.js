/**
 * Program enrollment submission helpers.
 *
 * Responsibilities:
 * - Validate and format enrollment form data into Supabase-friendly rows.
 * - Provide CRUD helpers for `program_enrollments` with audit logging.
 * - Provide small derived-metric helpers (attendance/progress calculations).
 * - Lookup case and program details required by enrollment workflows.
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * @typedef {"CICL/CAR"|"VAC"|"FAC"|"FAR"|"IVAC"} EnrollmentCaseType
 */

/**
 * @typedef {Object} EnrollmentData
 * @property {string} [id]
 * @property {string} case_id
 * @property {string} case_number
 * @property {EnrollmentCaseType} case_type
 * @property {string} beneficiary_name
 * @property {string} program_id
 * @property {string} enrollment_date
 * @property {string} [expected_completion_date]
 * @property {string} [completion_date]
 * @property {string} [status]
 * @property {number|string} [progress_percentage]
 * @property {string} [progress_level]
 * @property {number|string} [sessions_total]
 * @property {number|string} [sessions_attended]
 * @property {number|string} [sessions_completed]
 * @property {number|string} [attendance_rate]
 * @property {string} [case_worker]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} EnrollmentValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 */

/**
 * @typedef {Object} EnrollmentRow
 * @property {string} case_id
 * @property {string|undefined} case_number
 * @property {EnrollmentCaseType} case_type
 * @property {string|undefined} beneficiary_name
 * @property {string} program_id
 * @property {string} enrollment_date
 * @property {string|null} expected_completion_date
 * @property {string|null} completion_date
 * @property {string} status
 * @property {number} progress_percentage
 * @property {string|null} progress_level
 * @property {number} sessions_total
 * @property {number} sessions_attended
 * @property {number} sessions_completed
 * @property {number} attendance_rate
 * @property {string|null} assigned_by
 * @property {string|null} assigned_by_name
 * @property {string|null} case_worker
 * @property {string|null} notes
 */

/**
 * @typedef {Object} EnrollmentError
 * @property {string} message
 * @property {string[]} [validationErrors]
 */

/**
 * Validate enrollment data before submission.
 * @param {EnrollmentData} enrollmentData
 * @returns {EnrollmentValidationResult}
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
	if (
		!enrollmentData.beneficiary_name ||
		enrollmentData.beneficiary_name.trim().length < 2
	) {
		errors.push("Beneficiary name must be at least 2 characters");
	}
	if (!enrollmentData.program_id) {
		errors.push("Program is required");
	}
	if (!enrollmentData.enrollment_date) {
		errors.push("Enrollment date is required");
	}

	// Validate case type
	const validCaseTypes = /** @type {EnrollmentCaseType[]} */ ([
		"CICL/CAR",
		"VAC",
		"FAC",
		"FAR",
		"IVAC",
	]);
	if (
		enrollmentData.case_type &&
		!validCaseTypes.includes(enrollmentData.case_type)
	) {
		errors.push(`Case type must be one of: ${validCaseTypes.join(", ")}`);
	}

	// Numeric validations
	if (
		enrollmentData.sessions_total &&
		parseInt(enrollmentData.sessions_total) < 0
	) {
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
	if (
		enrollmentData.expected_completion_date &&
		enrollmentData.enrollment_date
	) {
		// Only validate if expected_completion_date is not an empty string
		const expectedDate = enrollmentData.expected_completion_date.trim();
		if (expectedDate) {
			const enrollDate = new Date(enrollmentData.enrollment_date);
			const completionDate = new Date(expectedDate);
			if (completionDate < enrollDate) {
				errors.push(
					"Expected completion date must be after enrollment date",
				);
			}
		}
	}
	if (enrollmentData.completion_date && enrollmentData.enrollment_date) {
		// Only validate if completion_date is not an empty string
		const completionDateStr = enrollmentData.completion_date.trim();
		if (completionDateStr) {
			const enrollDate = new Date(enrollmentData.enrollment_date);
			const completionDate = new Date(completionDateStr);
			if (completionDate < enrollDate) {
				errors.push("Completion date must be after enrollment date");
			}
		}
	}

	// Session validations
	if (enrollmentData.sessions_attended && enrollmentData.sessions_total) {
		if (
			parseInt(enrollmentData.sessions_attended) >
			parseInt(enrollmentData.sessions_total)
		) {
			errors.push("Sessions attended cannot exceed total sessions");
		}
	}
	if (enrollmentData.sessions_completed && enrollmentData.sessions_total) {
		if (
			parseInt(enrollmentData.sessions_completed) >
			parseInt(enrollmentData.sessions_total)
		) {
			errors.push("Sessions completed cannot exceed total sessions");
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Format enrollment data for Supabase insertion.
 *
 * Notes:
 * - Empty strings are normalized to `null` for nullable DB columns.
 * - Numeric form fields are coerced to numbers with sane defaults.
 *
 * @param {EnrollmentData} enrollmentData Raw enrollment data from the form.
 * @param {string|null} [userId=null] Current user ID for `assigned_by`.
 * @param {string|null} [userName=null] Current user's full name.
 * @returns {EnrollmentRow}
 */
export function formatEnrollmentData(
	enrollmentData,
	userId = null,
	userName = null,
) {
	return {
		case_id: enrollmentData.case_id,
		case_number: enrollmentData.case_number?.trim(),
		case_type: enrollmentData.case_type,
		beneficiary_name: enrollmentData.beneficiary_name?.trim(),
		program_id: enrollmentData.program_id,
		enrollment_date: enrollmentData.enrollment_date,
		// Ensure empty strings are converted to null to satisfy DB constraints
		expected_completion_date:
			enrollmentData.expected_completion_date || null,
		completion_date: enrollmentData.completion_date || null,
		status: enrollmentData.status || "active",
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
 * Calculate attendance rate from sessions data.
 * @param {number} sessionsAttended
 * @param {number} sessionsTotal
 * @returns {number} Attendance rate percentage (0-100).
 */
export function calculateAttendanceRate(sessionsAttended, sessionsTotal) {
	if (!sessionsTotal || sessionsTotal === 0) return 0;
	return Math.round((sessionsAttended / sessionsTotal) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate progress percentage from completed sessions.
 * @param {number} sessionsCompleted
 * @param {number} sessionsTotal
 * @returns {number} Progress percentage (0-100).
 */
export function calculateProgressPercentage(sessionsCompleted, sessionsTotal) {
	if (!sessionsTotal || sessionsTotal === 0) return 0;
	return Math.round((sessionsCompleted / sessionsTotal) * 100);
}

/**
 * Determine progress level based on a percentage.
 * @param {number} progressPercentage Progress percentage (0-100).
 * @returns {"excellent"|"good"|"fair"|"poor"}
 */
export function determineProgressLevel(progressPercentage) {
	if (progressPercentage >= 90) return "excellent";
	if (progressPercentage >= 70) return "good";
	if (progressPercentage >= 50) return "fair";
	return "poor";
}

/**
 * Submit a new enrollment to Supabase with audit logging.
 * @param {EnrollmentData} enrollmentData
 * @param {string|null} [userId=null] Current user ID.
 * @param {string|null} [userName=null] Current user's full name.
 * @returns {Promise<{enrollmentId: string|null, data: any|null, error: any|EnrollmentError}>}
 */
export async function submitEnrollment(
	enrollmentData,
	userId = null,
	userName = null,
) {
	try {
		// Validate data
		const validation = validateEnrollmentData(enrollmentData);
		if (!validation.isValid) {
			return {
				enrollmentId: null,
				data: null,
				error: {
					message: validation.errors.join(", "),
					validationErrors: validation.errors,
				},
			};
		}

		// Format data
		const formattedData = formatEnrollmentData(
			enrollmentData,
			userId,
			userName,
		);

		// Insert into Supabase with program details
		const { data, error } = await supabase
			.from("program_enrollments")
			.insert([formattedData])
			.select(
				`
        *,
        program:programs(
          id,
          program_name,
          program_type,
          coordinator
        )
      `,
			)
			.single();

		if (error) {
			return { enrollmentId: null, data: null, error };
		}

		// Create audit log
		await createAuditLog({
			actionType: AUDIT_ACTIONS.CREATE_ENROLLMENT,
			actionCategory: AUDIT_CATEGORIES.PROGRAM,
			description: `Enrolled ${data.beneficiary_name} in program ${data.program?.program_name || "Unknown"}`,
			resourceType: "enrollment",
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
			severity: "info",
		});

		return { enrollmentId: data.id, data, error: null };
	} catch (err) {
		console.error("Error in submitEnrollment:", err);
		return { enrollmentId: null, data: null, error: err };
	}
}

/**
 * Update an existing enrollment in Supabase and write an audit entry.
 * @param {string} enrollmentId Enrollment ID to update.
 * @param {Partial<EnrollmentData>} updates Updated enrollment data.
 * @param {EnrollmentData|null} [oldData=null] Previous enrollment data for audit comparison.
 * @returns {Promise<{data: any|null, error: any}>}
 */
export async function updateEnrollment(enrollmentId, updates, oldData = null) {
	try {
		// Prepare formatted updates
		const formattedUpdates = {
			...updates,
			updated_at: new Date().toISOString(),
		};

		// Remove undefined values
		Object.keys(formattedUpdates).forEach((key) => {
			if (formattedUpdates[key] === undefined) {
				delete formattedUpdates[key];
			}
		});

		// Update in Supabase with program details
		const { data, error } = await supabase
			.from("program_enrollments")
			.update(formattedUpdates)
			.eq("id", enrollmentId)
			.select(
				`
        *,
        program:programs(
          id,
          program_name,
          program_type,
          coordinator
        )
      `,
			)
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
			resourceType: "enrollment",
			resourceId: enrollmentId,
			metadata: {
				beneficiaryName: data.beneficiary_name,
				caseId: data.case_id,
				programName: data.program?.program_name,
				changes,
			},
			severity: "info",
		});

		return { data, error: null };
	} catch (err) {
		console.error("Error in updateEnrollment:", err);
		return { data: null, error: err };
	}
}

/**
 * Delete an enrollment from Supabase and (optionally) write an audit entry.
 * @param {string} enrollmentId Enrollment ID to delete.
 * @param {EnrollmentData|null} [enrollmentData=null] Enrollment data for audit log.
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function deleteEnrollment(enrollmentId, enrollmentData = null) {
	try {
		// Delete from Supabase
		const { error } = await supabase
			.from("program_enrollments")
			.delete()
			.eq("id", enrollmentId);

		if (error) {
			return { success: false, error };
		}

		// Create audit log
		if (enrollmentData) {
			await createAuditLog({
				actionType: AUDIT_ACTIONS.DELETE_ENROLLMENT,
				actionCategory: AUDIT_CATEGORIES.PROGRAM,
				description: `Deleted enrollment for ${enrollmentData.beneficiary_name}`,
				resourceType: "enrollment",
				resourceId: enrollmentId,
				metadata: {
					beneficiaryName: enrollmentData.beneficiary_name,
					caseId: enrollmentData.case_id,
					caseNumber: enrollmentData.case_number,
					programId: enrollmentData.program_id,
				},
				severity: "warning",
			});
		}

		return { success: true, error: null };
	} catch (err) {
		console.error("Error in deleteEnrollment:", err);
		return { success: false, error: err };
	}
}

/**
 * Fetch case details needed for enrollment display.
 * @param {string} caseId
 * @param {EnrollmentCaseType} caseType
 * @returns {Promise<{data: any|null, error: any}>}
 */
export async function fetchCaseDetails(caseId, caseType) {
	try {
		let tableName;
		let selectFields = "id";

		// Determine table and fields based on case type
		switch (caseType) {
			case "CICL/CAR":
				tableName = "ciclcar_case";
				selectFields = "id, profile_name, case_manager, status";
				break;
			case "VAC":
				tableName = "case";
				selectFields = "id, identifying_name, case_manager, status";
				break;
			case "FAC":
				tableName = "fac_case";
				selectFields =
					"id, head_first_name, head_last_name, case_manager, status";
				break;
			case "FAR":
				tableName = "far_case";
				selectFields = "id, receiving_member, case_manager, status";
				break;
			case "IVAC":
				tableName = "ivac_cases";
				selectFields = "id, records, status";
				break;
			default:
				return {
					data: null,
					error: { message: `Invalid case type: ${caseType}` },
				};
		}

		const { data, error } = await supabase
			.from(tableName)
			.select(selectFields)
			.eq("id", caseId)
			.single();

		if (error) {
			return { data: null, error };
		}

		return { data, error: null };
	} catch (err) {
		console.error("Error fetching case details:", err);
		return { data: null, error: err };
	}
}

/**
 * Fetch available programs for enrollment.
 * @param {EnrollmentCaseType|null} [caseType=null] Optional case type to filter programs.
 * @returns {Promise<{data: any[]|null, error: any}>}
 */
export async function fetchAvailablePrograms(caseType = null) {
	try {
		let query = supabase
			.from("programs")
			.select(
				"id, program_name, program_type, capacity, current_enrollment, status",
			)
			.eq("status", "active")
			.order("program_name");

		// Filter by target beneficiary if case type provided
		if (caseType) {
			query = query.contains("target_beneficiary", [caseType]);
		}

		const { data, error } = await query;

		if (error) {
			return { data: null, error };
		}

		// Filter out programs at full capacity
		const availablePrograms = (data || []).filter(
			(program) => program.current_enrollment < program.capacity,
		);

		return { data: availablePrograms, error: null };
	} catch (err) {
		console.error("Error fetching available programs:", err);
		return { data: null, error: err };
	}
}
