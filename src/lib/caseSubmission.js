/**
 * VAC case submission helpers.
 *
 * Responsibilities:
 * - Map intake-store data to the Supabase `case` and `case_family_member` tables.
 * - Support two intake variants by mapping to base columns and `*2`-suffixed columns.
 * - Insert the main case row and (optionally) two groups of family-member rows.
 *
 * Design notes:
 * - The intake store uses capitalized section keys; the second variant appends `2`.
 * - `submitCase()` intentionally merges both variants so Part 1 and Part 2 save together.
 */

import supabase from "../../config/supabase";

/**
 * @typedef {Object} CaseDetails
 * @property {string} [caseManager]
 * @property {string} [status]
 * @property {string} [priority]
 */

/**
 * @typedef {Object} IdentifyingSection
 * @property {string} [intakeDate]
 * @property {string} [name]
 * @property {string} [referralSource]
 * @property {string} [alias]
 * @property {string|number} [age]
 * @property {string} [status]
 * @property {string} [occupation]
 * @property {string|number} [income]
 * @property {string} [sex]
 * @property {string} [address]
 * @property {string} [caseType]
 * @property {string} [religion]
 * @property {string} [educationalAttainment]
 * @property {string} [contactPerson]
 * @property {string} [birthPlace]
 * @property {string} [respondentName]
 * @property {string} [birthday]
 */

/**
 * @typedef {Object} PerpetratorOrVictimSection
 * @property {string} [name]
 * @property {string|number} [age]
 * @property {string} [alias]
 * @property {string} [sex]
 * @property {string} [address]
 * @property {string} [victimRelation]
 * @property {string} [offenceType]
 * @property {string} [commissionDateTime]
 */

/**
 * @typedef {Object} NarrativeSection
 * @property {string} [presentingProblem]
 * @property {string} [backgroundInfo]
 * @property {string} [communityInfo]
 * @property {string} [assessment]
 * @property {string} [recommendation]
 */

/**
 * @typedef {Object} FamilyMember
 * @property {string} [name]
 * @property {string|number} [age]
 * @property {string} [relation]
 * @property {string} [status]
 * @property {string} [education]
 * @property {string} [occupation]
 * @property {string|number} [income]
 */

/**
 * @typedef {Object} FamilySection
 * @property {FamilyMember[]} [members]
 */

/**
 * @typedef {Object} CaseIntakeStoreData
 * @property {IdentifyingSection} [IdentifyingData]
 * @property {IdentifyingSection} [IdentifyingData2]
 * @property {PerpetratorOrVictimSection} [PerpetratorInfo]
 * @property {PerpetratorOrVictimSection} [VictimInfo2]
 * @property {NarrativeSection} [PresentingProblem]
 * @property {NarrativeSection} [PresentingProblem2]
 * @property {NarrativeSection} [BackgroundInfo]
 * @property {NarrativeSection} [BackgroundInfo2]
 * @property {NarrativeSection} [CommunityInfo]
 * @property {NarrativeSection} [CommunityInfo2]
 * @property {NarrativeSection} [Assessment]
 * @property {NarrativeSection} [Assessment2]
 * @property {NarrativeSection} [Recommendation]
 * @property {NarrativeSection} [Recommendation2]
 * @property {FamilySection} [FamilyData]
 * @property {FamilySection} [FamilyData2]
 * @property {CaseDetails} [caseDetails]
 */

/**
 * @typedef {Record<string, any>} CasePayload
 * A dynamic payload object whose keys depend on which variant is being built.
 */

/**
 * @typedef {Object} CaseFamilyMemberRow
 * @property {string} case_id
 * @property {number} group_no
 * @property {string|null} name
 * @property {string|number|null} age
 * @property {string|null} relation
 * @property {string|null} status
 * @property {string|null} education
 * @property {string|null} occupation
 * @property {string|number|null} income
 */

/**
 * Build the case-row payload based on intake store data.
 * @param {CaseIntakeStoreData} data Full store data (sections keyed by section name).
 * @param {boolean} isSecond Whether this is the second intake variant using suffixed columns.
 * @returns {CasePayload} Payload suitable for Supabase insert/update.
 */
