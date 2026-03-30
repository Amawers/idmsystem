"use client";
/**
 * Case intake edit dialog.
 *
 * Responsibilities:
 * - Prefill `useIntakeFormStore` from a selected case row for a two-part intake flow.
 * - Normalize date/datetime values to what form controls expect.
 * - Populate family members from the selected case.
 * - Queue the update via the offline service; when online, force a one-time tab reload to
 *   encourage immediate sync.
 *
 * Notes:
 * - The flow uses index-based tab state + a completed set (similar to FAC) to keep UX stable.
 * - Tab forcing is coordinated via `sessionStorage` keys consumed by the case management page.
 */
import { useState, useEffect } from "react";
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
import { toast } from "sonner";

/**
 * Safe online check for browser-like environments.
 * @returns {boolean} True when the browser reports connectivity, otherwise true by default.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Forces the Case Management view to reopen on the CASE tab.
 *
 * Used after queuing an update while online so the list can refresh/sync.
 * @returns {void}
 */
const forceCaseTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "CASE");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "CASE");
	sessionStorage.setItem("caseManagement.forceCaseSync", "true");
	window.location.reload();
};

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
 * )} CaseEditTabId
 */

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

/**
 * @typedef {Object} IntakeSheetCaseEditProps
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 * @property {any} row
 * @property {() => void} [onSuccess]
 */

