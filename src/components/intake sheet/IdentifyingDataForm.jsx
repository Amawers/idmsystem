"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";

// ✅ Schema with mix of text, select, and date
const schema = z.object({
	name: z.string().min(2, "Required"),
	alias: z.string().min(2, "Required"),
	age: z.string().min(1, "Required"),
	status: z.string().min(1, "Required"),
	address: z.string().min(2, "Required"),
	religion: z.string().min(2, "Required"),
	educationalAttainment: z.string().min(2, "Required"),
	sex: z.string().min(1, "Required"),
	birthday: z.string({ required_error: "Birthday required" }),
	birthPlace: z.string().min(2, "Required"),
	referralSource: z.string().min(2, "Required"),
	occupation: z.string().min(2, "Required"),
	income: z.string().min(1, "Required"),
	intakeDate: z.string({ required_error: "Intake date required" }),
	caseType: z.string().min(2, "Required"),
	contactPerson: z.string().min(2, "Required"),
	respondentName: z.string().min(2, "Required"),
});

export function IdentifyingDataForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();

	const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {
    ...data[sectionKey],
    birthday: data[sectionKey]?.birthday || "",
    intakeDate: data[sectionKey]?.intakeDate || "",
  },
});


	function onSubmit(values) {
		console.log("✅ Submitted values:", values);
		Object.keys(values).forEach((key) => {
			setSectionField(sectionKey, key, values[key]);
		});
		goNext();
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Grid layout: 2 columns */}
				<div className="grid grid-cols-2 gap-4">
					{/* NAME */}
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input
										{...field}
										onChange={(e) => {
											field.onChange(e);
											setSectionField(
												sectionKey,
												"name",
												e.target.value
											);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* SOURCE REFERRAL */}
					<FormField
						control={form.control}
						name="referralSource"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Source of Referral</FormLabel>
								<FormControl>
									<Input
										{...field}
										onChange={(e) => {
											field.onChange(e);
											setSectionField(
												sectionKey,
												"referralSource",
												e.target.value
											);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-2">
						{/* ALIAS */}
						<FormField
							control={form.control}
							name="alias"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Alias</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"alias",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* AGE */}
						<FormField
							control={form.control}
							name="age"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Age</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"age",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* STATUS */}
						<div className="w-1/3">
							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Status</FormLabel>
										<Select
											onValueChange={(val) => {
												field.onChange(val);
												setSectionField(
													sectionKey,
													"status",
													val
												);
											}}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="single">
													Single
												</SelectItem>
												<SelectItem value="married">
													Married
												</SelectItem>
												<SelectItem value="widowed">
													Widowed
												</SelectItem>
												<SelectItem value="separated">
													Separated
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="flex gap-2 w-full">
						{/* OCCUPATION */}
						<FormField
							control={form.control}
							name="occupation"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Occupation</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"occupation",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* INCOME */}
						<FormField
							control={form.control}
							name="income"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Income</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"income",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="gap-2 flex">
						{/* SEX */}
						<FormField
							control={form.control}
							name="sex"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Sex</FormLabel>
									<Select
										onValueChange={(val) => {
											field.onChange(val);
											setSectionField(
												sectionKey,
												"sex",
												val
											);
										}}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select sex" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="male">
												Male
											</SelectItem>
											<SelectItem value="Female">
												Female
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex-1">
							{/* ADDRESS */}
							<FormField
								control={form.control}
								name="address"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Address</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"address",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						{/* DATE INTAKE (Date Picker) */}
						<div className="flex-1">
							<FormField
							control={form.control}
							name="intakeDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Date of Intake</FormLabel>
									<FormControl>
										<input
											type="date"
											className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2  rounded-md"
											value={field.value || ""}
											onChange={(e) => {
												const val = e.target.value;
												field.onChange(val);
												setSectionField(
													sectionKey,
													"intakeDate",
													val
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						</div>

						{/* CASE TYPE */}
						<div className="flex-1">
							<FormField
								control={form.control}
								name="caseType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type of Case</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"caseType",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="flex gap-2">
						{/* RELIGION */}
						<FormField
							control={form.control}
							name="religion"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Religion</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"religion",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* EDUCATIONAL ATTAINMENT */}
						<FormField
							control={form.control}
							name="educationalAttainment"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>
										Educational Attainment
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"educationalAttainment",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* CONTACT PERSON */}
					<FormField
						control={form.control}
						name="contactPerson"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Contact Person</FormLabel>
								<FormControl>
									<Input
										{...field}
										onChange={(e) => {
											field.onChange(e);
											setSectionField(
												sectionKey,
												"contactPerson",
												e.target.value
											);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-2">
						{/* Birthdate (Date Picker) */}
						<FormField
							control={form.control}
							name="birthday"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Birth Day</FormLabel>
									<FormControl>
										<input
											type="date"
											className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2  rounded-md"
											value={field.value || ""}
											onChange={(e) => {
												const val = e.target.value;
												field.onChange(val);
												setSectionField(
													sectionKey,
													"birthday",
													val
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex-1">
							{/* BIRTH PLACE */}
							<FormField
								control={form.control}
								name="birthPlace"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Birth Place</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"birthPlace",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* RESPONDENT NAME */}
					<FormField
						control={form.control}
						name="respondentName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Respondent Name</FormLabel>
								<FormControl>
									<Input
										{...field}
										onChange={(e) => {
											field.onChange(e);
											setSectionField(
												sectionKey,
												"respondentName",
												e.target.value
											);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="flex justify-between">
					<Button type="button" variant="outline" onClick={goBack}>
						Back
					</Button>
					<Button type="submit">Next</Button>
				</div>
			</form>
		</Form>
	);
}
