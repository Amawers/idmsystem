"use client";
/**
 * FAC (Family Assistance Card) intake dialog.
 *
 * Responsibilities:
 * - Multi-step (tabbed) intake flow backed by `useIntakeFormStore`.
 * - In edit mode, hydrate the store from the best available source (offline cache preferred).
 * - On submit, build a payload and queue create/update via the FAC offline service.
 * - When online, trigger a one-time reload into the FAC tab to encourage immediate sync.
 *
 * Notes:
 * - `completedTabs` gates forward navigation in create mode.
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
import { LocationForm } from "@/components/intake sheet FAC/LocationForm";
import { HeadOfFamilyForm } from "@/components/intake sheet FAC/HeadOfFamilyForm";
import { FamilyInformationForm } from "@/components/intake sheet FAC/FamilyInformationForm";
import { VulnerableMembersForm } from "@/components/intake sheet FAC/VulnerableMembersForm";
import { FinalDetailsForm } from "@/components/intake sheet FAC/FinalDetailsForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { buildFacCasePayload, mapDbToFormData } from "@/lib/facSubmission";
import {
	createOrUpdateLocalFacCase,
	getFacCaseById,
	getFacCaseByLocalId,
} from "@/services/facOfflineService";
import { toast } from "sonner";

/**
 * @typedef {(
 *   | "location-of-affected-family"
 *   | "head-of-family"
 *   | "family-information"
 *   | "vulnerable-members"
 *   | "final-details"
 * )} FacTabId
 */

const tabOrder = [
	"location-of-affected-family",
	"head-of-family",
	"family-information",
	"vulnerable-members",
	"final-details",
];

/**
 * @typedef {Object} FamilyMemberLike
 * @property {string} [family_member_name]
 * @property {string} [familyMember]
 * @property {string} [relation_to_head]
 * @property {string} [relationToHead]
 * @property {string} [birthdate]
 * @property {string|number} [age]
 * @property {string} [sex]
 * @property {string} [educational_attainment]
 * @property {string} [educationalAttainment]
 * @property {string} [occupation]
 * @property {string} [remarks]
 */

/**
 * Normalizes mixed casing/naming from remote/offline records into the form schema.
 * @param {Array<FamilyMemberLike>} [members]
 * @returns {Array<Record<string, any>>}
 */
const normalizeFamilyMembersForPrefill = (members = []) =>
	members.map((member) => ({
		family_member_name:
			member.family_member_name ?? member.familyMember ?? "",
		relation_to_head:
			member.relation_to_head ?? member.relationToHead ?? "",
		birthdate: member.birthdate ?? "",
		age: member.age ?? "",
		sex: member.sex ?? "",
		educational_attainment:
			member.educational_attainment ?? member.educationalAttainment ?? "",
		occupation: member.occupation ?? "",
		remarks: member.remarks ?? "",
	}));

/**
 * Safe online check for browser-like environments.
 * @returns {boolean} True when the browser reports connectivity, otherwise true by default.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Forces the Case Management view to reopen on the FAC tab.
 *
 * Used after queuing a create/update while online so the FAC list can refresh/sync.
 * @returns {void}
 */
const forceFacTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FAC");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAC");
	sessionStorage.setItem("caseManagement.forceFacSync", "true");
	window.location.reload();
};

/**
 * @typedef {Object} IntakeSheetFacProps
 * @property {boolean} open
 * @property {(open: boolean) => void} setOpen
 * @property {any} [editingRecord]
 * @property {() => void} [onSuccess]
 */

