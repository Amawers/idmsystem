import ExcelJS from "exceljs";

const EXCEL_TEMPLATE_BY_CASE_TYPE = {
	SP: {
		templateUrl: "/excel-templates/sp-case-template.xlsx",
		filenamePrefix: "single-parent",
		worksheetName: "SP",
	},
	FA: {
		templateUrl: "/excel-templates/fa-case-template.xlsx",
		filenamePrefix: "financial-assistance",
		worksheetName: "FA",
	},
	CICLCAR: {
		templateUrl: "/excel-templates/ciclcar-case-template.xlsx",
		filenamePrefix: "cicl-car",
		worksheetName: "CICLCAR",
	},
	FAC: {
		templateUrl: "/excel-templates/fac-case-template.xlsx",
		filenamePrefix: "family-assistance-card",
		worksheetName: "FAC",
	},
	FAR: {
		templateUrl: "/excel-templates/far-case-template.xlsx",
		filenamePrefix: "family-assistance-record",
		worksheetName: "FAR",
	},
	SC: {
		templateUrl: "/excel-templates/sc-case-template.xlsx",
		filenamePrefix: "senior-citizen",
		worksheetName: "SC",
	},
	IVAC: {
		templateUrl: "/excel-templates/ivac-case-template.xlsx",
		filenamePrefix: "ivac",
		worksheetName: "IVAC",
	},
};

const SP_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// FULL_NAME: "B5",
	// AGE: "B6",
};

const FA_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// CLIENT_NAME: "B6",
	// ADDRESS: "B7",
};

const CICLCAR_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// CASE_ID: "B6",
	// PROFILE_NAME: "B7",
};

const FAC_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// HEAD_FULL_NAME: "B6",
	// LOCATION_BARANGAY: "E6",
};

const FAR_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// RECEIVING_MEMBER: "B6",
	// ASSISTANCE: "E6",
};

const SC_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// SENIOR_NAME: "B6",
	// BARANGAY: "E6",
};

const IVAC_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// PROVINCE: "B6",
	// MUNICIPALITY: "C6",
};

function safeString(value) {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}

function formatDateForTemplate(value) {
	if (!value) return "";
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	const yyyy = d.getFullYear();
	return `${mm}-${dd}-${yyyy}`;
}

function parseNameParts(fullNameValue = "") {
	const cleaned = safeString(fullNameValue).replace(/\s+/g, " ").trim();
	if (!cleaned) {
		return { firstName: "", middleName: "", lastName: "" };
	}

	const tokens = cleaned.split(" ").filter(Boolean);
	if (tokens.length === 1) {
		return { firstName: tokens[0], middleName: "", lastName: "" };
	}

	const firstName = tokens.shift() || "";
	const lastName = tokens.length ? tokens.pop() || "" : "";
	const middleName = tokens.join(" ");

	return { firstName, middleName, lastName };
}

