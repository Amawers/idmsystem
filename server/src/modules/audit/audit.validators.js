import { z } from "zod";

export const createAuditSchema = z.object({
	body: z.object({
		actionType: z.string().min(1),
		actionCategory: z.string().min(1),
		description: z.string().min(1),
		resourceType: z.string().optional().nullable(),
		resourceId: z.string().optional().nullable(),
		metadata: z.record(z.any()).optional().nullable(),
		severity: z.enum(["info", "warning", "critical"]).optional(),
	}),
});

export const listAuditSchema = z.object({
	query: z.object({
		userId: z.string().uuid().optional(),
		actionCategory: z.string().optional(),
		actionType: z.string().optional(),
		severity: z.enum(["info", "warning", "critical"]).optional(),
		startDate: z.string().datetime().optional(),
		endDate: z.string().datetime().optional(),
		limit: z.coerce.number().max(200).optional(),
		offset: z.coerce.number().optional(),
	}).optional(),
});
