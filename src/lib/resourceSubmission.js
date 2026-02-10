/**
 * Resource request submission helpers.
 *
 * Responsibilities:
 * - Validate resource request and disbursement payloads.
 * - Format request/disbursement payloads for persistence.
 * - Generate human-readable request/voucher numbers.
 * - Provide small UI helpers (priority scoring, formatting, badge classes).
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 */

/**
 * @typedef {Object} ResourceRequestFormData
 * @property {string} [request_type]
 * @property {string} [resource_category]
 * @property {string} [item_description]
 * @property {number|string} [quantity]
 * @property {number|string} [unit_cost]
 * @property {string} [unit]
 * @property {number} [total_amount]
 * @property {string} [justification]
 * @property {string} [barangay]
 * @property {string} [beneficiary_name]
 * @property {string} [beneficiary_type]
 * @property {string} [priority]
 * @property {string|null} [case_id]
 * @property {string|null} [program_id]
 * @property {string|null} [program_name]
 * @property {unknown[]} [attachments]
 */

/**
 * @typedef {Object} ResourceRequestPayload
 * @property {string} requester_id
 * @property {string} requester_name
 * @property {string} request_type
 * @property {string} resource_category
 * @property {string} item_description
 * @property {number} quantity
 * @property {string} unit
 * @property {number} unit_cost
 * @property {number} total_amount
 * @property {string} justification
 * @property {string} barangay
 * @property {string} beneficiary_name
 * @property {string} [beneficiary_type]
 * @property {string} priority
 * @property {string|null} case_id
 * @property {string|null} program_id
 * @property {string|null} program_name
 * @property {unknown[]} attachments
 */

/**
 * @typedef {Object} DisbursementFormData
 * @property {string} [request_id]
 * @property {string} [request_number]
 * @property {number|string} [disbursement_amount]
 * @property {string} [disbursement_date]
 * @property {string} [disbursement_method]
 * @property {string} [beneficiary_name]
 * @property {unknown} [beneficiary_signature]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} DisbursementPayload
 * @property {string} request_id
 * @property {string} [request_number]
 * @property {number} disbursement_amount
 * @property {string} disbursement_date
 * @property {string} disbursement_method
 * @property {string} beneficiary_name
 * @property {unknown|null} beneficiary_signature
 * @property {string} disbursed_by
 * @property {string} disbursed_by_name
 * @property {string} notes
 */

/**
 * Validate resource request form data.
 *
 * @param {ResourceRequestFormData} requestData Request form data.
 * @returns {ValidationResult} Validation result.
 */
