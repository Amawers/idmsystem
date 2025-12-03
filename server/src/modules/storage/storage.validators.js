import { z } from "zod";

export const signedUrlSchema = z.object({
	body: z.object({
		filePath: z.string().min(1),
	}),
});
