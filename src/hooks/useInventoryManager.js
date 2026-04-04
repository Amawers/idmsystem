import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import {
	calculateExpirationStatus,
	calculateStockStatus,
	generateItemCode,
} from "@/lib/inventoryHelpers";

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getItemStatus(item) {
	const currentStock = toNumber(item.current_stock);
	const minimumStock = toNumber(item.minimum_stock);

	if (currentStock <= 0) return "depleted";
	if (currentStock < minimumStock * 0.5) return "critical_stock";
	if (currentStock <= minimumStock) return "low_stock";
	return "available";
}

function normalizeItem(row) {
	const normalized = {
		...row,
		current_stock: toNumber(row.current_stock),
		minimum_stock: toNumber(row.minimum_stock),
		unit_cost: toNumber(row.unit_cost),
	};

	return {
		...normalized,
		status: row.status || getItemStatus(normalized),
		total_value:
			toNumber(row.total_value) ||
			normalized.current_stock * normalized.unit_cost,
	};
}

function buildInventoryStats(items) {
	const totalItems = items.length;
	const totalValue = items.reduce((sum, item) => sum + item.total_value, 0);
	const lowStock = items.filter((item) => item.status === "low_stock").length;
	const criticalStock = items.filter(
		(item) => item.status === "critical_stock" || item.status === "depleted",
	).length;
	const available = items.filter((item) => item.status === "available").length;

	return {
		totalItems,
		totalValue,
		lowStock,
		criticalStock,
		available,
	};
}

function asStockStatus(item) {
	const stock = calculateStockStatus(item);
	const status =
		stock.health === "healthy"
			? "sufficient"
			: stock.health === "warning"
				? "low"
				: stock.health;

	return {
		...stock,
		status,
	};
}

