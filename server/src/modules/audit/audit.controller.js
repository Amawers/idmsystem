import { insertAuditLog, fetchAuditLogs } from "./audit.service.js";
import { success } from "../../utils/responses.js";
import { getProfileById } from "../profiles/profile.service.js";

export const AuditController = {
	async create(req, res) {
		const { actionType, actionCategory, description, resourceType, resourceId, metadata, severity } =
			req.validated.body;
		const profile = await getProfileById(req.user.sub);
		const log = await insertAuditLog({
			userId: req.user.sub,
			userEmail: req.user.email,
			userRole: profile?.role ?? req.user.role,
			actionType,
			actionCategory,
			description,
			resourceType,
			resourceId,
			metadata,
			severity,
		});
		return success(res, log);
	},

	async list(req, res) {
		const query = req.validated?.query ?? {};
		const { data, count } = await fetchAuditLogs({
			...query,
			startDate: query.startDate ? new Date(query.startDate) : undefined,
			endDate: query.endDate ? new Date(query.endDate) : undefined,
		});
		return success(res, data, { count });
	},
};