function buildCasePayload(data, isSecond) {
	// NOTE: Store uses Capitalized section keys, and second variant appends "2".
	// First variant keys:
	//  IdentifyingData, PerpetratorInfo, PresentingProblem, BackgroundInfo, CommunityInfo, Assessment, Recommendation, FamilyData
	// Second variant keys:
	//  IdentifyingData2, VictimInfo2, PresentingProblem2, BackgroundInfo2, CommunityInfo2, Assessment2, Recommendation2, FamilyData2

	const identifying = isSecond
		? data.IdentifyingData2 || {}
		: data.IdentifyingData || {};
	const perpetratorOrVictim = isSecond
		? data.VictimInfo2 || {}
		: data.PerpetratorInfo || {};
	const presenting = isSecond
		? data.PresentingProblem2 || {}
		: data.PresentingProblem || {};
	const background = isSecond
		? data.BackgroundInfo2 || {}
		: data.BackgroundInfo || {};
	const community = isSecond
		? data.CommunityInfo2 || {}
		: data.CommunityInfo || {};
	const assessment = isSecond
		? data.Assessment2 || {}
		: data.Assessment || {};
	const recommendation = isSecond
		? data.Recommendation2 || {}
		: data.Recommendation || {};
	const caseDetails = data.caseDetails || {}; // shared

	// Column prefix selection
	const idPrefix = isSecond ? "identifying2" : "identifying";
	const ppKey = isSecond ? "presenting_problem2" : "presenting_problem"; // DB columns: presenting_problem / presenting_problem2
	const bgKey = isSecond ? "background_info2" : "background_info";
	const commKey = isSecond ? "community_info2" : "community_info";
	const recCol = isSecond ? "recommendation2" : "recommendation";
	const assessCol = isSecond ? "assessment2" : "assessment";

	// For perpetrator / victim2 columns based on schema
	const perpNameCol = isSecond ? "victim2_name" : "perpetrator_name";
	const perpAgeCol = isSecond ? "victim2_age" : "perpetrator_age";
	const perpAliasCol = isSecond ? "victim2_alias" : "perpetrator_alias";
	const perpSexCol = isSecond ? "victim2_sex" : "perpetrator_sex";
	const perpAddressCol = isSecond ? "victim2_address" : "perpetrator_address";
	const perpRelationCol = isSecond
		? "victim2_victim_relation"
		: "perpetrator_victim_relation";
	const perpOffenceCol = isSecond
		? "victim2_offence_type"
		: "perpetrator_offence_type";
	const perpCommissionCol = isSecond
		? "victim2_commission_datetime"
		: "perpetrator_commission_datetime";

	const payload = {
		case_manager: caseDetails.caseManager || null,
		status: caseDetails.status || null,
		priority: caseDetails.priority || null,

		// Identifying data mapping using dynamic property names
		[`${idPrefix}_intake_date`]: identifying.intakeDate || null,
		[`${idPrefix}_name`]: identifying.name || null,
		[`${idPrefix}_referral_source`]: identifying.referralSource || null,
		[`${idPrefix}_alias`]: identifying.alias || null,
		[`${idPrefix}_age`]: identifying.age || null,
		[`${idPrefix}_status`]: identifying.status || null,
		[`${idPrefix}_occupation`]: identifying.occupation || null,
		[`${idPrefix}_income`]: identifying.income || null,
		[`${idPrefix}_sex`]: identifying.sex || null,
		[`${idPrefix}_address`]: identifying.address || null,
		[`${idPrefix}_case_type`]: identifying.caseType || null,
		[`${idPrefix}_religion`]: identifying.religion || null,
		[`${idPrefix}_educational_attainment`]:
			identifying.educationalAttainment || null,
		[`${idPrefix}_contact_person`]: identifying.contactPerson || null,
		[`${idPrefix}_birth_place`]: identifying.birthPlace || null,
		[`${idPrefix}_respondent_name`]: identifying.respondentName || null,
		// birthday special: DB expects date (without time) - ensure empty string => null
		[`${idPrefix}_birthday`]: identifying.birthday || null,

		// Perpetrator / victim (second-variant maps to victim2_* columns)
		[perpNameCol]: perpetratorOrVictim.name || null,
		[perpAgeCol]: perpetratorOrVictim.age || null,
		[perpAliasCol]: perpetratorOrVictim.alias || null,
		[perpSexCol]: perpetratorOrVictim.sex || null,
		[perpAddressCol]: perpetratorOrVictim.address || null,
		[perpRelationCol]: perpetratorOrVictim.victimRelation || null,
		[perpOffenceCol]: perpetratorOrVictim.offenceType || null,
		[perpCommissionCol]: perpetratorOrVictim.commissionDateTime || null,

		// Narrative sections
		[ppKey]: presenting.presentingProblem || null,
		[bgKey]: background.backgroundInfo || null,
		[commKey]: community.communityInfo || null,
		[assessCol]: assessment.assessment || null,
		[recCol]: recommendation.recommendation || null,
	};

	return payload;
}

/**
 * Insert a case and related family members.
 *
 * Family members are inserted into two groups:
 * - Part 1 uses group numbers starting at 1
 * - Part 2 uses a high base to avoid collisions when displaying/ordering
 *
 * @param {CaseIntakeStoreData} finalData Store data snapshot.
 * @returns {Promise<{caseId: string|null, error: any}>}
 */
export async function submitCase(finalData) {
	// Build and merge both variants so Part 1 and Part 2 save together.
	const p1 = buildCasePayload(finalData, false);
	const p2 = buildCasePayload(finalData, true);
	const payload = { ...p1, ...p2 };

	// Insert main case row
	const { data: inserted, error } = await supabase
		.from("case")
		.insert(payload)
		.select()
		.single();

	if (error) return { caseId: null, error };
	const caseId = inserted?.id;

	// Insert family members for both groups
	const members1 = Array.isArray(finalData?.FamilyData?.members)
		? finalData.FamilyData.members
		: [];
	const members2 = Array.isArray(finalData?.FamilyData2?.members)
		? finalData.FamilyData2.members
		: [];

	const PART2_GROUP_BASE = 2000;
	/** @type {CaseFamilyMemberRow[]} */
	const fmRows = [];

	members1.forEach((m, idx) => {
		fmRows.push({
			case_id: caseId,
			group_no: idx + 1,
			name: m.name || null,
			age: m.age || null,
			relation: m.relation || null,
			status: m.status || null,
			education: m.education || null,
			occupation: m.occupation || null,
			income: m.income || null,
		});
	});

	members2.forEach((m, idx) => {
		fmRows.push({
			case_id: caseId,
			group_no: PART2_GROUP_BASE + idx + 1,
			name: m.name || null,
			age: m.age || null,
			relation: m.relation || null,
			status: m.status || null,
			education: m.education || null,
			occupation: m.occupation || null,
			income: m.income || null,
		});
	});

	if (fmRows.length) {
		const { error: fmErr } = await supabase
			.from("case_family_member")
			.insert(fmRows);
		if (fmErr) return { caseId, error: fmErr };
	}

	return { caseId, error: null };
}

export { buildCasePayload };
