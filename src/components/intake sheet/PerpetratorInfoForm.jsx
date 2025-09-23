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

const schema = z.object({
	name: z.string().min(2, "Required"),
	age: z.string().min(1, "Required"),
	alias: z.string().min(2, "Required"),
	sex: z.string().min(1, "Required"),
	address: z.string().min(2, "Required"),
	victimRelation: z.string().min(1, "Required"),
	offenceType: z.string().min(1, "Required"),
	commissionDateTime: z.string({ required_error: "Commission date required" }),
});

export function PerpetratorInfoForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			...data[sectionKey],
			commissionDateTime: data[sectionKey]?.commissionDateTime
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

					<div className="flex gap-2">
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
					</div>

					<div className="gap-2 flex">
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
					<div className="gap-2 flex">
						<div className="flex-1">
							{/* VICTIM'S RELATION */}
							<FormField
								control={form.control}
								name="victimRelation"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Victim's Relation</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"victimRelation",
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
						<div className="flex-1">
							{/* TYPE OF OFFENCE */}
							<FormField
								control={form.control}
								name="offenceType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Offence Type</FormLabel>
										<FormControl>
											<Input
												{...field}
												onChange={(e) => {
													field.onChange(e);
													setSectionField(
														sectionKey,
														"offenceType",
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

					{/* COMMISSION DATE & TIME */}
					<div className="flex-1">
						<FormField
							control={form.control}
							name="commissionDateTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Commission Date & Time
									</FormLabel>
									<FormControl>
										<input
											type="datetime-local"
											className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-1/2 justify-start text-left font-normal py-1 px-2  rounded-md"
											value={field.value || ""}
											onChange={(e) => {
												const val = e.target.value;
												field.onChange(val);
												setSectionField(
													sectionKey,
													"commissionDateTime",
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
