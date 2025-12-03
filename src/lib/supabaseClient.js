import { io } from "socket.io-client";

import { apiFetch, getApiBaseUrl } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";

const TABLE_ENDPOINT = "/db/query";
const RPC_ENDPOINT = "/db/rpc";
const RAW_COLUMN_KEY = "__column";

const filterOperators = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]);

function normalizeColumns(columns) {
	if (!columns || columns === "*") {
		return ["*"];
	}

	if (Array.isArray(columns)) {
		return columns.map((col) => col.trim()).filter(Boolean);
	}

	return String(columns)
		.split(",")
		.map((col) => col.trim())
		.filter(Boolean);
}

function normalizeValue(value) {
	if (value === undefined) return null;
	return value;
}

export function raw(columnName) {
	return { [RAW_COLUMN_KEY]: columnName };
}

class SupabaseQueryBuilder {
	constructor(table) {
		this.table = table;
		this.action = "select";
		this.columns = ["*"];
		this.filters = [];
		this.orGroups = [];
		this.order = [];
		this.limitValue = null;
		this.offsetValue = null;
		this.payload = null;
		this.returning = null;
		this.singleMode = null;
		this.count = null;
	}

	select(columns = "*", options = {}) {
		const normalized = normalizeColumns(columns);

		if (["insert", "update", "delete"].includes(this.action)) {
			this.returning = normalized;
		} else {
			this.columns = normalized;
			this.action = "select";
		}

		if (options?.count) {
			this.count = options.count;
		}

		return this;
	}

	insert(values) {
		this.action = "insert";
		this.payload = values;
		return this;
	}

	update(values) {
		this.action = "update";
		this.payload = values;
		return this;
	}

	delete() {
		this.action = "delete";
		return this;
	}

	eq(column, value) {
		return this.#addFilter(column, "eq", value);
	}

	neq(column, value) {
		return this.#addFilter(column, "neq", value);
	}

	gt(column, value) {
		return this.#addFilter(column, "gt", value);
	}

	gte(column, value) {
		return this.#addFilter(column, "gte", value);
	}

	lt(column, value) {
		return this.#addFilter(column, "lt", value);
	}

	lte(column, value) {
		return this.#addFilter(column, "lte", value);
	}

	like(column, value) {
		return this.#addFilter(column, "like", value);
	}

	ilike(column, value) {
		return this.#addFilter(column, "ilike", value);
	}

	is(column, value) {
		return this.#addFilter(column, "is", value);
	}

	in(column, values) {
		return this.#addFilter(column, "in", values);
	}

	or(expression) {
		if (!expression) return this;
		const rawGroups = String(expression).split(",");
		const filters = rawGroups
			.map((chunk) => chunk.trim())
			.filter(Boolean)
			.map((chunk) => {
				const [left, op, ...rest] = chunk.split(".");
				if (!left || !op || !rest.length) return null;
				const operator = op.trim();
				const value = rest.join(".");
				if (!filterOperators.has(operator)) return null;
				return {
					column: left.trim(),
					operator,
					value: normalizeValue(value),
				};
			})
			.filter(Boolean);

		if (filters.length) {
			this.orGroups.push({ operator: "or", filters });
		}

		return this;
	}

	order(column, { ascending = true } = {}) {
		this.order.push({ column, direction: ascending ? "asc" : "desc" });
		return this;
	}

	limit(value) {
		this.limitValue = value;
		return this;
	}

	range(from, to) {
		if (typeof from === "number" && typeof to === "number") {
			this.offsetValue = from;
			this.limitValue = to - from + 1;
		}
		return this;
	}

	single() {
		this.singleMode = "single";
		return this;
	}

	maybeSingle() {
		this.singleMode = "maybeSingle";
		return this;
	}

	then(resolve, reject) {
		return this.#execute().then(resolve, reject);
	}

	catch(onRejected) {
		return this.#execute().catch(onRejected);
	}

	async #execute() {
		const body = {
			action: this.action,
			table: this.table,
			columns: this.columns,
			filters: this.filters.length ? this.filters : undefined,
			order: this.order.length ? this.order : undefined,
			values: this.payload,
			returning: this.returning,
			count: this.count,
			range: this.#buildRange(),
			groups: this.orGroups.length ? this.orGroups : undefined,
		};

