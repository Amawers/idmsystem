"use client";

/**
 * Single Parent (SP) intake sheet dialog.
 *
 * Responsibilities:
 * - Collect multi-step intake data across tabs and build a case payload.
 * - Stage the case locally via the offline service, then optionally trigger a sync flow.
 * - Reset both local form state and the shared intake store when closing.
 *
 * Notes:
 * - When saving while online, this view triggers a reload with sessionStorage flags to
 *   restore the Case Management tab context and prompt syncing.
 */

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FamilyCompositionForm } from "@/components/intake sheet SP/FamilyCompositionForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { useCaseManagerStore } from "@/store/useCaseManagerStore";
import { buildSPCasePayload } from "@/lib/spSubmission";
import { createOrUpdateLocalSpCase } from "@/services/spOfflineService";

/**
 * @typedef {Object} IntakeSheetSpProps
 * @property {boolean} open
 * @property {(open: boolean) => void} setOpen
 * @property {() => void} [onSuccess]
 * @property {Record<string, any> | null} [editingRecord]
 */

/**
 * @typedef {Object} SpIntakeFormState
 * @property {string} name
 * @property {string} age
 * @property {string} address
 * @property {string} birthDate
 * @property {string} birthPlace
 * @property {string} civilStatus
 * @property {string} educationalAttainment
 * @property {string} occupation
 * @property {string} monthlyIncome
 * @property {string} religion
 * @property {string} interviewDate
 * @property {string} yearMember
 * @property {string} skills
 * @property {string} soloParentDuration
 * @property {boolean|null} fourPs
 * @property {string} parentsWhereabouts
 * @property {string} backgroundInformation
 * @property {string} assessment
 * @property {string} caseManager
 * @property {string} cellphoneNumber
 * @property {string} emergencyContactPerson
 * @property {string} emergencyContactNumber
 * @property {string} notes
 */

const tabOrder = ["identification", "familyComposition", "other"];

const tabLabels = {
	identification: "Identification Data",
	familyComposition: "Family Composition",
	other: "Other",
};

const createDefaultFormState = () => ({
	name: "",
	age: "",
	address: "",
	birthDate: "",
	birthPlace: "",
	civilStatus: "",
	educationalAttainment: "",
	occupation: "",
	monthlyIncome: "",
	religion: "",
	interviewDate: "",
	yearMember: "",
	skills: "",
	soloParentDuration: "",
	fourPs: null,
	parentsWhereabouts: "",
	backgroundInformation: "",
	assessment: "",
	caseManager: "",
	cellphoneNumber: "",
	emergencyContactPerson: "",
	emergencyContactNumber: "",
	notes: "",
});

const toDateInputValue = (value) => {
	if (!value) return "";
	const str = String(value);
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
	const date = new Date(str);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
};

const mapRecordToSpFormState = (record) => {
	if (!record) return createDefaultFormState();
	const derivedName =
		record.full_name ||
		`${record.first_name || ""} ${record.last_name || ""}`.trim();

	return {
		name: derivedName || "",
		age: record.age != null ? String(record.age) : "",
		address: record.address || "",
		birthDate: toDateInputValue(record.birth_date),
		birthPlace: record.birth_place || "",
		civilStatus: record.civil_status || "",
		educationalAttainment: record.educational_attainment || "",
		occupation: record.occupation || "",
		monthlyIncome:
			record.monthly_income != null ? String(record.monthly_income) : "",
		religion: record.religion || "",
		interviewDate: toDateInputValue(record.interview_date),
		yearMember:
			record.year_member != null ? String(record.year_member) : "",
		skills: record.skills || "",
		soloParentDuration: record.solo_parent_duration || "",
		fourPs: typeof record.four_ps === "boolean" ? record.four_ps : null,
		parentsWhereabouts: record.parents_whereabouts || "",
		backgroundInformation: record.background_information || "",
		assessment: record.assessment || "",
		caseManager: record.case_manager || "",
		cellphoneNumber: record.contact_number || "",
		emergencyContactPerson: record.emergency_contact_person || "",
		emergencyContactNumber: record.emergency_contact_number || "",
		notes: record.notes || "",
	};
};

