import { z } from "zod";

export const loginSchema = z.object({
	body: z.object({
		email: z.string().email(),
		password: z.string().min(8),
	}),
});

export const registerSchema = z.object({
	body: z.object({
		email: z.string().email(),
		password: z.string().min(12),
		role: z.enum(["admin", "case_manager", "program_manager", "executive"]).default("case_manager"),
		fullName: z.string().min(3),
	}),
});

export const refreshSchema = z.object({
	body: z.object({
		refreshToken: z.string().min(10),
	}),
});

export const passwordUpdateSchema = z.object({
	body: z.object({
		oldPassword: z.string().min(8),
		newPassword: z.string().min(12),
	}),
});
