/**
 * Program submission helpers.
 *
 * Responsibilities:
 * - Validate program form data prior to persistence.
 * - Format program payloads into Supabase-friendly shapes.
 * - Create/update/delete programs in Supabase with audit logging.
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 */

/**
 * @typedef {Object} ProgramData
 * @property {string} [program_name]
 * @property {string} [program_type]
 * @property {string} [description]
 * @property {string[]|string} [target_beneficiary]
 * @property {number|string} [duration_weeks]
 * @property {number|string} [budget_allocated]
 * @property {number|string} [capacity]
 * @property {string} [status]
 * @property {string} [start_date]
 * @property {string} [end_date]
 * @property {string} [coordinator]
 * @property {string} [location]
 * @property {string} [schedule]
 * @property {string[]} [partner_ids]
 */

/**
 * @typedef {Object} ProgramRow
 * A loose representation of the `programs` row returned by Supabase.
 * @property {string} id
 * @property {string} program_name
 * @property {string} program_type
 * @property {string[]} target_beneficiary
 * @property {number} budget_allocated
 * @property {number} capacity
 * @property {string} coordinator
 * @property {string} start_date
 * @property {string[]} [partner_ids]
 */

/**
 * @typedef {Object} SubmitProgramResult
 * @property {string|null} programId
 * @property {ProgramRow|null} data
 * @property {any} error
 */

/**
 * @typedef {Object} UpdateProgramResult
 * @property {ProgramRow|null} data
 * @property {any} error
 */

/**
 * @typedef {Object} DeleteProgramResult
 * @property {boolean} success
 * @property {any} error
 */

/**
 * Validate program data before submission.
 * @param {ProgramData} programData Program data to validate.
 * @returns {ValidationResult} Validation result.
 */
