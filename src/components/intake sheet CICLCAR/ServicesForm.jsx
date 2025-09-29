"use client";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { useState } from "react";

export function ServicesForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();
	const [open, setOpen] = useState(false);

	// Load members from store, default to empty array
	const [services, setServices] = useState(
		Array.isArray(data[sectionKey]?.services)
			? data[sectionKey].services
			: []
	);

	const form = useForm({
		defaultValues: {
			type: "",
			service: "",
			dateProvided: "",
			dateCompleted: "",
		},
	});

	function onSubmit(values) {
		const updated = [...services, values];
		setServices(updated);
		// Save array under "members" field
		setSectionField(sectionKey, "services", updated);
		setOpen(false);
		form.reset();
	}

	function removeMember(index) {
		const updated = services.filter((_, i) => i !== index);
		setServices(updated);
		setSectionField(sectionKey, "services", updated);
	}

	return (
		<div className="space-y-4 ">
			{/* Services Table */}
			<div className="border rounded-lg overflow-hidden">
				<div className="grid grid-cols-5 bg-muted font-medium text-sm px-3 py-2">
					<div>Type</div>
					<div>Service</div>
					<div>Date Provided</div>
					<div>Date Completed</div>
					<div className="text-center">Action</div>
				</div>

				<div className="divide-y max-h-64 overflow-y-auto">
					{services.length === 0 ? (
						<p className="p-3 text-sm text-muted-foreground">
							No services added yet.
						</p>
					) : (
						services.map((m, i) => (
							<div
								key={i}
								className="grid grid-cols-5 items-center px-3 py-2 text-sm"
							>
								<div>{m.type}</div>
								<div>{m.service}</div>
								<div>{m.dateProvided}</div>
								<div>{m.dateCompleted}</div>
								<div className="flex justify-center">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										onClick={() => removeMember(i)}
									>
										<Trash2 className="h-4 w-4 text-red-500" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Add Member Button */}
			<div className="flex justify-end">
				<Button onClick={() => setOpen(true)}>Add Service</Button>
			</div>

			{/* Add Service Modal */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Service</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-3"
						>
							{/* //* TYPE */}
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							{/* //* SERVICE */}
							<FormField
								control={form.control}
								name="service"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Service</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>

							{/*//* DATE PROVIDED & DATE COMPLETED */}
							<div className="flex gap-4 w-full">
								{/* Date Provided */}
								<FormField
									control={form.control}
									name="dateProvided"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>Date Provided</FormLabel>
											<FormControl>
												<input
													type="date"
													className="w-full border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2 rounded-md"
													value={field.value || ""}
													onChange={(e) => {
														const val =
															e.target.value;
														field.onChange(val);
														setSectionField(
															sectionKey,
															"dateProvided",
															val
														);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Date Completed */}
								<FormField
									control={form.control}
									name="dateCompleted"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>
												Date Completed
											</FormLabel>
											<FormControl>
												<input
													type="date"
													className="w-full border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2 rounded-md"
													value={field.value || ""}
													onChange={(e) => {
														const val =
															e.target.value;
														field.onChange(val);
														setSectionField(
															sectionKey,
															"dateCompleted",
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

							{/*//* ADD SERVICE  */}
							<div className="flex justify-end pt-2">
								<Button type="submit">Save</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Navigation Buttons */}
			<div className="flex justify-between mt-4">
				<Button type="button" variant="outline" onClick={goBack}>
					Back
				</Button>
				<Button
					type="button"
					onClick={goNext}
					disabled={services.length === 0}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
