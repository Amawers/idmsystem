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
	FAR: {
		templateUrl: "/excel-templates/far-case-template.xlsx",
		filenamePrefix: "family-assistance-record",
		worksheetName: "FAR",
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

const FAR_FALLBACK_CELL_MAP = {
	// Optional fallback if you do not use named ranges in the template.
	// Example:
	// RECEIVING_MEMBER: "B6",
	// ASSISTANCE: "E6",
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
		case "FAR":
			return buildFarExcelValues(record);
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
		case "FAR":
			return FAR_FALLBACK_CELL_MAP;
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
