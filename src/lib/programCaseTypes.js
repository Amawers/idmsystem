export const PROGRAM_CASE_TYPES = [
	"CASE",
	"CICL/CAR",
	"IVAC",
	"FAC",
	"FAR",
	"SP",
	"FA",
	"PWD",
	"SC",
];

export const PROGRAM_ENROLLMENT_CASE_TYPES = [
	"CICL/CAR",
	"VAC",
	"CASE",
	"FAC",
	"FAR",
	"FA",
	"IVAC",
	"SP",
	"PWD",
	"SC",
];

export const PROGRAM_CASE_TYPE_OPTIONS = PROGRAM_CASE_TYPES.map((value) => ({
	value,
	label: value,
}));

// Legacy mapping retained for older data values.
export const normalizeProgramCaseType = (value) => {
	if (!value) return value;
	if (value === "VAC") return "CASE";
	return value;
};

export const getProgramCaseTypeCandidates = (value) => {
	const normalized = normalizeProgramCaseType(value);
	if (!normalized) return [];
	if (normalized === "CASE") {
		return ["CASE", "VAC"];
	}
	return [normalized];
};

// Persist regular CASE enrollments as VAC for legacy DB compatibility.
export const toProgramEnrollmentCaseType = (value) => {
	const normalized = normalizeProgramCaseType(value);
	if (!normalized) return normalized;
	if (normalized === "CASE") return "VAC";
	return normalized;
};
