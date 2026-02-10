"use client";
/**
 * FAR intake dialog.
 *
 * Responsibilities:
 * - Hydrate the intake store for edit mode (prefer offline cache when available).
 * - Build a submission payload and queue create/update via the FAR offline service.
 * - When online, trigger a one-time reload into the FAR tab to encourage immediate sync.
 *
 * Notes:
 * - Form state is persisted in `useIntakeFormStore` under `familyAssistanceRecord`.
 * - Tab forcing is coordinated via `sessionStorage` keys consumed by the case management page.
 */
import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FamilyAssistanceForm } from "@/components/intake sheet FAR/FamilyAssistanceForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { buildFARCasePayload } from "@/lib/farSubmission";
import {
	createOrUpdateLocalFarCase,
	getFarCaseById,
	getFarCaseByLocalId,
} from "@/services/farOfflineService";
import { toast } from "sonner";

/**
 * Safe online check for browser-like environments.
 * @returns {boolean} True when the browser reports connectivity, otherwise true by default.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Forces the Case Management view to reopen on the FAR tab.
 *
 * Used after queuing a create/update while online so the FAR list can refresh/sync.
 * @returns {void}
 */
const forceFarTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FAR");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAR");
	sessionStorage.setItem("caseManagement.forceFarSync", "true");
	window.location.reload();
};

/**
 * @typedef {Object} FarCaseDetails
 * @property {string} [caseManager]
 * @property {string} [status]
 * @property {string} [priority]
 */

/**
 * @typedef {Object} FamilyAssistanceRecordSection
 * @property {string} [date]
 * @property {string} [receivingMember]
 * @property {string} [emergency]
 * @property {string} [emergencyOther]
 * @property {string} [assistance]
 * @property {string} [assistanceOther]
 * @property {string} [unit]
 * @property {string} [quantity]
 * @property {string} [cost]
 * @property {string} [provider]
 * @property {string} [caseManager]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {FarCaseDetails} [caseDetails]
 */

/**
 * @typedef {Object} IntakeSheetFarProps
 * @property {boolean} open
 * @property {(open: boolean) => void} setOpen
 * @property {() => void} [onSuccess]
 * @property {any} [editingRecord] Record to edit; may be a remote row or offline cached row.
 */

/**
 * @param {IntakeSheetFarProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetFAR({
	open,
	setOpen,
	onSuccess,
	editingRecord,
}) {
	const { getAllData, resetAll, setSectionField } = useIntakeFormStore();
	const [isSaving, setIsSaving] = useState(false);
	const isEditMode = !!editingRecord;

	/**
	 * Hydrates `useIntakeFormStore` for edit mode.
	 *
	 * Prefers offline cache when `editingRecord.localId` is available; otherwise uses cached
	 * remote record when `editingRecord.id` exists.
	 * @returns {void}
	 */
	useEffect(() => {
		let isActive = true;
		async function hydrateForm() {
			if (!open) return;

			if (!editingRecord) {
				resetAll();
				return;
			}

			console.log("🔄 Pre-filling FAR form with:", editingRecord);
			try {
				let sourceRecord = editingRecord;
				if (editingRecord?.localId != null) {
					const local = await getFarCaseByLocalId(
						editingRecord.localId,
					);
					if (local) sourceRecord = local;
				} else if (editingRecord?.id) {
					const cached = await getFarCaseById(editingRecord.id);
					if (cached) sourceRecord = cached;
				}

				if (!isActive) return;

				/** @type {FamilyAssistanceRecordSection} */
				const formData = {
					date: sourceRecord?.date || "",
					receivingMember: sourceRecord?.receiving_member || "",
					emergency: sourceRecord?.emergency || "",
					emergencyOther: sourceRecord?.emergency_other || "",
					assistance: sourceRecord?.assistance || "",
					assistanceOther: sourceRecord?.assistance_other || "",
					unit: sourceRecord?.unit || "",
					quantity: sourceRecord?.quantity?.toString() || "",
					cost: sourceRecord?.cost?.toString() || "",
					provider: sourceRecord?.provider || "",
					caseManager: sourceRecord?.case_manager || "",
					status: sourceRecord?.status || "",
					priority: sourceRecord?.priority || "",
					caseDetails: {
						caseManager: sourceRecord?.case_manager || "",
						status: sourceRecord?.status || "",
						priority: sourceRecord?.priority || "",
					},
				};

				setSectionField("familyAssistanceRecord", formData);
			} catch (err) {
				if (!isActive) return;
				console.error("❌ Failed to load FAR case:", err);
				toast.error("Error loading Family Assistance Record", {
					description: err.message || "An unexpected error occurred.",
				});
			}
		}

		hydrateForm();
		return () => {
			isActive = false;
		};
	}, [open, editingRecord, resetAll, setSectionField]);

	/**
	 * Queues a FAR create/update.
	 *
	 * Flow:
	 * - Build payload from intake store snapshot.
	 * - Write to offline queue (and local cache) via `createOrUpdateLocalFarCase`.
	 * - When online, force a one-time reload into the FAR tab to pick up sync.
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async () => {
		try {
			setIsSaving(true);
			const allData = getAllData() || {};

			console.log("🔍 Full FAR intake data:", allData);

			const casePayload = buildFARCasePayload(allData);
			await createOrUpdateLocalFarCase({
				casePayload,
				targetId: editingRecord?.id ?? null,
				localId: editingRecord?.localId ?? null,
				mode: isEditMode ? "update" : "create",
			});

			const online = isBrowserOnline();
			toast.success(
				isEditMode
					? "Family Assistance Record saved"
					: "Family Assistance Record queued",
				{
					description: online
						? "Sync queued and will push shortly."
						: "Stored locally. Sync once you're online.",
				},
			);

			resetAll();
			setOpen(false);
			if (onSuccess) {
				onSuccess();
			}

			if (online) {
				setTimeout(forceFarTabReload, 0);
			}
		} catch (err) {
			console.error("❌ Unexpected error:", err);
			toast.error(
				`Failed to ${isEditMode ? "update" : "create"} Family Assistance Record`,
				{
					description:
						"An unexpected error occurred. Please try again.",
				},
			);
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * Single-step form: Next submits.
	 * @returns {Promise<void>}
	 */
	const goNext = async () => {
		await handleSubmit();
	};

	/**
	 * Closes the dialog and clears the intake store.
	 * @returns {void}
	 */
	const goBack = () => {
		resetAll();
		setOpen(false);
	};

	/**
	 * Ensures a fresh store when opening in create mode.
	 * @returns {void}
	 */
	useEffect(() => {
		if (open && !editingRecord) {
			resetAll();
		}
	}, [open, editingRecord, resetAll]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? "Edit Family Assistance Record"
							: "Family Assistance Record"}
					</DialogTitle>
				</DialogHeader>
				<div className="overflow-auto p-4">
					<FamilyAssistanceForm
						sectionKey="familyAssistanceRecord"
						goNext={goNext}
						goBack={goBack}
						isSaving={isSaving}
						isEditMode={isEditMode}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
