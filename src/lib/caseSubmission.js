/**
 * VAC case submission helpers.
 *
 * Responsibilities:
 * - Map intake-store data to the Supabase `case` and `case_family_member` tables.
 * - Insert the main case row and optional family-member rows.
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
 * @property {PerpetratorOrVictimSection} [PerpetratorInfo]
 * @property {NarrativeSection} [PresentingProblem]
 * @property {NarrativeSection} [BackgroundInfo]
 * @property {NarrativeSection} [CommunityInfo]
 * @property {NarrativeSection} [Assessment]
 * @property {NarrativeSection} [Recommendation]
 * @property {FamilySection} [FamilyData]
 * @property {CaseDetails} [caseDetails]
 */

/**
 * @typedef {Record<string, any>} CasePayload
 * A case payload object suitable for Supabase insert/update.
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
 * @returns {CasePayload} Payload suitable for Supabase insert/update.
 */
function buildCasePayload(data) {
	const identifying = data.IdentifyingData || {};
	const perpetrator = data.PerpetratorInfo || {};
	const presenting = data.PresentingProblem || {};
	const background = data.BackgroundInfo || {};
	const community = data.CommunityInfo || {};
	const assessment = data.Assessment || {};
	const recommendation = data.Recommendation || {};
	const caseDetails = data.caseDetails || {};

	const payload = {
		case_manager: caseDetails.caseManager || null,
		status: caseDetails.status || null,
		priority: caseDetails.priority || null,

		identifying_intake_date: identifying.intakeDate || null,
		identifying_name: identifying.name || null,
		identifying_referral_source: identifying.referralSource || null,
		identifying_alias: identifying.alias || null,
		identifying_age: identifying.age || null,
		identifying_status: identifying.status || null,
		identifying_occupation: identifying.occupation || null,
		identifying_income: identifying.income || null,
		identifying_sex: identifying.sex || null,
		identifying_address: identifying.address || null,
		identifying_case_type: identifying.caseType || null,
		identifying_religion: identifying.religion || null,
		identifying_educational_attainment:
			identifying.educationalAttainment || null,
		identifying_contact_person: identifying.contactPerson || null,
		identifying_birth_place: identifying.birthPlace || null,
		identifying_respondent_name: identifying.respondentName || null,
		identifying_birthday: identifying.birthday || null,

		perpetrator_name: perpetrator.name || null,
		perpetrator_age: perpetrator.age || null,
		perpetrator_alias: perpetrator.alias || null,
		perpetrator_sex: perpetrator.sex || null,
		perpetrator_address: perpetrator.address || null,
		perpetrator_victim_relation: perpetrator.victimRelation || null,
		perpetrator_offence_type: perpetrator.offenceType || null,
		perpetrator_commission_datetime:
			perpetrator.commissionDateTime || null,

		// Narrative sections
		presenting_problem: presenting.presentingProblem || null,
		background_info: background.backgroundInfo || null,
		community_info: community.communityInfo || null,
		assessment: assessment.assessment || null,
		recommendation: recommendation.recommendation || null,
	};

	return payload;
}

/**
 * Insert a case and related family members.
 *
 * @param {CaseIntakeStoreData} finalData Store data snapshot.
 * @returns {Promise<{caseId: string|null, error: any}>}
 */
export async function submitCase(finalData) {
	const payload = buildCasePayload(finalData);

	// Insert main case row
	const { data: inserted, error } = await supabase
		.from("case")
		.insert(payload)
		.select()
		.single();

	if (error) return { caseId: null, error };
	const caseId = inserted?.id;

	// Insert family members
	const members1 = Array.isArray(finalData?.FamilyData?.members)
		? finalData.FamilyData.members
		: [];

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

	if (fmRows.length) {
		const { error: fmErr } = await supabase
			.from("case_family_member")
			.insert(fmRows);
		if (fmErr) return { caseId, error: fmErr };
	}

	return { caseId, error: null };
}

export { buildCasePayload };