		const response = await apiFetch(TABLE_ENDPOINT, { method: "POST", body });
		let data = response.data ?? null;

		if (Array.isArray(data) === false && data !== null) {
			data = [data];
		}

		if (this.singleMode) {
			if (!data || data.length === 0) {
				if (this.singleMode === "single") {
					throw new Error("No rows found");
				}
				return { data: null, error: null, count: response.meta?.count ?? null };
			}
			return { data: data[0], error: null, count: response.meta?.count ?? null };
		}

		return { data, error: null, count: response.meta?.count ?? null };
	}

	#buildRange() {
		if (this.limitValue == null && this.offsetValue == null) {
			return undefined;
		}

		return {
			limit: this.limitValue ?? undefined,
			offset: this.offsetValue ?? undefined,
		};
	}

	#addFilter(column, operator, value) {
		this.filters.push({ column, operator, value: normalizeValue(value) });
		return this;
	}
}

class AuthClient {
	async getUser() {
		const user = useAuthStore.getState().user;
		if (user) {
			return { data: { user }, error: null };
		}
		try {
			const { data } = await apiFetch("/auth/session", { method: "GET" });
			return { data: { user: data?.user ?? null }, error: null };
		} catch (error) {
			return { data: { user: null }, error };
		}
	}

	async getSession() {
		const { data, error } = await this.getUser();
		if (error) {
			return { data: { session: null }, error };
		}
		return {
			data: {
				session: data.user
					? {
						user: data.user,
					}
					: null,
			},
			error: null,
		};
	}

	async signUp(payload) {
		const { email, password, options } = payload ?? {};
		if (!email || !password) {
			throw new Error("Email and password are required");
		}

		const body = {
			email,
			password,
			role: options?.data?.role ?? "case_manager",
			fullName: options?.data?.full_name ?? null,
		};

		const response = await apiFetch("/auth/register", { method: "POST", body });
		return {
			data: { user: response.data },
			error: null,
		};
	}

	async setSession() {
		return {
			data: { session: null },
			error: null,
		};
	}
}

let socket;

function getRealtimeSocket() {
	if (socket) return socket;
	const apiUrl = new URL(getApiBaseUrl());
	socket = io(apiUrl.origin, {
		path: "/realtime",
		withCredentials: true,
	});
	return socket;
}

function filterMatches(payload, filter = {}) {
	if (filter.event && filter.event !== "*" && payload.event !== filter.event.toUpperCase()) {
		return false;
	}

	if (filter.table && payload.table !== filter.table) {
		return false;
	}

	return true;
}

class RealtimeChannel {
	constructor(name) {
		this.name = name;
		this.listeners = [];
	}

	on(event, filter, callback) {
		if (event !== "postgres_changes" || typeof callback !== "function") {
			return this;
		}

		const handler = (payload) => {
			if (filterMatches(payload, filter)) {
				callback(payload);
			}
		};

		const client = getRealtimeSocket();
		client.on("postgres_changes", handler);
		this.listeners.push(handler);
		return this;
	}

	subscribe() {
		return this;
	}

	unsubscribe() {
		const client = getRealtimeSocket();
		this.listeners.forEach((handler) => client.off("postgres_changes", handler));
		this.listeners = [];
	}
}

async function executeRpc(fn, params = {}) {
	const response = await apiFetch(`${RPC_ENDPOINT}/${fn}`, {
		method: "POST",
		body: params,
	});
	return { data: response.data ?? null, error: null };
}

class SupabaseCompatibilityClient {
	constructor() {
		this.auth = new AuthClient();
	}

	from(table) {
		return new SupabaseQueryBuilder(table);
	}

	rpc(functionName, params) {
		return executeRpc(functionName, params);
	}

	channel(name) {
		return new RealtimeChannel(name);
	}

	removeChannel(channel) {
		channel?.unsubscribe?.();
	}

	raw(columnName) {
		return raw(columnName);
	}
}

const supabaseClient = new SupabaseCompatibilityClient();

export default supabaseClient;
