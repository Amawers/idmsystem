"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
	region: z.string().min(2, "Required"),
	province: z.string().min(2, "Required"),
	city: z.string().min(2, "Required"),
	barangay: z.string().min(2, "Required"),
	referredTo: z.string().min(2, "Required"),

	dateReferred: z.string({ required_error: "Date & time required" }),
	referralReason: z.string().min(2, "Required"),
});

export function ReferralForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			...data[sectionKey],
			birthday: data[sectionKey]?.birthday || "",
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
					{/* LEFT SIDE */}
					<div className="space-y-4">
						{/* //* REGION & PROVINCE */}
						<div className="flex gap-2">
							{/* REGION */}
							<FormField
								control={form.control}
								name="region"
								render={({ field }) => (
									<FormItem className="flex-[1]">
										<FormLabel>Region</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"region",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{/* PROVINCE */}
							<FormField
								control={form.control}
								name="province"
								render={({ field }) => (
									<FormItem className="flex-[1]">
										<FormLabel>Province</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"province",
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
						{/* //* CITY & BARANGAY */}
						<div className="flex gap-2">
							{/* CITY */}
							<FormField
								control={form.control}
								name="city"
								render={({ field }) => (
									<FormItem className="flex-[1]">
										<FormLabel>City</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"city",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{/* BARANGAY */}
							<FormField
								control={form.control}
								name="barangay"
								render={({ field }) => (
									<FormItem className="flex-[1]">
										<FormLabel>Barangay</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"barangay",
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
						{/* //* REFERRED TTO & DATE REFFERED */}
						<div className="flex gap-2">
							{/* REFERRED TO */}
							<FormField
								control={form.control}
								name="referredTo"
								render={({ field }) => (
									<FormItem className="flex-[1]">
										<FormLabel>Referred To</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"referredTo",
														e.target.value
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{/* DATE REFERRED (Date Picker) */}
							<div className="flex-1">
								<FormField
									control={form.control}
									name="dateReferred"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Date Referred</FormLabel>
											<FormControl>
												<input
													type="date"
													className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2  rounded-md"
													value={field.value || ""}
													onChange={(e) => {
														const val =
															e.target.value;
														field.onChange(val);
														setSectionField(
															sectionKey,
															"dateReferred",
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
						</div>
					</div>
					{/* RIGHT SIDE */}
					<div className="space-y-4">
						{/* Textarea Field */}
						<FormField
							control={form.control}
							name="referralReason"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="Enter reasons for referral..."
											className="min-h-52 resize"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
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
