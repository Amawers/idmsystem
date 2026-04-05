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

import { useMemo, useState, useEffect, useCallback } from "react";
import { useEnrollments } from "@/hooks/useEnrollments";
import supabase from "@/../config/supabase";
import {
	PROGRAM_CASE_TYPE_OPTIONS,
	getProgramCaseTypeCandidates,
} from "@/lib/programCaseTypes";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";

const asString = (value) =>
	typeof value === "string" ? value.trim() : "";

const joinNameParts = (...parts) =>
	parts
		.map((part) => asString(part))
		.filter(Boolean)
		.join(" ")
		.trim();

const extractCaseManager = (caseItem) => {
	if (asString(caseItem.case_manager)) {
		return asString(caseItem.case_manager);
	}

	if (!Array.isArray(caseItem.case_managers)) {
		return "Unassigned";
	}

	const managers = caseItem.case_managers
		.map((entry) => {
			if (typeof entry === "string") return asString(entry);
			if (!entry || typeof entry !== "object") return "";
			return (
				asString(entry.name) ||
				asString(entry.case_manager) ||
				asString(entry.full_name)
			);
		})
		.filter(Boolean);

	return managers.length ? managers.join(", ") : "Unassigned";
};

const formatCasesForDisplay = (data, caseType) => {
	return (data || []).map((caseItem) => {
		let displayName = "";

		if (caseType === "CICL/CAR") {
			displayName = caseItem.profile_name || "Unknown";
		} else if (caseType === "CASE") {
			displayName = caseItem.identifying_name || "Unknown";
		} else if (caseType === "FAC") {
			displayName =
				`${caseItem.head_first_name || ""} ${caseItem.head_last_name || ""}`.trim() ||
				"Unknown";
		} else if (caseType === "FAR") {
			displayName = caseItem.receiving_member || "Unknown";
		} else if (caseType === "IVAC") {
			displayName = `IVAC - ${caseItem.reporting_period ? new Date(caseItem.reporting_period).toLocaleDateString() : "Unknown"}`;
		} else if (caseType === "SP") {
			displayName =
				caseItem.full_name ||
				joinNameParts(caseItem.first_name, caseItem.last_name) ||
				"Unknown";
		} else if (caseType === "FA") {
			displayName =
				caseItem.client_name ||
				caseItem.benificiary_name ||
				"Unknown";
		} else if (caseType === "PWD") {
			displayName =
				joinNameParts(
					caseItem.first_name,
					caseItem.middle_name,
					caseItem.last_name,
				) || "Unknown";
		} else if (caseType === "SC") {
			displayName = caseItem.senior_name || "Unknown";
		}

		return {
			...caseItem,
			displayName,
			case_manager: extractCaseManager(caseItem),
		};
	});
};

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

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [searchingCase, setSearchingCase] = useState(false);
	const [programs, setPrograms] = useState([]);
	const [caseSearch, setCaseSearch] = useState("");
	const [selectedCaseIds, setSelectedCaseIds] = useState([]);

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
	const visibleCases = useMemo(() => {
		const term = caseSearch.trim().toLowerCase();
		if (!term) return cases;
		return cases.filter((c) => {
			const name = (c.displayName || "").toLowerCase();
			const manager = (c.case_manager || "").toLowerCase();
			return name.includes(term) || manager.includes(term);
		});
	}, [cases, caseSearch]);

	/**
	 * Load active programs from Supabase.
	 */
	const loadPrograms = useCallback(async () => {
		try {
			const { data, error: programsError } = await supabase
				.from("programs")
				.select(
					"id, program_name, status, target_beneficiary, current_enrollment, capacity",
				)
				.eq("status", "active")
				.order("created_at", { ascending: false });

			if (programsError) throw programsError;
			setPrograms(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("[Dialog] Error loading programs:", err);
			setPrograms([]);
			setError("Failed to load active programs. Please try again.");
		}
	}, []);

	/**
	 * Fetch cases directly from Supabase by case type.
	 */
	const fetchCasesByType = useCallback(async (caseType) => {
		let query;

		switch (caseType) {
			case "CICL/CAR":
				query = supabase
					.from("ciclcar_case")
					.select("id, profile_name, case_manager, status")
					.in("status", ["Filed", "Assessed", "In Process", "Resolved"])
					.order("created_at", { ascending: false })
					.limit(100);
				break;
			case "CASE":
			case "VAC":
				query = supabase
					.from("case")
					.select("id, identifying_name, case_manager, status")
					.order("created_at", { ascending: false })
					.limit(100);
				break;
			case "FAC":
				query = supabase
					.from("fac_case")
					.select("id, head_first_name, head_last_name, case_manager, status")
					.eq("status", "active")
					.order("created_at", { ascending: false })
					.limit(100);
				break;
			case "FAR":
				query = supabase
					.from("far_case")
					.select("id, receiving_member, case_manager, status, date")
					.order("date", { ascending: false })
					.limit(100);
				break;
			case "IVAC":
				query = supabase
					.from("ivac_cases")
					.select("id, records, status, reporting_period")
					.eq("status", "Active")
					.order("created_at", { ascending: false })
					.limit(100);
				break;
			case "SP":
				query = supabase
					.from("sp_case")
					.select("id, full_name, first_name, last_name, case_manager, status")
					.eq("status", "active")
					.order("updated_at", { ascending: false })
					.limit(100);
				break;
			case "FA":
				query = supabase
					.from("fa_case")
					.select("id, client_name, benificiary_name, case_manager, status")
					.eq("status", "active")
					.order("updated_at", { ascending: false })
					.limit(100);
				break;
			case "PWD":
				query = supabase
					.from("pwd_case")
					.select("id, first_name, middle_name, last_name, case_manager, status")
					.eq("status", "active")
					.order("updated_at", { ascending: false })
					.limit(100);
				break;
			case "SC":
				query = supabase
					.from("sc_case")
					.select("id, senior_name, case_manager, status")
					.eq("status", "active")
					.order("updated_at", { ascending: false })
					.limit(100);
				break;
			default:
				return [];
		}

		const { data, error: caseError } = await query;
		if (caseError) throw caseError;
		return Array.isArray(data) ? data : [];
	}, []);

	/**
	 * Load cases for a case type from Supabase.
	 */
	const loadCasesByType = useCallback(async (caseType) => {
		setSearchingCase(true);
		setError(null);

		try {
			const caseRows = await fetchCasesByType(caseType);
			
			if (caseRows.length > 0) {
				const formatted = formatCasesForDisplay(caseRows, caseType);
				setCases(formatted);
			} else {
				setError(`No ${caseType} cases found.`);
			}
		} catch (err) {
			console.error("[Dialog] Error loading cases:", err);
			setError(`Failed to load ${caseType} cases: ${err.message}`);
		} finally {
			setSearchingCase(false);
		}
	}, [fetchCasesByType]);

	// Load active programs when dialog opens.
	useEffect(() => {
		if (open) {
			loadPrograms();
		}
	}, [open, loadPrograms]);

	// Load cases for the selected case type.
	useEffect(() => {
		if (formData.case_type && open) {
			loadCasesByType(formData.case_type);
		} else {
			setCases([]);
			setSelectedCaseIds([]);
			setCaseSearch("");
			setFormData((prev) => ({
				...prev,
				case_id: "",
				case_number: "",
				beneficiary_name: "",
				case_worker: "",
			}));
		}
	}, [formData.case_type, open, loadCasesByType]);

	/**
	 * Toggle a case selection (bulk enrollment)
	 */
	const toggleCaseSelection = (caseId) => {
		setSelectedCaseIds((prev) => {
			const next = prev.includes(caseId)
				? prev.filter((id) => id !== caseId)
				: [...prev, caseId];

			// Keep the existing UX for single-case enrollment: populate editable fields
			if (next.length === 1) {
				const only = cases.find((c) => c.id === next[0]);
				if (only) {
					setFormData((current) => ({
						...current,
						case_id: only.id,
						case_number: only.id,
						beneficiary_name: only.displayName,
						case_worker: only.case_manager || "",
					}));
				}
			} else {
				setFormData((current) => ({
					...current,
					case_id: "",
					case_number: "",
					// In bulk mode these are set per-case on submit
					beneficiary_name: next.length ? "" : current.beneficiary_name,
					// Keep manually typed case worker in bulk mode
					case_worker: current.case_worker,
				}));
			}

			return next;
		});
	};

	const selectAllVisibleCases = () => {
		setSelectedCaseIds(visibleCases.map((c) => c.id));
		setFormData((current) => ({
			...current,
			case_id: "",
			case_number: "",
			beneficiary_name: "",
			case_worker: current.case_worker,
		}));
	};

	const clearSelectedCases = () => {
		setSelectedCaseIds([]);
		setFormData((current) => ({
			...current,
			case_id: "",
			case_number: "",
			beneficiary_name: "",
			case_worker: current.case_worker,
		}));
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
			if (!selectedCaseIds.length) {
				throw new Error("Please select at least one case");
			}
			if (!formData.program_id) {
				throw new Error("Please select a program");
			}

			// Date validation: expected_completion_date must be >= enrollment_date
			if (formData.expected_completion_date && formData.enrollment_date) {
				if (formData.expected_completion_date < formData.enrollment_date) {
					throw new Error("Expected completion date must be after or equal to enrollment date");
				}
			}

			const commonEnrollmentData = {
				...formData,
				// Ensure empty strings for dates are converted to null to satisfy DB constraints
				expected_completion_date: formData.expected_completion_date || null,
				status: "active",
				progress_percentage: 0,
				sessions_attended: 0,
				sessions_completed: 0,
				sessions_absent_unexcused: 0,
				sessions_absent_excused: 0,
				attendance_rate: 0,
			};

			const failures = [];
			let successCount = 0;

			for (const caseId of selectedCaseIds) {
				const selected = cases.find((c) => c.id === caseId);
				if (!selected) {
					failures.push({
						caseId,
						reason: "Case not found in the current list",
					});
					continue;
				}

				const perCaseData = {
					...commonEnrollmentData,
					case_id: selected.id,
					case_number: selected.id,
					beneficiary_name: selected.displayName,
					case_worker: selected.case_manager || null,
				};

				try {
					await createEnrollment(perCaseData);
					successCount += 1;
				} catch (enrollErr) {
					failures.push({
						caseId: selected.id,
						caseName: selected.displayName,
						reason: enrollErr?.message || "Failed to create enrollment",
					});
				}
			}

			if (failures.length) {
				const preview = failures
					.slice(0, 3)
					.map((f) => `${f.caseName || f.caseId}: ${f.reason}`)
					.join(" | ");
				throw new Error(
					`Enrolled ${successCount}/${selectedCaseIds.length} cases. Failed: ${preview}${
						failures.length > 3 ? " | …" : ""
					}`
				);
			}

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
			setSelectedCaseIds([]);
			setCaseSearch("");

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
		const caseTypeCandidates = getProgramCaseTypeCandidates(formData.case_type);

		return programs.filter((program) => {
			// Check if program has capacity
			const hasCapacity = (program.current_enrollment || 0) < (program.capacity || 0);

			// Check if program targets this case type
			const targetBeneficiary = Array.isArray(program.target_beneficiary)
				? program.target_beneficiary
				: program.target_beneficiary
					? [program.target_beneficiary]
					: [];
			const targetsType = targetBeneficiary.some((value) =>
				caseTypeCandidates.includes(value),
			);

			return hasCapacity && targetsType;
		});
	};

	const availablePrograms = getAvailablePrograms();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Enroll Case in Program
					</DialogTitle>
					<DialogDescription>
						Select one or more cases and a program to create enrollments
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-4">
						{/* Date Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="enrollment_date">Enrollment Date *</Label>
								<Input
									id="enrollment_date"
									type="date"
									value={formData.enrollment_date}
									onChange={(e) =>
										handleChange("enrollment_date", e.target.value)
									}
									required
									className="cursor-pointer"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="expected_completion_date">Expected Completion</Label>
								<Input
									id="expected_completion_date"
									type="date"
									value={formData.expected_completion_date}
									onChange={(e) =>
										handleChange("expected_completion_date", e.target.value)
									}
									min={formData.enrollment_date}
									className="cursor-pointer"
								/>
								{formData.expected_completion_date &&
									formData.enrollment_date &&
									formData.expected_completion_date < formData.enrollment_date && (
										<p className="text-xs text-red-600">
											Expected completion must be after enrollment date
										</p>
									)}
							</div>
						</div>

						{/* Case Type + Program */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-10">
							<div className="space-y-2">
								<Label htmlFor="case_type">Case Type *</Label>
								<Select
									value={formData.case_type}
									onValueChange={(value) => handleChange("case_type", value)}
									required
								>
									<SelectTrigger id="case_type" className="cursor-pointer">
										<SelectValue placeholder="Select case type" />
									</SelectTrigger>
									<SelectContent>
										{PROGRAM_CASE_TYPE_OPTIONS.map((caseType) => (
											<SelectItem key={caseType.value} value={caseType.value}>
												{caseType.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="program_id">Program *</Label>
								<Select
									value={formData.program_id}
									onValueChange={(value) => handleChange("program_id", value)}
									required
									disabled={!formData.case_type}
								>
									<SelectTrigger id="program_id" className="cursor-pointer">
										<SelectValue
											placeholder={
												!formData.case_type
													? "Select case type first"
													: availablePrograms.length === 0
													? "No available programs"
													: "Select a program"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{availablePrograms.map((program) => (
											<SelectItem key={program.id} value={program.id}>
												{program.program_name} ({program.current_enrollment}/{program.capacity} enrolled)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Selected Cases (below Case Type + Program) */}
						{formData.case_type && (
							<div className="space-y-2">
								<Label>Selected Cases *</Label>
								{searchingCase ? (
									<div className="flex items-center justify-center p-4">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span className="ml-2">Loading cases...</span>
									</div>
								) : (
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Input
												value={caseSearch}
												onChange={(e) => setCaseSearch(e.target.value)}
												placeholder="Search cases by name or case manager"
												disabled={cases.length === 0}
											/>
											<Button
												type="button"
												variant="outline"
												onClick={selectAllVisibleCases}
												disabled={cases.length === 0 || visibleCases.length === 0}
											>
												Select all
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={clearSelectedCases}
												disabled={!selectedCaseIds.length}
											>
												Clear
											</Button>
										</div>

										<div className="rounded-md border max-h-56 overflow-y-auto">
											{visibleCases.length === 0 ? (
												<div className="p-3 text-sm text-muted-foreground">
													{cases.length === 0
														? "No active cases found"
														: "No cases match your search"}
												</div>
											) : (
												<div className="divide-y">
													{visibleCases.map((caseItem) => {
														const checked = selectedCaseIds.includes(caseItem.id);
														return (
															<label
																key={caseItem.id}
																className="flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/40"
															>
																<Checkbox
																	checked={checked}
																	onCheckedChange={() => toggleCaseSelection(caseItem.id)}
																/>
																<div className="flex-1">
																	<div className="text-sm font-medium">{caseItem.displayName}</div>
																	<div className="text-xs text-muted-foreground">
																		Case manager: {caseItem.case_manager}
																	</div>
																</div>
															</label>
														);
													})}
												</div>
											)}
										</div>

										<div className="text-xs text-muted-foreground">Selected: {selectedCaseIds.length}</div>
									</div>
								)}
							</div>
						)}


						{/* Total Sessions */}
						<div className="space-y-2">
							<Label htmlFor="sessions_total">Total Sessions</Label>
							<Input
								id="sessions_total"
								type="number"
								min="0"
								value={formData.sessions_total}
								onChange={(e) => handleChange("sessions_total", e.target.value)}
								placeholder="Enter total sessions"
							/>
						</div>

						{/* Notes */}
						<div className="space-y-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) => handleChange("notes", e.target.value)}
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
							disabled={loading || !selectedCaseIds.length}
							className="cursor-pointer"
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Enroll {selectedCaseIds.length || ""}{" "}
							{selectedCaseIds.length === 1 ? "Case" : "Cases"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
