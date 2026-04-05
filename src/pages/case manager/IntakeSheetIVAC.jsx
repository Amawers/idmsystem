"use client";
/**
 * IVAC intake dialog.
 *
 * Responsibilities:
 * - Hydrate the form store when editing an existing record.
 * - Validate + build a submission payload, then create/update records in Supabase.
 * - Close the dialog and invoke `onSuccess` so the parent can refresh or reload data.
 *
 * Notes:
 * - This component intentionally persists form state in `useIntakeFormStore`.
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
import {
	fetchIVACCase,
	mapDbToFormData,
	submitIVACCase,
	updateIVACCase,
	validateIVACData,
} from "@/lib/ivacSubmission";
import { toast } from "sonner";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

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
 * @property {any} [editingRecord] Record to edit; typically a selected table row.
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
	 * Fetches latest values from Supabase when the record has an id.
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
				if (editingRecord?.id) {
					const { data, error } = await fetchIVACCase(
						editingRecord.id,
					);
					if (error) throw error;
					if (data) sourceRecord = data;
				}

				if (!isActive) return;

				const mapped = mapDbToFormData(sourceRecord);
				setSectionField(
					"incidenceOnVAC",
					mapped?.incidenceOnVAC || {
						province: "Misamis Oriental",
						municipality: "Villanueva",
						records: [],
						caseManagers: [],
						status: "",
						caseDetails: {
							caseManagers: [],
							status: "",
						},
					},
				);
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
	 * Creates/updates an IVAC case directly in Supabase.
	 *
	 * Flow:
	 * - Validate intake store snapshot.
	 * - Submit online via `submitIVACCase`/`updateIVACCase`.
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


			if (isEditMode && editingRecord?.id) {
				const { success, error } = await updateIVACCase(
					editingRecord.id,
					allData,
				);
				if (!success || error) throw error || new Error("Update failed");

				toast.success("Incidence on VAC updated", {
					description: "Changes were saved successfully.",
				});
			} else {
				const { error } = await submitIVACCase(allData);
				if (error) throw error;

				toast.success("Incidence on VAC created", {
					description: "Record saved successfully.",
				});
			}

			resetAll();
			setOpen(false);
			if (onSuccess) {
				onSuccess();
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
