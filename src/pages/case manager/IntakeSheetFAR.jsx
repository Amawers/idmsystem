"use client";
/**
 * FAR intake dialog.
 *
 * Responsibilities:
	* - Hydrate the intake store for edit mode.
	* - Build a submission payload and save create/update directly via Supabase.
 *
 * Notes:
 * - Form state is persisted in `useIntakeFormStore` under `familyAssistanceRecord`.
 * - Single-step flow submits through `goNext`.
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
import { submitFARCase, updateFARCase } from "@/lib/farSubmission";
import { toast } from "sonner";

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
	 * @returns {void}
	 */
	useEffect(() => {
		function hydrateForm() {
			if (!open) return;

			if (!editingRecord) {
				resetAll();
				return;
			}

			console.log("🔄 Pre-filling FAR form with:", editingRecord);
			try {
				const sourceRecord = editingRecord;

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
				console.error("❌ Failed to load FAR case:", err);
				toast.error("Error loading Family Assistance Record", {
					description: err.message || "An unexpected error occurred.",
				});
			}
		}

		hydrateForm();
	}, [open, editingRecord, resetAll, setSectionField]);

	/**
	 * Saves a FAR create/update directly to Supabase.
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async () => {
		try {
			setIsSaving(true);
			const allData = getAllData() || {};

			console.log("🔍 Full FAR intake data:", allData);

			if (isEditMode && editingRecord?.id) {
				const { success, error } = await updateFARCase(
					editingRecord.id,
					allData,
				);
				if (!success) throw error ?? new Error("Failed to update FAR case");
			} else {
				const { error } = await submitFARCase(allData);
				if (error) throw error;
			}

			toast.success(
				isEditMode
					? "Family Assistance Record saved"
					: "Family Assistance Record created",
				{
					description: "Changes were saved successfully.",
				},
			);

			resetAll();
			setOpen(false);
			if (onSuccess) {
				onSuccess();
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
