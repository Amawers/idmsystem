"use client";

/**
 * Case Intake (Create) dialog.
 *
 * Responsibilities:
 * - Renders a multi-tab intake flow backed by `useIntakeFormStore`.
 * - On the final step, builds a normalized payload from store sections and creates records in Supabase.
 * - Closes the dialog and invokes `onSuccess` so the parent can refresh or reload data.
 *
 * Notes:
 * - This flow is intentionally kept to one schema-aligned pass (no duplicated Part 2 tabs).
 */
import { useState, useEffect, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IdentifyingDataForm } from "@/components/intake sheet/IdentifyingDataForm";
import { FamilyCompositionForm } from "@/components/intake sheet/FamilyCompositionForm";
import { PerpetratorInfoForm } from "@/components/intake sheet/PerpetratorInfoForm";
import { ProblemForm } from "@/components/intake sheet/ProblemForm";
import { BackgroundInfoForm } from "@/components/intake sheet/BackgroundInfoForm";
import { CommunityInfoForm } from "@/components/intake sheet/CommunityInforForm";
import { AssessmentForm } from "@/components/intake sheet/AssessmentForm";
import { RecommendationForm } from "@/components/intake sheet/RecommendationForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { toast } from "sonner";
import supabase from "@/../config/supabase";

/**
 * @typedef {(
 *   | "identifying-data"
 *   | "family-composition"
 *   | "perpetrator-information"
 *   | "presenting-problem"
 *   | "background-information"
 *   | "community-information"
 *   | "assessment"
 *   | "recommendation"
 * )} CaseCreateTabId
 */

/**
 * @typedef IntakeSheetCaseCreateProps
 * @property {boolean} open Controls dialog visibility.
 * @property {(open: boolean) => void} setOpen Dialog open-state setter.
 * @property {() => void} [onSuccess] Optional callback fired after a successful create.
 */

/** @type {CaseCreateTabId[]} */
const tabOrder = [
	"identifying-data",
	"family-composition",
	"perpetrator-information",
	"presenting-problem",
	"background-information",
	"community-information",
	"assessment",
	"recommendation",
];

// Keep Case writes aligned with the current public.case schema.
const CASE_TABLE_COLUMNS = new Set([
	"case_manager",
	"status",
	"priority",
	"identifying_intake_date",
	"identifying_name",
	"identifying_referral_source",
	"identifying_alias",
	"identifying_age",
	"identifying_status",
	"identifying_occupation",
	"identifying_income",
	"identifying_sex",
	"identifying_address",
	"identifying_case_type",
	"identifying_religion",
	"identifying_educational_attainment",
	"identifying_contact_person",
	"identifying_birth_place",
	"identifying_respondent_name",
	"identifying_birthday",
	"perpetrator_name",
	"perpetrator_age",
	"perpetrator_alias",
	"perpetrator_sex",
	"perpetrator_address",
	"perpetrator_victim_relation",
	"perpetrator_offence_type",
	"perpetrator_commission_datetime",
	"presenting_problem",
	"background_info",
	"community_info",
	"assessment",
	"recommendation",
]);

const toCaseTablePayload = (payload) =>
	Object.fromEntries(
		Object.entries(payload).filter(([column]) =>
			CASE_TABLE_COLUMNS.has(column),
		),
	);

/**
 * @param {IntakeSheetCaseCreateProps} props
 */
