/**
 * Partner submission helpers.
 *
 * Responsibilities:
 * - Validate and format partner payloads for Supabase persistence.
 * - Provide MOU date utilities and status helpers.
 * - Create/update/delete partners in Supabase with audit logging.
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 */

/**
 * @typedef {Object} PartnerData
 * @property {string} [organization_name]
 * @property {string} [organization_type]
 * @property {string[]|string} [services_offered]
 * @property {string} [contact_person]
 * @property {string} [contact_email]
 * @property {string} [contact_phone]
 * @property {string} [address]
 * @property {string} [partnership_status]
 * @property {string|Date} [mou_signed_date]
 * @property {string|Date} [mou_expiry_date]
 * @property {number|string} [success_rate]
 * @property {number|string} [budget_allocation]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} PartnerRow
 * A loose representation of a `partners` row returned by Supabase.
 * @property {string} id
 * @property {string} organization_name
 * @property {string} organization_type
 * @property {string[]} services_offered
 * @property {string} contact_person
 * @property {string} partnership_status
 * @property {number} success_rate
 */

/**
 * @typedef {Object} SubmitPartnerResult
 * @property {string|null} partnerId
 * @property {PartnerRow|null} data
 * @property {any} error
 */

/**
 * @typedef {Object} UpdatePartnerResult
 * @property {PartnerRow|null} data
 * @property {any} error
 */

/**
 * @typedef {Object} DeletePartnerResult
 * @property {boolean} success
 * @property {any} error
 */

/** @type {string[]} Valid organization types. */
export const ORGANIZATION_TYPES = [
	"NGO",
	"Government Agency",
	"Legal Service Provider",
	"Medical Facility",
	"Training Center",
	"Sports Organization",
	"Foundation",
	"Crisis Center",
	"Private Organization",
	"Community-Based Organization",
];

/** @type {string[]} Valid service types. */
export const SERVICE_TYPES = [
	"counseling",
	"legal",
	"medical",
	"educational",
	"financial",
	"prevention",
	"livelihood",
	"shelter",
	"recreational",
	"advocacy",
	"psychological",
];

/**
 * Partnership status values.
 * @type {{ ACTIVE: string, INACTIVE: string, PENDING: string, EXPIRED: string }}
 */
export const PARTNERSHIP_STATUS = {
	ACTIVE: "active",
	INACTIVE: "inactive",
	PENDING: "pending",
	EXPIRED: "expired",
};

/**
 * Validate partner data before submission.
 * @param {PartnerData} partnerData Partner data to validate.
 * @returns {ValidationResult} Validation result.
 */
