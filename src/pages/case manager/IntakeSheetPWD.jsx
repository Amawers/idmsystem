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

const initialFormState = {
	interview_date: "",
	date_recorded: "",
	full_name: "",
	address: "",
	contact_number: "",
	disability_type: "",
	assistive_device: "",
	guardian_name: "",
	guardian_contact: "",
	status: "",
	notes: "",
};

export default function IntakeSheetPWD({ open, setOpen, onSuccess }) {
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
			toast.success("PWD intake saved", {
				description:
					"Template modal saved. Replace with your own logic.",
			});
			setOpen(false);
			onSuccess?.();
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
			<DialogContent className="max-w-6xl">
				<DialogHeader>
					<DialogTitle>Persons with Disabilities Intake</DialogTitle>
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
								<Label>Full Name</Label>
								<Input
									value={formState.full_name}
									onChange={handleChange("full_name")}
									placeholder="Full name"
								/>
							</div>
							<div className="space-y-1">
								<Label>Address</Label>
								<Input
									value={formState.address}
									onChange={handleChange("address")}
									placeholder="Full address"
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
									<Label>Disability Type</Label>
									<Input
										value={formState.disability_type}
										onChange={handleChange(
											"disability_type",
										)}
										placeholder="Type of disability"
									/>
								</div>
							</div>
						</div>

						<div className="space-y-4 rounded-lg border p-4">
							<div className="space-y-1">
								<Label>Assistive Device</Label>
								<Input
									value={formState.assistive_device}
									onChange={handleChange("assistive_device")}
									placeholder="Wheelchair, hearing aid, etc."
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label>Guardian Name</Label>
									<Input
										value={formState.guardian_name}
										onChange={handleChange("guardian_name")}
										placeholder="Guardian name"
									/>
								</div>
								<div className="space-y-1">
									<Label>Guardian Contact</Label>
									<Input
										value={formState.guardian_contact}
										onChange={handleChange(
											"guardian_contact",
										)}
										placeholder="Guardian contact"
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label>Status</Label>
								<Select
									value={formState.status}
									onValueChange={(value) =>
										setFormState((prev) => ({
											...prev,
											status: value,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">
											Pending
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
