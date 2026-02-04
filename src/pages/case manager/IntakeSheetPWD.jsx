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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { buildPWDCasePayload } from "@/lib/pwdSubmission";
import { createOrUpdateLocalPwdCase } from "@/services/pwdOfflineService";

const initialFormState = {
	application_type: "", // new_applicant | renewal
	pwd_number: "",
	date_applied: "",
	last_name: "",
	first_name: "",
	middle_name: "",
	suffix: "",
	date_of_birth: "",
	sex: "", // male | female
	civil_status: "", // single | separated | cohabitation_livein | married | widowed
	type_of_disability: [],
	cause_of_disability: [],
	house_no_street: "",
	barangay: "",
	municipality: "",
	province: "",
	region: "",
	landline_number: "",
	mobile_no: "",
	email_address: "",
	educational_attainment: "",
	employment_status: "", // employed | unemployed | self_employed
	employment_category: "", // government | private
	type_of_employment: "", // permanent_regular | seasonal | casual | emergency
	occupation: "",
	organization_affiliated: "",
	contact_person: "",
	office_address: "",
	tel_no: "",
	sss: "",
	gsis: "",
	pag_ibig: "",
	psn: "",
	philhealth: "",
	fathers_name: "",
	mothers_name: "",
	accomplished_by: "", // applicant | guardian | representative
	certifying_physician: "",
	license_no: "",
	processing_officer: "",
	approving_officer: "",
	encoder: "",
	reporting_unit: "",
	control_no: "",
};

const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;
const forcePwdTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "PWD");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "PWD");
	sessionStorage.setItem("caseManagement.forcePwdSync", "true");
	window.location.reload();
};

