/**
 * Inventory analytics hook.
 *
 * Responsibilities:
 * - Read inventory state/actions from the Zustand `useResourceStore()`.
 * - Optionally auto-fetch inventory on mount / filter changes.
 * - Provide derived groupings and convenience lists for UI rendering
 *   (by category/location, expiring soon, attention-needed, total value).
 * - Provide a `getStockStatus()` helper for consistent stock labeling.
 */

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";

/**
 * @typedef {Object} UseInventoryOptions
 * @property {string} [category]
 * @property {string} [status]
 * @property {string} [location]
 * @property {boolean} [low_stock]
 * @property {boolean} [critical_stock]
 * @property {string} [search]
 * @property {boolean} [autoFetch=true]
 */

/**
 * @typedef {Object} InventoryFilters
 * @property {string} [category]
 * @property {string} [status]
 * @property {string} [location]
 * @property {boolean} [low_stock]
 * @property {boolean} [critical_stock]
 * @property {string} [search]
 */

/**
 * @typedef {Object} InventoryItemRow
 * Loose inventory item row shape used for grouping and status.
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [code]
 * @property {string} [category]
 * @property {string} [location]
 * @property {string} [status]
 * @property {number} [current_stock]
 * @property {number} [minimum_stock]
 * @property {number} [unit_cost]
 * @property {string|null} [expiration_date]
 */

/**
 * @typedef {'depleted'|'critical'|'low'|'sufficient'} StockStatus
 */

/**
 * @typedef {'critical'|'warning'|'info'} StockSeverity
 */

/**
 * @typedef {Object} StockStatusInfo
 * @property {StockStatus} status
 * @property {string} color
 * @property {StockSeverity} severity
 * @property {number} percentage
 */

/**
 * @typedef {Object} UseInventoryResult
 * @property {InventoryItemRow[]} items Filtered inventory items for the current filters.
 * @property {InventoryItemRow[]} allItems Unfiltered full list (as maintained by the store).
 * @property {Record<string, InventoryItemRow[]>} itemsByCategory
 * @property {Record<string, InventoryItemRow[]>} itemsByLocation
 * @property {InventoryItemRow[]} itemsNeedingAttention
 * @property {InventoryItemRow[]} expiringSoon
 * @property {InventoryItemRow[]} availableItems
 * @property {any} statistics Store-provided aggregate stats.
 * @property {number} totalValue
 * @property {boolean} loading
 * @property {any} error
 * @property {(filters?: InventoryFilters) => any} fetchInventory
 * @property {(payload: any) => any} updateStock
 * @property {(payload: any) => any} allocateResource
 * @property {() => any} refresh
 * @property {() => any} clearError
 * @property {(item: InventoryItemRow) => StockStatusInfo} getStockStatus
 */

/**
 * Manage inventory items and derived lists.
 * @param {UseInventoryOptions} [options]
 * @returns {UseInventoryResult}
 */
export function useInventory(options = {}) {
	const {
		category,
		status,
		location,
		low_stock,
		critical_stock,
		search,
		autoFetch = true,
	} = options;

	const {
		inventoryItems,
		filteredInventory,
		inventoryStats,
		loading,
		error,
		fetchInventory,
		updateStock,
		allocateResource,
		clearError,
	} = useResourceStore();

	// Fetch data on mount / filter changes (optional).
	useEffect(() => {
		if (autoFetch) {
			/** @type {InventoryFilters} */
			const filters = {
				category,
				status,
				location,
				low_stock,
				critical_stock,
				search,
			};

			// Remove undefined values
			Object.keys(filters).forEach(
				(key) => filters[key] === undefined && delete filters[key],
			);

			fetchInventory(filters);
		}
	}, [
		category,
		status,
		location,
		low_stock,
		critical_stock,
		search,
		autoFetch,
		fetchInventory,
	]);

	/** Group filtered items by category. */
	const itemsByCategory = useMemo(() => {
		return filteredInventory.reduce((acc, item) => {
			const cat = item.category || "uncategorized";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(item);
			return acc;
		}, {});
	}, [filteredInventory]);

	/** Group filtered items by location. */
	const itemsByLocation = useMemo(() => {
		return filteredInventory.reduce((acc, item) => {
			const loc = item.location || "unassigned";
			if (!acc[loc]) acc[loc] = [];
			acc[loc].push(item);
			return acc;
		}, {});
	}, [filteredInventory]);

	/** Items needing attention (low/critical stock), sorted by severity. */
	const itemsNeedingAttention = useMemo(() => {
		return filteredInventory
			.filter(
				(item) =>
					item.status === "low_stock" ||
					item.status === "critical_stock" ||
					item.current_stock <= item.minimum_stock,
			)
			.sort((a, b) => {
				// Sort by severity: critical > low > normal
				const severityOrder = {
					critical_stock: 0,
					low_stock: 1,
					available: 2,
				};
				return (
					(severityOrder[a.status] || 3) -
					(severityOrder[b.status] || 3)
				);
			});
	}, [filteredInventory]);

	/** Items expiring soon (within 60 days), sorted by expiration date. */
	const expiringSoon = useMemo(() => {
		const sixtyDaysFromNow = new Date();
		sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

		return filteredInventory
			.filter((item) => {
				if (!item.expiration_date) return false;
				const expiryDate = new Date(item.expiration_date);
				return (
					expiryDate <= sixtyDaysFromNow && expiryDate > new Date()
				);
			})
			.sort(
				(a, b) =>
					new Date(a.expiration_date) - new Date(b.expiration_date),
			);
	}, [filteredInventory]);

	/** Available items (available status and stock > 0). */
	const availableItems = useMemo(() => {
		return filteredInventory.filter(
			(item) => item.status === "available" && item.current_stock > 0,
		);
	}, [filteredInventory]);

	/** Total inventory value across filtered items. */
	const totalValue = useMemo(() => {
		return filteredInventory.reduce(
			(sum, item) => sum + item.current_stock * item.unit_cost,
			0,
		);
	}, [filteredInventory]);

	/**
	 * Get stock status information for an item.
	 * @param {InventoryItemRow} item
	 * @returns {StockStatusInfo}
	 */
	const getStockStatus = (item) => {
		const percentage = (item.current_stock / item.minimum_stock) * 100;

		if (item.current_stock === 0) {
			return {
				status: "depleted",
				color: "red",
				severity: "critical",
				percentage: 0,
			};
		} else if (item.current_stock < item.minimum_stock * 0.5) {
			return {
				status: "critical",
				color: "red",
				severity: "critical",
				percentage,
			};
		} else if (item.current_stock <= item.minimum_stock) {
			return {
				status: "low",
				color: "yellow",
				severity: "warning",
				percentage,
			};
		} else {
			return {
				status: "sufficient",
				color: "green",
				severity: "info",
				percentage,
			};
		}
	};

	/** @type {UseInventoryResult} */
	return {
		// Data
		items: filteredInventory,
		allItems: inventoryItems,

		// Groupings
		itemsByCategory,
		itemsByLocation,
		itemsNeedingAttention,
		expiringSoon,
		availableItems,

		// Statistics
		statistics: inventoryStats,
		totalValue,

		// State
		loading,
		error,

		// Actions
		fetchInventory: (filters) => fetchInventory(filters),
		updateStock,
		allocateResource,
		refresh: () =>
			fetchInventory({
				category,
				status,
				location,
				low_stock,
				critical_stock,
				search,
			}),
		clearError,

		// Utilities
		getStockStatus,
	};
}
