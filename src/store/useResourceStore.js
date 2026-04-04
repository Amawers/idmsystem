import { create } from "zustand";
import supabase from "@/../config/supabase";
import {
	formatResourceRequest,
	generateRequestNumber,
	validateResourceRequest,
} from "@/lib/resourceSubmission";
import { useAuthStore } from "@/store/authStore";

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getItemStatus(item) {
	if (toNumber(item.current_stock) <= 0) return "depleted";
	if (toNumber(item.current_stock) < toNumber(item.minimum_stock) * 0.5) {
		return "critical_stock";
	}
	if (toNumber(item.current_stock) <= toNumber(item.minimum_stock)) {
		return "low_stock";
	}
	return "available";
}

function normalizeInventoryItem(row) {
	const currentStock = toNumber(row.current_stock);
	const unitCost = toNumber(row.unit_cost);
	return {
		...row,
		current_stock: currentStock,
		unit_cost: unitCost,
		minimum_stock: toNumber(row.minimum_stock),
		total_value: toNumber(row.total_value) || currentStock * unitCost,
		status: row.status || getItemStatus(row),
	};
}

function buildInventoryStats(items) {
	return {
		totalItems: items.length,
		totalValue: items.reduce((sum, item) => sum + toNumber(item.total_value), 0),
		lowStock: items.filter((item) => item.status === "low_stock").length,
		criticalStock: items.filter(
			(item) => item.status === "critical_stock" || item.status === "depleted",
		).length,
		available: items.filter((item) => item.status === "available").length,
	};
}

async function fetchSequence(tableName) {
	const { count, error } = await supabase
		.from(tableName)
		.select("id", { count: "exact", head: true });

	if (error) {
		console.warn(`[useResourceStore] Failed to count ${tableName}:`, error);
		return 0;
	}

	return count || 0;
}

export const useResourceStore = create((set) => ({
	inventoryItems: [],
	inventoryStats: {
		totalItems: 0,
		totalValue: 0,
		lowStock: 0,
		criticalStock: 0,
		available: 0,
	},
	loading: false,
	error: null,

	fetchInventory: async () => {
		set({ loading: true, error: null });
		try {
			const { data, error } = await supabase
				.from("inventory_items")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;

			const items = (Array.isArray(data) ? data : []).map(normalizeInventoryItem);
			set({
				inventoryItems: items,
				inventoryStats: buildInventoryStats(items),
				error: null,
			});
		} catch (err) {
			console.error("[useResourceStore] Failed to fetch inventory:", err);
			set({
				inventoryItems: [],
				inventoryStats: {
					totalItems: 0,
					totalValue: 0,
					lowStock: 0,
					criticalStock: 0,
					available: 0,
				},
				error: err,
			});
		} finally {
			set({ loading: false });
		}
	},

	submitRequest: async (requestData) => {
		const validation = validateResourceRequest(requestData);
		if (!validation.isValid) {
			throw new Error(validation.errors.join("\n"));
		}

		const auth = useAuthStore.getState();
		const userId = auth.user?.id;
		const userName =
			auth.profile?.full_name ||
			auth.user?.user_metadata?.full_name ||
			auth.user?.email ||
			"Unknown User";

		if (!userId) {
			throw new Error("You must be logged in to submit a request.");
		}

		const formatted = formatResourceRequest(requestData, userId, userName);
		const sequence = (await fetchSequence("resource_requests")) + 1;

		const payload = {
			request_number: generateRequestNumber(sequence),
			requester_id: userId,
			requester_name: userName,
			request_type: formatted.request_type,
			request_category:
				requestData.request_category || formatted.resource_category || "other",
			item_id: requestData.item_id || null,
			item_description: formatted.item_description,
			quantity: toNumber(formatted.quantity),
			unit: formatted.unit,
			unit_cost: toNumber(formatted.unit_cost),
			total_amount: toNumber(formatted.total_amount),
			justification: formatted.justification,
			priority: formatted.priority || "medium",
			beneficiary_name: formatted.beneficiary_name || null,
			beneficiary_type: formatted.beneficiary_type || null,
			program_id: formatted.program_id,
			program_name: formatted.program_name,
			status: "submitted",
		};

		const { data, error } = await supabase
			.from("resource_requests")
			.insert(payload)
			.select()
			.single();

		if (error) throw error;

		return data;
	},

	resolveAlert: async (alertId) => {
		if (!alertId) throw new Error("Alert ID is required.");

		const userId = useAuthStore.getState().user?.id ?? null;
		const payload = {
			is_resolved: true,
			resolved_at: new Date().toISOString(),
			resolved_by: userId,
		};

		const { error } = await supabase
			.from("inventory_alerts")
			.update(payload)
			.eq("id", alertId);

		if (error) throw error;

		return { success: true };
	},

	reset: () => {
		set({
			inventoryItems: [],
			inventoryStats: {
				totalItems: 0,
				totalValue: 0,
				lowStock: 0,
				criticalStock: 0,
				available: 0,
			},
			loading: false,
			error: null,
		});
	},
}));

export default useResourceStore;
