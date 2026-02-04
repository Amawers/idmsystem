"use client";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { buildFACasePayload } from "@/lib/faSubmission";
import { createOrUpdateLocalFaCase } from "@/services/faOfflineService";

const initialFormState = {
	interview_date: "",
	date_recorded: "",
	client_name: "",
	address: "",
	purpose: "",
	benificiary_name: "",
	contact_number: "",
	prepared_by: "",
	status_report: "",
	client_category: "",
	gender: "",
	four_ps_member: "",
	transaction: "",
	notes: "",
};

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;
const forceFaTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "FA");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "FA");
	sessionStorage.setItem("caseManagement.forceFaSync", "true");
	window.location.reload();
};

export default function IntakeSheetFA({ open, setOpen, onSuccess }) {
	const [formState, setFormState] = useState(initialFormState);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			setFormState(initialFormState);
			setIsSubmitting(false);
		}
	}, [open]);

	const handleChange = (field) => (event) => {
		setFormState((prev) => ({
			...prev,
			[field]: event.target.value,
		}));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		try {
			const casePayload = buildFACasePayload(formState);
			await createOrUpdateLocalFaCase({
				casePayload,
				mode: "create",
			});

			const online = isBrowserOnline();
			toast.success("Financial Assistance case queued", {
				description: online
					? "Sync queued and will push shortly."
					: "Stored locally. Sync once you're online.",
			});
			setOpen(false);
			onSuccess?.();

			if (online) {
				setTimeout(forceFaTabReload, 0);
			}
		} catch (error) {
			toast.error("Save failed", {
				description: error?.message || "Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-6xl">
				<DialogHeader>
					<DialogTitle>Financial Assistance Intake</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-4 rounded-lg border p-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label>Interview Date</Label>
									<Input
										type="date"
										value={formState.interview_date}
										onChange={handleChange(
											"interview_date",
										)}
									/>
								</div>
								<div className="space-y-1">
									<Label>Date Recorded</Label>
									<Input
										type="date"
										value={formState.date_recorded}
										onChange={handleChange("date_recorded")}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label>Client Name</Label>
								<Input
									value={formState.client_name}
									onChange={handleChange("client_name")}
									placeholder="Client name"
								/>
							</div>
							<div className="space-y-1">
								<Label>Name of Beneficiary</Label>
								<Input
									value={formState.benificiary_name}
									onChange={handleChange("benificiary_name")}
									placeholder="Beneficiary name"
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label>Contact Number</Label>
									<Input
										value={formState.contact_number}
										onChange={handleChange(
											"contact_number",
										)}
										placeholder="Contact number"
									/>
								</div>
								<div className="space-y-1">
									<Label>Prepared By</Label>
									<Input
										value={formState.prepared_by}
										onChange={handleChange("prepared_by")}
										placeholder="Prepared by"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label>Gender</Label>
									<Select
										value={formState.gender}
										onValueChange={(value) =>
											setFormState((prev) => ({
												...prev,
												gender: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select gender" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="female">
												Female
											</SelectItem>
											<SelectItem value="male">
												Male
											</SelectItem>
											<SelectItem value="other">
												Other
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label>4P's Member</Label>
									<Select
										value={formState.four_ps_member}
										onValueChange={(value) =>
											setFormState((prev) => ({
												...prev,
												four_ps_member: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select option" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="yes">
												Yes
											</SelectItem>
											<SelectItem value="no">
												No
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<div className="space-y-4 rounded-lg border p-4">
							<div className="space-y-1">
								<Label>Address</Label>
								<Input
									value={formState.address}
									onChange={handleChange("address")}
									placeholder="Full address"
								/>
							</div>
							<div className="space-y-1">
								<Label>Purpose</Label>
								<Textarea
									value={formState.purpose}
									onChange={handleChange("purpose")}
									placeholder="Purpose of assistance"
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label>Report Status</Label>
									<Select
										value={formState.status_report}
										onValueChange={(value) =>
											setFormState((prev) => ({
												...prev,
												status_report: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="draft">
												Draft
											</SelectItem>
											<SelectItem value="submitted">
												Submitted
											</SelectItem>
											<SelectItem value="approved">
												Approved
											</SelectItem>
											<SelectItem value="rejected">
												Rejected
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label>Client Category</Label>
									<Input
										value={formState.client_category}
										onChange={handleChange(
											"client_category",
										)}
										placeholder="Category"
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label>Transaction</Label>
								<Input
									value={formState.transaction}
									onChange={handleChange("transaction")}
									placeholder="Transaction details"
								/>
							</div>
							<div className="space-y-1">
								<Label>Notes</Label>
								<Textarea
									value={formState.notes}
									onChange={handleChange("notes")}
									placeholder="Additional notes"
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
