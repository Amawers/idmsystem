import { z } from "zod";

const filterSchema = z.object({
	column: z.string(),
	operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
	value: z.any().optional(),
});

const orderSchema = z.object({
	column: z.string(),
	direction: z.enum(["asc", "desc"]).default("desc"),
});

const groupSchema = z.object({
	operator: z.enum(["or"]),
	filters: z.array(filterSchema).min(1),
});

export const tableQuerySchema = z.object({
	body: z.object({
		action: z.enum(["select", "insert", "update", "delete"]),
		table: z.string(),
		columns: z.array(z.string()).optional(),
		filters: z.array(filterSchema).optional(),
		order: z.array(orderSchema).optional(),
		values: z.any().optional(),
		range: z
			.object({
				limit: z.number().optional(),
				offset: z.number().optional(),
			})
			.optional(),
		returning: z.array(z.string()).optional(),
		count: z.enum(["exact", "planned", "estimated"]).optional(),
		groups: z.array(groupSchema).optional(),
	}),
});
