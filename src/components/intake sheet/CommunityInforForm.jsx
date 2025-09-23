"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import {
	Form,
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";

const schema = z.object({
	communityInfo: z
		.string()
		.trim()
		.refine(
			(val) => val.split(/\s+/).filter(Boolean).length >= 5,
			"Please provide community info (min 5 words)"
		),
});

export function CommunityInfoForm({ sectionKey, goNext, goBack }) {
	const { data, setSectionField } = useIntakeFormStore();

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			communityInfo: data[sectionKey]?.communityInfo || "",
		},
	});

	function onSubmit(values) {
		console.log("✅ Submitted values:", values);
		setSectionField(sectionKey, values);
		goNext();
	}

	return (
		<div className="flex flex-col items-center w-full">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="w-4/4 space-y-4"
				>
					{/* Textarea Field */}
					<FormField
						control={form.control}
						name="communityInfo"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea
										placeholder="Enter community information..."
										className="min-h-80 resize"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Navigation buttons */}
					<div className="flex justify-between w-full">
						<Button
							type="button"
							variant="outline"
							onClick={goBack}
						>
							Back
						</Button>
						<Button type="submit">Next</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
