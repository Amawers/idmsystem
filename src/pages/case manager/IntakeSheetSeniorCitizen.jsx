"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildSCCasePayload } from "@/lib/scSubmission";
import { createOrUpdateLocalScCase } from "@/services/scOfflineService";

const initialFormState = {
	// Identifying Information
	senior_name: "",
	region: "",
	province: "",
	city_municipality: "",
	barangay: "",
	date_of_birth: "",
	place_of_birth: "",
	marital_status: "",
	gender: "",
	contact_number: "",
	email_address: "",
	religion: "",
	ethnic_origin: "",
	language_spoken_written: "",
	osca_id_number: "",
	gsis: "",
	tin: "",
	philhealth: "",
	sc_association: "",
	other_gov_id: "",
	capability_to_travel: "", // yes | no
	service_business_employment: "",
	current_pension: "",

	// Family Composition
	name_of_spouse: "",
	fathers_name: "",
	mothers_maiden_name: "",
	children: [
		{
			full_name: "",
			occupation: "",
			income: "",
			age: "",
			working_status: "",
		},
	],
	other_dependents: "",

	// Education
	educational_attainment: [],
	technical_skills: [],
	community_service_involvement: [],
	living_with: [],
	household_condition: [],

	// Economic Profile
	source_of_income_assistance: [],
	assets_real_immovable: [],
	assets_personal_movable: [],
	needs_commonly_encountered: [],

	// Health Profile
	medical_concern: [],
	dental_concern: [],
	optical: [],
	hearing: [],
	social: [],
	difficulty: [],
	medicines_for_maintenance: [""],
	scheduled_checkup: "", // yes | no
	checkup_frequency: "", // yearly | every_6_months
	assisting_person: "",
	relation_to_senior: "",
	interviewer: "",
	date_of_interview: "",
	place_of_interview: "",
};

function toKebabId(prefix, value) {
	return `${prefix}-${String(value)
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")}`;
}

