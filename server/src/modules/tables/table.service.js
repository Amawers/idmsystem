import { query } from "../../config/database.js";
import { getTableMetadata } from "../../config/tableRegistry.js";
import { broadcastTableChange } from "../../config/realtime.js";

export async function executeQuery(payload) {
	const metadata = await getTableMetadata(payload.table);
	switch (payload.action) {
		case "select":
			return runSelect(metadata, payload);
		case "insert":
			return runInsert(metadata, payload);
		case "update":
			return runUpdate(metadata, payload);
		case "delete":
			return runDelete(metadata, payload);
		default:
			throw new Error(`Unsupported action ${payload.action}`);
	}
}

async function runSelect(metadata, payload) {
	const columns = resolveColumns(metadata, payload.columns);
	const where = buildWhere(metadata, payload.filters ?? [], payload.groups ?? []);
	const orderClause = buildOrder(metadata, payload.order ?? []);
	const limitClause = buildLimit(payload.range);

	const sql = `SELECT ${columns.join(", ")} FROM ${payload.table}${where.text}${orderClause}${limitClause}`;
	const { rows } = await query(sql, where.params);

	let meta;
	if (payload.count) {
		const countSql = `SELECT COUNT(*) FROM ${payload.table}${where.text}`;
		const countResult = await query(countSql, where.params);
		meta = { count: Number(countResult.rows[0]?.count ?? 0) };
	}

	return { rows, meta };
}

async function runInsert(metadata, payload) {
	const records = Array.isArray(payload.values) ? payload.values : [payload.values];
	const inserted = [];
	const returning = resolveReturning(metadata, payload.returning);

	for (const record of records) {
		const cols = Object.keys(record).filter((col) => metadata.columns.includes(col));
		if (!cols.length) {
			throw new Error("No valid columns provided for insert");
		}

		const placeholders = cols.map((_, idx) => `$${idx + 1}`);
		const values = cols.map((col) => record[col]);
		const sql = `INSERT INTO ${payload.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${returning.join(", ")}`;
		const { rows } = await query(sql, values);
		inserted.push(rows[0]);
		broadcastTableChange({ table: payload.table, event: "INSERT", payload: rows[0] });
	}

	return { rows: inserted };
}

async function runUpdate(metadata, payload) {
	if (!payload.values || typeof payload.values !== "object") {
		throw new Error("Update requires values object");
	}

	if (!payload.filters?.length && !payload.groups?.length) {
		throw new Error("Update requires at least one filter");
	}

	const cols = Object.keys(payload.values).filter((col) => metadata.columns.includes(col));
	if (!cols.length) {
		throw new Error("No valid columns provided for update");
	}

	const setClauses = cols.map((col, idx) => `${col} = $${idx + 1}`);
	const values = cols.map((col) => payload.values[col]);
	const returning = resolveReturning(metadata, payload.returning);
	const where = buildWhere(metadata, payload.filters ?? [], payload.groups ?? [], cols.length + 1);

	const sql = `UPDATE ${payload.table} SET ${setClauses.join(", ")}${where.text} RETURNING ${returning.join(", ")}`;
	const { rows } = await query(sql, [...values, ...where.params]);
	rows.forEach((row) => broadcastTableChange({ table: payload.table, event: "UPDATE", payload: row }));
	return { rows };
}

async function runDelete(metadata, payload) {
	if (!payload.filters?.length && !payload.groups?.length) {
		throw new Error("Delete requires at least one filter");
	}

	const returning = resolveReturning(metadata, payload.returning);
	const where = buildWhere(metadata, payload.filters ?? [], payload.groups ?? []);
	const sql = `DELETE FROM ${payload.table}${where.text} RETURNING ${returning.join(", ")}`;
	const { rows } = await query(sql, where.params);
	rows.forEach((row) => broadcastTableChange({ table: payload.table, event: "DELETE", payload: row }));
	return { rows };
}

function resolveColumns(metadata, requested) {
	if (!requested || !requested.length || requested.includes("*")) {
		return metadata.columns;
	}
	return requested.filter((col) => metadata.columns.includes(col));
}

function resolveReturning(metadata, requested) {
	if (!requested || !requested.length || requested.includes("*")) {
		return metadata.columns;
	}
	const valid = requested.filter((col) => metadata.columns.includes(col));
	return valid.length ? valid : metadata.columns;
}