/**
 * @param {IntakeSheetFacProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetFAC({
	open,
	setOpen,
	editingRecord = null,
	onSuccess,
}) {
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	const [completedTabs, setCompletedTabs] = useState(new Set());
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { getAllData, resetAll } = useIntakeFormStore();

	const isEditMode = !!editingRecord;

	/**
	 * Loads existing data when the dialog opens in edit mode.
	 *
	 * Prefers offline cache when `editingRecord.localId` exists; otherwise falls back to a
	 * cached remote record when `editingRecord.id` exists.
	 * @returns {void}
	 */
	useEffect(() => {
		async function loadEditData() {
			if (!open) return;

			if (!editingRecord) {
				console.log("🆕 Opening in CREATE mode - clearing form");
				resetAll();
				return;
			}

			console.log(
				"✏️ Opening in EDIT mode - loading data for:",
				editingRecord.id,
			);
			try {
				let sourceRecord = editingRecord;
				if (!sourceRecord?.family_members?.length) {
					const localFallback =
						sourceRecord?.localId != null
							? await getFacCaseByLocalId(sourceRecord.localId)
							: null;
					if (localFallback) {
						sourceRecord = localFallback;
					} else if (sourceRecord?.id) {
						const remoteCached = await getFacCaseById(
							sourceRecord.id,
						);
						if (remoteCached) {
							sourceRecord = remoteCached;
						}
					}
				}

				if (sourceRecord) {
					const normalizedMembers = normalizeFamilyMembersForPrefill(
						sourceRecord.family_members || [],
					);
					const formData = mapDbToFormData(
						sourceRecord,
						normalizedMembers,
					);
					console.log("📥 Pre-filling form with:", formData);
					useIntakeFormStore.setState({ data: formData });
				}
			} catch (err) {
				console.error("❌ Unexpected error:", err);
				toast.error("Error loading case", {
					description: err.message || "An unexpected error occurred.",
				});
			}
		}

		loadEditData();
	}, [editingRecord, open, resetAll]);

	/**
	 * Queues a FAC create/update via the offline service.
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async () => {
		setIsSubmitting(true);
		const formData = getAllData();

		try {
			const casePayload = buildFacCasePayload(formData);
			const familyMembers = formData.familyInformation?.members || [];
			await createOrUpdateLocalFacCase({
				casePayload,
				familyMembers,
				targetId: editingRecord?.id ?? null,
				localId: editingRecord?.localId ?? null,
				mode: isEditMode ? "update" : "create",
			});

			const online = isBrowserOnline();
			toast.success(isEditMode ? "FAC saved" : "FAC created", {
				description: online
					? "Sync queued and will push shortly."
					: "Stored locally. Sync once you're back online.",
			});

			resetAll();
			setOpen(false);
			if (onSuccess) onSuccess();

			if (online) {
				setTimeout(forceFacTabReload, 0);
			}
		} catch (err) {
			console.error("❌ Unexpected error:", err);
			toast.error(
				isEditMode ? "Failed to update FAC" : "Failed to create FAC",
				{
					description: err.message || "Please try again.",
				},
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	/**
	 * Advances to the next tab; on the final tab triggers submission.
	 * @returns {void}
	 */
	const goNext = () => {
		setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
		if (currentTabIndex < tabOrder.length - 1) {
			setCurrentTabIndex((prev) => prev + 1);
		} else {
			handleSubmit();
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
	 * Resets UI state when the modal closes.
	 * @returns {void}
	 */
	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setCompletedTabs(new Set());
			setIsSubmitting(false);
		}
	}, [open]);

	/**
	 * Auto-centers the active tab in the horizontal tab scroller.
	 * @returns {void}
	 */
	useEffect(() => {
		const container = document.getElementById("fac-tabs-container");
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
					<DialogTitle>Family Assistance Card</DialogTitle>
				</DialogHeader>

				<Tabs
					value={currentTab}
					onValueChange={(tab) =>
						setCurrentTabIndex(tabOrder.indexOf(tab))
					}
					className="w-full flex flex-col gap-4"
				>
					<div
						id="fac-tabs-container"
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
										!isEditMode &&
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
						<TabsContent value="location-of-affected-family">
							<LocationForm
								sectionKey="locationOfAffectedFamily"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="head-of-family">
							<HeadOfFamilyForm
								sectionKey="headOfFamily"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="family-information">
							<FamilyInformationForm
								sectionKey="familyInformation"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="vulnerable-members">
							<VulnerableMembersForm
								sectionKey="vulnerableMembers"
								goNext={goNext}
								goBack={goBack}
							/>
						</TabsContent>

						<TabsContent value="final-details">
							<FinalDetailsForm
								sectionKey="finalDetails"
								goNext={goNext}
								goBack={goBack}
								isSubmitting={isSubmitting}
								isEdit={isEditMode}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
