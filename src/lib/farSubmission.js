/**
 * Family Assistance Record (FAR) submission helpers.
 *
 * Responsibilities:
 * - Normalize intake-store state into a Supabase `far_case` payload.
 * - Handle "other" values for emergency/assistance fields.
 * - Provide create/update operations and write an audit log for each.
 */

import supabase from "../../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * @typedef {Object} FarCaseDetails
 * @property {string} [caseManager]
 * @property {string} [case_manager]
 * @property {string} [status]
 * @property {string} [caseStatus]
 * @property {string} [priority]
 * @property {string} [casePriority]
 * @property {string} [case_priority]
 * @property {string} [visibility]
 * @property {string} [caseVisibility]
 * @property {string} [case_visibility]
 */

/**
 * @typedef {Object} FarSection
 * @property {FarCaseDetails} [caseDetails]
 * @property {string|Date|null} [date]
 * @property {string|Date|null} [assistanceDate]
 * @property {string} [receivingMember]
 * @property {string} [receiving_member]
 * @property {string} [emergency]
 * @property {string} [emergencyOther]
 * @property {string} [assistance]
 * @property {string} [assistanceOther]
 * @property {string|number} [unit]
 * @property {string|number} [quantity]
 * @property {string|number} [cost]
 * @property {string} [provider]
 */

/**
 * @typedef {Object} FarIntakeStoreData
 * @property {FarSection} [familyAssistanceRecord]
 * @property {FarCaseDetails} [caseDetails]
 */

/**
 * @typedef {Object} FarCasePayload
 * @property {string|null} [case_manager]
 * @property {string|null} [status]
 * @property {string|null} [priority]
 * @property {string|null} [visibility]
 * @property {string|null} date
 * @property {string|null} receiving_member
 * @property {string|null} emergency
 * @property {string|null} emergency_other
 * @property {string|null} assistance
 * @property {string|null} assistance_other
 * @property {string|number|null} unit
 * @property {string|number|null} quantity
 * @property {string|number|null} cost
 * @property {string|null} provider
 */

/**
 * Safely pick the first non-empty value from an object using multiple possible keys.
 *
 * "Non-empty" means: not `undefined`, not `null`, and not the empty string.
 * @param {Record<string, any>|null|undefined} obj
 * @param {...string} keys
 * @returns {any|null}
 */
const pick = (obj, ...keys) => {
	for (const k of keys) {
		const v = obj?.[k];
		if (v !== undefined && v !== null && v !== "") return v;
	}
	return null;
};

/**
 * Normalize date-like input into `YYYY-MM-DD` for Supabase DATE columns.
 * @param {string|Date|null|undefined} v
 * @returns {string|null}
 */
const normalizeDate = (v) => {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10); // Returns YYYY-MM-DD
};

/**
 * Build FAR case payload from intake store data.
 *
 * Handles "other" fields for emergency and assistance types by swapping the
 * selected value for the typed text.
 *
 * @param {FarIntakeStoreData} data Full intake store data (from `getAllData()`).
 * @returns {FarCasePayload} Payload suitable for Supabase `far_case` insert.
 */
function buildFARCasePayload(data) {
	// Extract sections from intake form store
	const farData = data.familyAssistanceRecord || {};

	// Case details can be nested in farData.caseDetails or at root level
	const caseDetails = farData.caseDetails || data.caseDetails || {};

	console.log("📋 Building FAR payload from:", { farData, caseDetails });

	// Handle "other" fields: if emergency/assistance is "other", use the custom value
	let emergencyValue = pick(farData, "emergency");
	let assistanceValue = pick(farData, "assistance");

	// If user selected "other" and provided custom text, use that instead
	const emergencyOther = pick(farData, "emergencyOther");
	const assistanceOther = pick(farData, "assistanceOther");

	if (emergencyValue === "other" && emergencyOther) {
		emergencyValue = emergencyOther;
	}

	if (assistanceValue === "other" && assistanceOther) {
		assistanceValue = assistanceOther;
	}

	const payload = {
		// Case management fields - properly extract from caseDetails
		case_manager: pick(caseDetails, "caseManager", "case_manager") ?? null,
		status: pick(caseDetails, "status", "caseStatus") ?? null,
		priority:
			pick(caseDetails, "priority", "casePriority", "case_priority") ??
			null,
		visibility:
			pick(
				caseDetails,
				"visibility",
				"caseVisibility",
				"case_visibility",
			) ?? null,

		// FAR specific fields
		date: normalizeDate(pick(farData, "date", "assistanceDate")) ?? null,
		receiving_member:
			pick(farData, "receivingMember", "receiving_member") ?? null,

		// Emergency and assistance types
		emergency: emergencyValue ?? null,
		emergency_other: emergencyOther ?? null, // Store original "other" text
		assistance: assistanceValue ?? null,
		assistance_other: assistanceOther ?? null, // Store original "other" text

		// Assistance details
		unit: pick(farData, "unit") ?? null,
		quantity: pick(farData, "quantity") ?? null,
		cost: pick(farData, "cost") ?? null,
		provider: pick(farData, "provider") ?? null,
	};

	// Remove null/undefined values from optional case management fields to avoid CHECK constraint violations
	// Only include them if they have valid values
	if (!payload.case_manager) delete payload.case_manager;
	if (!payload.status) delete payload.status;
	if (!payload.priority) delete payload.priority;
	if (!payload.visibility) delete payload.visibility;

	console.log("💾 Final FAR case payload:", payload);
	console.log("🔍 Extracted case details:", {
		case_manager: payload.case_manager,
		status: payload.status,
		priority: payload.priority,
		visibility: payload.visibility,
	});

	return payload;
}

