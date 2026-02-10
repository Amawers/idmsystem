"use client";
/**
 * CICL/CAR create dialog.
 *
 * Responsibilities:
 * - Multi-step (tabbed) intake flow backed by `useIntakeFormStore`.
 * - Build a case payload using defensive field mapping to support legacy keys.
 * - Queue case creation via the offline service; when online, force a one-time tab reload to
 *   encourage immediate sync.
 *
 * Notes:
 * - Case manager options are read from `useCaseManagerStore` and initialized on mount.
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
import { ProfileCICLCARForm } from "@/components/intake sheet CICLCAR/ProfileCICLCARForm";
import { FamilyBackgroundForm } from "@/components/intake sheet CICLCAR/FamilyBackgroundForm";
import { ViolationCICLCARForm } from "@/components/intake sheet CICLCAR/ViolationCICLCARForm";
import { RecordDetailsForm } from "@/components/intake sheet CICLCAR/RecordDetails";
import { ComplainantForm } from "@/components/intake sheet CICLCAR/ComplainantForm";
import { RemarksForm } from "@/components/intake sheet CICLCAR/RemarksForm";
import { ReferralForm } from "@/components/intake sheet CICLCAR/ReferralForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { useCaseManagerStore } from "@/store/useCaseManagerStore";
import { toast } from "sonner";
import { createOrUpdateLocalCase } from "@/services/ciclcarOfflineService";

/**
 * Safe online check for browser-like environments.
 * @returns {boolean} True when the browser reports connectivity, otherwise true by default.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Forces the Case Management view to reopen on the CICLCAR tab.
 *
 * Used after queuing a create while online so the list can refresh/sync.
 * @returns {void}
 */
const forceCiclcarTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "CICLCAR");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "CICLCAR");
	sessionStorage.setItem("caseManagement.forceCiclcarSync", "true");
	window.location.reload();
};

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
	// accept Date, ISO, or YYYY-MM-DD; return YYYY-MM-DD for DATE columns
	const d = v instanceof Date ? v : new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	// toISOString gives UTC date; slice to YYYY-MM-DD
	return d.toISOString().slice(0, 10);
};

/**
 * Computes age in years from a date string.
 * @param {string} dateStr
 * @returns {number | null}
 */
const computeAge = (dateStr) => {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return null;
	const today = new Date();
	let age = today.getFullYear() - d.getFullYear();
	const m = today.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
	return age;
};

/**
 * @typedef {(
 * 	| "Profile-of-CICL/CAR"
 * 	| "Family-Background"
 * 	| "Violation-Offense-of-CICL/CAR"
 * 	| "Record-Details"
 * 	| "Complainant"
 * 	| "Remarks"
 * 	| "Referral"
 * )} CiclcarTabId
 */

const tabOrder = [
	"Profile-of-CICL/CAR",
	"Family-Background",
	"Violation-Offense-of-CICL/CAR",
	"Record-Details",
	"Complainant",
	"Remarks",
	"Referral",
];

/**
 * @typedef {Object} IntakeSheetCiclcarCreateProps
 * @property {boolean} open
 * @property {(open: boolean) => void} setOpen
 * @property {() => void} [onSuccess]
 */