export function validatePartnerData(partnerData) {
	const errors = [];

	// Required fields
	if (
		!partnerData.organization_name ||
		partnerData.organization_name.trim().length < 3
	) {
		errors.push("Organization name must be at least 3 characters");
	}

	if (!partnerData.organization_type) {
		errors.push("Organization type is required");
	} else if (!ORGANIZATION_TYPES.includes(partnerData.organization_type)) {
		errors.push(
			`Invalid organization type. Must be one of: ${ORGANIZATION_TYPES.join(", ")}`,
		);
	}

	if (
		!partnerData.contact_person ||
		partnerData.contact_person.trim().length < 2
	) {
		errors.push("Contact person is required");
	}

	// Email validation
	const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
	if (!partnerData.contact_email) {
		errors.push("Contact email is required");
	} else if (!emailRegex.test(partnerData.contact_email)) {
		errors.push("Invalid email format");
	}

	// Phone validation (basic)
	if (!partnerData.contact_phone) {
		errors.push("Contact phone is required");
	} else if (partnerData.contact_phone.length < 10) {
		errors.push("Contact phone must be at least 10 characters");
	}

	if (!partnerData.address || partnerData.address.trim().length < 5) {
		errors.push("Address must be at least 5 characters");
	}

	// Services offered validation
	if (
		!partnerData.services_offered ||
		partnerData.services_offered.length === 0
	) {
		errors.push("At least one service must be offered");
	} else {
		const invalidServices = partnerData.services_offered.filter(
			(service) => !SERVICE_TYPES.includes(service),
		);
		if (invalidServices.length > 0) {
			errors.push(`Invalid service types: ${invalidServices.join(", ")}`);
		}
	}

	// Numeric validations
	if (
		partnerData.success_rate !== undefined &&
		partnerData.success_rate !== null
	) {
		if (partnerData.success_rate < 0 || partnerData.success_rate > 100) {
			errors.push("Success rate must be between 0 and 100");
		}
	}

	if (partnerData.budget_allocation && partnerData.budget_allocation < 0) {
		errors.push("Budget allocation cannot be negative");
	}

	// MOU date validations
	if (partnerData.mou_signed_date && partnerData.mou_expiry_date) {
		const signedDate = new Date(partnerData.mou_signed_date);
		const expiryDate = new Date(partnerData.mou_expiry_date);

		if (expiryDate <= signedDate) {
			errors.push("MOU expiry date must be after signed date");
		}
	} else if (partnerData.mou_signed_date || partnerData.mou_expiry_date) {
		errors.push(
			"Both MOU signed date and expiry date must be provided together",
		);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Format partner data for Supabase insertion.
 * @param {PartnerData} partnerData Raw partner data from form.
 * @returns {Record<string, any>} Formatted partner payload.
 */
export function formatPartnerData(partnerData) {
	return {
		organization_name: partnerData.organization_name?.trim(),
		organization_type: partnerData.organization_type,
		services_offered: Array.isArray(partnerData.services_offered)
			? partnerData.services_offered
			: [partnerData.services_offered],
		contact_person: partnerData.contact_person?.trim(),
		contact_email: partnerData.contact_email?.trim().toLowerCase(),
		contact_phone: partnerData.contact_phone?.trim(),
		address: partnerData.address?.trim(),
		partnership_status:
			partnerData.partnership_status || PARTNERSHIP_STATUS.PENDING,
		mou_signed_date: partnerData.mou_signed_date || null,
		mou_expiry_date: partnerData.mou_expiry_date || null,
		success_rate: parseInt(partnerData.success_rate) || 0,
		budget_allocation: parseFloat(partnerData.budget_allocation) || 0,
		notes: partnerData.notes?.trim() || null,
	};
}

/**
 * Checks if MOU is expiring soon (within 30 days).
 * @param {string|Date} mouExpiryDate MOU expiry date.
 * @returns {boolean} True if expiring within 30 days.
 */
export function isMOUExpiringSoon(mouExpiryDate) {
	if (!mouExpiryDate) return false;

	const expiryDate = new Date(mouExpiryDate);
	const today = new Date();
	const daysUntilExpiry = Math.ceil(
		(expiryDate - today) / (1000 * 60 * 60 * 24),
	);

	return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

/**
 * Checks if MOU is expired.
 * @param {string|Date} mouExpiryDate MOU expiry date.
 * @returns {boolean} True if expired.
 */
export function isMOUExpired(mouExpiryDate) {
	if (!mouExpiryDate) return false;

	const expiryDate = new Date(mouExpiryDate);
	const today = new Date();

	return expiryDate < today;
}

/**
 * Gets MOU status badge information.
 * @param {string|Date} mouExpiryDate MOU expiry date.
 * @returns {{ status: string, color: string, label: string }} Badge info.
 */
export function getMOUStatus(mouExpiryDate) {
	if (!mouExpiryDate) {
		return { status: "none", color: "gray", label: "No MOU" };
	}

	if (isMOUExpired(mouExpiryDate)) {
		return { status: "expired", color: "red", label: "Expired" };
	}

	if (isMOUExpiringSoon(mouExpiryDate)) {
		return { status: "expiring", color: "yellow", label: "Expiring Soon" };
	}

	return { status: "active", color: "green", label: "Active" };
}

/**
 * Submit a new partner to Supabase and emit an audit log entry.
 * @param {PartnerData} partnerData Partner data to submit.
 * @returns {Promise<SubmitPartnerResult>}
 */
export async function submitPartner(partnerData) {
	try {
		// Validate data
		const validation = validatePartnerData(partnerData);
		if (!validation.isValid) {
			return {
				partnerId: null,
				data: null,
				error: {
					message: validation.errors.join(", "),
					validationErrors: validation.errors,
				},
			};
		}

		// Format data
		const formattedData = formatPartnerData(partnerData);

		// Insert into Supabase
		const { data, error } = await supabase
			.from("partners")
			.insert([formattedData])
			.select()
			.single();

		if (error) {
			return { partnerId: null, data: null, error };
		}

		// Create audit log
		await createAuditLog({
			actionType: AUDIT_ACTIONS.CREATE_PARTNER,
			actionCategory: AUDIT_CATEGORIES.PARTNER,
			description: `Created new partner: ${data.organization_name}`,
			resourceType: "partner",
			resourceId: data.id,
			metadata: {
				organizationName: data.organization_name,
				organizationType: data.organization_type,
				servicesOffered: data.services_offered,
				contactPerson: data.contact_person,
				partnershipStatus: data.partnership_status,
			},
			severity: "info",
		});

		return { partnerId: data.id, data, error: null };
	} catch (err) {
		console.error("Error in submitPartner:", err);
		return { partnerId: null, data: null, error: err };
	}
}

/**
 * Update an existing partner in Supabase and emit an audit log entry.
 * @param {string} partnerId Partner ID to update.
 * @param {Partial<PartnerData>} updates Updated partner data.
 * @param {PartnerRow|null} oldData Previous partner data for audit comparison.
 * @returns {Promise<UpdatePartnerResult>}
 */
export async function updatePartner(partnerId, updates, oldData = null) {
	try {
		// Format updates
		const formattedUpdates = {
			...updates,
			services_offered: Array.isArray(updates.services_offered)
				? updates.services_offered
				: updates.services_offered
					? [updates.services_offered]
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
			.from("partners")
			.update(formattedUpdates)
			.eq("id", partnerId)
			.select()
			.single();

		if (error) {
			return { data: null, error };
		}

		// Create audit log with change details
		const changes = oldData
			? Object.keys(updates).reduce((acc, key) => {
					if (
						JSON.stringify(oldData[key]) !==
						JSON.stringify(updates[key])
					) {
						acc[key] = { old: oldData[key], new: updates[key] };
					}
					return acc;
				}, {})
			: updates;

		await createAuditLog({
			actionType: AUDIT_ACTIONS.UPDATE_PARTNER,
			actionCategory: AUDIT_CATEGORIES.PARTNER,
			description: `Updated partner: ${data.organization_name}`,
			resourceType: "partner",
			resourceId: partnerId,
			metadata: {
				organizationName: data.organization_name,
				changes,
			},
			severity: "info",
		});

		return { data, error: null };
	} catch (err) {
		console.error("Error in updatePartner:", err);
		return { data: null, error: err };
	}
}

/**
 * Delete a partner from Supabase and (optionally) emit an audit log entry.
 * @param {string} partnerId Partner ID to delete.
 * @param {PartnerRow|null} partnerData Partner data for audit log context.
 * @returns {Promise<DeletePartnerResult>}
 */
export async function deletePartner(partnerId, partnerData = null) {
	try {
		// Delete from Supabase
		const { error } = await supabase
			.from("partners")
			.delete()
			.eq("id", partnerId);

		if (error) {
			return { success: false, error };
		}

		// Create audit log
		if (partnerData) {
			await createAuditLog({
				actionType: AUDIT_ACTIONS.DELETE_PARTNER,
				actionCategory: AUDIT_CATEGORIES.PARTNER,
				description: `Deleted partner: ${partnerData.organization_name}`,
				resourceType: "partner",
				resourceId: partnerId,
				metadata: {
					organizationName: partnerData.organization_name,
					organizationType: partnerData.organization_type,
					servicesOffered: partnerData.services_offered,
				},
				severity: "warning",
			});
		}

		return { success: true, error: null };
	} catch (err) {
		console.error("Error in deletePartner:", err);
		return { success: false, error: err };
	}
}

/**
 * Retrieves the partner's current stored success rate.
 * @param {string} partnerId Partner ID.
 * @returns {Promise<{successRate: number|null, error: any}>}
 */
export async function calculateSuccessRate(partnerId) {
	try {
		// This would typically query service_delivery table
		// For now, returns the current stored rate
		const { data, error } = await supabase
			.from("partners")
			.select("success_rate")
			.eq("id", partnerId)
			.single();

		if (error) {
			return { successRate: null, error };
		}

		return { successRate: data.success_rate, error: null };
	} catch (err) {
		console.error("Error in calculateSuccessRate:", err);
		return { successRate: null, error: err };
	}
}

/**
 * Gets partners with MOUs expiring within the provided threshold (default 30 days).
 * @param {number} daysThreshold Number of days threshold.
 * @returns {Promise<{partners: PartnerRow[]|null, error: any}>}
 */
export async function getExpiringSoonPartners(daysThreshold = 30) {
	try {
		const today = new Date();
		const futureDate = new Date();
		futureDate.setDate(today.getDate() + daysThreshold);

		const { data, error } = await supabase
			.from("partners")
			.select("*")
			.gte("mou_expiry_date", today.toISOString().split("T")[0])
			.lte("mou_expiry_date", futureDate.toISOString().split("T")[0])
			.eq("partnership_status", "active")
			.order("mou_expiry_date", { ascending: true });

		if (error) {
			return { partners: null, error };
		}

		return { partners: data, error: null };
	} catch (err) {
		console.error("Error in getExpiringSoonPartners:", err);
		return { partners: null, error: err };
	}
}
