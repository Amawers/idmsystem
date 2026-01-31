"use client";
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

const tabOrder = ["identification", "familyComposition", "other"];

const tabLabels = {
	identification: "Identification Data",
	familyComposition: "Family Composition",
	other: "Other",
};

export default function IntakeSheetSP({ open, setOpen, onSuccess }) {
	const [currentTabIndex, setCurrentTabIndex] = useState(0);
	const [formState, setFormState] = useState({
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
		cellphoneNumber: "",
		emergencyContactPerson: "",
		emergencyContactNumber: "",
		notes: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(0);
			setIsSubmitting(false);
			setFormState({
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
				cellphoneNumber: "",
				emergencyContactPerson: "",
				emergencyContactNumber: "",
				notes: "",
			});
		}
	}, [open]);

	const currentTab = tabOrder[currentTabIndex];

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
			// Template only — replace with Supabase or offline save logic
			toast.success("Single Parent signup saved", {
				description:
					"Template modal saved. Replace with your own logic.",
			});
			setOpen(false);
			onSuccess?.();
		} catch (err) {
			toast.error("Signup failed", {
				description: err?.message || "Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Single Parent Signup</DialogTitle>
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

					<form
						onSubmit={handleSubmit}
						className="flex-1 overflow-auto"
					>
						<TabsContent
							value="identification"
							className="space-y-6"
						>
							<div className="grid gap-6 lg:grid-cols-2">
								{/* Left column */}
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

								{/* Right column */}
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
								<div className="grid gap-4 md:grid-cols-3">
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
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								className="cursor-pointer"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="cursor-pointer"
							>
								{isSubmitting ? "Saving..." : "Save"}
							</Button>
						</div>
					</form>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
