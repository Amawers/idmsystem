import { z } from "zod";

const bodySchema = z
	.object({
		full_name: z.string().min(3).max(120).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

export const profileUpdateSchema = z.object({
	body: bodySchema,
});