/**
 * @param {IntakeSheetCiclcarCreateProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetCICLCARCreate({ open, setOpen, onSuccess }) {
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	const [completedTabs, setCompletedTabs] = useState(new Set());
	const { getAllData, resetAll } = useIntakeFormStore();
	const [isSaving, setIsSaving] = useState(false);

	// Use cached case managers from store
	const caseManagers = useCaseManagerStore((state) => state.caseManagers);
	const loadingCaseManagers = useCaseManagerStore((state) => state.loading);
	const initCaseManagers = useCaseManagerStore((state) => state.init);

	/**
	 * Initializes case manager options used by the Referral step.
	 * @returns {void}
	 */
	useEffect(() => {
		initCaseManagers();
	}, [initCaseManagers]);

	/**
	 * Queues creation of the CICL/CAR case and related family background rows.
	 *
	 * Uses defensive mapping to support older section keys (`referal`) and mixed field naming.
	 * @returns {Promise<void>}
	 */
	const handleCreate = async () => {
		try {
			setIsSaving(true);
			const all = getAllData() || {};

			console.log("🔍 Full intake data:", all);

			const profile = all.profileOfCICLCar || {};
			const violation = all.violationOfCICLCar || {};
			const complainant = all.complainant || {};
			const remarks = all.remarks || {};
			const referral = all.referral || all.referal || {}; // support old key
			const recordDetails = all.recordDetails || {};

			console.log("📝 Profile data:", profile);
			console.log("⚖️ Violation data:", violation);
			console.log("👥 Complainant data:", complainant);
			console.log("📍 Referral data:", referral);

			// Normalize family background rows
			const familyRows = Array.isArray(all.familyBackground)
				? all.familyBackground
				: Array.isArray(all.familyBackground?.members)
					? all.familyBackground.members
					: [];

			// Extract case details from the referral section (where they're actually stored)
			const caseDetails = referral?.caseDetails || {};

			// Base case payload
			const casePayload = {
				case_manager:
					pick(caseDetails, "caseManager", "case_manager") ?? null,
				status: pick(caseDetails, "status", "caseStatus") ?? null,
				priority:
					pick(
						caseDetails,
						"priority",
						"casePriority",
						"case_priority",
					) ?? null,

				profile_name: pick(profile, "name", "fullName") ?? null,
				profile_alias: pick(profile, "alias") ?? null,
				profile_sex: pick(profile, "sex") ?? null,
				profile_gender: pick(profile, "gender") ?? null,
				profile_birth_date: normalizeDate(
					pick(
						profile,
						"birthday",
						"birthDate",
						"birth_date",
						"dob",
						"dateOfBirth",
					),
				),
				profile_age:
					pick(profile, "age") ??
					computeAge(
						normalizeDate(
							pick(
								profile,
								"birthday",
								"birthDate",
								"birth_date",
								"dob",
								"dateOfBirth",
							),
						),
					),
				profile_status:
					pick(profile, "civilStatus", "status", "civil_status") ??
					null,
				profile_religion: pick(profile, "religion") ?? null,
				profile_address: pick(profile, "address") ?? null,
				profile_client_category:
					pick(profile, "clientCategory", "client_category") ?? null,
				profile_ip_group: pick(profile, "ipGroup", "ip_group") ?? null,
				profile_nationality: pick(profile, "nationality") ?? null,
				profile_disability: pick(profile, "disability") ?? null,
				profile_contact_number:
					pick(profile, "contactNumber", "contact_number") ?? null,
				profile_educational_attainment:
					pick(
						profile,
						"educationalAttainment",
						"educational_attainment",
					) ?? null,
				profile_educational_status:
					pick(profile, "educationalStatus", "educational_status") ??
					null,

				violation: pick(violation, "violation") ?? null,
				violation_date_time_committed: normalizeDate(
					pick(violation, "dateTimeCommitted", "date_time_committed"),
				),
				specific_violation:
					pick(
						violation,
						"specificViolation",
						"specific_violation",
					) ?? null,
				violation_place_committed:
					pick(violation, "placeCommitted", "place_committed") ??
					null,
				violation_status: pick(violation, "status") ?? null,
				violation_admission_date: normalizeDate(
					pick(violation, "admissionDate", "admission_date"),
				),
				repeat_offender:
					pick(violation, "repeatOffender", "repeat_offender") ??
					null,
				violation_previous_offense:
					pick(
						violation,
						"previousOffense",
						"previouseOffense",
						"prevOffense",
						"previous_offense",
					) ?? null,

				record_details:
					recordDetails?.details ??
					recordDetails?.recordDetails ??
					null,

				complainant_name: pick(complainant, "name") ?? null,
				complainant_alias: pick(complainant, "alias") ?? null,
				complainant_victim: pick(complainant, "victim") ?? null,
				complainant_relationship:
					pick(complainant, "relationship") ?? null,
				complainant_contact_number:
					pick(complainant, "contactNumber", "contact_number") ??
					null,
				complainant_sex: pick(complainant, "sex") ?? null,
				complainant_birth_date: normalizeDate(
					pick(
						complainant,
						"birthday",
						"birthDate",
						"birth_date",
						"dob",
						"dateOfBirth",
					),
				),
				complainant_address: pick(complainant, "address") ?? null,

				remarks: pick(remarks, "remarks", "notes") ?? null,

				referral_region: pick(referral, "region") ?? null,
				referral_province: pick(referral, "province") ?? null,
				referral_city: pick(referral, "city") ?? null,
				referral_barangay: pick(referral, "barangay") ?? null,
				referral_referred_to:
					pick(referral, "referredTo", "referred_to") ?? null,
				referral_date_referred: normalizeDate(
					pick(referral, "dateReferred", "date_referred"),
				),
				referral_reason:
					pick(
						referral,
						"referralReason",
						"reason",
						"referral_reason",
					) ?? null,
			};

			console.log("💾 Final case payload:", casePayload);

			await createOrUpdateLocalCase({
				casePayload,
				familyMembers: familyRows,
				mode: "create",
			});

			// Done - close modal and clean up
			resetAll();
			setOpen(false);

			const online = isBrowserOnline();
			toast.success(online ? "Case Saved" : "Case Saved Offline", {
				description: online
					? "CICL/CAR case was stored and will sync shortly."
					: "Changes were stored locally and will sync once you're reconnected.",
			});

			// Fire-and-forget parent refresh so we can move straight to reload when needed
			if (onSuccess) {
				try {
					onSuccess();
				} catch (callbackError) {
					console.error(
						"CICL/CAR create onSuccess callback failed:",
						callbackError,
					);
				}
			}

			if (online) {
				setTimeout(forceCiclcarTabReload, 0);
			}
		} catch (err) {
			console.error("Failed to create CICL/CAR record:", err);

			// Show error toast
			toast.error("Creation Failed", {
				description:
					err.message ||
					"An error occurred while creating the case. Please try again.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * Advances to the next tab; on the last tab, creates the record.
	 * @returns {Promise<void>}
	 */
	const goNext = async () => {
		setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
		if (currentTabIndex < tabOrder.length - 1) {
			setCurrentTabIndex((prev) => prev + 1);
		} else {
			await handleCreate();
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
	 * Auto-centers the active tab in the horizontal tab scroller.
	 * @returns {void}
	 */
	useEffect(() => {
		const container = document.getElementById("tabs-container");
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

	/**
	 * Resets UI state when the dialog closes.
	 * @returns {void}
	 */
	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setCompletedTabs(new Set());
		}
	}, [open]);

	/**
	 * Clears the intake store when opening to ensure a fresh create flow.
	 * @returns {void}
	 */
	useEffect(() => {
		if (open) {
			resetAll();
		}
	}, [open, resetAll]);

	const currentTab = tabOrder[currentTabIndex];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Create CICL/CAR Record</DialogTitle>
				</DialogHeader>

				<Tabs
					value={currentTab}
					onValueChange={(tab) =>
						setCurrentTabIndex(tabOrder.indexOf(tab))
					}
					className="w-full flex flex-col gap-4"
				>
					<div
						id="tabs-container"
						className="w-full overflow-x-auto scrollbar-hide scrollbar-thin"
					>
						<TabsList className="flex w-max gap-2 px-2">
							{tabOrder.map((tab, index) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className="flex items-center whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
									onClick={() => setCurrentTabIndex(index)}
									disabled={
										index > currentTabIndex &&
										!completedTabs.has(index)
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
									{tab.replace(/-/g, " ").replace("2", "")}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					<TabsContent value="Profile-of-CICL/CAR">
						<ProfileCICLCARForm
							sectionKey="profileOfCICLCar"
							goNext={goNext}
							goBack={goBack}
							isFirstStep={true}
						/>
					</TabsContent>

					<TabsContent value="Family-Background">
						<FamilyBackgroundForm
							sectionKey="familyBackground"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Violation-Offense-of-CICL/CAR">
						<ViolationCICLCARForm
							sectionKey="violationOfCICLCar"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Record-Details">
						<RecordDetailsForm
							sectionKey="recordDetails"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Complainant">
						<ComplainantForm
							sectionKey="complainant"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Remarks">
						<RemarksForm
							sectionKey="remarks"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Referral">
						<ReferralForm
							// filepath: support correct section key; legacy 'referal' still read in handleCreate
							sectionKey="referral"
							goNext={goNext}
							goBack={goBack}
							isSaving={isSaving}
							isEditing={false}
							caseManagers={caseManagers}
							loadingCaseManagers={loadingCaseManagers}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
