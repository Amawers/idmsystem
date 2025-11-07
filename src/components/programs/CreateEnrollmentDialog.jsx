/**
 * @file CreateEnrollmentDialog.jsx
 * @description Dialog component for creating new program enrollments
 * @module components/programs/CreateEnrollmentDialog
 *
 * Features:
 * - Search and select case from different case types
 * - Select program from available programs
 * - Set enrollment details and expected completion date
 * - Validate enrollment data before submission
 * - Auto-populate case details
 */

import { useState, useEffect } from "react";
import { useEnrollments } from "@/hooks/useEnrollments";
import { usePrograms } from "@/hooks/usePrograms";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import supabase from "@/../config/supabase";

/**
 * Create Enrollment Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Function} props.onSuccess - Success callback
 * @returns {JSX.Element} Create enrollment dialog
 */
export default function CreateEnrollmentDialog({
	open,
	onOpenChange,
	onSuccess,
}) {
	const { createEnrollment } = useEnrollments();
	const { programs } = usePrograms({ status: "active" });

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [searchingCase, setSearchingCase] = useState(false);

	const [formData, setFormData] = useState({
		case_type: "",
		case_id: "",
		case_number: "",
		beneficiary_name: "",
		program_id: "",
		enrollment_date: new Date().toISOString().split("T")[0],
		expected_completion_date: "",
		sessions_total: "",
		case_worker: "",
		notes: "",
	});

	const [cases, setCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);

	// Fetch cases when case type changes
	useEffect(() => {
		if (formData.case_type && open) {
			fetchCasesByType(formData.case_type);
		} else {
			setCases([]);
			setSelectedCase(null);
		}
	}, [formData.case_type, open]);

	/**
	 * Fetch cases by type from appropriate table
	 */
	const fetchCasesByType = async (caseType) => {
		setSearchingCase(true);
		setError(null);

		try {
			let query;
			let tableName;
			let nameField;

			switch (caseType) {
				case "CICL/CAR":
					tableName = "ciclcar_case";
					nameField = "profile_name";
					query = supabase
						.from(tableName)
						.select("id, profile_name, case_manager, status")
						.eq("status", "active")
						.order("created_at", { ascending: false });
					break;
				case "VAC":
					tableName = "case";
					nameField = "identifying_name";
					query = supabase
						.from(tableName)
						.select("id, identifying_name, case_manager, status")
						.order("created_at", { ascending: false });
					break;
				case "FAC":
					tableName = "fac_case";
					query = supabase
						.from(tableName)
						.select(
							"id, head_first_name, head_last_name, case_manager, status"
						)
						.eq("status", "active")
						.order("created_at", { ascending: false });
					break;
				case "FAR":
					tableName = "far_case";
					nameField = "receiving_member";
					query = supabase
						.from(tableName)
						.select(
							"id, receiving_member, case_manager, status, date"
						)
						.order("date", { ascending: false });
					break;
				case "IVAC":
					tableName = "ivac_cases";
					query = supabase
						.from(tableName)
						.select("id, records, status, reporting_period")
						.eq("status", "Active")
						.order("created_at", { ascending: false });
					break;
				default:
					setCases([]);
					return;
			}

			const { data, error } = await query.limit(100);

			if (error) throw error;

			// Format cases for display
			const formattedCases = (data || []).map((caseItem) => {
				let displayName = "";

				if (caseType === "FAC") {
					displayName = `${caseItem.head_first_name} ${caseItem.head_last_name}`;
				} else if (caseType === "IVAC") {
					// For IVAC, show reporting period
					displayName = `IVAC - ${new Date(
						caseItem.reporting_period
					).toLocaleDateString()}`;
				} else {
					displayName = caseItem[nameField] || "Unknown";
				}

				return {
					...caseItem,
					displayName,
					case_manager: caseItem.case_manager || "Unassigned",
				};
			});

			setCases(formattedCases);
		} catch (err) {
			console.error("Error fetching cases:", err);
			setError(`Failed to load ${caseType} cases: ${err.message}`);
		} finally {
			setSearchingCase(false);
		}
	};

	/**
	 * Handle case selection
	 */
	const handleCaseSelect = (caseId) => {
		const selected = cases.find((c) => c.id === caseId);
		if (selected) {
			setSelectedCase(selected);
			setFormData((prev) => ({
				...prev,
				case_id: selected.id,
				case_number: selected.id, // Using ID as case number
				beneficiary_name: selected.displayName,
				case_worker: selected.case_manager || "",
			}));
		}
	};

	/**
	 * Handle form field changes
	 */
	const handleChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	/**
	 * Handle form submission
	 */
	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			// Validation
			if (!formData.case_type) {
				throw new Error("Please select a case type");
			}
			if (!formData.case_id) {
				throw new Error("Please select a case");
			}
			if (!formData.program_id) {
				throw new Error("Please select a program");
			}
			if (!formData.beneficiary_name) {
				throw new Error("Beneficiary name is required");
			}

			// Create enrollment
			await createEnrollment({
				...formData,
				// Ensure empty strings for dates are converted to null to satisfy DB constraints
				expected_completion_date: formData.expected_completion_date || null,
				status: "active",
				progress_percentage: 0,
				sessions_attended: 0,
				sessions_completed: 0,
				attendance_rate: 0,
			});

			// Success
			if (onSuccess) {
				onSuccess();
			}

			// Reset form
			setFormData({
				case_type: "",
				case_id: "",
				case_number: "",
				beneficiary_name: "",
				program_id: "",
				enrollment_date: new Date().toISOString().split("T")[0],
				expected_completion_date: "",
				sessions_total: "",
				case_worker: "",
				notes: "",
			});
			setSelectedCase(null);

			onOpenChange(false);
		} catch (err) {
			console.error("Error creating enrollment:", err);
			setError(err.message || "Failed to create enrollment");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Get available programs filtered by case type
	 */
	const getAvailablePrograms = () => {
		if (!formData.case_type) return [];

		return programs.filter((program) => {
			// Check if program has capacity
			const hasCapacity = program.current_enrollment < program.capacity;

			// Check if program targets this case type
			const targetsType = program.target_beneficiary?.includes(
				formData.case_type
			);

			return hasCapacity && targetsType;
		});
	};

	const availablePrograms = getAvailablePrograms();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Enroll Case in Program</DialogTitle>
					<DialogDescription>
						Select a case and program to create a new enrollment
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Left column */}
						<div className="space-y-3">
							{/* Case Type Selection */}
							<div className="space-y-2">
								<Label htmlFor="case_type">Case Type *</Label>
								<Select
									value={formData.case_type}
									onValueChange={(value) =>
										handleChange("case_type", value)
									}
									required
								>
									<SelectTrigger
										id="case_type"
										className="cursor-pointer"
									>
										<SelectValue placeholder="Select case type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="CICL/CAR">
											CICL/CAR
										</SelectItem>
										<SelectItem value="VAC">VAC</SelectItem>
										<SelectItem value="FAC">FAC</SelectItem>
										<SelectItem value="FAR">FAR</SelectItem>
										<SelectItem value="IVAC">
											IVAC
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Case Selection */}
							{formData.case_type && (
								<div className="space-y-2">
									<Label htmlFor="case_id">
										Select Case *
									</Label>
									{searchingCase ? (
										<div className="flex items-center justify-center p-4">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span className="ml-2">
												Loading cases...
											</span>
										</div>
									) : (
										<Select
											value={formData.case_id}
											onValueChange={handleCaseSelect}
											required
											disabled={cases.length === 0}
										>
											<SelectTrigger id="case_id">
												<SelectValue
													placeholder={
														cases.length === 0
															? "No active cases found"
															: "Select a case"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{cases.map((caseItem) => (
													<SelectItem
														key={caseItem.id}
														value={caseItem.id}
													>
														{caseItem.displayName} -{" "}
														{caseItem.case_manager}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</div>
							)}

							{/* Beneficiary Name */}
							<div className="space-y-2">
								<Label htmlFor="beneficiary_name">
									Beneficiary Name *
								</Label>
								<Input
									id="beneficiary_name"
									value={formData.beneficiary_name}
									onChange={(e) =>
										handleChange(
											"beneficiary_name",
											e.target.value
										)
									}
									placeholder="Enter beneficiary name"
									required
								/>
							</div>

							{/* Case Worker */}
							<div className="space-y-2">
								<Label htmlFor="case_worker">Case Worker</Label>
								<Input
									id="case_worker"
									value={formData.case_worker}
									onChange={(e) =>
										handleChange(
											"case_worker",
											e.target.value
										)
									}
									placeholder="Enter case worker name"
								/>
							</div>
						</div>

						{/* Right column */}
						<div className="space-y-3">
							{/* Program Selection */}
							<div className="space-y-2">
								<Label htmlFor="program_id">Program *</Label>
								<Select
									value={formData.program_id}
									onValueChange={(value) =>
										handleChange("program_id", value)
									}
									required
									disabled={!formData.case_type}
								>
									<SelectTrigger
										id="program_id"
										className="cursor-pointer"
									>
										<SelectValue
											placeholder={
												!formData.case_type
													? "Select case type first"
													: availablePrograms.length ===
													  0
													? "No available programs"
													: "Select a program"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{availablePrograms.map((program) => (
											<SelectItem
												key={program.id}
												value={program.id}
											>
												{program.program_name} (
												{program.current_enrollment}/
												{program.capacity} enrolled)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Date Fields */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="enrollment_date">
										Enrollment Date *
									</Label>
									<Input
										id="enrollment_date"
										type="date"
										value={formData.enrollment_date}
										onChange={(e) =>
											handleChange(
												"enrollment_date",
												e.target.value
											)
										}
										required
										className="cursor-pointer"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="expected_completion_date">
										Expected Completion
									</Label>
									<Input
										id="expected_completion_date"
										type="date"
										value={
											formData.expected_completion_date
										}
										onChange={(e) =>
											handleChange(
												"expected_completion_date",
												e.target.value
											)
										}
										className="cursor-pointer"
									/>
								</div>
							</div>

							{/* Sessions Total */}
							<div className="space-y-2">
								<Label htmlFor="sessions_total">
									Total Sessions
								</Label>
								<Input
									id="sessions_total"
									type="number"
									min="0"
									value={formData.sessions_total}
									onChange={(e) =>
										handleChange(
											"sessions_total",
											e.target.value
										)
									}
									placeholder="Enter total number of sessions"
								/>
							</div>
						</div>

						{/* Notes - full width */}
						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									handleChange("notes", e.target.value)
								}
								placeholder="Additional notes or comments"
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
							className="cursor-pointer"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading}
							className="cursor-pointer"
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Create Enrollment
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
