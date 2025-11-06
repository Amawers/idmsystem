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
import { Textarea } from "@/components/ui/textarea";

// ✅ Schema with mix of text, select, and date
const schema = z.object({
	violation: z.string().min(2, "Required"),
	dateTimeCommitted: z.string({ required_error: "Date & time required" }),
	status: z.string().min(2, "Required"),
	specificViolation: z.string().min(2, "Required"),
	admissionDate: z.string({ required_error: "Admission date required" }),
	repeatOffender: z.string().min(2, "Required"),
	previousOffense: z.string().min(2, "Required"),
	placeCommitted: z.string().min(2, "Required"),
});

export function ViolationCICLCARForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			...data[sectionKey],
			admissionDate: data[sectionKey]?.admissionDate || "",
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
					{/*//* VIOLATION & DATE TIME COMMITED */}
					<div className="flex gap-2">
						{/* VIOLATION */}
						<FormField
							control={form.control}
							name="violation"
							render={({ field }) => (
								<FormItem className="flex-2">
									<FormLabel>Violation</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"violation",
													e.target.value
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* DATE & TIME COMMITTED */}
						<FormField
							control={form.control}
							name="dateTimeCommitted"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Date & Time Committed</FormLabel>
									<FormControl>
										<input
											type="datetime-local"
											className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-full text-left font-normal py-1 px-2 rounded-md"
											value={field.value || ""}
											onChange={(e) => {
												const val = e.target.value;
												field.onChange(val);
												setSectionField(
													sectionKey,
													"dateTimeCommitted",
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

					{/*//* STATUS */}
					<div className="flex gap-2">
						{/* STATUS */}
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="flex-[1]">
									<FormLabel>Status</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"status",
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

					{/*//* SPECIFIC VIOLATION */}
					<div className="flex gap-2 w-full">
						<FormField
							control={form.control}
							name="specificViolation"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Specific Violation</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"specificViolation",
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

					{/*//* ADMISSION DATE & REPEAT OFFENDER */}
					<div className="flex gap-2 w-full">
						{/* ADMISSION DATE */}
						<div className="flex-1">
							<FormField
								control={form.control}
								name="admissionDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Admission Date</FormLabel>
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
														"admissionDate",
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

						{/* REPEAT OFFENDER */}
						<div className="gap-0">
							<FormField
								className="w-2/3"
								control={form.control}
								name="repeatOffender"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Repeat Offender?</FormLabel>
										<Select
											onValueChange={(val) => {
												field.onChange(val);
												setSectionField(
													sectionKey,
													"repeatOffender",
													val
												);
											}}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select answer" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="yes">
													Yes
												</SelectItem>
												<SelectItem value="no">
													No
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/*//* PLACE COMMITTED */}
					<div className="col-span-1">
						<FormField
							control={form.control}
							name="placeCommitted"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Place Committed</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"placeCommitted",
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

					{/*//* IF YES */}
					<div className="">
						{/* Textarea Field */}
						<FormField
							control={form.control}
							name="previousOffense"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="Enter previous offense..."
											className="min-h-40 resize"
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
					<Button type="button" variant="outline" onClick={goBack} className="cursor-pointer">
						Back
					</Button>
					<Button type="submit" className="cursor-pointer">Next</Button>
				</div>
			</form>
		</Form>
	);
}