/**
 * Submit a FAR record to Supabase.
 * @param {FarIntakeStoreData} finalData Complete intake form data from `getAllData()`.
 * @returns {Promise<{caseId: string|null, error: any}>}
 *
 * @example
 * const { caseId, error } = await submitFARCase(getAllData());
 * if (error) console.error(error);
 */
export async function submitFARCase(finalData) {
	try {
		// Build the payload
		const payload = buildFARCasePayload(finalData);

		// Validate required fields
		const requiredFields = [
			"date",
			"receiving_member",
			"emergency",
			"assistance",
			"unit",
			"quantity",
			"cost",
			"provider",
		];
		const missingFields = requiredFields.filter((field) => !payload[field]);

		if (missingFields.length > 0) {
			console.error("❌ Missing required fields:", missingFields);
			return {
				caseId: null,
				error: new Error(
					`Missing required fields: ${missingFields.join(", ")}`,
				),
			};
		}

		// Insert into Supabase
		console.log("🚀 Submitting FAR case to Supabase...");
		const { data: inserted, error } = await supabase
			.from("far_case")
			.insert([payload])
			.select()
			.single();

		if (error) {
			console.error("❌ FAR case insertion error:", error);
			return { caseId: null, error };
		}

		const caseId = inserted?.id;
		console.log("✅ FAR case created successfully:", caseId);

		// Create audit log for FAR case creation
		await createAuditLog({
			actionType: AUDIT_ACTIONS.CREATE_CASE,
			actionCategory: AUDIT_CATEGORIES.CASE,
			description: `Created new FAR (Family Assistance Record) case for ${payload.requestor_full_name || "N/A"}`,
			resourceType: "far_case",
			resourceId: caseId,
			metadata: {
				caseType: "FAR",
				requestorName: payload.requestor_full_name,
				assistanceType: payload.type_of_assistance,
				location: payload.barangay,
			},
			severity: "info",
		});

		return { caseId, error: null };
	} catch (err) {
		console.error("❌ Unexpected error in submitFARCase:", err);
		return { caseId: null, error: err };
	}
}

/**
 * Update an existing FAR case.
 * @param {string} caseId UUID of the case to update.
 * @param {FarIntakeStoreData} finalData Updated form data.
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function updateFARCase(caseId, finalData) {
	try {
		const payload = buildFARCasePayload(finalData);

		console.log("🔄 Updating FAR case:", caseId);
		const { data, error } = await supabase
			.from("far_case")
			.update(payload)
			.eq("id", caseId)
			.select()
			.single();

		if (error) {
			console.error("❌ FAR case update error:", error);
			return { success: false, error };
		}

		console.log("✅ FAR case updated successfully:", data);

		// Create audit log for FAR case update
		await createAuditLog({
			actionType: AUDIT_ACTIONS.UPDATE_CASE,
			actionCategory: AUDIT_CATEGORIES.CASE,
			description: `Updated FAR (Family Assistance Record) case for ${payload.requestor_full_name || "N/A"}`,
			resourceType: "far_case",
			resourceId: caseId,
			metadata: {
				caseType: "FAR",
				requestorName: payload.requestor_full_name,
				assistanceType: payload.type_of_assistance,
			},
			severity: "info",
		});

		return { success: true, error: null };
	} catch (err) {
		console.error("❌ Unexpected error in updateFARCase:", err);
		return { success: false, error: err };
	}
}

export { buildFARCasePayload };
