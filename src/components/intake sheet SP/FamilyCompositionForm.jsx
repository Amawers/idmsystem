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
import { Trash2, Pencil } from "lucide-react";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const relationOptions = [
	"father",
	"mother",
	"spouse",
	"son",
	"daughter",
	"brother",
	"sister",
	"grandfather",
	"grandmother",
	"guardian",
];

const statusOptions = ["single", "married", "widowed", "separated"];

export function FamilyCompositionForm({ sectionKey }) {
	const { data, setSectionField } = useIntakeFormStore();
	const [open, setOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState(null);

	const [members, setMembers] = useState(
		Array.isArray(data[sectionKey]?.members)
			? data[sectionKey].members
			: [],
	);

	const form = useForm({
		defaultValues: {
			name: "",
			age: "",
			status: "",
			relationToClient: "",
			birthday: "",
			educationalAttainment: "",
			occupation: "",
		},
	});

	function onSubmit(values) {
		if (editingIndex !== null) {
			const updated = [...members];
			updated[editingIndex] = values;
			setMembers(updated);
			setSectionField(sectionKey, "members", updated);
		} else {
			const updated = [...members, values];
			setMembers(updated);
			setSectionField(sectionKey, "members", updated);
		}
		setOpen(false);
		setEditingIndex(null);
		form.reset();
	}

	function editMember(index) {
		const member = members[index];
		form.reset(member);
		setEditingIndex(index);
		setOpen(true);
	}

	function removeMember(index) {
		const updated = members.filter((_, i) => i !== index);
		setMembers(updated);
		setSectionField(sectionKey, "members", updated);
	}

	function handleDialogClose(isOpen) {
		setOpen(isOpen);
		if (!isOpen) {
			setEditingIndex(null);
			form.reset();
		}
	}

	return (
		<div className="space-y-4">
			<div className="border rounded-lg overflow-hidden">
				<div className="grid grid-cols-9 bg-muted font-medium text-sm px-3 py-2">
					<div>Name</div>
					<div>Age</div>
					<div>Status</div>
					<div>Relation</div>
					<div>Birthday</div>
					<div>Education</div>
					<div>Occupation</div>
					<div className="text-center col-span-2">Actions</div>
				</div>

				<div className="divide-y max-h-64 overflow-y-auto">
					{members.length === 0 ? (
						<p className="p-3 text-sm text-muted-foreground">
							No family members added yet.
						</p>
					) : (
						members.map((m, i) => (
							<div
								key={i}
								className="grid grid-cols-9 items-center px-3 py-2 text-sm"
							>
								<div>{m.name}</div>
								<div>{m.age}</div>
								<div>{m.status}</div>
								<div>{m.relationToClient}</div>
								<div>{m.birthday}</div>
								<div>{m.educationalAttainment}</div>
								<div>{m.occupation}</div>
								<div className="flex justify-center gap-1 col-span-2">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										onClick={() => editMember(i)}
										title="Edit member"
										className="cursor-pointer"
									>
										<Pencil className="h-4 w-4 text-blue-500" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										onClick={() => removeMember(i)}
										title="Delete member"
										className="cursor-pointer"
									>
										<Trash2 className="h-4 w-4 text-red-500" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			<div className="flex justify-end">
				<Button
					type="button"
					onClick={() => setOpen(true)}
					className="cursor-pointer"
				>
					Add Family Member
				</Button>
			</div>

			<Dialog open={open} onOpenChange={handleDialogClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingIndex !== null
								? "Edit Family Member"
								: "Add Family Member"}
						</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-3"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="age"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Age</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="number"
													min="0"
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Status</FormLabel>
											<Select
												onValueChange={(val) =>
													field.onChange(val)
												}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select status" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{statusOptions.map(
														(option) => (
															<SelectItem
																key={option}
																value={option}
															>
																{option}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="relationToClient"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Relation to Client
											</FormLabel>
											<Select
												onValueChange={(val) =>
													field.onChange(val)
												}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select relation" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{relationOptions.map(
														(option) => (
															<SelectItem
																key={option}
																value={option}
															>
																{option}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="birthday"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Birthday</FormLabel>
											<FormControl>
												<Input {...field} type="date" />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="educationalAttainment"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Educational Attainment
										</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="occupation"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Occupation</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="flex justify-end pt-2">
								<Button
									type="submit"
									className="cursor-pointer"
								>
									{editingIndex !== null ? "Update" : "Save"}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