export function useInventoryManager(options = {}) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const autoFetch = options.autoFetch ?? true;

	const refreshInventory = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const { data, error: fetchError } = await supabase
				.from("inventory_items")
				.select("*")
				.order("created_at", { ascending: false });

			if (fetchError) {
				throw fetchError;
			}

			setItems((Array.isArray(data) ? data : []).map(normalizeItem));
		} catch (err) {
			console.error("[useInventoryManager] Failed to fetch inventory:", err);
			setError(err);
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!autoFetch) return;
		refreshInventory();
	}, [autoFetch, refreshInventory]);

	const statistics = useMemo(() => buildInventoryStats(items), [items]);

	const itemsByCategory = useMemo(() => {
		return items.reduce((acc, item) => {
			const key = item.category || "uncategorized";
			if (!acc[key]) acc[key] = [];
			acc[key].push(item);
			return acc;
		}, {});
	}, [items]);

	const itemsNeedingAttention = useMemo(
		() =>
			items.filter(
				(item) =>
					item.status === "low_stock" ||
					item.status === "critical_stock" ||
					item.status === "depleted",
			),
		[items],
	);

	const expiringSoon = useMemo(
		() =>
			items.filter((item) => {
				const expiration = calculateExpirationStatus(item.expiration_date);
				return (
					expiration.status === "expiring_soon" ||
					expiration.status === "expiring_critical" ||
					expiration.status === "expiring_moderate"
				);
			}),
		[items],
	);

	const totalValue = statistics.totalValue;

	const createItem = useCallback(
		async (values) => {
			const count = items.length + 1;
			const generatedCode = generateItemCode(values.category, count);

			const payload = {
				item_code: values.item_code || generatedCode,
				item_name: values.item_name?.trim(),
				category: values.category,
				current_stock: toNumber(values.current_stock),
				minimum_stock: toNumber(values.minimum_stock),
				unit_cost: toNumber(values.unit_cost),
				unit_of_measure: values.unit_of_measure?.trim() || "unit",
				location: values.location?.trim() || null,
				description: values.description?.trim() || null,
				expiration_date: values.expiration_date || null,
			};

			const { data, error: createError } = await supabase
				.from("inventory_items")
				.insert(payload)
				.select()
				.single();

			if (createError) throw createError;
			await refreshInventory();
			return normalizeItem(data);
		},
		[items.length, refreshInventory],
	);

	const updateItem = useCallback(
		async (itemId, values = {}, options = {}) => {
			const targetId = itemId || options.localId;
			if (!targetId) {
				throw new Error("Inventory item ID is required.");
			}

			const payload = {
				item_name: values.item_name?.trim(),
				category: values.category,
				unit_cost: values.unit_cost !== undefined ? toNumber(values.unit_cost) : undefined,
				minimum_stock:
					values.minimum_stock !== undefined
						? toNumber(values.minimum_stock)
						: undefined,
				unit_of_measure: values.unit_of_measure?.trim(),
				location: values.location?.trim() || null,
				description: values.description?.trim() || null,
				expiration_date: values.expiration_date || null,
			};

			Object.keys(payload).forEach((key) => {
				if (payload[key] === undefined) delete payload[key];
			});

			const { error: updateError } = await supabase
				.from("inventory_items")
				.update(payload)
				.eq("id", targetId);

			if (updateError) throw updateError;
			await refreshInventory();
			return { success: true, queued: false };
		},
		[refreshInventory],
	);

	const deleteItem = useCallback(
		async ({ itemId = null, localId = null }) => {
			const targetId = itemId || localId;
			if (!targetId) {
				throw new Error("Inventory item ID is required.");
			}

			const { error: deleteError } = await supabase
				.from("inventory_items")
				.delete()
				.eq("id", targetId);

			if (deleteError) throw deleteError;
			await refreshInventory();
			return { success: true, queued: false };
		},
		[refreshInventory],
	);

	const adjustStock = useCallback(
		async ({
			itemId = null,
			localId = null,
			quantity,
			transactionType = "adjustment",
			notes = null,
			performedBy = null,
		}) => {
			const targetId = itemId || localId;
			if (!targetId) {
				throw new Error("Inventory item ID is required.");
			}

			const delta = toNumber(quantity);
			if (!delta) {
				throw new Error("Quantity must be a non-zero number.");
			}

			const target = items.find((item) => item.id === targetId);
			if (!target) {
				throw new Error("Inventory item not found.");
			}

			const nextStock = toNumber(target.current_stock) + delta;
			if (nextStock < 0) {
				throw new Error("Insufficient stock for this adjustment.");
			}

			const actorId =
				performedBy?.id ||
				performedBy?.user_id ||
				performedBy?.staff_id ||
				null;

			const transactionPayload = {
				inventory_item_id: targetId,
				transaction_type: transactionType,
				quantity_delta: delta,
				resulting_stock: nextStock,
				unit_cost_at_time: toNumber(target.unit_cost),
				notes,
				performed_by: actorId,
			};

			const { error: trxError } = await supabase
				.from("inventory_transactions")
				.insert(transactionPayload);

			if (trxError) {
				console.warn(
					"[useInventoryManager] Transaction log insert failed, applying stock update directly:",
					trxError,
				);
			}

			const { error: updateError } = await supabase
				.from("inventory_items")
				.update({
					current_stock: nextStock,
					updated_by: actorId,
				})
				.eq("id", targetId);

			if (updateError) throw updateError;

			await refreshInventory();
			return { success: true, queued: false };
		},
		[items, refreshInventory],
	);

	const updateStock = useCallback(
		async (itemId, updateData = {}) => {
			if (!itemId) {
				throw new Error("Inventory item ID is required.");
			}

			if (updateData.quantity_delta || updateData.quantityDelta) {
				return adjustStock({
					itemId,
					quantity: updateData.quantity_delta ?? updateData.quantityDelta,
					transactionType: updateData.transaction_type || "adjustment",
					notes: updateData.notes,
					performedBy: updateData.performedBy,
				});
			}

			const payload = {};
			if (updateData.current_stock !== undefined) {
				payload.current_stock = toNumber(updateData.current_stock);
			}
			if (updateData.minimum_stock !== undefined) {
				payload.minimum_stock = toNumber(updateData.minimum_stock);
			}
			if (updateData.unit_cost !== undefined) {
				payload.unit_cost = toNumber(updateData.unit_cost);
			}

			const { error: updateError } = await supabase
				.from("inventory_items")
				.update(payload)
				.eq("id", itemId);

			if (updateError) throw updateError;
			await refreshInventory();
			return { success: true, queued: false };
		},
		[adjustStock, refreshInventory],
	);

	const allocateResource = useCallback(
		async (itemId, allocationData = {}) => {
			const quantity = toNumber(
				allocationData.quantity ?? allocationData.quantity_delta,
			);
			return adjustStock({
				itemId,
				quantity: -Math.abs(quantity),
				transactionType: "allocation",
				notes:
					allocationData.notes ||
					`Resource allocation for ${allocationData.request_number || "request"}`,
				performedBy: allocationData.performedBy,
			});
		},
		[adjustStock],
	);

	const getStockStatus = useCallback((item) => asStockStatus(item), []);

	return {
		items,
		loading,
		error,
		statistics,
		itemsByCategory,
		itemsNeedingAttention,
		expiringSoon,
		totalValue,
		refreshInventory,
		refresh: refreshInventory,
		createItem,
		updateItem,
		adjustStock,
		deleteItem,
		updateStock,
		allocateResource,
		getStockStatus,
	};
}

export default useInventoryManager;
