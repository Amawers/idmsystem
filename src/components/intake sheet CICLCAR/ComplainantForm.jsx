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
	sex: z.string().min(2, "Required"),
	birthday: z.string({ required_error: "Date & time required" }),
	victim: z.string().min(2, "Required"),
	relationship: z.string().min(2, "Required"),
	contactNumber: z.string().min(2, "Required"),
	address: z.string().min(2, "Required"),
});

export function ComplainantForm({ sectionKey, goNext, goBack }) {
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
					{/* //* NAME & ALIAS */}
					<div className="flex gap-2">
						{/* NAME */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex-[2]">
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
						{/* ALIAS */}
						<FormField
							control={form.control}
							name="alias"
							render={({ field }) => (
								<FormItem className="flex-[1]">
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
					</div>

					{/*//* SEX & BIRTHDAY */}
					<div className="flex gap-2">
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
											<SelectTrigger className="cursor-pointer">
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
						{/* Birthdate (Date Picker) */}
						<div className="flex-1">
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
						</div>
					</div>

					{/*//* VICTIM, RELATIONSHIP, & CONTACT NUMBER */}
					<div className="flex gap-2 w-full">
						{/* VICTIM? */}
						<FormField
							className="w-2/3"
							control={form.control}
							name="victim"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Victim?</FormLabel>
									<Select
										onValueChange={(val) => {
											field.onChange(val);
											setSectionField(
												sectionKey,
												"victim",
												val
											);
										}}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger className="cursor-pointer">
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
						{/* RELATIONSHIP */}
						<FormField
							control={form.control}
							name="relationship"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Relationship</FormLabel>
									<Select
										onValueChange={(val) => {
											field.onChange(val);
											setSectionField(
												sectionKey,
												"relationship",
												val
											);
										}}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger className="cursor-pointer">
												<SelectValue placeholder="Select relationship" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="father">
												Father
											</SelectItem>
											<SelectItem value="mother">
												Mother
											</SelectItem>
											<SelectItem value="spouse">
												Spouse
											</SelectItem>
											<SelectItem value="son">
												Son
											</SelectItem>
											<SelectItem value="daughter">
												Daughter
											</SelectItem>
											<SelectItem value="brother">
												Brother
											</SelectItem>
											<SelectItem value="sister">
												Sister
											</SelectItem>
											<SelectItem value="grandfather">
												Grandfather
											</SelectItem>
											<SelectItem value="grandmother">
												Grandmother
											</SelectItem>
											<SelectItem value="uncle">
												Uncle
											</SelectItem>
											<SelectItem value="aunt">
												Aunt
											</SelectItem>
											<SelectItem value="nephew">
												Nephew
											</SelectItem>
											<SelectItem value="niece">
												Niece
											</SelectItem>
											<SelectItem value="cousin">
												Cousin
											</SelectItem>
											<SelectItem value="stepfather">
												Stepfather
											</SelectItem>
											<SelectItem value="stepmother">
												Stepmother
											</SelectItem>
											<SelectItem value="stepbrother">
												Stepbrother
											</SelectItem>
											<SelectItem value="stepsister">
												Stepsister
											</SelectItem>
											<SelectItem value="father-in-law">
												Father-in-law
											</SelectItem>
											<SelectItem value="mother-in-law">
												Mother-in-law
											</SelectItem>
											<SelectItem value="guardian">
												Guardian
											</SelectItem>
											<SelectItem value="foster-parent">
												Foster Parent
											</SelectItem>
											<SelectItem value="relative">
												Other Relative
											</SelectItem>
											<SelectItem value="neighbor">
												Neighbor
											</SelectItem>
											<SelectItem value="friend">
												Friend
											</SelectItem>
											<SelectItem value="acquaintance">
												Acquaintance
											</SelectItem>
											<SelectItem value="stranger">
												Stranger
											</SelectItem>
											<SelectItem value="other">
												Other
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* CONTACT NUMBER */}
						<FormField
							control={form.control}
							name="contactNumber"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>Contact Number</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												field.onChange(e);
												setSectionField(
													sectionKey,
													"contactNumber",
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

					{/*//* ADDRESS */}
					<div className="flex gap-2 w-full">
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem className="w-full">
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
