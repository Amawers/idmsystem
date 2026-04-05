"use client";
/**
 * FAR intake dialog.
 *
 * Responsibilities:
 * - Hydrate the intake store for edit mode from the selected row and latest database data.
 * - Build a submission payload and create/update records directly in Supabase.
 * - Close the dialog and invoke `onSuccess` so the parent can refresh or reload data.
 *
 * Notes:
 * - Form state is persisted in `useIntakeFormStore` under `familyAssistanceRecord`.
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
import { toast } from "sonner";
import supabase from "@/../config/supabase";

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
 * @property {any} [editingRecord] Record to edit; typically a selected table row.
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
	 * Fetches latest remote values when `editingRecord.id` exists; otherwise uses the
	 * provided row snapshot.
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
				if (editingRecord?.id) {
					const { data, error } = await supabase
						.from("far_case")
						.select("*")
						.eq("id", editingRecord.id)
						.single();
					if (error) throw error;
					if (data) sourceRecord = data;
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
	 * Creates or updates a FAR record directly in Supabase.
	 *
	 * Flow:
	 * - Build payload from intake store snapshot.
	 * - Submit with `insert` for create and `update` for edit.
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async () => {
		try {
			setIsSaving(true);
			const allData = getAllData() || {};

			console.log("🔍 Full FAR intake data:", allData);

			const casePayload = buildFARCasePayload(allData);

			if (isEditMode && editingRecord?.id) {
				const { error } = await supabase
					.from("far_case")
					.update(casePayload)
					.eq("id", editingRecord.id);
				if (error) throw error;

				toast.success("Family Assistance Record updated", {
					description:
						"Changes were saved successfully.",
				});
			} else {
				const { error } = await supabase
					.from("far_case")
					.insert([casePayload]);
				if (error) throw error;

				toast.success("Family Assistance Record created", {
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