/**
 * Read the browser's online state.
 * @returns {boolean}
 */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Force the Case Management UI back to the SP tab after save.
 *
 * Uses sessionStorage flags + reload to reset downstream hook state and encourage a sync.
 * @returns {void}
 */
const forceSpTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "SP");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "SP");
	sessionStorage.setItem("caseManagement.forceSpSync", "true");
	window.location.reload();
};

/**
 * SP intake dialog.
 * @param {IntakeSheetSpProps} props
 * @returns {JSX.Element}
 */
export default function IntakeSheetSP({
	open,
	setOpen,
	onSuccess,
	editingRecord = null,
}) {
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	/** @type {[SpIntakeFormState, import("react").Dispatch<import("react").SetStateAction<SpIntakeFormState>>]} */
	const [formState, setFormState] = useState(createDefaultFormState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const {
		data: intakeData,
		resetAll,
		setSectionField,
	} = useIntakeFormStore();
	const caseManagers = useCaseManagerStore((state) => state.caseManagers);
	const loadingCaseManagers = useCaseManagerStore((state) => state.loading);
	const caseManagerError = useCaseManagerStore((state) => state.error);
	const initCaseManagers = useCaseManagerStore((state) => state.init);
	const isEditMode = Boolean(editingRecord);

	useEffect(() => {
		initCaseManagers();
	}, [initCaseManagers]);

	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setIsSubmitting(false);
			setFormState(createDefaultFormState());
			resetAll();
			return;
		}

		if (isEditMode && editingRecord) {
			setFormState(mapRecordToSpFormState(editingRecord));
			setSectionField("familyComposition", {
				members: Array.isArray(editingRecord.family_members)
					? editingRecord.family_members
					: [],
			});
		} else {
			setFormState(createDefaultFormState());
			resetAll();
		}
	}, [open, resetAll, isEditMode, editingRecord, setSectionField]);

	const currentTab = tabOrder[currentTabIndex];
	const isFirstTab = currentTabIndex === 0;
	const isLastTab = currentTabIndex === tabOrder.length - 1;

	/**
	 * Create a controlled-input `onChange` handler.
	 * @param {keyof SpIntakeFormState} field
	 * @returns {(event: import("react").ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void}
	 */
	const handleChange = (field) => (event) => {
		setFormState((prev) => ({
			...prev,
			[field]: event.target.value,
		}));
	};

	/**
	 * Build and stage the SP case locally, then optionally trigger a sync flow.
	 * @param {import("react").FormEvent} event
	 * @returns {Promise<void>}
	 */
	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);
		try {
			const casePayload = buildSPCasePayload(formState, intakeData);
			await createOrUpdateLocalSpCase({
				casePayload,
				targetId: isEditMode ? (editingRecord?.id ?? null) : null,
				localId: isEditMode ? (editingRecord?.localId ?? null) : null,
				mode: isEditMode ? "update" : "create",
			});

			const online = isBrowserOnline();
			toast.success(
				isEditMode
					? "Single Parent case update queued"
					: "Single Parent case queued",
				{
					description: online
						? "Sync queued and will push shortly."
						: "Stored locally. Sync once you're online.",
				},
			);

			resetAll();
			setOpen(false);
			onSuccess?.();

			if (online) {
				setTimeout(forceSpTabReload, 0);
			}
		} catch (err) {
			toast.error("Save failed", {
				description: err?.message || "Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleNext = () => {
		setCurrentTabIndex((prev) => Math.min(prev + 1, tabOrder.length - 1));
	};

	const handleBack = () => {
		setCurrentTabIndex((prev) => Math.max(prev - 1, 0));
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? "Edit Single Parent Case"
							: "Single Parent Signup"}
					</DialogTitle>
				</DialogHeader>

				<Tabs
					value={currentTab}
					onValueChange={(tab) =>
						setCurrentTabIndex(tabOrder.indexOf(tab))
					}
					className="w-full flex flex-col gap-4"
				>
					<TabsList className="flex w-full flex-wrap gap-2 px-2">
						{tabOrder.map((tab) => (
							<TabsTrigger
								key={tab}
								value={tab}
								className="flex items-center whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								{tabLabels[tab]}
							</TabsTrigger>
						))}
					</TabsList>

					<div className="flex-1 overflow-auto">
						<TabsContent
							value="identification"
							className="space-y-6"
						>
							<div className="grid gap-6 lg:grid-cols-2">
								<div className="space-y-4">
									<div className="grid gap-4 md:grid-cols-2">
										<div className="grid gap-2">
											<Label htmlFor="sp-name">
												Name
											</Label>
											<Input
												id="sp-name"
												placeholder="Enter name"
												value={formState.name}
												onChange={handleChange("name")}
												required
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-age">Age</Label>
											<Input
												id="sp-age"
												type="number"
												min="0"
												placeholder="Enter age"
												value={formState.age}
												onChange={handleChange("age")}
											/>
										</div>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-address">
											Address
										</Label>
										<Input
											id="sp-address"
											placeholder="Enter address"
											value={formState.address}
											onChange={handleChange("address")}
										/>
									</div>

									<div className="grid gap-4 md:grid-cols-3">
										<div className="grid gap-2">
											<Label htmlFor="sp-birth-date">
												Birth Date
											</Label>
											<Input
												id="sp-birth-date"
												type="date"
												value={formState.birthDate}
												onChange={handleChange(
													"birthDate",
												)}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-birth-place">
												Birth Place
											</Label>
											<Input
												id="sp-birth-place"
												placeholder="Enter birth place"
												value={formState.birthPlace}
												onChange={handleChange(
													"birthPlace",
												)}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-civil-status">
												Civil Status
											</Label>
											<Input
												id="sp-civil-status"
												placeholder="Enter civil status"
												value={formState.civilStatus}
												onChange={handleChange(
													"civilStatus",
												)}
											/>
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div className="grid gap-2">
											<Label htmlFor="sp-education">
												Educational Attainment
											</Label>
											<Input
												id="sp-education"
												placeholder="Enter educational attainment"
												value={
													formState.educationalAttainment
												}
												onChange={handleChange(
													"educationalAttainment",
												)}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-occupation">
												Occupation
											</Label>
											<Input
												id="sp-occupation"
												placeholder="Enter occupation"
												value={formState.occupation}
												onChange={handleChange(
													"occupation",
												)}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div className="grid gap-4 md:grid-cols-2">
										<div className="grid gap-2">
											<Label htmlFor="sp-monthly-income">
												Monthly Income
											</Label>
											<Input
												id="sp-monthly-income"
												type="number"
												min="0"
												placeholder="Enter monthly income"
												value={formState.monthlyIncome}
												onChange={handleChange(
													"monthlyIncome",
												)}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-religion">
												Religion
											</Label>
											<Input
												id="sp-religion"
												placeholder="Enter religion"
												value={formState.religion}
												onChange={handleChange(
													"religion",
												)}
											/>
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div className="grid gap-2">
											<Label htmlFor="sp-interview-date">
												Date of Interview
											</Label>
											<Input
												id="sp-interview-date"
												type="date"
												value={formState.interviewDate}
												onChange={handleChange(
													"interviewDate",
												)}
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="sp-year-member">
												Year Member
											</Label>
											<Input
												id="sp-year-member"
												type="number"
												min="0"
												placeholder="Enter year member"
												value={formState.yearMember}
												onChange={handleChange(
													"yearMember",
												)}
											/>
										</div>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-skills">
											Skills
										</Label>
										<Textarea
											id="sp-skills"
											placeholder="Enter skills"
											value={formState.skills}
											onChange={handleChange("skills")}
											rows={5}
										/>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent
							value="familyComposition"
							className="space-y-4"
						>
							<FamilyCompositionForm sectionKey="familyComposition" />
						</TabsContent>

						<TabsContent value="other" className="space-y-4">
							<div className="grid gap-4">
								<div className="grid gap-4 md:grid-cols-4">
									<div className="grid gap-2">
										<Label htmlFor="sp-solo-parent-duration">
											No. years/months become solo parent
										</Label>
										<Input
											id="sp-solo-parent-duration"
											placeholder="e.g., 3 years 2 months"
											value={formState.soloParentDuration}
											onChange={handleChange(
												"soloParentDuration",
											)}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-cellphone-number">
											Cellphone number
										</Label>
										<Input
											id="sp-cellphone-number"
											type="tel"
											placeholder="Enter cellphone number"
											value={formState.cellphoneNumber}
											onChange={handleChange(
												"cellphoneNumber",
											)}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-4ps">4ps</Label>
										<Select
											value={
												formState.fourPs === null
													? ""
													: formState.fourPs
														? "yes"
														: "no"
											}
											onValueChange={(value) => {
												setFormState((prev) => ({
													...prev,
													fourPs:
														value === ""
															? null
															: value === "yes",
												}));
											}}
										>
											<SelectTrigger id="sp-4ps">
												<SelectValue placeholder="Select" />
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

								<div className="grid gap-4 md:grid-cols-2">
									<div className="grid gap-2">
										<Label htmlFor="sp-emergency-contact-person">
											Contact person in case of emergency
										</Label>
										<Input
											id="sp-emergency-contact-person"
											placeholder="Enter contact person"
											value={
												formState.emergencyContactPerson
											}
											onChange={handleChange(
												"emergencyContactPerson",
											)}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-emergency-contact-number">
											Contact person number
										</Label>
										<Input
											id="sp-emergency-contact-number"
											type="tel"
											placeholder="Enter contact person number"
											value={
												formState.emergencyContactNumber
											}
											onChange={handleChange(
												"emergencyContactNumber",
											)}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="sp-case-manager">
											Case Manager
										</Label>
										<Select
											value={formState.caseManager}
											onValueChange={(value) =>
												setFormState((prev) => ({
													...prev,
													caseManager: value,
												}))
											}
										>
											<SelectTrigger
												id="sp-case-manager"
												disabled={
													loadingCaseManagers &&
													caseManagers.length === 0
												}
											>
												<SelectValue placeholder="Select case manager" />
											</SelectTrigger>
											<SelectContent>
												{caseManagers.length > 0 ? (
													caseManagers.map(
														(manager) => (
															<SelectItem
																key={manager.id}
																value={
																	manager.full_name
																}
															>
																{
																	manager.full_name
																}
															</SelectItem>
														),
													)
												) : loadingCaseManagers ? (
													<SelectItem
														value="loading"
														disabled
													>
														Loading...
													</SelectItem>
												) : caseManagerError ? (
													<SelectItem
														value="fetch-error"
														disabled
													>
														Unable to load case
														managers
													</SelectItem>
												) : (
													<SelectItem
														value="no-managers"
														disabled
													>
														No case managers
														available
													</SelectItem>
												)}
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="sp-parents-whereabouts">
										Parents whereabouts
									</Label>
									<Textarea
										id="sp-parents-whereabouts"
										placeholder="Add details"
										value={formState.parentsWhereabouts}
										onChange={handleChange(
											"parentsWhereabouts",
										)}
										rows={3}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="sp-background-information">
										Background Information
									</Label>
									<Textarea
										id="sp-background-information"
										placeholder="Add background information"
										value={formState.backgroundInformation}
										onChange={handleChange(
											"backgroundInformation",
										)}
										rows={3}
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="sp-assessment">
										Assessment
									</Label>
									<Textarea
										id="sp-assessment"
										placeholder="Add assessment"
										value={formState.assessment}
										onChange={handleChange("assessment")}
										rows={3}
									/>
								</div>
							</div>
						</TabsContent>

						<div className="mt-4 flex items-center justify-end gap-2">
							{!isFirstTab ? (
								<Button
									type="button"
									variant="outline"
									onClick={handleBack}
									className="cursor-pointer"
								>
									Back
								</Button>
							) : null}
							{isLastTab ? (
								<Button
									type="button"
									onClick={handleSubmit}
									disabled={isSubmitting}
									className="cursor-pointer"
								>
									{isSubmitting
										? "Saving..."
										: isEditMode
											? "Update"
											: "Save"}
								</Button>
							) : (
								<Button
									type="button"
									onClick={handleNext}
									className="cursor-pointer"
								>
									Next
								</Button>
							)}
						</div>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