export function validateProgramData(programData) {
	const errors = [];

	// Required fields
	if (
		!programData.program_name ||
		programData.program_name.trim().length < 3
	) {
		errors.push("Program name must be at least 3 characters");
	}
	if (!programData.program_type) {
		errors.push("Program type is required");
	}
	if (
		!programData.target_beneficiary ||
		programData.target_beneficiary.length === 0
	) {
		errors.push("At least one target beneficiary is required");
	}
	if (!programData.coordinator) {
		errors.push("Coordinator name is required");
	}
	if (!programData.start_date) {
		errors.push("Start date is required");
	}

	// Numeric validations
	if (programData.duration_weeks && programData.duration_weeks < 1) {
		errors.push("Duration must be at least 1 week");
	}
	if (programData.capacity && programData.capacity < 1) {
		errors.push("Capacity must be at least 1");
	}
	if (programData.budget_allocated && programData.budget_allocated < 0) {
		errors.push("Budget allocated must be a positive number");
	}

	// Date validations
	if (programData.end_date && programData.start_date) {
		const startDate = new Date(programData.start_date);
		const endDate = new Date(programData.end_date);
		if (endDate < startDate) {
			errors.push("End date must be after start date");
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Format program data for Supabase insertion.
 * @param {ProgramData} programData Raw program data from form.
 * @param {string|null} userId Current user ID for coordinator_id.
 * @returns {Record<string, any>} Formatted program payload.
 */
export function formatProgramData(programData, userId = null) {
	return {
		program_name: programData.program_name?.trim(),
		program_type: programData.program_type,
		description: programData.description?.trim() || null,
		target_beneficiary: Array.isArray(programData.target_beneficiary)
			? programData.target_beneficiary
			: [programData.target_beneficiary],
		duration_weeks: parseInt(programData.duration_weeks),
		budget_allocated: parseFloat(programData.budget_allocated) || 0,
		budget_spent: 0, // Always start at 0
		capacity: parseInt(programData.capacity),
		current_enrollment: 0, // Always start at 0
		status: programData.status || "active",
		start_date: programData.start_date,
		end_date: programData.end_date || null,
		coordinator: programData.coordinator?.trim(),
		coordinator_id: userId,
		location: programData.location?.trim() || null,
		schedule: programData.schedule?.trim() || null,
		success_rate: 0, // Always start at 0
		partner_ids: programData.partner_ids || [],
	};
}

/**
 * Submit a new program to Supabase and emit an audit log entry.
 * @param {ProgramData} programData Program data to submit.
 * @param {string|null} userId Current user ID.
 * @returns {Promise<SubmitProgramResult>}
 */
export async function submitProgram(programData, userId = null) {
	try {
		// Validate data
		const validation = validateProgramData(programData);
		if (!validation.isValid) {
			return {
				programId: null,
				data: null,
				error: {
					message: validation.errors.join(", "),
					validationErrors: validation.errors,
				},
			};
		}

		// Format data
		const formattedData = formatProgramData(programData, userId);

		// Insert into Supabase
		const { data, error } = await supabase
			.from("programs")
			.insert([formattedData])
			.select()
			.single();

		if (error) {
			return { programId: null, data: null, error };
		}

		// Create audit log
		await createAuditLog({
			actionType: AUDIT_ACTIONS.CREATE_PROGRAM,
			actionCategory: AUDIT_CATEGORIES.PROGRAM,
			description: `Created new program: ${data.program_name}`,
			resourceType: "program",
			resourceId: data.id,
			metadata: {
				programName: data.program_name,
				programType: data.program_type,
				targetBeneficiary: data.target_beneficiary,
				budgetAllocated: data.budget_allocated,
				capacity: data.capacity,
				coordinator: data.coordinator,
				startDate: data.start_date,
				partnerIds: data.partner_ids || [],
			},
			severity: "info",
		});

		return { programId: data.id, data, error: null };
	} catch (err) {
		console.error("Error in submitProgram:", err);
		return { programId: null, data: null, error: err };
	}
}

/**
 * Update an existing program in Supabase and emit an audit log entry.
 * @param {string} programId Program ID to update.
 * @param {Partial<ProgramData>} updates Updated program data.
 * @param {ProgramRow|null} oldData Previous program data for audit comparison.
 * @returns {Promise<UpdateProgramResult>}
 */
export async function updateProgram(programId, updates, oldData = null) {
	try {
		// Format updates
		const formattedUpdates = {
			...updates,
			target_beneficiary: Array.isArray(updates.target_beneficiary)
				? updates.target_beneficiary
				: updates.target_beneficiary
					? [updates.target_beneficiary]
					: undefined,
			partner_ids:
				updates.partner_ids !== undefined
					? updates.partner_ids
					: undefined,
			updated_at: new Date().toISOString(),
		};

		// Remove undefined values
		Object.keys(formattedUpdates).forEach((key) => {
			if (formattedUpdates[key] === undefined) {
				delete formattedUpdates[key];
			}
		});

		// Update in Supabase
		const { data, error } = await supabase
			.from("programs")
			.update(formattedUpdates)
			.eq("id", programId)
			.select()
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
			actionType: AUDIT_ACTIONS.UPDATE_PROGRAM,
			actionCategory: AUDIT_CATEGORIES.PROGRAM,
			description: `Updated program: ${data.program_name}`,
			resourceType: "program",
			resourceId: programId,
			metadata: {
				programName: data.program_name,
				changes,
			},
			severity: "info",
		});

		return { data, error: null };
	} catch (err) {
		console.error("Error in updateProgram:", err);
		return { data: null, error: err };
	}
}

/**
 * Delete a program from Supabase and (optionally) emit an audit log entry.
 * @param {string} programId Program ID to delete.
 * @param {ProgramRow|null} programData Program data for audit log context.
 * @returns {Promise<DeleteProgramResult>}
 */
export async function deleteProgram(programId, programData = null) {
	try {
		// Delete from Supabase
		const { error } = await supabase
			.from("programs")
			.delete()
			.eq("id", programId);

		if (error) {
			return { success: false, error };
		}

		// Create audit log
		if (programData) {
			await createAuditLog({
				actionType: AUDIT_ACTIONS.DELETE_PROGRAM,
				actionCategory: AUDIT_CATEGORIES.PROGRAM,
				description: `Deleted program: ${programData.program_name}`,
				resourceType: "program",
				resourceId: programId,
				metadata: {
					programName: programData.program_name,
					programType: programData.program_type,
					targetBeneficiary: programData.target_beneficiary,
				},
				severity: "warning",
			});
		}

		return { success: true, error: null };
	} catch (err) {
		console.error("Error in deleteProgram:", err);
		return { success: false, error: err };
	}
}