export default function IntakeSheetSeniorCitizen({ open, setOpen, onSuccess }) {
	const [formState, setFormState] = useState(initialFormState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [activeTab, setActiveTab] = useState("identifying");

	const isBrowserOnline = () =>
		typeof navigator !== "undefined" ? navigator.onLine : true;
	const forceScTabReload = () => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", "SC");
		sessionStorage.setItem("caseManagement.forceTabAfterReload", "SC");
		sessionStorage.setItem("caseManagement.forceScSync", "true");
		window.location.reload();
	};

	useEffect(() => {
		if (!open) {
			setFormState(initialFormState);
			setIsSubmitting(false);
			setActiveTab("identifying");
		}
	}, [open]);

	const handleChange = (field) => (event) => {
		setFormState((prev) => ({
			...prev,
			[field]: event.target.value,
		}));
	};

	const setSingleCheckboxValue = (field, value) => {
		setFormState((prev) => ({
			...prev,
			[field]: prev[field] === value ? "" : value,
		}));
	};

	const toggleArrayValue = (field, value) => {
		setFormState((prev) => {
			const current = Array.isArray(prev[field]) ? prev[field] : [];
			const next = current.includes(value)
				? current.filter((v) => v !== value)
				: [...current, value];
			return { ...prev, [field]: next };
		});
	};

	const updateChild = (index, field, value) => {
		setFormState((prev) => {
			const nextChildren = prev.children.map((child, i) =>
				i === index ? { ...child, [field]: value } : child,
			);
			return { ...prev, children: nextChildren };
		});
	};

	const addChild = () => {
		setFormState((prev) => ({
			...prev,
			children: [
				...prev.children,
				{
					full_name: "",
					occupation: "",
					income: "",
					age: "",
					working_status: "",
				},
			],
		}));
	};

	const removeChild = (index) => {
		setFormState((prev) => {
			const nextChildren = prev.children.filter((_, i) => i !== index);
			return {
				...prev,
				children: nextChildren.length
					? nextChildren
					: [
							{
								full_name: "",
								occupation: "",
								income: "",
								age: "",
								working_status: "",
							},
						],
			};
		});
	};

	const updateMedicine = (index, value) => {
		setFormState((prev) => {
			const next = prev.medicines_for_maintenance.map((m, i) =>
				i === index ? value : m,
			);
			return { ...prev, medicines_for_maintenance: next };
		});
	};

	const addMedicine = () => {
		setFormState((prev) => ({
			...prev,
			medicines_for_maintenance: [...prev.medicines_for_maintenance, ""],
		}));
	};

	const removeMedicine = (index) => {
		setFormState((prev) => {
			const next = prev.medicines_for_maintenance.filter(
				(_, i) => i !== index,
			);
			return {
				...prev,
				medicines_for_maintenance: next.length ? next : [""],
			};
		});
	};

	const CheckboxItem = ({ id, label, checked, onCheckedChange }) => (
		<div className="flex items-center gap-2">
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(next) => onCheckedChange(Boolean(next))}
			/>
			<Label htmlFor={id} className="font-normal">
				{label}
			</Label>
		</div>
	);

	const educationalAttainmentOptions = useMemo(
		() => [
			"Elementary Level",
			"Elementary Graduate",
			"High School Level",
			"Highschool Graduate",
			"College Level",
			"College Graduate",
			"Vocational",
			"Post Graduate",
			"Not Attended School",
		],
		[],
	);

	const technicalSkillsOptions = useMemo(
		() => [
			"Medical",
			"Dental",
			"Fishing",
			"Engineering",
			"Barber",
			"Evangelization",
			"Millwright",
			"Teaching",
			"Counselling",
			"Cooking",
			"Carpenter",
			"Mason",
			"Tailor",
			"Legal Services",
			"Farming",
			"Arts",
			"Plumber",
			"Sapatero",
			"Chef",
		],
		[],
	);

	const communityServiceOptions = useMemo(
		() => [
			"Medical",
			"Community Leader",
			"Neighborhood Support Services",
			"Counselling",
			"Resource Volunteer",
			"Dental",
			"Legal Services",
			"Sponsorship",
			"Community Beautification",
			"Friendly Visits",
			"Religious",
		],
		[],
	);

	const livingWithOptions = useMemo(
		() => [
			"Alone",
			"Spouse",
			"Children",
			"Grand Children",
			"Inlaws",
			"Relatives",
			"Common Law Spouse",
			"Care Institution",
			"Friends",
		],
		[],
	);

	const householdConditionOptions = useMemo(
		() => [
			"No Privacy",
			"Informal Settler",
			"High Cost of Rent",
			"Overcrowded in Home",
			"No Permanent House",
			"Longing for Independent Living Quiet Atmosphere",
		],
		[],
	);

	const incomeAssistanceOptions = useMemo(
		() => [
			"Own Earnings",
			"Dependent on Children",
			"Spouse Pension",
			"Livestock",
			"Own Pension",
			"Spouse Salary",
			"Rental",
			"Fishing",
			"Stocks",
			"Insurance",
			"Savings",
		],
		[],
	);

	const assetsRealOptions = useMemo(
		() => [
			"House",
			"Commercial Building",
			"Farmland",
			"House and Lot",
			"Fishpond",
		],
		[],
	);

	const assetsPersonalOptions = useMemo(
		() => [
			"Automobile",
			"Heavy Equipment",
			"Motorcycle",
			"Personal Computer",
			"Laptops",
			"Mobile Phones",
			"Boats",
			"Drones",
		],
		[],
	);

	const needsOptions = useMemo(
		() => [
			"Lack of Income",
			"Loss of Income",
			"Skills",
			"Livelihood Oppurtunities",
		],
		[],
	);

	const medicalConcernOptions = useMemo(
		() => [
			"Health Problems",
			"Hypertension",
			"Diabeties",
			"Gout",
			"Kidnet Disease",
			"Heart Disease",
			"Dementia",
			"Pulmonary Disease",
		],
		[],
	);

	const socialOptions = useMemo(
		() => [
			"Feeling Neglect",
			"Feeling Helplessness",
			"Feeling Loneliness",
			"Lack Leisure",
			"Lack SC Friendly Environment",
		],
		[],
	);

	const difficultyOptions = useMemo(
		() => [
			"High Cost of Medicines",
			"Lack of Medicines",
			"Lack of Medical Attention",
		],
		[],
	);

	const handleSubmit = async (event) => {
		event?.preventDefault?.();
		setIsSubmitting(true);
		try {
			const casePayload = buildSCCasePayload(formState);
			await createOrUpdateLocalScCase({
				casePayload,
				mode: "create",
			});

			const online = isBrowserOnline();
			toast.success("Senior Citizen case queued", {
				description: online
					? "Sync queued and will push shortly."
					: "Stored locally. Sync once you're online.",
			});
			setOpen(false);
			onSuccess?.();

			if (online) {
				setTimeout(forceScTabReload, 0);
			}
		} catch (error) {
			toast.error("Save failed", {
				description: error?.message || "Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const tabOrder = [
		"identifying",
		"family",
		"education",
		"economic",
		"health",
	];
	const activeIndex = tabOrder.indexOf(activeTab);
	const isFirstTab = activeIndex <= 0;
	const isLastTab = activeIndex === tabOrder.length - 1;

	const handleNext = () => {
		const next = tabOrder[activeIndex + 1];
		if (next) setActiveTab(next);
	};

	const handleBack = () => {
		const prev = tabOrder[activeIndex - 1];
		if (prev) setActiveTab(prev);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-6xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Senior Citizen Intake</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<div className="w-full overflow-x-auto">
							<TabsList className="flex w-max gap-2 px-2">
								<TabsTrigger value="identifying">
									Identifying Information
								</TabsTrigger>
								<TabsTrigger value="family">
									Family Composition
								</TabsTrigger>
								<TabsTrigger value="education">
									Education
								</TabsTrigger>
								<TabsTrigger value="economic">
									Economic Profile
								</TabsTrigger>
								<TabsTrigger value="health">
									Health Profile
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="identifying" className="space-y-4">
							<div className="rounded-lg border p-4">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-4">
										<div className="space-y-1">
											<Label>
												Name of Senior Citizen
											</Label>
											<Input
												value={formState.senior_name}
												onChange={handleChange(
													"senior_name",
												)}
												placeholder="Full name"
											/>
										</div>

										<div className="space-y-2">
											<Label>Address</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<div className="space-y-1">
													<Label>Region</Label>
													<Input
														value={formState.region}
														onChange={handleChange(
															"region",
														)}
														placeholder="Region"
													/>
												</div>
												<div className="space-y-1">
													<Label>Province</Label>
													<Input
														value={
															formState.province
														}
														onChange={handleChange(
															"province",
														)}
														placeholder="Province"
													/>
												</div>
												<div className="space-y-1">
													<Label>
														City/Municipality
													</Label>
													<Input
														value={
															formState.city_municipality
														}
														onChange={handleChange(
															"city_municipality",
														)}
														placeholder="City/Municipality"
													/>
												</div>
												<div className="space-y-1">
													<Label>Barangay</Label>
													<Input
														value={
															formState.barangay
														}
														onChange={handleChange(
															"barangay",
														)}
														placeholder="Barangay"
													/>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Date of Birth</Label>
												<Input
													type="date"
													value={
														formState.date_of_birth
													}
													onChange={handleChange(
														"date_of_birth",
													)}
												/>
											</div>
											<div className="space-y-1">
												<Label>Place of Birth</Label>
												<Input
													value={
														formState.place_of_birth
													}
													onChange={handleChange(
														"place_of_birth",
													)}
													placeholder="Place of birth"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Marital Status</Label>
												<Input
													value={
														formState.marital_status
													}
													onChange={handleChange(
														"marital_status",
													)}
													placeholder="Marital status"
												/>
											</div>
											<div className="space-y-1">
												<Label>Gender</Label>
												<Input
													value={formState.gender}
													onChange={handleChange(
														"gender",
													)}
													placeholder="Gender"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Contact Number</Label>
												<Input
													value={
														formState.contact_number
													}
													onChange={handleChange(
														"contact_number",
													)}
													placeholder="Contact number"
												/>
											</div>
											<div className="space-y-1">
												<Label>Email Address</Label>
												<Input
													type="email"
													value={
														formState.email_address
													}
													onChange={handleChange(
														"email_address",
													)}
													placeholder="Email"
												/>
											</div>
										</div>
									</div>

									<div className="space-y-4">
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Religion</Label>
												<Input
													value={formState.religion}
													onChange={handleChange(
														"religion",
													)}
													placeholder="Religion"
												/>
											</div>
											<div className="space-y-1">
												<Label>Ethnic Origin</Label>
												<Input
													value={
														formState.ethnic_origin
													}
													onChange={handleChange(
														"ethnic_origin",
													)}
													placeholder="Ethnic origin"
												/>
											</div>
										</div>

										<div className="space-y-1">
											<Label>
												Language Spoken/Written
											</Label>
											<Input
												value={
													formState.language_spoken_written
												}
												onChange={handleChange(
													"language_spoken_written",
												)}
												placeholder="Language"
											/>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
											<div className="space-y-1">
												<Label>OSCA ID Number</Label>
												<Input
													value={
														formState.osca_id_number
													}
													onChange={handleChange(
														"osca_id_number",
													)}
													placeholder="OSCA ID"
												/>
											</div>
											<div className="space-y-1">
												<Label>GSIS</Label>
												<Input
													value={formState.gsis}
													onChange={handleChange(
														"gsis",
													)}
													placeholder="GSIS"
												/>
											</div>
											<div className="space-y-1">
												<Label>TIN</Label>
												<Input
													value={formState.tin}
													onChange={handleChange(
														"tin",
													)}
													placeholder="TIN"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
											<div className="space-y-1">
												<Label>Philhealth</Label>
												<Input
													value={formState.philhealth}
													onChange={handleChange(
														"philhealth",
													)}
													placeholder="Philhealth"
												/>
											</div>
											<div className="space-y-1">
												<Label>SC Association</Label>
												<Input
													value={
														formState.sc_association
													}
													onChange={handleChange(
														"sc_association",
													)}
													placeholder="Association"
												/>
											</div>
											<div className="space-y-1">
												<Label>Other Gov ID</Label>
												<Input
													value={
														formState.other_gov_id
													}
													onChange={handleChange(
														"other_gov_id",
													)}
													placeholder="Other ID"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<Label>Capability to Travel</Label>
											<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
												<CheckboxItem
													id="sc-travel-yes"
													label="Yes"
													checked={
														formState.capability_to_travel ===
														"yes"
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"capability_to_travel",
															"yes",
														)
													}
												/>
												<CheckboxItem
													id="sc-travel-no"
													label="No"
													checked={
														formState.capability_to_travel ===
														"no"
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"capability_to_travel",
															"no",
														)
													}
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>
													Service/Business/Employment
												</Label>
												<Input
													value={
														formState.service_business_employment
													}
													onChange={handleChange(
														"service_business_employment",
													)}
													placeholder="Service/business/employment"
												/>
											</div>
											<div className="space-y-1">
												<Label>Current Pension</Label>
												<Input
													value={
														formState.current_pension
													}
													onChange={handleChange(
														"current_pension",
													)}
													placeholder="Current pension"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="family" className="space-y-4">
							<div className="space-y-4 rounded-lg border p-4">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<div className="space-y-1">
										<Label>Name of Spouse</Label>
										<Input
											value={formState.name_of_spouse}
											onChange={handleChange(
												"name_of_spouse",
											)}
											placeholder="Spouse name"
										/>
									</div>
									<div className="space-y-1">
										<Label>Father's Name</Label>
										<Input
											value={formState.fathers_name}
											onChange={handleChange(
												"fathers_name",
											)}
											placeholder="Father's name"
										/>
									</div>
									<div className="space-y-1">
										<Label>Mother's Maiden Name</Label>
										<Input
											value={
												formState.mothers_maiden_name
											}
											onChange={handleChange(
												"mothers_maiden_name",
											)}
											placeholder="Mother's maiden name"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<Label>Children</Label>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={addChild}
										>
											Add Child
										</Button>
									</div>

									<div className="space-y-3">
										{formState.children.map(
											(child, index) => (
												<div
													key={`child-${index}`}
													className="rounded-md border p-3"
												>
													<div className="flex items-center justify-between gap-2">
														<p className="text-sm font-medium">
															Child {index + 1}
														</p>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() =>
																removeChild(
																	index,
																)
															}
														>
															Remove
														</Button>
													</div>

													<div className="grid grid-cols-1 gap-3 md:grid-cols-5">
														<div className="space-y-1 md:col-span-2">
															<Label>
																Full Name
															</Label>
															<Input
																value={
																	child.full_name
																}
																onChange={(e) =>
																	updateChild(
																		index,
																		"full_name",
																		e.target
																			.value,
																	)
																}
																placeholder="Full name"
															/>
														</div>
														<div className="space-y-1">
															<Label>
																Occupation
															</Label>
															<Input
																value={
																	child.occupation
																}
																onChange={(e) =>
																	updateChild(
																		index,
																		"occupation",
																		e.target
																			.value,
																	)
																}
																placeholder="Occupation"
															/>
														</div>
														<div className="space-y-1">
															<Label>
																Income
															</Label>
															<Input
																value={
																	child.income
																}
																onChange={(e) =>
																	updateChild(
																		index,
																		"income",
																		e.target
																			.value,
																	)
																}
																placeholder="Income"
															/>
														</div>
														<div className="space-y-1">
															<Label>Age</Label>
															<Input
																value={
																	child.age
																}
																onChange={(e) =>
																	updateChild(
																		index,
																		"age",
																		e.target
																			.value,
																	)
																}
																placeholder="Age"
															/>
														</div>
													</div>

													<div className="space-y-2 pt-2">
														<Label>
															Working Status
														</Label>
														<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
															<CheckboxItem
																id={`child-${index}-working`}
																label="Working"
																checked={
																	child.working_status ===
																	"working"
																}
																onCheckedChange={() =>
																	updateChild(
																		index,
																		"working_status",
																		child.working_status ===
																			"working"
																			? ""
																			: "working",
																	)
																}
															/>
															<CheckboxItem
																id={`child-${index}-not-working`}
																label="Not Working"
																checked={
																	child.working_status ===
																	"not_working"
																}
																onCheckedChange={() =>
																	updateChild(
																		index,
																		"working_status",
																		child.working_status ===
																			"not_working"
																			? ""
																			: "not_working",
																	)
																}
															/>
														</div>
													</div>
												</div>
											),
										)}
									</div>
								</div>

								<div className="space-y-1">
									<Label>Other Dependents</Label>
									<Textarea
										value={formState.other_dependents}
										onChange={handleChange(
											"other_dependents",
										)}
										placeholder="Other dependents"
									/>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="education" className="space-y-4">
							<div className="rounded-lg border p-4">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="space-y-4">
										<div className="space-y-2">
											<Label>
												Educational Attainment
											</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{educationalAttainmentOptions.map(
													(label) => {
														const value = label
															.toLowerCase()
															.replace(
																/\s+/g,
																"_",
															);
														return (
															<CheckboxItem
																key={value}
																id={toKebabId(
																	"sc-edu",
																	value,
																)}
																label={label}
																checked={formState.educational_attainment.includes(
																	value,
																)}
																onCheckedChange={() =>
																	toggleArrayValue(
																		"educational_attainment",
																		value,
																	)
																}
															/>
														);
													},
												)}
											</div>
										</div>

										<div className="space-y-2">
											<Label>Living With</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{livingWithOptions.map(
													(label) => {
														const value = label
															.toLowerCase()
															.replace(
																/\s+/g,
																"_",
															);
														return (
															<CheckboxItem
																key={value}
																id={toKebabId(
																	"sc-living",
																	value,
																)}
																label={label}
																checked={formState.living_with.includes(
																	value,
																)}
																onCheckedChange={() =>
																	toggleArrayValue(
																		"living_with",
																		value,
																	)
																}
															/>
														);
													},
												)}
											</div>
										</div>

										<div className="space-y-2">
											<Label>Household Condition</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{householdConditionOptions.map(
													(label) => {
														const value = label
															.toLowerCase()
															.replace(
																/\s+/g,
																"_",
															);
														return (
															<CheckboxItem
																key={value}
																id={toKebabId(
																	"sc-household",
																	value,
																)}
																label={label}
																checked={formState.household_condition.includes(
																	value,
																)}
																onCheckedChange={() =>
																	toggleArrayValue(
																		"household_condition",
																		value,
																	)
																}
															/>
														);
													},
												)}
											</div>
										</div>
									</div>

									<div className="space-y-4">
										<div className="space-y-2">
											<Label>Technical Skills</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{technicalSkillsOptions.map(
													(label) => {
														const value = label
															.toLowerCase()
															.replace(
																/\s+/g,
																"_",
															);
														return (
															<CheckboxItem
																key={value}
																id={toKebabId(
																	"sc-skill",
																	value,
																)}
																label={label}
																checked={formState.technical_skills.includes(
																	value,
																)}
																onCheckedChange={() =>
																	toggleArrayValue(
																		"technical_skills",
																		value,
																	)
																}
															/>
														);
													},
												)}
											</div>
										</div>

										<div className="space-y-2">
											<Label>
												Community Service Involvement
											</Label>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{communityServiceOptions.map(
													(label) => {
														const value = label
															.toLowerCase()
															.replace(
																/\s+/g,
																"_",
															);
														return (
															<CheckboxItem
																key={value}
																id={toKebabId(
																	"sc-community",
																	value,
																)}
																label={label}
																checked={formState.community_service_involvement.includes(
																	value,
																)}
																onCheckedChange={() =>
																	toggleArrayValue(
																		"community_service_involvement",
																		value,
																	)
																}
															/>
														);
													},
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="economic" className="space-y-4">
							<div className="space-y-4 rounded-lg border p-4">
								<div className="space-y-2">
									<Label>
										Source of Income and Assistance
									</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{incomeAssistanceOptions.map(
											(label) => {
												const value = label
													.toLowerCase()
													.replace(/\s+/g, "_");
												return (
													<CheckboxItem
														key={value}
														id={toKebabId(
															"sc-income",
															value,
														)}
														label={label}
														checked={formState.source_of_income_assistance.includes(
															value,
														)}
														onCheckedChange={() =>
															toggleArrayValue(
																"source_of_income_assistance",
																value,
															)
														}
													/>
												);
											},
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label>
										Assets: Real and Immovable Properties
									</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{assetsRealOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-assets-real",
														value,
													)}
													label={label}
													checked={formState.assets_real_immovable.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"assets_real_immovable",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>

								<div className="space-y-2">
									<Label>
										Assets: Personal and Movable Properties
									</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{assetsPersonalOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-assets-personal",
														value,
													)}
													label={label}
													checked={formState.assets_personal_movable.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"assets_personal_movable",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>

								<div className="space-y-2">
									<Label>Needs Commonly Encountered</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{needsOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-needs",
														value,
													)}
													label={label}
													checked={formState.needs_commonly_encountered.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"needs_commonly_encountered",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="health" className="space-y-4">
							<div className="space-y-4 rounded-lg border p-4">
								<div className="space-y-2">
									<Label>Medical Concern</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{medicalConcernOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-med",
														value,
													)}
													label={label}
													checked={formState.medical_concern.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"medical_concern",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>

								<div className="space-y-2">
									<Label>Dental Concern</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<CheckboxItem
											id="sc-dental-needs"
											label="Needs dental care"
											checked={formState.dental_concern.includes(
												"needs_dental_care",
											)}
											onCheckedChange={() =>
												toggleArrayValue(
													"dental_concern",
													"needs_dental_care",
												)
											}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Optical</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<CheckboxItem
											id="sc-optical-eye"
											label="Eye impairment"
											checked={formState.optical.includes(
												"eye_impairment",
											)}
											onCheckedChange={() =>
												toggleArrayValue(
													"optical",
													"eye_impairment",
												)
											}
										/>
										<CheckboxItem
											id="sc-optical-care"
											label="Needs eye care"
											checked={formState.optical.includes(
												"needs_eye_care",
											)}
											onCheckedChange={() =>
												toggleArrayValue(
													"optical",
													"needs_eye_care",
												)
											}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Hearing</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<CheckboxItem
											id="sc-hearing-aural"
											label="Aural impairment"
											checked={formState.hearing.includes(
												"aural_impairment",
											)}
											onCheckedChange={() =>
												toggleArrayValue(
													"hearing",
													"aural_impairment",
												)
											}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Social</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{socialOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-social",
														value,
													)}
													label={label}
													checked={formState.social.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"social",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>

								<div className="space-y-2">
									<Label>Difficulty</Label>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{difficultyOptions.map((label) => {
											const value = label
												.toLowerCase()
												.replace(/\s+/g, "_");
											return (
												<CheckboxItem
													key={value}
													id={toKebabId(
														"sc-difficulty",
														value,
													)}
													label={label}
													checked={formState.difficulty.includes(
														value,
													)}
													onCheckedChange={() =>
														toggleArrayValue(
															"difficulty",
															value,
														)
													}
												/>
											);
										})}
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<Label>
											List of Medicines for Maintenance
										</Label>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={addMedicine}
										>
											Add Medicine
										</Button>
									</div>
									<div className="space-y-2">
										{formState.medicines_for_maintenance.map(
											(medicine, index) => (
												<div
													key={`medicine-${index}`}
													className="flex items-center gap-2"
												>
													<Input
														value={medicine}
														onChange={(e) =>
															updateMedicine(
																index,
																e.target.value,
															)
														}
														placeholder="Medicine name"
													/>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() =>
															removeMedicine(
																index,
															)
														}
													>
														Remove
													</Button>
												</div>
											),
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label>
										Do you have a scheduled medical/physical
										checkup?
									</Label>
									<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
										<CheckboxItem
											id="sc-checkup-yes"
											label="Yes"
											checked={
												formState.scheduled_checkup ===
												"yes"
											}
											onCheckedChange={() =>
												setSingleCheckboxValue(
													"scheduled_checkup",
													"yes",
												)
											}
										/>
										<CheckboxItem
											id="sc-checkup-no"
											label="No"
											checked={
												formState.scheduled_checkup ===
												"no"
											}
											onCheckedChange={() => {
												setSingleCheckboxValue(
													"scheduled_checkup",
													"no",
												);
												setFormState((prev) => ({
													...prev,
													checkup_frequency: "",
												}));
											}}
										/>
									</div>
								</div>

								{formState.scheduled_checkup === "yes" && (
									<div className="space-y-2">
										<Label>If yes, when is it done?</Label>
										<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
											<CheckboxItem
												id="sc-checkup-yearly"
												label="Yearly"
												checked={
													formState.checkup_frequency ===
													"yearly"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"checkup_frequency",
														"yearly",
													)
												}
											/>
											<CheckboxItem
												id="sc-checkup-6months"
												label="Every 6 months"
												checked={
													formState.checkup_frequency ===
													"every_6_months"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"checkup_frequency",
														"every_6_months",
													)
												}
											/>
										</div>
									</div>
								)}

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-1">
										<Label>Assisting Person</Label>
										<Input
											value={formState.assisting_person}
											onChange={handleChange(
												"assisting_person",
											)}
											placeholder="Assisting person"
										/>
									</div>
									<div className="space-y-1">
										<Label>
											Relation to Senior Citizen
										</Label>
										<Input
											value={formState.relation_to_senior}
											onChange={handleChange(
												"relation_to_senior",
											)}
											placeholder="Relation"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-1">
										<Label>Interviewer</Label>
										<Input
											value={formState.interviewer}
											onChange={handleChange(
												"interviewer",
											)}
											placeholder="Interviewer"
										/>
									</div>
									<div className="space-y-1">
										<Label>Date of Interview</Label>
										<Input
											type="date"
											value={formState.date_of_interview}
											onChange={handleChange(
												"date_of_interview",
											)}
										/>
									</div>
								</div>

								<div className="space-y-1">
									<Label>Place of Interview</Label>
									<Input
										value={formState.place_of_interview}
										onChange={handleChange(
											"place_of_interview",
										)}
										placeholder="Place of interview"
									/>
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<div className="flex justify-end gap-2">
						{!isFirstTab ? (
							<Button
								type="button"
								variant="outline"
								onClick={handleBack}
							>
								Back
							</Button>
						) : null}
						{isLastTab ? (
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={isSubmitting}
							>
								{isSubmitting ? "Saving..." : "Save"}
							</Button>
						) : (
							<Button type="button" onClick={handleNext}>
								Next
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
