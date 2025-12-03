import { query } from "../../config/database.js";

export async function insertAuditLog(log) {
	const { rows } = await query(
		`INSERT INTO audit_log (
			user_id,
			user_email,
			user_role,
			action_type,
			action_category,
			description,
			resource_type,
			resource_id,
			metadata,
			severity
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING *`,
		[
			log.userId,
			log.userEmail,
			log.userRole,
			log.actionType,
			log.actionCategory,
			log.description,
			log.resourceType,
			log.resourceId,
			log.metadata,
			log.severity ?? "info",
		]
	);
	return rows[0];
}

export async function fetchAuditLogs({
	userId,
	actionCategory,
	actionType,
	severity,
	startDate,
	endDate,
	limit = 50,
	offset = 0,
}) {
	const conditions = [];
	const params = [];
	let idx = 1;

	if (userId) {
		conditions.push(`user_id = $${idx}`);
		params.push(userId);
		idx += 1;
	}
	if (actionCategory) {
		conditions.push(`action_category = $${idx}`);
		params.push(actionCategory);
		idx += 1;
	}
	if (actionType) {
		conditions.push(`action_type = $${idx}`);
		params.push(actionType);
		idx += 1;
	}
	if (severity) {
		conditions.push(`severity = $${idx}`);
		params.push(severity);
		idx += 1;
	}
	if (startDate) {
		conditions.push(`created_at >= $${idx}`);
		params.push(startDate);
		idx += 1;
	}
	if (endDate) {
		conditions.push(`created_at <= $${idx}`);
		params.push(endDate);
		idx += 1;
	}

	const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

	const sql = `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
	const countSql = `SELECT COUNT(*) FROM audit_log ${whereClause}`;

	const [{ rows }, countResult] = await Promise.all([
		query(sql, [...params, limit, offset]),
		query(countSql, params),
	]);

	return { data: rows, count: Number(countResult.rows[0].count) };
}
