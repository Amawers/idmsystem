import supabase from "@/../config/supabase";

const ASSIGNABLE_ROLE_SLUGS = new Set(["social_worker", "case_manager"]);

const toRoleSlug = (role) =>
	String(role ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");

const sanitizeCaseManagers = (rows) => {
	const uniqueById = new Map();

	(rows || []).forEach((row) => {
		if (!row?.id || !row?.full_name) return;

		const roleSlug = toRoleSlug(row.role);
		if (!ASSIGNABLE_ROLE_SLUGS.has(roleSlug)) return;

		const statusText =
			row.status == null
				? "active"
				: String(row.status).trim().toLowerCase();

		if (statusText !== "active") return;

		if (!uniqueById.has(row.id)) {
			uniqueById.set(row.id, {
				id: row.id,
				full_name: String(row.full_name).trim(),
				email: row.email ?? null,
				role: row.role ?? null,
			});
		}
	});

	return Array.from(uniqueById.values()).sort((a, b) =>
		a.full_name.localeCompare(b.full_name, undefined, {
			sensitivity: "base",
		}),
	);
};

const fetchFromRpc = async () => {
	const { data, error } = await supabase.rpc("get_assignable_case_managers");

	if (error) throw error;

	return sanitizeCaseManagers(data || []);
};

const fetchFromProfile = async ({ withStatusFilter }) => {
	let query = supabase
		.from("profile")
		.select(
			withStatusFilter
				? "id, full_name, email, role, status"
				: "id, full_name, email, role",
		)
		.order("full_name", { ascending: true });

	if (withStatusFilter) {
		query = query.eq("status", "active");
	}

	const { data, error } = await query;

	if (error) throw error;

	return sanitizeCaseManagers(data || []);
};

/**
 * Fetches assignable case managers.
 *
 * Strategy:
 * 1) Prefer RPC (`get_assignable_case_managers`) so environments with strict
 *    profile RLS can still return all assignable staff.
 * 2) Fall back to direct profile queries for backward compatibility.
 *
 * @returns {Promise<{ data: Array<{id: string, full_name: string, email: string|null, role: string|null}>, source: string }>}
 */
export const fetchAssignableCaseManagers = async () => {
	try {
		const managers = await fetchFromRpc();
		return { data: managers, source: "rpc" };
	} catch (rpcError) {
		console.warn(
			"[CaseManagersDirectory] RPC unavailable, falling back to profile query:",
			rpcError?.message || rpcError,
		);
	}

	let activeManagers = [];
	try {
		activeManagers = await fetchFromProfile({ withStatusFilter: true });
	} catch (profileError) {
		console.warn(
			"[CaseManagersDirectory] Status-filtered profile query failed, retrying without status filter:",
			profileError?.message || profileError,
		);
	}

	if (activeManagers.length > 0) {
		return { data: activeManagers, source: "profile-active" };
	}

	const fallbackManagers = await fetchFromProfile({ withStatusFilter: false });
	return { data: fallbackManagers, source: "profile-no-status" };
};