function buildOrder(metadata, order = []) {
	if (!order.length) {
		return ` ORDER BY ${metadata.defaultOrder.column} ${metadata.defaultOrder.direction}`;
	}

	const clauses = order
		.filter((item) => metadata.columns.includes(item.column))
		.map((item) => `${item.column} ${item.direction?.toUpperCase() === "ASC" ? "ASC" : "DESC"}`);

	return clauses.length ? ` ORDER BY ${clauses.join(", ")}` : "";
}

function buildLimit(range) {
	if (!range) return "";
	const limit = typeof range.limit === "number" ? range.limit : null;
	const offset = typeof range.offset === "number" ? range.offset : null;

	let clause = "";
	if (limit !== null) {
		clause += ` LIMIT ${limit}`;
	}
	if (offset !== null) {
		clause += ` OFFSET ${offset}`;
	}
	return clause;
}

function buildWhere(metadata, filters = [], groups = [], startIdx = 1) {
	if (!filters.length && !groups.length) {
		return { text: "", params: [], nextIndex: startIdx };
	}

	const clauses = [];
	const params = [];
	let idx = startIdx;

	const appendFilter = (filter) => {
		if (!metadata.columns.includes(filter.column)) return;
		const comparison = buildComparison(filter, metadata, idx);
		if (!comparison) return;
		clauses.push(comparison.clause);
		if (comparison.value !== undefined) {
			params.push(comparison.value);
			idx += 1;
		}
	};

	filters.forEach((filter) => appendFilter(filter));

	groups.forEach((group) => {
		if (!group.filters?.length) return;
		const innerClauses = [];
		group.filters.forEach((filter) => {
			if (!metadata.columns.includes(filter.column)) return;
			const comparison = buildComparison(filter, metadata, idx);
			if (!comparison) return;
			innerClauses.push(comparison.clause);
			if (comparison.value !== undefined) {
				params.push(comparison.value);
				idx += 1;
			}
		});
		if (innerClauses.length) {
			clauses.push(`(${innerClauses.join(" OR ")})`);
		}
	});

	if (!clauses.length) {
		return { text: "", params: [], nextIndex: idx };
	}

	return { text: ` WHERE ${clauses.join(" AND ")}`, params, nextIndex: idx };
}

function buildComparison(filter, metadata, placeholderIndex) {
	const columnRef = isColumnReference(filter.value, metadata);
	const operator = filter.operator;

	if (columnRef) {
		switch (operator) {
			case "eq":
				return { clause: `${filter.column} = ${columnRef}` };
			case "neq":
				return { clause: `${filter.column} <> ${columnRef}` };
			case "gt":
				return { clause: `${filter.column} > ${columnRef}` };
			case "gte":
				return { clause: `${filter.column} >= ${columnRef}` };
			case "lt":
				return { clause: `${filter.column} < ${columnRef}` };
			case "lte":
				return { clause: `${filter.column} <= ${columnRef}` };
			default:
				return null;
		}
	}

	const placeholder = `$${placeholderIndex}`;
	switch (operator) {
		case "eq":
			return { clause: `${filter.column} = ${placeholder}`, value: filter.value };
		case "neq":
			return { clause: `${filter.column} <> ${placeholder}`, value: filter.value };
		case "gt":
			return { clause: `${filter.column} > ${placeholder}`, value: filter.value };
		case "gte":
			return { clause: `${filter.column} >= ${placeholder}`, value: filter.value };
		case "lt":
			return { clause: `${filter.column} < ${placeholder}`, value: filter.value };
		case "lte":
			return { clause: `${filter.column} <= ${placeholder}`, value: filter.value };
		case "like":
			return { clause: `${filter.column} LIKE ${placeholder}`, value: filter.value };
		case "ilike":
			return { clause: `${filter.column} ILIKE ${placeholder}`, value: filter.value };
		case "in":
			return { clause: `${filter.column} = ANY(${placeholder})`, value: filter.value };
		case "is":
			if (filter.value === null) {
				return { clause: `${filter.column} IS NULL` };
			}
			if (typeof filter.value === "string" && ["not null", "NOT NULL"].includes(filter.value)) {
				return { clause: `${filter.column} IS NOT NULL` };
			}
			return { clause: `${filter.column} IS ${placeholder}`, value: filter.value };
		default:
			return null;
	}
}

function isColumnReference(value, metadata) {
	if (!value || typeof value !== "object") return null;
	if (!value.__column) return null;
	if (!metadata.columns.includes(value.__column)) {
		return null;
	}
	return value.__column;
}
