"use client";
/**
 * IVAC intake dialog.
 *
 * Responsibilities:
 * - Hydrate the form store when editing an existing record (prefers offline cache when present).
 * - Validate + build a submission payload, then queue the create/update via the offline service.
 * - When online, trigger a one-time reload into the IVAC tab to encourage immediate sync.
 *
 * Notes:
 * - This component intentionally persists form state in `useIntakeFormStore`.
 * - Tab forcing is coordinated via `sessionStorage` keys consumed by the case management page.
 */
import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { IncidenceVACForm } from "@/components/intake sheet IVAC/IncidenceVACForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { buildIVACCasePayload, validateIVACData } from "@/lib/ivacSubmission";
import {
	createOrUpdateLocalIvacCase,
	getIvacCaseById,
	getIvacCaseByLocalId,
} from "@/services/ivacOfflineService";
import { toast } from "sonner";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

/**
 * Safe online check for browser-like environments.
 * @returns {boolean} True when the browser reports connectivity, otherwise true by default.
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Forces the Case Management view to reopen on the IVAC tab.
 *
 * Used after queuing a create/update while online so the IVAC list can refresh/sync.
 * @returns {void}
 */
const forceIvacTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "IVAC");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "IVAC");
	sessionStorage.setItem("caseManagement.forceIvacSync", "true");
	window.location.reload();
};

/**
 * @typedef {Object} IvacCaseDetails
 * @property {Array<any>} [caseManagers]
 * @property {string} [status]
 */

/**
 * @typedef {Object} IncidenceOnVacSection
 * @property {string} [province]
 * @property {string} [municipality]
 * @property {Array<any>} [records]
 * @property {Array<any>} [caseManagers]
 * @property {string} [status]
 * @property {IvacCaseDetails} [caseDetails]
 */

/**
 * @typedef {Object} IntakeSheetIvacProps
 * @property {boolean} open
 * @property {(open: boolean) => void} setOpen
 * @property {() => void} [onSuccess]
 * @property {any} [editingRecord] Record to edit; may be a remote row or offline cached row.
 */

/**
 * @param {IntakeSheetIvacProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetIVAC({
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

			console.log("🔄 Pre-filling IVAC form with:", editingRecord);
			try {
				let sourceRecord = editingRecord;
				if (editingRecord?.localId != null) {
					const local = await getIvacCaseByLocalId(
						editingRecord.localId,
					);
					if (local) sourceRecord = local;
				} else if (editingRecord?.id) {
					const cached = await getIvacCaseById(editingRecord.id);
					if (cached) sourceRecord = cached;
				}

				if (!isActive) return;

				/** @type {IncidenceOnVacSection} */
				const formData = {
					province: sourceRecord?.province || "Misamis Oriental",
					municipality: sourceRecord?.municipality || "Villanueva",
					records: sourceRecord?.records || [],
					caseManagers: sourceRecord?.case_managers || [],
					status: sourceRecord?.status || "",
					caseDetails: {
						caseManagers: sourceRecord?.case_managers || [],
						status: sourceRecord?.status || "",
					},
				};

				setSectionField("incidenceOnVAC", formData);
			} catch (err) {
				if (!isActive) return;
				console.error("❌ Failed to load IVAC case:", err);
				toast.error("Error loading Incidence on VAC record", {
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
	 * Queues an IVAC case create/update.
	 *
	 * Flow:
	 * - Validate intake store snapshot.
	 * - Build payload.
	 * - Write to offline queue (and local cache) via `createOrUpdateLocalIvacCase`.
	 * - When online, force a one-time reload into the IVAC tab to pick up sync.
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async () => {
		try {
			setIsSaving(true);
			const allData = getAllData() || {};

			console.log("🔍 Full IVAC intake data:", allData);

			const validation = validateIVACData(allData);
			if (!validation.valid) {
				toast.error("IVAC form incomplete", {
					description: validation.errors.join(", "),
				});
				return;
			}

			const casePayload = buildIVACCasePayload(allData);
			await createOrUpdateLocalIvacCase({
				casePayload,
				targetId: editingRecord?.id ?? null,
				localId: editingRecord?.localId ?? null,
				mode: isEditMode ? "update" : "create",
			});

			const online = isBrowserOnline();
			toast.success(
				isEditMode
					? "Incidence on VAC saved"
					: "Incidence on VAC queued",
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
				setTimeout(forceIvacTabReload, 0);
			}
		} catch (err) {
			console.error("❌ Unexpected error:", err);
			toast.error(
				`Failed to ${isEditMode ? "update" : "create"} Incidence on VAC record`,
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
			<DialogContent className="max-h-[90vh] min-w-[90vw] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						<span>
							{isEditMode
								? "Edit Incidence on VAC"
								: "Incidence on Violence Against Children"}
						</span>
						{isEditMode &&
							editingRecord?.status &&
							(editingRecord.status === "Inactive" ? (
								<Badge
									variant="outline"
									className="flex items-center gap-1.5 px-3 py-1 border-2 border-red-600 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500"
								>
									<IconAlertCircle className="h-4 w-4" />
									<span className="text-xs font-medium">
										Inactive Record
									</span>
								</Badge>
							) : editingRecord.status === "Active" ? (
								<Badge
									variant="outline"
									className="flex items-center gap-1.5 px-3 py-1 border-2 border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-500"
								>
									<IconCircleCheck className="h-4 w-4" />
									<span className="text-xs font-medium">
										Active Record
									</span>
								</Badge>
							) : null)}
					</DialogTitle>
				</DialogHeader>
				<div className="overflow-auto p-4">
					<IncidenceVACForm
						sectionKey="incidenceOnVAC"
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