function normalizeFamilyMembers(rawMembers) {
	if (Array.isArray(rawMembers)) return rawMembers;
	if (typeof rawMembers === "string") {
		try {
			const parsed = JSON.parse(rawMembers);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function buildFamilyCompositionValues(members = [], maxRows = 15) {
	const values = {};

	for (let index = 0; index < maxRows; index += 1) {
		const member = members[index] || {};
		const rowNumber = index + 1;

		values[`FAMILY_${rowNumber}_NAME`] = safeString(member.name);
		values[`FAMILY_${rowNumber}_AGE`] = safeString(member.age);
		values[`FAMILY_${rowNumber}_STATUS`] = safeString(member.status);
		values[`FAMILY_${rowNumber}_RELATION_TO_CLIENT`] = safeString(
			member.relationToClient,
		);
		values[`FAMILY_${rowNumber}_BIRTHDAY`] = formatDateForTemplate(
			member.birthday,
		);
		values[`FAMILY_${rowNumber}_EDUCATIONAL_ATTAINMENT`] = safeString(
			member.educationalAttainment,
		);
		values[`FAMILY_${rowNumber}_OCCUPATION`] = safeString(
			member.occupation,
		);
	}

	return values;
}

function buildSpExcelValues(record = {}) {
	const firstName = safeString(record.first_name || record.firstName);
	const lastName = safeString(record.last_name || record.lastName);
	const fullName =
		safeString(record.full_name || record.fullName).trim() ||
		`${firstName} ${lastName}`.trim();

	const values = {
		FULL_NAME: fullName,
		AGE: safeString(record.age),
		ADDRESS: safeString(record.address || record.location_address),
		BIRTH_DATE: formatDateForTemplate(
			record.birth_date || record.birthDate,
		),
		STATUS: safeString(record.status),
		EDUCATIONAL_ATTAINMENT: safeString(
			record.educational_attainment || record.educationalAttainment,
		),
		OCCUPATION: safeString(record.occupation),
		MONTHLY_INCOME: safeString(
			record.monthly_income || record.monthlyIncome,
		),
		RELIGION: safeString(record.religion),
		INTERVIEW_DATE: formatDateForTemplate(
			record.interview_date || record.interviewDate,
		),
		YEAR_MEMBER: safeString(record.year_member || record.yearMember),
		SKILLS: safeString(record.skills),
		SOLO_PARENT_DURATION: safeString(
			record.solo_parent_duration || record.soloParentDuration,
		),
		FOUR_PS:
			typeof record.four_ps === "boolean"
				? record.four_ps
					? "Yes"
					: "No"
				: safeString(record.fourPs),
		PARENTS_WHEREABOUTS: safeString(
			record.parents_whereabouts || record.parentsWhereabouts,
		),
		BACKGROUND_INFORMATION: safeString(
			record.background_information || record.backgroundInformation,
		),
		ASSESSMENT: safeString(record.assessment),
		CONTACT_NUMBER: safeString(
			record.contact_number || record.cellphoneNumber,
		),
		EMERGENCY_CONTACT_PERSON: safeString(
			record.emergency_contact_person || record.emergencyContactPerson,
		),
		EMERGENCY_CONTACT_NUMBER: safeString(
			record.emergency_contact_number || record.emergencyContactNumber,
		),
	};

	const familyMembers = normalizeFamilyMembers(record.family_members);
	return {
		...values,
		...buildFamilyCompositionValues(familyMembers, 15),
	};
}

function buildFaExcelValues(record = {}) {
	return {
		CASE_ID: safeString(record.id),
		CASE_MANAGER: safeString(record.case_manager || record.caseManager),
		STATUS: safeString(record.status),
		PRIORITY: safeString(record.priority),
		VISIBILITY: safeString(record.visibility),
		INTERVIEW_DATE: formatDateForTemplate(
			record.interview_date || record.interviewDate,
		),
		DATE_RECORDED: formatDateForTemplate(
			record.date_recorded || record.dateRecorded,
		),
		CLIENT_NAME: safeString(record.client_name || record.clientName),
		ADDRESS: safeString(record.address),
		PURPOSE: safeString(record.purpose),
		BENIFICIARY_NAME: safeString(
			record.benificiary_name || record.beneficiary_name,
		),
		CONTACT_NUMBER: safeString(
			record.contact_number || record.contactNumber,
		),
		PREPARED_BY: safeString(record.prepared_by || record.preparedBy),
		STATUS_REPORT: safeString(record.status_report || record.statusReport),
		CLIENT_CATEGORY: safeString(
			record.client_category || record.clientCategory,
		),
		GENDER: safeString(record.gender),
		FOUR_PS_MEMBER: safeString(
			record.four_ps_member || record.fourPsMember,
		),
		TRANSACTION: safeString(record.transaction),
		NOTES: safeString(record.notes),
	};
}

function buildFaBulkRowValues(record = {}) {
	const base = buildFaExcelValues(record);
	return {
		...base,
		BENEFICIARY_NAME: base.BENIFICIARY_NAME,
	};
}

function normalizeCiclcarFamilyBackground(rawValue) {
	if (Array.isArray(rawValue)) return rawValue;
	if (typeof rawValue === "string") {
		try {
			const parsed = JSON.parse(rawValue);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function buildCiclcarFamilyBackgroundValues(members = [], maxRows = 15) {
	const values = {};

	for (let index = 0; index < maxRows; index += 1) {
		const member = members[index] || {};
		const rowNumber = index + 1;

		values[`CICLCAR_FAMILY_${rowNumber}_NAME`] = safeString(member.name);
		values[`CICLCAR_FAMILY_${rowNumber}_RELATIONSHIP`] = safeString(
			member.relationship,
		);
		values[`CICLCAR_FAMILY_${rowNumber}_AGE`] = safeString(member.age);
		values[`CICLCAR_FAMILY_${rowNumber}_SEX`] = safeString(member.sex);
		values[`CICLCAR_FAMILY_${rowNumber}_STATUS`] = safeString(
			member.status,
		);
		values[`CICLCAR_FAMILY_${rowNumber}_CONTACT_NUMBER`] = safeString(
			member.contactNumber || member.contact_number,
		);
		values[`CICLCAR_FAMILY_${rowNumber}_EDUCATIONAL_ATTAINMENT`] =
			safeString(
				member.educationalAttainment || member.educational_attainment,
			);
		values[`CICLCAR_FAMILY_${rowNumber}_EMPLOYMENT`] = safeString(
			member.employment,
		);
	}

	return values;
}

function buildCiclcarExcelValues(record = {}) {
	const familyBackground = normalizeCiclcarFamilyBackground(
		record.family_background,
	);
	const rawProfileName = safeString(record.profile_name).trim();
	let parsedProfileName = parseNameParts(rawProfileName);

	if (rawProfileName.includes(",")) {
		const [lastNameRaw, firstMiddleRaw = ""] = rawProfileName
			.split(",")
			.map((part) => part.trim());
		const firstMiddle = parseNameParts(firstMiddleRaw);
		parsedProfileName = {
			firstName: firstMiddle.firstName,
			middleName: firstMiddle.middleName,
			lastName: lastNameRaw,
		};
	}

	const profileFirstName = safeString(
		record.profile_first_name ||
			record.profileFirstName ||
			parsedProfileName.firstName,
	);
	const profileMiddleName = safeString(
		record.profile_middle_name ||
			record.profileMiddleName ||
			parsedProfileName.middleName,
	);
	const profileLastName = safeString(
		record.profile_last_name ||
			record.profileLastName ||
			parsedProfileName.lastName,
	);

	return {
		CASE_ID: safeString(record.id || record["case ID"]),
		CASE_MANAGER: safeString(record.case_manager || record["case manager"]),
		STATUS: safeString(record.status),
		PRIORITY: safeString(record.priority),
		VISIBILITY: safeString(record.visibility),
		PROFILE_NAME: safeString(record.profile_name),
		PROFILE_ALIAS: safeString(record.profile_alias),
		PROFILE_SEX: safeString(record.profile_sex),
		PROFILE_GENDER: safeString(record.profile_gender),
		PROFILE_BIRTH_DATE: formatDateForTemplate(record.profile_birth_date),
		PROFILE_AGE: safeString(record.profile_age),
		PROFILE_STATUS: safeString(record.profile_status),
		PROFILE_RELIGION: safeString(record.profile_religion),
		PROFILE_ADDRESS: safeString(record.profile_address),
		PROFILE_CLIENT_CATEGORY: safeString(record.profile_client_category),
		PROFILE_IP_GROUP: safeString(record.profile_ip_group),
		PROFILE_NATIONALITY: safeString(record.profile_nationality),
		PROFILE_DISABILITY: safeString(record.profile_disability),
		PROFILE_CONTACT_NUMBER: safeString(record.profile_contact_number),
		PROFILE_EDUCATIONAL_ATTAINMENT: safeString(
			record.profile_educational_attainment,
		),
		PROFILE_EDUCATIONAL_STATUS: safeString(
			record.profile_educational_status,
		),
		PROFILE_FIRST_NAME: profileFirstName,
		PROFILE_MIDDLE_NAME: profileMiddleName,
		PROFILE_LAST_NAME: profileLastName,
		VIOLATION: safeString(record.violation),
		VIOLATION_DATE_TIME_COMMITTED: formatDateForTemplate(
			record.violation_date_time_committed,
		),
		SPECIFIC_VIOLATION: safeString(record.specific_violation),
		VIOLATION_PLACE_COMMITTED: safeString(
			record.violation_place_committed,
		),
		VIOLATION_STATUS: safeString(record.violation_status),
		VIOLATION_ADMISSION_DATE: formatDateForTemplate(
			record.violation_admission_date,
		),
		REPEAT_OFFENDER: safeString(record.repeat_offender),
		VIOLATION_PREVIOUS_OFFENSE: safeString(
			record.violation_previous_offense,
		),
		RECORD_DETAILS: safeString(record.record_details),
		COMPLAINANT_NAME: safeString(record.complainant_name),
		COMPLAINANT_ALIAS: safeString(record.complainant_alias),
		COMPLAINANT_VICTIM: safeString(record.complainant_victim),
		COMPLAINANT_RELATIONSHIP: safeString(record.complainant_relationship),
		COMPLAINANT_CONTACT_NUMBER: safeString(
			record.complainant_contact_number,
		),
		COMPLAINANT_SEX: safeString(record.complainant_sex),
		COMPLAINANT_BIRTH_DATE: formatDateForTemplate(
			record.complainant_birth_date,
		),
		COMPLAINANT_ADDRESS: safeString(record.complainant_address),
		REMARKS: safeString(record.remarks),
		REFERRAL_REGION: safeString(record.referral_region),
		REFERRAL_PROVINCE: safeString(record.referral_province),
		REFERRAL_CITY: safeString(record.referral_city),
		REFERRAL_BARANGAY: safeString(record.referral_barangay),
		REFERRAL_REFERRED_TO: safeString(record.referral_referred_to),
		REFERRAL_DATE_REFERRED: formatDateForTemplate(
			record.referral_date_referred,
		),
		REFERRAL_REASON: safeString(record.referral_reason),
		FAMILY_BACKGROUND_COUNT: safeString(familyBackground.length),
		FAMILY_BACKGROUND_JSON: safeString(familyBackground),
		CREATED_AT: formatDateForTemplate(record.created_at),
		UPDATED_AT: formatDateForTemplate(record.updated_at),
		...buildCiclcarFamilyBackgroundValues(familyBackground, 15),
	};
}

function normalizeFacFamilyMembers(rawMembers) {
	if (Array.isArray(rawMembers)) return rawMembers;
	if (typeof rawMembers === "string") {
		try {
			const parsed = JSON.parse(rawMembers);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function formatYesNo(value) {
	if (typeof value === "boolean") return value ? "Yes" : "No";
	const normalized = safeString(value).trim().toLowerCase();
	if (!normalized) return "";
	if (["true", "yes", "y", "1"].includes(normalized)) return "Yes";
	if (["false", "no", "n", "0"].includes(normalized)) return "No";
	return safeString(value);
}

function buildFacFamilyCompositionValues(members = [], maxRows = 15) {
	const values = {};

	for (let index = 0; index < maxRows; index += 1) {
		const member = members[index] || {};
		const rowNumber = index + 1;

		values[`FAC_FAMILY_${rowNumber}_NAME`] = safeString(
			member.familyMember || member.family_member_name,
		);
		values[`FAC_FAMILY_${rowNumber}_RELATION_TO_HEAD`] = safeString(
			member.relationToHead || member.relation_to_head,
		);
		values[`FAC_FAMILY_${rowNumber}_BIRTHDATE`] = formatDateForTemplate(
			member.birthdate,
		);
		values[`FAC_FAMILY_${rowNumber}_AGE`] = safeString(member.age);
		values[`FAC_FAMILY_${rowNumber}_SEX`] = safeString(member.sex);
		values[`FAC_FAMILY_${rowNumber}_EDUCATIONAL_ATTAINMENT`] = safeString(
			member.educationalAttainment || member.educational_attainment,
		);
		values[`FAC_FAMILY_${rowNumber}_OCCUPATION`] = safeString(
			member.occupation,
		);
		values[`FAC_FAMILY_${rowNumber}_REMARKS`] = safeString(member.remarks);
	}

	return values;
}

function buildFacExcelValues(record = {}) {
	const headFirstName = safeString(record.head_first_name || record.headFirstName);
	const headMiddleName = safeString(
		record.head_middle_name || record.headMiddleName,
	);
	const headLastName = safeString(record.head_last_name || record.headLastName);
	const headFullName = `${headFirstName} ${headMiddleName} ${headLastName}`
		.replace(/\s+/g, " ")
		.trim();

	const familyMembers = normalizeFacFamilyMembers(record.family_members);

	return {
		CASE_ID: safeString(record.id),
		CASE_MANAGER: safeString(record.case_manager || record.caseManager),
		STATUS: safeString(record.status),
		PRIORITY: safeString(record.priority),
		VISIBILITY: safeString(record.visibility),
		LOCATION_REGION: safeString(record.location_region),
		LOCATION_PROVINCE: safeString(record.location_province),
		LOCATION_DISTRICT: safeString(record.location_district),
		LOCATION_CITY_MUNICIPALITY: safeString(
			record.location_city_municipality,
		),
		LOCATION_BARANGAY: safeString(record.location_barangay),
		LOCATION_EVACUATION_CENTER: safeString(
			record.location_evacuation_center,
		),
		HEAD_FIRST_NAME: headFirstName,
		HEAD_MIDDLE_NAME: headMiddleName,
		HEAD_LAST_NAME: headLastName,
		HEAD_NAME_EXTENSION: safeString(
			record.head_name_extension || record.headNameExtension,
		),
		HEAD_FULL_NAME: headFullName,
		HEAD_BIRTHDATE: formatDateForTemplate(record.head_birthdate),
		HEAD_AGE: safeString(record.head_age),
		HEAD_BIRTHPLACE: safeString(record.head_birthplace),
		HEAD_SEX: safeString(record.head_sex),
		HEAD_CIVIL_STATUS: safeString(record.head_civil_status),
		HEAD_MOTHERS_MAIDEN_NAME: safeString(
			record.head_mothers_maiden_name,
		),
		HEAD_RELIGION: safeString(record.head_religion),
		HEAD_OCCUPATION: safeString(record.head_occupation),
		HEAD_MONTHLY_INCOME: safeString(record.head_monthly_income),
		HEAD_ID_CARD_PRESENTED: safeString(record.head_id_card_presented),
		HEAD_ID_CARD_NUMBER: safeString(record.head_id_card_number),
		HEAD_CONTACT_NUMBER: safeString(record.head_contact_number),
		HEAD_PERMANENT_ADDRESS: safeString(record.head_permanent_address),
		HEAD_ALTERNATE_CONTACT_NUMBER: safeString(
			record.head_alternate_contact_number,
		),
		HEAD_4PS_BENEFICIARY: formatYesNo(record.head_4ps_beneficiary),
		HEAD_IP_ETHNICITY: formatYesNo(record.head_ip_ethnicity),
		HEAD_IP_ETHNICITY_TYPE: safeString(record.head_ip_ethnicity_type),
		VULNERABLE_OLDER_PERSONS: safeString(
			record.vulnerable_older_persons,
		),
		VULNERABLE_PREGNANT_WOMEN: safeString(
			record.vulnerable_pregnant_women,
		),
		VULNERABLE_LACTATING_WOMEN: safeString(
			record.vulnerable_lactating_women,
		),
		VULNERABLE_PWDS: safeString(record.vulnerable_pwds),
		HOUSE_OWNERSHIP: safeString(record.house_ownership),
		SHELTER_DAMAGE: safeString(record.shelter_damage),
		BARANGAY_CAPTAIN: safeString(record.barangay_captain),
		DATE_REGISTERED: formatDateForTemplate(record.date_registered),
		LSWDO_NAME: safeString(record.lswdo_name),
		FAMILY_MEMBER_COUNT: safeString(
			record.family_member_count ?? familyMembers.length,
		),
		FAMILY_MEMBERS_JSON: safeString(familyMembers),
		CREATED_AT: formatDateForTemplate(record.created_at),
		UPDATED_AT: formatDateForTemplate(record.updated_at),
		...buildFacFamilyCompositionValues(familyMembers, 15),
	};
}

function buildFarExcelValues(record = {}) {
	return {
		CASE_ID: safeString(record.id),
		DATE: formatDateForTemplate(record.date),
		RECEIVING_MEMBER: safeString(record.receiving_member),
		EMERGENCY: safeString(record.emergency),
		ASSISTANCE: safeString(record.assistance),
		UNIT: safeString(record.unit),
		QUANTITY: safeString(record.quantity),
		COST: safeString(record.cost),
		PROVIDER: safeString(record.provider),
		CASE_MANAGER: safeString(record.case_manager || record.caseManager),
		STATUS: safeString(record.status),
		PRIORITY: safeString(record.priority),
		VISIBILITY: safeString(record.visibility),
		CREATED_AT: formatDateForTemplate(record.created_at),
		UPDATED_AT: formatDateForTemplate(record.updated_at),
	};
}

function buildFarBulkRowValues(record = {}) {
	return buildFarExcelValues(record);
}

function normalizeStringArray(rawValue) {
	if (Array.isArray(rawValue)) {
		return rawValue;
	}
	if (typeof rawValue === "string") {
		const trimmed = rawValue.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed;
				}
			} catch {
				// fallback to comma split below
			}
		}
		return trimmed
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

function formatWorkingStatus(value) {
	const raw = safeString(value).trim().toLowerCase();
	if (!raw) return "";
	if (raw === "working") return "Working";
	if (raw === "not_working" || raw === "not working") {
		return "Not Working";
	}
	return safeString(value);
}

function formatScOptionLabel(value) {
	const raw = safeString(value).trim();
	if (!raw) return "";

	const normalized = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
	if (!normalized) return "";

	return normalized
		.split(" ")
		.map((word) => {
			const lower = word.toLowerCase();
			if (lower === "sc") return "SC";
			if (lower === "osca") return "OSCA";
			if (lower === "gsis") return "GSIS";
			if (lower === "tin") return "TIN";
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(" ");
}

function buildScChildrenValues(children = [], maxRows = 15) {
	const values = {};

	for (let index = 0; index < maxRows; index += 1) {
		const child = children[index] || {};
		const rowNumber = index + 1;

		values[`CHILD_${rowNumber}_NAME`] = safeString(
			child.full_name || child.name || child.child_name || child.childName,
		);
		values[`CHILD_${rowNumber}_OCCUPATION`] = safeString(
			child.occupation,
		);
		values[`CHILD_${rowNumber}_INCOME`] = safeString(child.income);
		values[`CHILD_${rowNumber}_AGE`] = safeString(child.age);
		values[`CHILD_${rowNumber}_WORKING_STATUS`] = formatWorkingStatus(
			child.working_status || child.workingStatus,
		);
	}

	return values;
}

function buildScExcelValues(record = {}) {
	const seniorNameParts = parseNameParts(record.senior_name);
	const spouseNameParts = parseNameParts(record.name_of_spouse);
	const fatherNameParts = parseNameParts(record.fathers_name);
	const motherMaidenNameParts = parseNameParts(record.mothers_maiden_name);
	const childrenRaw = normalizeStringArray(record.children);
	const children = childrenRaw
		.map((entry) => {
			if (entry && typeof entry === "object") {
				return safeString(entry.full_name || entry.name || "");
			}
			return safeString(entry);
		})
		.filter(Boolean);
	const childValues = buildScChildrenValues(childrenRaw, 15);

	const listText = (value) =>
		normalizeStringArray(value)
			.map((entry) => {
				if (entry && typeof entry === "object") {
					return safeString(entry.name || entry.full_name || "");
				}
				return formatScOptionLabel(entry);
			})
			.filter(Boolean)
			.join(", ");

	return {
		CASE_ID: safeString(record.id),
		CASE_MANAGER: safeString(record.case_manager || record.caseManager),
		STATUS: safeString(record.status),
		PRIORITY: safeString(record.priority),
		VISIBILITY: safeString(record.visibility),
		SENIOR_NAME: safeString(record.senior_name),
		SENIOR_FIRST_NAME: seniorNameParts.firstName,
		SENIOR_MIDDLE_NAME: seniorNameParts.middleName,
		SENIOR_LAST_NAME: seniorNameParts.lastName,
		REGION: safeString(record.region),
		PROVINCE: safeString(record.province),
		CITY_MUNICIPALITY: safeString(record.city_municipality),
		BARANGAY: safeString(record.barangay),
		DATE_OF_BIRTH: formatDateForTemplate(record.date_of_birth),
		PLACE_OF_BIRTH: safeString(record.place_of_birth),
		MARITAL_STATUS: safeString(record.marital_status),
		GENDER: safeString(record.gender),
		CONTACT_NUMBER: safeString(record.contact_number),
		EMAIL_ADDRESS: safeString(record.email_address),
		RELIGION: safeString(record.religion),
		ETHNIC_ORIGIN: safeString(record.ethnic_origin),
		LANGUAGE_SPOKEN_WRITTEN: safeString(record.language_spoken_written),
		OSCA_ID_NUMBER: safeString(record.osca_id_number),
		GSIS: safeString(record.gsis),
		TIN: safeString(record.tin),
		PHILHEALTH: safeString(record.philhealth),
		SC_ASSOCIATION: safeString(record.sc_association),
		OTHER_GOV_ID: safeString(record.other_gov_id),
		CAPABILITY_TO_TRAVEL: safeString(record.capability_to_travel),
		SERVICE_BUSINESS_EMPLOYMENT: safeString(
			record.service_business_employment,
		),
		CURRENT_PENSION: safeString(record.current_pension),
		NAME_OF_SPOUSE: safeString(record.name_of_spouse),
		SPOUSE_FIRST_NAME: spouseNameParts.firstName,
		SPOUSE_MIDDLE_NAME: spouseNameParts.middleName,
		SPOUSE_LAST_NAME: spouseNameParts.lastName,
		FATHERS_NAME: safeString(record.fathers_name),
		FATHER_FIRST_NAME: fatherNameParts.firstName,
		FATHER_MIDDLE_NAME: fatherNameParts.middleName,
		FATHER_LAST_NAME: fatherNameParts.lastName,
		MOTHERS_MAIDEN_NAME: safeString(record.mothers_maiden_name),
		MOTHER_MAIDEN_FIRST_NAME: motherMaidenNameParts.firstName,
		MOTHER_MAIDEN_MIDDLE_NAME: motherMaidenNameParts.middleName,
		MOTHER_MAIDEN_LAST_NAME: motherMaidenNameParts.lastName,
		CHILDREN: children.join(", "),
		OTHER_DEPENDENTS: safeString(record.other_dependents),
		EDUCATIONAL_ATTAINMENT: listText(record.educational_attainment),
		TECHNICAL_SKILLS: listText(record.technical_skills),
		COMMUNITY_SERVICE_INVOLVEMENT: listText(
			record.community_service_involvement,
		),
		LIVING_WITH: listText(record.living_with),
		HOUSEHOLD_CONDITION: listText(record.household_condition),
		SOURCE_OF_INCOME_ASSISTANCE: listText(
			record.source_of_income_assistance,
		),
		ASSETS_REAL_IMMOVABLE: listText(record.assets_real_immovable),
		ASSETS_PERSONAL_MOVABLE: listText(record.assets_personal_movable),
		NEEDS_COMMONLY_ENCOUNTERED: listText(record.needs_commonly_encountered),
		MEDICAL_CONCERN: listText(record.medical_concern),
		DENTAL_CONCERN: listText(record.dental_concern),
		OPTICAL: listText(record.optical),
		HEARING: listText(record.hearing),
		SOCIAL: listText(record.social),
		DIFFICULTY: listText(record.difficulty),
		MEDICINES_FOR_MAINTENANCE: listText(record.medicines_for_maintenance),
		SCHEDULED_CHECKUP: safeString(record.scheduled_checkup),
		CHECKUP_FREQUENCY: safeString(record.checkup_frequency),
		ASSISTING_PERSON: safeString(record.assisting_person),
		RELATION_TO_SENIOR: safeString(record.relation_to_senior),
		INTERVIEWER: safeString(record.interviewer),
		DATE_OF_INTERVIEW: formatDateForTemplate(record.date_of_interview),
		PLACE_OF_INTERVIEW: safeString(record.place_of_interview),
		CREATED_AT: formatDateForTemplate(record.created_at),
		UPDATED_AT: formatDateForTemplate(record.updated_at),
		...childValues,
	};
}

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getIvacRecordsArray(record = {}) {
	if (Array.isArray(record.records)) return record.records;
	if (typeof record.records === "string") {
		try {
			const parsed = JSON.parse(record.records);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function getIvacCaseManagers(record = {}) {
	if (Array.isArray(record.case_managers)) return record.case_managers;
	if (Array.isArray(record.caseManagers)) return record.caseManagers;
	if (typeof record.case_manager === "string") return [record.case_manager];
	if (typeof record.caseManager === "string") return [record.caseManager];
	return [];
}

const IVAC_RECORD_FIELD_TOKEN_MAP = {
	barangay: "BARANGAY",
	vacVictims: "VAC_VICTIMS",
	genderMale: "GENDER_MALE",
	genderFemale: "GENDER_FEMALE",
	age0to4: "AGE_0_TO_4",
	age5to9: "AGE_5_TO_9",
	age10to14: "AGE_10_TO_14",
	age15to17: "AGE_15_TO_17",
	age18Plus: "AGE_18_PLUS",
	physicalAbuse: "PHYSICAL_ABUSE",
	sexualAbuse: "SEXUAL_ABUSE",
	psychologicalAbuse: "PSYCHOLOGICAL_ABUSE",
	neglect: "NEGLECT",
	violenceOthers: "VIOLENCE_OTHERS",
	perpImmediateFamily: "PERP_IMMEDIATE_FAMILY",
	perpCloseRelative: "PERP_CLOSE_RELATIVE",
	perpAcquaintance: "PERP_ACQUAINTANCE",
	perpStranger: "PERP_STRANGER",
	perpLocalOfficial: "PERP_LOCAL_OFFICIAL",
	perpLawOfficer: "PERP_LAW_OFFICER",
	perpOthers: "PERP_OTHERS",
	actionLSWDO: "ACTION_LSWDO",
	actionPNP: "ACTION_PNP",
	actionNBI: "ACTION_NBI",
	actionMedical: "ACTION_MEDICAL",
	actionLegal: "ACTION_LEGAL",
	actionOthers: "ACTION_OTHERS",
};

function buildIvacRecordsInternalValues(rows = [], maxRows = 15) {
	const values = {};

	for (let index = 0; index < maxRows; index += 1) {
		const row = rows[index] || {};
		const rowNumber = index + 1;

		for (const [sourceKey, tokenKey] of Object.entries(
			IVAC_RECORD_FIELD_TOKEN_MAP,
		)) {
			values[`REC_${rowNumber}_${tokenKey}`] = safeString(row[sourceKey]);
		}
	}

	return values;
}

function buildIvacExcelValues(record = {}) {
	const rows = getIvacRecordsArray(record);
	const totalVacVictims = rows.reduce(
		(sum, row) => sum + toNumber(row?.vacVictims),
		0,
	);
	const totalMale = rows.reduce(
		(sum, row) => sum + toNumber(row?.genderMale),
		0,
	);
	const totalFemale = rows.reduce(
		(sum, row) => sum + toNumber(row?.genderFemale),
		0,
	);

	const values = {
		CASE_ID: safeString(record.id),
		PROVINCE: safeString(record.province),
		MUNICIPALITY: safeString(record.municipality),
		STATUS: safeString(record.status),
		REPORTING_PERIOD: safeString(
			record.reporting_period || record.reportingPeriod,
		),
		CASE_MANAGERS: getIvacCaseManagers(record).join(", "),
		TOTAL_VAC_VICTIMS: safeString(totalVacVictims),
		TOTAL_MALE: safeString(totalMale),
		TOTAL_FEMALE: safeString(totalFemale),
		BARANGAY_COUNT: safeString(rows.length),
		RECORDS_JSON: safeString(rows),
		NOTES: safeString(record.notes),
		CREATED_AT: formatDateForTemplate(record.created_at),
		UPDATED_AT: formatDateForTemplate(record.updated_at),
	};

	return {
		...values,
		...buildIvacRecordsInternalValues(rows, 15),
	};
}

function buildIvacBulkRowValues(record = {}) {
	return buildIvacExcelValues(record);
}

function getCaseExcelValues(caseType, record) {
	switch (caseType) {
		case "SP":
			return buildSpExcelValues(record);
		case "FA":
			return buildFaExcelValues(record);
		case "CICLCAR":
			return buildCiclcarExcelValues(record);
		case "FAC":
			return buildFacExcelValues(record);
		case "FAR":
			return buildFarExcelValues(record);
		case "SC":
			return buildScExcelValues(record);
		case "IVAC":
			return buildIvacExcelValues(record);
		default:
			return {};
	}
}

function getCaseCellMap(caseType) {
	switch (caseType) {
		case "SP":
			return SP_FALLBACK_CELL_MAP;
		case "FA":
			return FA_FALLBACK_CELL_MAP;
		case "CICLCAR":
			return CICLCAR_FALLBACK_CELL_MAP;
		case "FAC":
			return FAC_FALLBACK_CELL_MAP;
		case "FAR":
			return FAR_FALLBACK_CELL_MAP;
		case "SC":
			return SC_FALLBACK_CELL_MAP;
		case "IVAC":
			return IVAC_FALLBACK_CELL_MAP;
		default:
			return {};
	}
}

function normalizeRangeAddress(rangeAddress) {
	return safeString(rangeAddress).replace(/\$/g, "").split(":")[0].trim();
}

function parseDefinedNameReference(reference) {
	const trimmed = safeString(reference).trim();
	if (!trimmed) return { sheetName: "", address: "" };

	const bangIndex = trimmed.indexOf("!");
	if (bangIndex === -1) {
		return { sheetName: "", address: normalizeRangeAddress(trimmed) };
	}

	let sheetName = trimmed.slice(0, bangIndex).trim();
	if (sheetName.startsWith("'")) sheetName = sheetName.slice(1);
	if (sheetName.endsWith("'")) sheetName = sheetName.slice(0, -1);

	return {
		sheetName,
		address: normalizeRangeAddress(trimmed.slice(bangIndex + 1)),
	};
}

function setCellValue(worksheet, address, value) {
	if (!worksheet || !address) return false;
	worksheet.getCell(address).value = value;
	return true;
}

function normalizeRanges(rangesValue) {
	if (!rangesValue) return [];
	if (Array.isArray(rangesValue)) return rangesValue;
	if (typeof rangesValue === "string") return [rangesValue];
	if (typeof rangesValue[Symbol.iterator] === "function") {
		return Array.from(rangesValue);
	}
	if (Array.isArray(rangesValue.ranges)) return rangesValue.ranges;
	if (typeof rangesValue.range === "string") return [rangesValue.range];
	return [];
}

function applyNamedRangeValues(workbook, valueMap, preferredWorksheetName) {
	let filled = 0;
	const definedNames = workbook.definedNames;
	if (!definedNames || typeof definedNames.getRanges !== "function") {
		return filled;
	}

	for (const [name, value] of Object.entries(valueMap)) {
		let rangesRaw;
		try {
			rangesRaw = definedNames.getRanges(name);
		} catch {
			rangesRaw = [];
		}
		const ranges = normalizeRanges(rangesRaw);
		for (const range of ranges) {
			const { sheetName, address } = parseDefinedNameReference(range);
			const targetSheetName = sheetName || preferredWorksheetName;
			const worksheet = workbook.getWorksheet(targetSheetName);
			if (setCellValue(worksheet, address, value)) {
				filled += 1;
			}
		}
	}

	return filled;
}

function applyFallbackCellMap(
	workbook,
	valueMap,
	cellMap,
	preferredWorksheetName,
) {
	const worksheet =
		workbook.getWorksheet(preferredWorksheetName) ||
		workbook.worksheets?.[0];
	if (!worksheet) return 0;

	let filled = 0;
	for (const [fieldName, cellAddress] of Object.entries(cellMap || {})) {
		if (!(fieldName in valueMap)) continue;
		if (setCellValue(worksheet, cellAddress, valueMap[fieldName])) {
			filled += 1;
		}
	}
	return filled;
}

function applyInlineTokenReplacements(workbook, valueMap) {
	const tokenEntries = Object.entries(valueMap).map(([field, value]) => ({
		token: `{{${field}}}`,
		value: safeString(value),
	}));

	let filled = 0;

	for (const worksheet of workbook.worksheets || []) {
		worksheet.eachRow((row) => {
			row.eachCell((cell) => {
				if (typeof cell.value !== "string") return;
				let text = cell.value;
				let changed = false;

				for (const { token, value } of tokenEntries) {
					if (!text.includes(token)) continue;
					text = text.split(token).join(value);
					filled += 1;
					changed = true;
				}

				if (changed) {
					cell.value = text;
				}
			});
		});
	}

	return filled;
}

function replaceInlineTokens(text, valueMap) {
	let next = safeString(text);
	let replaced = 0;
	for (const [field, rawValue] of Object.entries(valueMap)) {
		const token = `{{${field}}}`;
		if (!next.includes(token)) continue;
		next = next.split(token).join(safeString(rawValue));
		replaced += 1;
	}
	return { text: next, replaced };
}

function cloneCellStyle(targetCell, templateStyle) {
	if (!templateStyle || typeof templateStyle !== "object") return;
	targetCell.style = JSON.parse(JSON.stringify(templateStyle));
}

function applyFaRepeatingTemplateRows(workbook, records = []) {
	const tokenKeys = Object.keys(buildFaBulkRowValues({}));
	const tokenSet = new Set(tokenKeys.map((key) => `{{${key}}}`));

	for (const worksheet of workbook.worksheets || []) {
		let templateRowNumber = null;
		let templateMaxColumn = 0;

		worksheet.eachRow((row) => {
			if (templateRowNumber !== null) return;
			const maxColumn = Math.max(row.cellCount, row.actualCellCount, 1);
			for (let col = 1; col <= maxColumn; col += 1) {
				const value = row.getCell(col).value;
				if (typeof value !== "string") continue;
				for (const token of tokenSet) {
					if (value.includes(token)) {
						templateRowNumber = row.number;
						templateMaxColumn = maxColumn;
						return;
					}
				}
			}
		});

		if (templateRowNumber === null) continue;

		const templateRow = worksheet.getRow(templateRowNumber);
		const templateCells = [];
		for (let col = 1; col <= templateMaxColumn; col += 1) {
			const cell = templateRow.getCell(col);
			templateCells.push({
				value: cell.value,
				style: cell.style,
			});
		}

		if (!records.length) {
			for (let col = 1; col <= templateMaxColumn; col += 1) {
				const targetCell = templateRow.getCell(col);
				targetCell.value = "";
			}
			return 1;
		}

		let replacedCount = 0;
		for (let index = 0; index < records.length; index += 1) {
			const targetRowNumber = templateRowNumber + index;
			if (index > 0) {
				worksheet.insertRow(targetRowNumber, []);
			}

			const targetRow = worksheet.getRow(targetRowNumber);
			const rowValues = buildFaBulkRowValues(records[index]);

			for (let col = 1; col <= templateMaxColumn; col += 1) {
				const templateCell = templateCells[col - 1];
				const targetCell = targetRow.getCell(col);
				cloneCellStyle(targetCell, templateCell.style);

				if (typeof templateCell.value === "string") {
					const { text, replaced } = replaceInlineTokens(
						templateCell.value,
						rowValues,
					);
					targetCell.value = text;
					replacedCount += replaced;
				} else {
					targetCell.value = templateCell.value;
				}
			}
		}

		return replacedCount;
	}

	return 0;
}

function applyFarRepeatingTemplateRows(workbook, records = []) {
	const tokenKeys = Object.keys(buildFarBulkRowValues({}));
	const tokenSet = new Set(tokenKeys.map((key) => `{{${key}}}`));

	for (const worksheet of workbook.worksheets || []) {
		let templateRowNumber = null;
		let templateMaxColumn = 0;

		worksheet.eachRow((row) => {
			if (templateRowNumber !== null) return;
			const maxColumn = Math.max(row.cellCount, row.actualCellCount, 1);
			for (let col = 1; col <= maxColumn; col += 1) {
				const value = row.getCell(col).value;
				if (typeof value !== "string") continue;
				for (const token of tokenSet) {
					if (value.includes(token)) {
						templateRowNumber = row.number;
						templateMaxColumn = maxColumn;
						return;
					}
				}
			}
		});

		if (templateRowNumber === null) continue;

		const templateRow = worksheet.getRow(templateRowNumber);
		const templateCells = [];
		for (let col = 1; col <= templateMaxColumn; col += 1) {
			const cell = templateRow.getCell(col);
			templateCells.push({
				value: cell.value,
				style: cell.style,
			});
		}

		if (!records.length) {
			for (let col = 1; col <= templateMaxColumn; col += 1) {
				const targetCell = templateRow.getCell(col);
				targetCell.value = "";
			}
			return 1;
		}

		let replacedCount = 0;
		for (let index = 0; index < records.length; index += 1) {
			const targetRowNumber = templateRowNumber + index;
			if (index > 0) {
				worksheet.insertRow(targetRowNumber, []);
			}

			const targetRow = worksheet.getRow(targetRowNumber);
			const rowValues = buildFarBulkRowValues(records[index]);

			for (let col = 1; col <= templateMaxColumn; col += 1) {
				const templateCell = templateCells[col - 1];
				const targetCell = targetRow.getCell(col);
				cloneCellStyle(targetCell, templateCell.style);

				if (typeof templateCell.value === "string") {
					const { text, replaced } = replaceInlineTokens(
						templateCell.value,
						rowValues,
					);
					targetCell.value = text;
					replacedCount += replaced;
				} else {
					targetCell.value = templateCell.value;
				}
			}
		}

		return replacedCount;
	}

	return 0;
}

function applyIvacRepeatingTemplateRows(workbook, records = []) {
	const tokenKeys = Object.keys(buildIvacBulkRowValues({}));
	const tokenSet = new Set(tokenKeys.map((key) => `{{${key}}}`));

	for (const worksheet of workbook.worksheets || []) {
		let templateRowNumber = null;
		let templateMaxColumn = 0;

		worksheet.eachRow((row) => {
			if (templateRowNumber !== null) return;
			const maxColumn = Math.max(row.cellCount, row.actualCellCount, 1);
			for (let col = 1; col <= maxColumn; col += 1) {
				const value = row.getCell(col).value;
				if (typeof value !== "string") continue;
				for (const token of tokenSet) {
					if (value.includes(token)) {
						templateRowNumber = row.number;
						templateMaxColumn = maxColumn;
						return;
					}
				}
			}
		});

		if (templateRowNumber === null) continue;

		const templateRow = worksheet.getRow(templateRowNumber);
		const templateCells = [];
		for (let col = 1; col <= templateMaxColumn; col += 1) {
			const cell = templateRow.getCell(col);
			templateCells.push({
				value: cell.value,
				style: cell.style,
			});
		}

		let replacedCount = 0;
		for (let index = 0; index < records.length; index += 1) {
			const targetRowNumber = templateRowNumber + index;
			if (index > 0) {
				worksheet.insertRow(targetRowNumber, []);
			}

			const targetRow = worksheet.getRow(targetRowNumber);
			const rowValues = buildIvacBulkRowValues(records[index]);

			for (let col = 1; col <= templateMaxColumn; col += 1) {
				const templateCell = templateCells[col - 1];
				const targetCell = targetRow.getCell(col);
				cloneCellStyle(targetCell, templateCell.style);

				if (typeof templateCell.value === "string") {
					const { text, replaced } = replaceInlineTokens(
						templateCell.value,
						rowValues,
					);
					targetCell.value = text;
					replacedCount += replaced;
				} else {
					targetCell.value = templateCell.value;
				}
			}
		}

		return replacedCount;
	}

	return 0;
}

function triggerDownload(bytes, fileName) {
	const blob = new Blob([bytes], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function getOutputFilename(caseType, record) {
	const template = EXCEL_TEMPLATE_BY_CASE_TYPE[caseType];
	const prefix = template?.filenamePrefix || "case";
	const id = safeString(record?.id) || "record";
	return `${prefix}-${id}-export.xlsx`;
}

export async function exportCaseRecordToExcel({ caseType, record }) {
	const templateConfig = EXCEL_TEMPLATE_BY_CASE_TYPE[caseType];
	if (!templateConfig) {
		throw new Error(
			`No Excel template configured for case type: ${caseType}`,
		);
	}

	const response = await fetch(templateConfig.templateUrl, {
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(
			`Template not found (${templateConfig.templateUrl}). Add your template under public/excel-templates.`,
		);
	}

	const templateBytes = await response.arrayBuffer();
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(templateBytes);

	const valueMap = getCaseExcelValues(caseType, record);
	const namedRangeCount = applyNamedRangeValues(
		workbook,
		valueMap,
		templateConfig.worksheetName,
	);
	const fallbackCellCount = applyFallbackCellMap(
		workbook,
		valueMap,
		getCaseCellMap(caseType),
		templateConfig.worksheetName,
	);
	const inlineTokenCount = applyInlineTokenReplacements(workbook, valueMap);

	const filledCount = namedRangeCount + fallbackCellCount + inlineTokenCount;
	if (!filledCount) {
		throw new Error(
			"No matching named ranges/cell mappings/placeholders found. Use named ranges, fallback cell map, or {{FIELD_NAME}} placeholders in cells.",
		);
	}

	const out = await workbook.xlsx.writeBuffer();
	triggerDownload(out, getOutputFilename(caseType, record));
	return { filledCount };
}

export async function exportCaseRecordsToExcel({ caseType, records = [] }) {
	const templateConfig = EXCEL_TEMPLATE_BY_CASE_TYPE[caseType];
	if (!templateConfig) {
		throw new Error(
			`No Excel template configured for case type: ${caseType}`,
		);
	}
	if (!Array.isArray(records) || records.length === 0) {
		throw new Error("No records to export.");
	}

	const response = await fetch(templateConfig.templateUrl, {
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(
			`Template not found (${templateConfig.templateUrl}). Add your template under public/excel-templates.`,
		);
	}

	const templateBytes = await response.arrayBuffer();
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(templateBytes);

	let filledCount = 0;
	if (caseType === "FA") {
		filledCount = applyFaRepeatingTemplateRows(workbook, records);
	} else if (caseType === "FAR") {
		filledCount = applyFarRepeatingTemplateRows(workbook, records);
	} else if (caseType === "IVAC") {
		filledCount = applyIvacRepeatingTemplateRows(workbook, records);
	}

	if (!filledCount) {
		throw new Error(
			"No bulk row template found. Add one row in your template with inline tokens for the selected case type.",
		);
	}

	const out = await workbook.xlsx.writeBuffer();
	const filename = `${templateConfig.filenamePrefix}-bulk-export.xlsx`;
	triggerDownload(out, filename);
	return { filledCount };
}