export function validateResourceRequest(requestData) {
	const errors = [];

	// Required fields validation
	if (!requestData.request_type) {
		errors.push("Request type is required");
	}

	if (!requestData.resource_category) {
		errors.push("Resource category is required");
	}

	if (
		!requestData.item_description ||
		requestData.item_description.trim() === ""
	) {
		errors.push("Item description is required");
	}

	if (!requestData.quantity || requestData.quantity <= 0) {
		errors.push("Quantity must be greater than 0");
	}

	if (!requestData.unit_cost || requestData.unit_cost < 0) {
		errors.push("Unit cost must be 0 or greater");
	}

	if (
		!requestData.justification ||
		requestData.justification.trim().length < 20
	) {
		errors.push("Justification must be at least 20 characters");
	}

	if (!requestData.beneficiary_name) {
		errors.push("Beneficiary name is required");
	}

	// Conditional validations
	if (
		requestData.request_type === "financial" &&
		requestData.total_amount > 500000
	) {
		errors.push(
			"Financial requests over ₱500,000 require special approval",
		);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Format resource request data into a persistence-friendly payload.
 *
 * @param {ResourceRequestFormData} formData Raw form data.
 * @param {string} userId Current user ID.
 * @param {string} userName Current user name.
 * @returns {ResourceRequestPayload} Formatted request payload.
 */
export function formatResourceRequest(formData, userId, userName) {
	const total_amount = (formData.quantity || 0) * (formData.unit_cost || 0);

	return {
		requester_id: userId,
		requester_name: userName,
		request_type: formData.request_type,
		resource_category: formData.resource_category,
		item_description: formData.item_description?.trim(),
		quantity: Number(formData.quantity),
		unit: formData.unit || "units",
		unit_cost: Number(formData.unit_cost),
		total_amount,
		justification: formData.justification?.trim(),
		barangay: formData.barangay,
		beneficiary_name: formData.beneficiary_name?.trim(),
		beneficiary_type: formData.beneficiary_type,
		priority: formData.priority || "medium",
		case_id: formData.case_id || null,
		program_id: formData.program_id || null,
		program_name: formData.program_name || null,
		attachments: formData.attachments || [],
	};
}

/**
 * Validate disbursement form data.
 * @param {DisbursementFormData} disbursementData Disbursement form data.
 * @returns {ValidationResult} Validation result.
 */
export function validateDisbursement(disbursementData) {
	const errors = [];

	if (!disbursementData.request_id) {
		errors.push("Request ID is required");
	}

	if (
		!disbursementData.disbursement_amount ||
		disbursementData.disbursement_amount <= 0
	) {
		errors.push("Disbursement amount must be greater than 0");
	}

	if (!disbursementData.disbursement_date) {
		errors.push("Disbursement date is required");
	}

	if (!disbursementData.disbursement_method) {
		errors.push("Disbursement method is required");
	}

	if (!disbursementData.beneficiary_name) {
		errors.push("Beneficiary name is required");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Format disbursement form data into a persistence-friendly payload.
 * @param {DisbursementFormData} formData Raw disbursement form data.
 * @param {string} userId Current user ID.
 * @param {string} userName Current user name.
 * @returns {DisbursementPayload} Formatted disbursement payload.
 */
export function formatDisbursement(formData, userId, userName) {
	return {
		request_id: formData.request_id,
		request_number: formData.request_number,
		disbursement_amount: Number(formData.disbursement_amount),
		disbursement_date: formData.disbursement_date,
		disbursement_method: formData.disbursement_method,
		beneficiary_name: formData.beneficiary_name?.trim(),
		beneficiary_signature: formData.beneficiary_signature || null,
		disbursed_by: userId,
		disbursed_by_name: userName,
		notes: formData.notes?.trim() || "",
	};
}

/**
 * Generate a human-readable request number.
 * @param {number} sequenceNumber Sequential number.
 * @returns {string} Formatted request number, e.g. `REQ-2026-0042`.
 */
export function generateRequestNumber(sequenceNumber) {
	const year = new Date().getFullYear();
	const paddedNumber = String(sequenceNumber).padStart(4, "0");
	return `REQ-${year}-${paddedNumber}`;
}

/**
 * Generate a human-readable voucher number.
 * @param {number} sequenceNumber Sequential number.
 * @returns {string} Formatted voucher number, e.g. `DV-2026-0015`.
 */
export function generateVoucherNumber(sequenceNumber) {
	const year = new Date().getFullYear();
	const paddedNumber = String(sequenceNumber).padStart(4, "0");
	return `DV-${year}-${paddedNumber}`;
}

/**
 * Calculate a priority score based on multiple factors.
 * @param {{ priority?: string, beneficiary_type?: string, request_type?: string, created_at?: string|Date }} request
 * @returns {number} Priority score (higher = more urgent).
 */
export function calculatePriorityScore(request) {
	let score = 0;

	// Base priority
	const priorityScores = {
		critical: 100,
		high: 75,
		medium: 50,
		low: 25,
	};
	score += priorityScores[request.priority] || 0;

	// Beneficiary type weight
	const beneficiaryWeights = {
		IVAC: 20,
		VAC: 18,
		CICL: 15,
		FAC: 10,
		FAR: 8,
	};
	score += beneficiaryWeights[request.beneficiary_type] || 0;

	// Request type weight
	if (request.request_type === "human_resource") score += 10;
	if (request.request_type === "medical") score += 15;

	// Age of request (older requests get higher score)
	const daysOld = Math.floor(
		(new Date() - new Date(request.created_at)) / (1000 * 60 * 60 * 24),
	);
	score += Math.min(daysOld * 2, 30); // Max 30 points for age

	return score;
}

/**
 * Format a currency value for display.
 * @param {number} amount Amount to format.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(amount) {
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
	}).format(amount || 0);
}

/**
 * Maps a request status into a Tailwind className string.
 * @param {string} status Request status.
 * @returns {string} Badge color className.
 */
export function getStatusColor(status) {
	const colorMap = {
		draft: "bg-gray-100 text-gray-800",
		submitted: "bg-blue-100 text-blue-800",
		cm_approved: "bg-indigo-100 text-indigo-800",
		head_approved: "bg-green-100 text-green-800",
		rejected: "bg-red-100 text-red-800",
		disbursed: "bg-purple-100 text-purple-800",
		completed: "bg-teal-100 text-teal-800",
	};
	return colorMap[status] || "bg-gray-100 text-gray-800";
}

/**
 * Maps a priority level into a Tailwind className string.
 * @param {string} priority Priority level.
 * @returns {string} Badge color className.
 */
export function getPriorityColor(priority) {
	const colorMap = {
		critical: "bg-red-100 text-red-800 border-red-300",
		high: "bg-orange-100 text-orange-800 border-orange-300",
		medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
		low: "bg-green-100 text-green-800 border-green-300",
	};
	return colorMap[priority] || "bg-gray-100 text-gray-800";
}

/**
 * Maps request type to icon identifier and text color class.
 *
 * This returns icon *names* (strings) that the UI layer can map to concrete icon components.
 * @param {string} requestType Request type.
 * @returns {{ icon: string, color: string }} Icon info.
 */
export function getRequestTypeInfo(requestType) {
	const typeMap = {
		financial: { icon: "DollarSign", color: "text-green-600" },
		material: { icon: "Package", color: "text-blue-600" },
		equipment: { icon: "Tool", color: "text-purple-600" },
		human_resource: { icon: "Users", color: "text-orange-600" },
	};
	return (
		typeMap[requestType] || { icon: "HelpCircle", color: "text-gray-600" }
	);
}