export default function IntakeSheetPWD({ open, setOpen, onSuccess }) {
	const [formState, setFormState] = useState(initialFormState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [activeTab, setActiveTab] = useState("first");

	useEffect(() => {
		if (!open) {
			setFormState(initialFormState);
			setIsSubmitting(false);
			setActiveTab("first");
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

	const handleSubmit = async (event) => {
		event?.preventDefault?.();
		setIsSubmitting(true);
		try {
			const casePayload = buildPWDCasePayload(formState);
			await createOrUpdateLocalPwdCase({
				casePayload,
				mode: "create",
			});

			const online = isBrowserOnline();
			toast.success("PWD case queued", {
				description: online
					? "Sync queued and will push shortly."
					: "Stored locally. Sync once you're online.",
			});
			setOpen(false);
			onSuccess?.();

			if (online) {
				setTimeout(forcePwdTabReload, 0);
			}
		} catch (error) {
			toast.error("Save failed", {
				description: error?.message || "Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const tabOrder = ["first", "second", "third"];
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
					<DialogTitle>Persons with Disabilities Intake</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="w-full"
					>
						<div className="w-full overflow-x-auto">
							<TabsList className="flex w-max gap-2 px-2">
								<TabsTrigger value="first">
									First Part
								</TabsTrigger>
								<TabsTrigger value="second">
									Second Part
								</TabsTrigger>
								<TabsTrigger value="third">
									Third Part
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="first" className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-4 rounded-lg border p-4">
									<div className="space-y-2">
										<Label>Applicant Type</Label>
										<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
											<CheckboxItem
												id="pwd-application-new"
												label="New Applicant"
												checked={
													formState.application_type ===
													"new_applicant"
												}
												onCheckedChange={(checked) =>
													checked
														? setSingleCheckboxValue(
																"application_type",
																"new_applicant",
															)
														: setSingleCheckboxValue(
																"application_type",
																"new_applicant",
															)
												}
											/>
											<CheckboxItem
												id="pwd-application-renewal"
												label="Renewal"
												checked={
													formState.application_type ===
													"renewal"
												}
												onCheckedChange={(checked) =>
													checked
														? setSingleCheckboxValue(
																"application_type",
																"renewal",
															)
														: setSingleCheckboxValue(
																"application_type",
																"renewal",
															)
												}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-1">
											<Label>
												Persons with Disability Number
											</Label>
											<Input
												value={formState.pwd_number}
												onChange={handleChange(
													"pwd_number",
												)}
												placeholder="PWD number"
											/>
										</div>
										<div className="space-y-1">
											<Label>Date Applied</Label>
											<Input
												type="date"
												value={formState.date_applied}
												onChange={handleChange(
													"date_applied",
												)}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label>Personal Information</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-4">
											<div className="space-y-1">
												<Label>Last Name</Label>
												<Input
													value={formState.last_name}
													onChange={handleChange(
														"last_name",
													)}
													placeholder="Last name"
												/>
											</div>
											<div className="space-y-1">
												<Label>First Name</Label>
												<Input
													value={formState.first_name}
													onChange={handleChange(
														"first_name",
													)}
													placeholder="First name"
												/>
											</div>
											<div className="space-y-1">
												<Label>Middle Name</Label>
												<Input
													value={
														formState.middle_name
													}
													onChange={handleChange(
														"middle_name",
													)}
													placeholder="Middle name"
												/>
											</div>
											<div className="space-y-1">
												<Label>Suffix</Label>
												<Input
													value={formState.suffix}
													onChange={handleChange(
														"suffix",
													)}
													placeholder="Jr., Sr., III"
												/>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-1">
											<Label>Date of Birth</Label>
											<Input
												type="date"
												value={formState.date_of_birth}
												onChange={handleChange(
													"date_of_birth",
												)}
											/>
										</div>
										<div className="space-y-2">
											<Label>Sex</Label>
											<div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
												<CheckboxItem
													id="pwd-sex-male"
													label="Male"
													checked={
														formState.sex === "male"
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"sex",
															"male",
														)
													}
												/>
												<CheckboxItem
													id="pwd-sex-female"
													label="Female"
													checked={
														formState.sex ===
														"female"
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"sex",
															"female",
														)
													}
												/>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<Label>Civil Status</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<CheckboxItem
												id="pwd-civil-single"
												label="Single"
												checked={
													formState.civil_status ===
													"single"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"civil_status",
														"single",
													)
												}
											/>
											<CheckboxItem
												id="pwd-civil-separated"
												label="Separated"
												checked={
													formState.civil_status ===
													"separated"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"civil_status",
														"separated",
													)
												}
											/>
											<CheckboxItem
												id="pwd-civil-cohabitation"
												label="Cohabitation/Live-in"
												checked={
													formState.civil_status ===
													"cohabitation_livein"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"civil_status",
														"cohabitation_livein",
													)
												}
											/>
											<CheckboxItem
												id="pwd-civil-married"
												label="Married"
												checked={
													formState.civil_status ===
													"married"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"civil_status",
														"married",
													)
												}
											/>
											<CheckboxItem
												id="pwd-civil-widowed"
												label="Widowed"
												checked={
													formState.civil_status ===
													"widowed"
												}
												onCheckedChange={() =>
													setSingleCheckboxValue(
														"civil_status",
														"widowed",
													)
												}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4 rounded-lg border p-4">
									<div className="space-y-2">
										<Label>Type of Disability</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												"Deaf or Hard of hearing",
												"Intellectual Disability",
												"Learning Disability",
												"Mental Disability",
												"Physical Disability",
												"Psychosocial Disability",
												"Speech and Language Impairment",
												"Visual Disability",
												"Cancer",
												"Rare Disease",
											].map((label) => {
												const value = label
													.toLowerCase()
													.replace(/\s+/g, "_")
													.replace(/\//g, "_")
													.replace(
														/[^a-z0-9_]+/g,
														"",
													);
												return (
													<CheckboxItem
														key={value}
														id={`pwd-disability-${value}`}
														label={label}
														checked={formState.type_of_disability.includes(
															value,
														)}
														onCheckedChange={() =>
															toggleArrayValue(
																"type_of_disability",
																value,
															)
														}
													/>
												);
											})}
										</div>
									</div>

									<div className="space-y-2">
										<Label>Cause of Disability</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												"Autism",
												"ADHD",
												"Cerebral Palsy",
												"Down Syndrome",
												"Chronic Illness",
												"Injury",
											].map((label) => {
												const value = label
													.toLowerCase()
													.replace(/\s+/g, "_")
													.replace(
														/[^a-z0-9_]+/g,
														"",
													);
												return (
													<CheckboxItem
														key={value}
														id={`pwd-cause-${value}`}
														label={label}
														checked={formState.cause_of_disability.includes(
															value,
														)}
														onCheckedChange={() =>
															toggleArrayValue(
																"cause_of_disability",
																value,
															)
														}
													/>
												);
											})}
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="second" className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-4 rounded-lg border p-4">
									<div className="space-y-2">
										<Label>Residence Address</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-5">
											<div className="space-y-1">
												<Label>House No.</Label>
												<Input
													value={
														formState.house_no_street
													}
													onChange={handleChange(
														"house_no_street",
													)}
													placeholder="House no./Street"
												/>
											</div>
											<div className="space-y-1">
												<Label>Barangay</Label>
												<Input
													value={formState.barangay}
													onChange={handleChange(
														"barangay",
													)}
													placeholder="Barangay"
												/>
											</div>
											<div className="space-y-1">
												<Label>Municipality</Label>
												<Input
													value={
														formState.municipality
													}
													onChange={handleChange(
														"municipality",
													)}
													placeholder="Municipality"
												/>
											</div>
											<div className="space-y-1">
												<Label>Province</Label>
												<Input
													value={formState.province}
													onChange={handleChange(
														"province",
													)}
													placeholder="Province"
												/>
											</div>
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
										</div>
									</div>

									<div className="space-y-2">
										<Label>Contact Details</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-3">
											<div className="space-y-1">
												<Label>Landline Number</Label>
												<Input
													value={
														formState.landline_number
													}
													onChange={handleChange(
														"landline_number",
													)}
													placeholder="Landline"
												/>
											</div>
											<div className="space-y-1">
												<Label>Mobile No.</Label>
												<Input
													value={formState.mobile_no}
													onChange={handleChange(
														"mobile_no",
													)}
													placeholder="Mobile"
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

									<div className="space-y-2">
										<Label>Educational Attainment</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "None",
													value: "none",
												},
												{
													label: "Kindergarten",
													value: "kindergarten",
												},
												{
													label: "Elementary",
													value: "elementary",
												},
												{
													label: "Junior High School",
													value: "junior_high_school",
												},
												{
													label: "Senior High School",
													value: "senior_high_school",
												},
												{
													label: "College",
													value: "college",
												},
												{
													label: "Vocational",
													value: "vocational",
												},
												{
													label: "Post Graduate",
													value: "post_graduate",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-educ-${opt.value}`}
													label={opt.label}
													checked={
														formState.educational_attainment ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"educational_attainment",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>
								</div>

								<div className="space-y-4 rounded-lg border p-4">
									<div className="space-y-2">
										<Label>Status of Employment</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "Employed",
													value: "employed",
												},
												{
													label: "Unemployed",
													value: "unemployed",
												},
												{
													label: "Self-employed",
													value: "self_employed",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-empstatus-${opt.value}`}
													label={opt.label}
													checked={
														formState.employment_status ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"employment_status",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<Label>Category of Employment</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "Government",
													value: "government",
												},
												{
													label: "Private",
													value: "private",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-empcat-${opt.value}`}
													label={opt.label}
													checked={
														formState.employment_category ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"employment_category",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<Label>Types of Employment</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "Permanent/Regular",
													value: "permanent_regular",
												},
												{
													label: "Seasonal",
													value: "seasonal",
												},
												{
													label: "Casual",
													value: "casual",
												},
												{
													label: "Emergency",
													value: "emergency",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-emptype-${opt.value}`}
													label={opt.label}
													checked={
														formState.type_of_employment ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"type_of_employment",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<Label>Occupation</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "Manager",
													value: "manager",
												},
												{
													label: "Professional",
													value: "professional",
												},
												{
													label: "Technicians and Associate Professionals",
													value: "technicians_associate_professionals",
												},
												{
													label: "Clerical Support Workers",
													value: "clerical_support_workers",
												},
												{
													label: "Service and Sales Workers",
													value: "service_sales_workers",
												},
												{
													label: "Skilled Agricultural Worker",
													value: "skilled_agricultural_worker",
												},
												{
													label: "Craft and Related Trade Workers",
													value: "craft_related_trade_workers",
												},
												{
													label: "Plant and Machine Operators",
													value: "plant_machine_operators",
												},
												{
													label: "Elementary Occupations",
													value: "elementary_occupations",
												},
												{
													label: "Armed Forces Occupation",
													value: "armed_forces_occupation",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-occupation-${opt.value}`}
													label={opt.label}
													checked={
														formState.occupation ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"occupation",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="third" className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-4 rounded-lg border p-4">
									<div className="space-y-2">
										<Label>
											Organizational Information
										</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-4">
											<div className="space-y-1">
												<Label>Org Affiliated</Label>
												<Input
													value={
														formState.organization_affiliated
													}
													onChange={handleChange(
														"organization_affiliated",
													)}
													placeholder="Organization"
												/>
											</div>
											<div className="space-y-1">
												<Label>Contact Person</Label>
												<Input
													value={
														formState.contact_person
													}
													onChange={handleChange(
														"contact_person",
													)}
													placeholder="Contact person"
												/>
											</div>
											<div className="space-y-1">
												<Label>Office Address</Label>
												<Input
													value={
														formState.office_address
													}
													onChange={handleChange(
														"office_address",
													)}
													placeholder="Office address"
												/>
											</div>
											<div className="space-y-1">
												<Label>Tel No.</Label>
												<Input
													value={formState.tel_no}
													onChange={handleChange(
														"tel_no",
													)}
													placeholder="Tel no"
												/>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<Label>ID Reference No.</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-5">
											{[
												{ label: "SSS", field: "sss" },
												{
													label: "GSIS",
													field: "gsis",
												},
												{
													label: "PAG IBIG",
													field: "pag_ibig",
												},
												{ label: "PSN", field: "psn" },
												{
													label: "Philhealth",
													field: "philhealth",
												},
											].map((item) => (
												<div
													key={item.field}
													className="space-y-1"
												>
													<Label>{item.label}</Label>
													<Input
														value={
															formState[
																item.field
															]
														}
														onChange={handleChange(
															item.field,
														)}
														placeholder={item.label}
													/>
												</div>
											))}
										</div>
									</div>

									<div className="space-y-2">
										<Label>Family Background</Label>
										<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
											<div className="space-y-1">
												<Label>Father's Name</Label>
												<Input
													value={
														formState.fathers_name
													}
													onChange={handleChange(
														"fathers_name",
													)}
													placeholder="Father's name"
												/>
											</div>
											<div className="space-y-1">
												<Label>Mother's Name</Label>
												<Input
													value={
														formState.mothers_name
													}
													onChange={handleChange(
														"mothers_name",
													)}
													placeholder="Mother's name"
												/>
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<Label>Accomplished By</Label>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{[
												{
													label: "Applicant",
													value: "applicant",
												},
												{
													label: "Guardian",
													value: "guardian",
												},
												{
													label: "Representative",
													value: "representative",
												},
											].map((opt) => (
												<CheckboxItem
													key={opt.value}
													id={`pwd-accomplished-${opt.value}`}
													label={opt.label}
													checked={
														formState.accomplished_by ===
														opt.value
													}
													onCheckedChange={() =>
														setSingleCheckboxValue(
															"accomplished_by",
															opt.value,
														)
													}
												/>
											))}
										</div>
									</div>
								</div>

								<div className="space-y-4 rounded-lg border p-4">
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-1">
											<Label>
												Name of Certifying Physician
											</Label>
											<Input
												value={
													formState.certifying_physician
												}
												onChange={handleChange(
													"certifying_physician",
												)}
												placeholder="Physician"
											/>
										</div>
										<div className="space-y-1">
											<Label>License No.</Label>
											<Input
												value={formState.license_no}
												onChange={handleChange(
													"license_no",
												)}
												placeholder="License no"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-1">
											<Label>Processing Officer</Label>
											<Input
												value={
													formState.processing_officer
												}
												onChange={handleChange(
													"processing_officer",
												)}
												placeholder="Processing officer"
											/>
										</div>
										<div className="space-y-1">
											<Label>Approving Officer</Label>
											<Input
												value={
													formState.approving_officer
												}
												onChange={handleChange(
													"approving_officer",
												)}
												placeholder="Approving officer"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-1">
											<Label>Encoder</Label>
											<Input
												value={formState.encoder}
												onChange={handleChange(
													"encoder",
												)}
												placeholder="Encoder"
											/>
										</div>
										<div className="space-y-1">
											<Label>
												Name of Reporting Unit
											</Label>
											<Input
												value={formState.reporting_unit}
												onChange={handleChange(
													"reporting_unit",
												)}
												placeholder="Reporting unit"
											/>
										</div>
									</div>

									<div className="space-y-1">
										<Label>Control No.</Label>
										<Input
											value={formState.control_no}
											onChange={handleChange(
												"control_no",
											)}
											placeholder="Control no"
										/>
									</div>
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