export default function IntakeSheetCaseCreate({ open, setOpen, onSuccess }) {
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	const [completedTabs, setCompletedTabs] = useState(new Set());
	const { getAllData, resetAll } = useIntakeFormStore();
	const [isSaving, setIsSaving] = useState(false);
	const createInFlightRef = useRef(false);

	/**
	 * Safely picks the first non-empty value for any of the provided keys.
	 *
	 * @template T
	 * @param {T | null | undefined} obj
	 * @param {...string} keys
	 * @returns {unknown | null}
	 */
	const pick = (obj, ...keys) => {
		for (const k of keys) {
			const v = obj?.[k];
			if (v !== undefined && v !== null && v !== "") return v;
		}
		return null;
	};

	/**
	 * Normalizes a date-like input into an ISO `YYYY-MM-DD` string.
	 *
	 * @param {unknown} v
	 * @returns {string | null}
	 */
	const normalizeDate = (v) => {
		if (!v) return null;
		const d = v instanceof Date ? v : new Date(v);
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString().slice(0, 10);
	};

	/**
	 * Builds the case payload from store sections and creates the record in Supabase.
	 */
	const handleCreate = async () => {
		if (createInFlightRef.current) {
			return;
		}
		createInFlightRef.current = true;
		try {
			setIsSaving(true);
			const all = getAllData() || {};

			console.log("🔍 Full intake data:", all);

			// Extract all form sections
			const identifying = all.IdentifyingData || {};
			const familyData = all.FamilyData || {};
			const perpetrator = all.PerpetratorInfo || {};
			const problem = all.PresentingProblem || {};
			const background = all.BackgroundInfo || {};
			const community = all.CommunityInfo || {};
			const assessment = all.Assessment || {};
			const recommendation = all.Recommendation || {};
			const caseDetails = all.caseDetails || {};

			// Extract family members
			const familyMembers = Array.isArray(familyData?.members)
				? familyData.members
				: [];

			// Build case payload
			const casePayload = {
				case_manager:
					pick(caseDetails, "caseManager", "case_manager") ?? null,
				status: pick(caseDetails, "status") ?? null,
				priority: pick(caseDetails, "priority") ?? null,

				// Identifying data
				identifying_name: pick(identifying, "name", "fullName") ?? null,
				identifying_referral_source:
					pick(identifying, "referralSource", "referral_source") ??
					null,
				identifying_alias: pick(identifying, "alias") ?? null,
				identifying_age: pick(identifying, "age") ?? null,
				identifying_status:
					pick(identifying, "civilStatus", "status") ?? null,
				identifying_occupation: pick(identifying, "occupation") ?? null,
				identifying_income: pick(identifying, "income") ?? null,
				identifying_sex: pick(identifying, "sex") ?? null,
				identifying_address: pick(identifying, "address") ?? null,
				identifying_case_type:
					pick(identifying, "caseType", "case_type") ?? null,
				identifying_religion: pick(identifying, "religion") ?? null,
				identifying_educational_attainment:
					pick(
						identifying,
						"educationalAttainment",
						"educational_attainment",
					) ?? null,
				identifying_contact_person:
					pick(identifying, "contactPerson", "contact_person") ??
					null,
				identifying_birth_place:
					pick(identifying, "birthPlace", "birth_place") ?? null,
				identifying_respondent_name:
					pick(identifying, "respondentName", "respondent_name") ??
					null,
				identifying_birthday:
					normalizeDate(
						pick(identifying, "birthday", "birth_date"),
					) ?? null,
				identifying_intake_date:
					normalizeDate(
						pick(identifying, "intakeDate", "intake_date"),
					) ?? null,

				// Perpetrator data
				perpetrator_name: pick(perpetrator, "name") ?? null,
				perpetrator_age: pick(perpetrator, "age") ?? null,
				perpetrator_alias: pick(perpetrator, "alias") ?? null,
				perpetrator_sex: pick(perpetrator, "sex") ?? null,
				perpetrator_address: pick(perpetrator, "address") ?? null,
				perpetrator_victim_relation:
					pick(perpetrator, "victimRelation", "victim_relation") ??
					null,
				perpetrator_offence_type:
					pick(perpetrator, "offenceType", "offence_type") ?? null,
				perpetrator_commission_datetime:
					normalizeDate(
						pick(
							perpetrator,
							"commissionDatetime",
							"commission_datetime",
						),
					) ?? null,

				// Problems/Assessment/Recommendation
				presenting_problem:
					pick(problem, "problem", "presentingProblem") ?? null,
				background_info:
					pick(background, "backgroundInfo", "background") ?? null,
				community_info:
					pick(community, "communityInfo", "community") ?? null,
				assessment: pick(assessment, "assessment") ?? null,
				recommendation: pick(recommendation, "recommendation") ?? null,
			};

			const casePayloadForInsert = toCaseTablePayload(casePayload);

			console.log("💾 Final case payload:", casePayloadForInsert);
			console.log("👨‍👩‍👧‍👦 Family members:", familyMembers);

			const { data: insertedCase, error: caseError } = await supabase
				.from("case")
				.insert([casePayloadForInsert])
				.select("id")
				.single();

			if (caseError) throw caseError;

			const createdCaseId = insertedCase?.id;
			if (createdCaseId && familyMembers.length > 0) {
				const familyRows = familyMembers.map((member, index) => ({
					case_id: createdCaseId,
					group_no: member?.group_no || index + 1,
					name: member?.name || null,
					age: member?.age || null,
					relation: member?.relation || null,
					status: member?.status || null,
					education: member?.education || null,
					occupation: member?.occupation || null,
					income: member?.income || null,
				}));

				const { error: familyError } = await supabase
					.from("case_family_member")
					.insert(familyRows);

				if (familyError) throw familyError;
			}

			// Done - close modal and clean up
			resetAll();
			setOpen(false);

			toast.success("Case Saved", {
				description: "Case was stored successfully.",
			});

			// Fire-and-forget parent refresh
			if (onSuccess) {
				try {
					onSuccess();
				} catch (callbackError) {
					console.error(
						"Case create onSuccess callback failed:",
						callbackError,
					);
				}
			}

		} catch (err) {
			console.error("Failed to create case record:", err);
			toast.error("Creation Failed", {
				description:
					err.message ||
					"An error occurred while creating the case. Please try again.",
			});
		} finally {
			setIsSaving(false);
			createInFlightRef.current = false;
		}
	};

	/** Advances to the next step; on the last step, triggers `handleCreate()`. */
	const goNext = async () => {
		setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
		if (currentTabIndex < tabOrder.length - 1) {
			setCurrentTabIndex((prev) => prev + 1);
		} else {
			// last tab completed - create record
			await handleCreate();
		}
	};

	/** Moves back one step (no-op at index 0). */
	const goBack = () => {
		if (currentTabIndex > 0) {
			setCurrentTabIndex((prev) => prev - 1);
		}
	};

	/** Resets local navigation state when the dialog closes. */
	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setCompletedTabs(new Set());
		}
	}, [open]);

	/** Clears the shared intake store when starting a new create session. */
	useEffect(() => {
		if (open) {
			resetAll();
		}
	}, [open, resetAll]);

	/** Scrolls the tab strip to keep the active tab centered. */
	useEffect(() => {
		const container = document.getElementById("case-tabs-container");
		const activeEl = container?.querySelector(`[data-state="active"]`);
		if (activeEl && container) {
			const containerWidth = container.offsetWidth;
			const elLeft = activeEl.offsetLeft;
			const elWidth = activeEl.offsetWidth;
			container.scrollTo({
				left: elLeft - containerWidth / 2 + elWidth / 2,
				behavior: "smooth",
			});
		}
	}, [currentTabIndex]);

	const currentTab = tabOrder[currentTabIndex];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Create Case Record</DialogTitle>
				</DialogHeader>

				<Tabs
					value={currentTab}
					onValueChange={(tab) =>
						setCurrentTabIndex(tabOrder.indexOf(tab))
					}
					className="w-full flex flex-col gap-4"
				>
					<div
						id="case-tabs-container"
						className="w-full overflow-x-auto scrollbar-hide scrollbar-thin"
					>
						<TabsList className="flex w-max gap-2 px-2">
							{tabOrder.map((tab, index) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className="flex items-center whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
									onClick={() => setCurrentTabIndex(index)}
								>
									{completedTabs.has(index) ? (
										<Badge
											variant="secondary"
											className="mr-2 h-4 w-4 rounded-full p-0 text-xs bg-green-100 text-green-700"
										>
											✓
										</Badge>
									) : (
										<Badge
											variant="secondary"
											className="mr-2"
										>
											{index + 1}
										</Badge>
									)}
									{tab
										.replace(/-/g, " ")
										.replace(/\b\w/g, (l) =>
											l.toUpperCase(),
										)}
								</TabsTrigger>
							))}
						</TabsList>
					</div>

					<div className="flex-1 overflow-auto">
						<TabsContent value="identifying-data">
							<IdentifyingDataForm
								sectionKey="IdentifyingData"
								goNext={goNext}
								goBack={goBack}
								isFirstStep={true}
							/>
						</TabsContent>

						<TabsContent value="family-composition">
							<FamilyCompositionForm
								sectionKey="FamilyData"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="perpetrator-information">
							<PerpetratorInfoForm
								sectionKey="PerpetratorInfo"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="presenting-problem">
							<ProblemForm
								sectionKey="PresentingProblem"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="background-information">
							<BackgroundInfoForm
								sectionKey="BackgroundInfo"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="community-information">
							<CommunityInfoForm
								sectionKey="CommunityInfo"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="assessment">
							<AssessmentForm
								sectionKey="Assessment"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="recommendation">
							<RecommendationForm
								sectionKey="Recommendation"
								goNext={goNext}
								goBack={goBack}
								isSecond={true}
								submitLabel="Save Case"
								setOpen={setOpen}
								submitDisabled={isSaving}
								deferSubmit={true}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