/**
 * @param {IntakeSheetCaseEditProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetCaseEdit({
	open,
	onOpenChange,
	row,
	onSuccess,
}) {
	// index-based tab state and completed set (match FAC behavior)
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	const [completedTabs, setCompletedTabs] = useState(new Set());
	const [prefilled, setPrefilled] = useState(false);
	const [saving, setSaving] = useState(false);

	const { resetAll, setSectionField } = useIntakeFormStore();

	/**
	 * Formats values to `YYYY-MM-DD` for `<input type="date">`.
	 * @param {any} val
	 * @returns {string}
	 */
	const toLocalDate = (val) => {
		if (!val) return "";
		// Accept 'YYYY-MM-DD' or ISO; return 'YYYY-MM-DD'
		if (typeof val === "string") {
			if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
			// Try ISO
			const d = new Date(val);
			if (!isNaN(d.getTime())) {
				const yyyy = d.getFullYear();
				const mm = String(d.getMonth() + 1).padStart(2, "0");
				const dd = String(d.getDate()).padStart(2, "0");
				return `${yyyy}-${mm}-${dd}`;
			}
		}
		return "";
	};

	/**
	 * Formats values to `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`.
	 * @param {any} val
	 * @returns {string}
	 */
	const toLocalDateTime = (val) => {
		if (!val) return "";
		// Expected by <input type="datetime-local"> → 'YYYY-MM-DDTHH:mm'
		if (typeof val === "string" && val.includes("T")) {
			// Strip seconds/timezone if present
			return val.slice(0, 16);
		}
		const d = new Date(val);
		if (!isNaN(d.getTime())) {
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, "0");
			const dd = String(d.getDate()).padStart(2, "0");
			const hh = String(d.getHours()).padStart(2, "0");
			const mi = String(d.getMinutes()).padStart(2, "0");
			return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
		}
		return "";
	};

	/**
	 * Prefills `useIntakeFormStore` from the selected row.
	 *
	 * Also resets local UI state when the dialog closes.
	 * @returns {void}
	 */
	useEffect(() => {
		if (!open) {
			// Clear any prefilled values when closing the edit modal
			resetAll();
			setPrefilled(false);
			setCurrentTabIndex(0);
			setCompletedTabs(new Set());
			return;
		}
		if (!row) return;

		try {
			resetAll();

			// Case Details
			setSectionField("caseDetails", {
				caseManager: row.case_manager || undefined,
				status: row.status || undefined,
				priority: row.priority || undefined,
			});

			// Part 1: Identifying
			setSectionField("IdentifyingData", {
				intakeDate: toLocalDate(row.identifying_intake_date),
				name: row.header || row.identifying_name || undefined,
				referralSource: row.identifying_referral_source || undefined,
				alias: row.identifying_alias || undefined,
				age: row.identifying_age || undefined,
				status: (row.identifying_status ?? undefined)
					?.toString?.()
					.toLowerCase?.(),
				occupation: row.identifying_occupation || undefined,
				income: row.identifying_income || undefined,
				sex: (row.identifying_sex ?? undefined)
					?.toString?.()
					.toLowerCase?.(),
				address: row.identifying_address || undefined,
				caseType: row.identifying_case_type || undefined,
				religion: row.identifying_religion || undefined,
				educationalAttainment:
					row.identifying_educational_attainment || undefined,
				contactPerson: row.identifying_contact_person || undefined,
				birthday: toLocalDate(row.identifying_birthday),
				birthPlace: row.identifying_birth_place || undefined,
				respondentName: row.identifying_respondent_name || undefined,
			});

			// Part 1: Perpetrator
			setSectionField("PerpetratorInfo", {
				name: row.perpetrator_name || undefined,
				age: row.perpetrator_age || undefined,
				alias: row.perpetrator_alias || undefined,
				sex: row.perpetrator_sex || undefined,
				address: row.perpetrator_address || undefined,
				victimRelation: row.perpetrator_victim_relation || undefined,
				offenceType: row.perpetrator_offence_type || undefined,
				commissionDateTime: toLocalDateTime(
					row.perpetrator_commission_datetime,
				),
			});

			// Part 1: Narratives
			setSectionField("PresentingProblem", {
				presentingProblem: row.presenting_problem || "",
			});
			setSectionField("BackgroundInfo", {
				backgroundInfo: row.background_info || "",
			});
			setSectionField("CommunityInfo", {
				communityInfo: row.community_info || "",
			});
			setSectionField("Assessment", { assessment: row.assessment || "" });
			setSectionField("Recommendation", {
				recommendation: row.recommendation || "",
			});

			// Family members
			if (
				Array.isArray(row.family_members) &&
				row.family_members.length
			) {
				const members = row.family_members.map((fm) => ({
					name: fm.name || "",
					age: fm.age || "",
					relation: fm.relation || "",
					status: fm.status || "",
					education: fm.education || "",
					occupation: fm.occupation || "",
					income: fm.income || "",
				}));
				setSectionField("FamilyData", { members });
			}

			setPrefilled(true);
		} catch (e) {
			console.error("Failed to prefill intake store", e);
			toast.error("Failed to load record for editing");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, row]);

	useEffect(() => {
		if (row) {
			console.log("Record in IntakeSheetEdit:", row);
		}
	}, [row]);

	/**
	 * Picks the first non-empty value from `obj` by key.
	 * @template T
	 * @param {T} obj
	 * @param {...string} keys
	 * @returns {any | null}
	 */
	const pick = (obj, ...keys) => {
		for (const k of keys) {
			const v = obj?.[k];
			if (v !== undefined && v !== null && v !== "") return v;
		}
		return null;
	};

	/**
	 * Normalizes a date-like input to `YYYY-MM-DD`.
	 * @param {any} v
	 * @returns {string | null}
	 */
	const normalizeDate = (v) => {
		if (!v) return null;
		const d = v instanceof Date ? v : new Date(v);
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString().slice(0, 10);
	};

	/**
	 * Queues an update for the current record via the offline service.
	 * @returns {Promise<void>}
	 */
	const handleUpdate = async () => {
		if (!row?.id) return;
		try {
			setSaving(true);
			const all = useIntakeFormStore.getState().getAllData();

			console.log("🔍 Full intake data for update:", all);

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
			const members1 = Array.isArray(familyData?.members)
				? familyData.members
				: [];

			const familyMembers = members1.map((m, idx) => ({
				...m,
				group_no: idx + 1,
			}));

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

			console.log("💾 Final update payload:", casePayload);
			console.log("👨‍👩‍👧‍👦 Family members:", familyMembers);

			await createOrUpdateLocalCase({
				casePayload,
				familyMembers,
				targetId: row.id,
				localId: row.localId,
				mode: "update",
			});

			// Done - close modal and clean up
			resetAll();
			onOpenChange(false);

			// Fire-and-forget parent reload so we can immediately trigger page refresh when needed
			if (onSuccess) {
				try {
					onSuccess();
				} catch (callbackError) {
					console.error(
						"Case update onSuccess callback failed:",
						callbackError,
					);
				}
			}

			const online = isBrowserOnline();
			toast.success(online ? "Case Updated" : "Case Updated Offline", {
				description: online
					? "Case was updated and will sync shortly."
					: "Changes were stored locally and will sync once you're reconnected.",
			});

			if (online) {
				setTimeout(forceCaseTabReload, 0);
			}
		} catch (e) {
			console.error("Failed to update case record:", e);
			toast.error("Update Failed", {
				description:
					e.message ||
					"An error occurred while updating the case. Please try again.",
			});
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Advances to the next tab; on the final tab triggers update.
	 * @returns {void}
	 */
	const goNext = () => {
		setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
		if (currentTabIndex < tabOrder.length - 1) {
			setCurrentTabIndex((prev) => prev + 1);
		} else {
			// last tab → update existing record
			handleUpdate();
		}
	};

	/**
	 * Navigates to the previous tab.
	 * @returns {void}
	 */
	const goBack = () => {
		if (currentTabIndex > 0) {
			setCurrentTabIndex((prev) => prev - 1);
		}
	};

	/**
	 * Resets UI-only tab state when the dialog closes.
	 * @returns {void}
	 */
	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setCompletedTabs(new Set());
		}
	}, [open]);

	/**
	 * Auto-centers the active tab in the horizontal tab scroller.
	 * @returns {void}
	 */
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>
						Edit Case Record{saving ? " — Saving..." : ""}
					</DialogTitle>
				</DialogHeader>

				{!prefilled ? (
					<div className="p-6 text-sm text-muted-foreground">
						Loading record...
					</div>
				) : (
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
										onClick={() =>
											setCurrentTabIndex(index)
										}
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
									submitLabel="Update"
									isEditMode={true}
									onSuccess={onSuccess}
									setOpen={onOpenChange}
									submitDisabled={saving}
									useOfflineSubmit={true}
								/>
							</TabsContent>
						</div>
					</Tabs>
				)}
			</DialogContent>
		</Dialog>
	);
}
