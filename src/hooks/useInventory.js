// =============================================
// useInventory Hook
// ---------------------------------------------
// Purpose: Hook for managing inventory items and stock levels
// 
// Key Responsibilities:
// - Fetch and filter inventory items
// - Update stock levels
// - Allocate resources
// - Track transactions
//
// Dependencies:
// - useResourceStore (Zustand store)
// - react hooks
//
// Notes:
// - Provides real-time stock status
// - Handles low stock alerts
// - Auto-computes inventory value
// =============================================

import { useEffect, useMemo } from "react";
import { useResourceStore } from "@/store/useResourceStore";

/**
 * Hook for managing inventory items
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.category - Filter by category
 * @param {string} options.status - Filter by status
 * @param {string} options.location - Filter by location
 * @param {boolean} options.low_stock - Show only low stock items
 * @param {boolean} options.critical_stock - Show only critical stock items
 * @param {string} options.search - Search by name or code
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * 
 * @returns {Object} Inventory data and operations
 * 
 * @example
 * const { items, statistics, updateStock } = useInventory({
 *   category: 'material',
 *   low_stock: true
 * });
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

	//* ================================================
	//* FETCH DATA ON MOUNT OR FILTER CHANGE
	//* ================================================
	useEffect(() => {
		if (autoFetch) {
			const filters = {
				category,
				status,
				location,
				low_stock,
				critical_stock,
				search,
			};
			
			// Remove undefined values
			Object.keys(filters).forEach(key => 
				filters[key] === undefined && delete filters[key]
			);
			
			fetchInventory(filters);
		}
	}, [category, status, location, low_stock, critical_stock, search, autoFetch, fetchInventory]);

	//* ================================================
	//* COMPUTED VALUES
	//* ================================================

	/**
	 * Group items by category
	 */
	const itemsByCategory = useMemo(() => {
		return filteredInventory.reduce((acc, item) => {
			const cat = item.category || 'uncategorized';
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(item);
			return acc;
		}, {});
	}, [filteredInventory]);

	/**
	 * Group items by location
	 */
	const itemsByLocation = useMemo(() => {
		return filteredInventory.reduce((acc, item) => {
			const loc = item.location || 'unassigned';
			if (!acc[loc]) acc[loc] = [];
			acc[loc].push(item);
			return acc;
		}, {});
	}, [filteredInventory]);

	/**
	 * Items needing attention (low or critical stock)
	 */
	const itemsNeedingAttention = useMemo(() => {
		return filteredInventory.filter(item => 
			item.status === 'low_stock' || 
			item.status === 'critical_stock' ||
			item.current_stock <= item.minimum_stock
		).sort((a, b) => {
			// Sort by severity: critical > low > normal
			const severityOrder = { 'critical_stock': 0, 'low_stock': 1, 'available': 2 };
			return (severityOrder[a.status] || 3) - (severityOrder[b.status] || 3);
		});
	}, [filteredInventory]);

	/**
	 * Items expiring soon (within 60 days)
	 */
	const expiringSoon = useMemo(() => {
		const sixtyDaysFromNow = new Date();
		sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
		
		return filteredInventory.filter(item => {
			if (!item.expiration_date) return false;
			const expiryDate = new Date(item.expiration_date);
			return expiryDate <= sixtyDaysFromNow && expiryDate > new Date();
		}).sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));
	}, [filteredInventory]);

	/**
	 * Available items (in stock and available status)
	 */
	const availableItems = useMemo(() => {
		return filteredInventory.filter(item => 
			item.status === 'available' && item.current_stock > 0
		);
	}, [filteredInventory]);

	/**
	 * Total inventory value
	 */
	const totalValue = useMemo(() => {
		return filteredInventory.reduce((sum, item) => 
			sum + (item.current_stock * item.unit_cost), 0
		);
	}, [filteredInventory]);

	/**
	 * Get stock status for an item
	 * @param {Object} item - Inventory item
	 * @returns {Object} Status info
	 */
	const getStockStatus = (item) => {
		const percentage = (item.current_stock / item.minimum_stock) * 100;
		
		if (item.current_stock === 0) {
			return { status: 'depleted', color: 'red', severity: 'critical', percentage: 0 };
		} else if (item.current_stock < item.minimum_stock * 0.5) {
			return { status: 'critical', color: 'red', severity: 'critical', percentage };
		} else if (item.current_stock <= item.minimum_stock) {
			return { status: 'low', color: 'yellow', severity: 'warning', percentage };
		} else {
			return { status: 'sufficient', color: 'green', severity: 'info', percentage };
		}
	};

	//* ================================================
	//* RETURN INTERFACE
	//* ================================================
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
		refresh: () => fetchInventory({ category, status, location, low_stock, critical_stock, search }),
		clearError,
		
		// Utilities
		getStockStatus,
	};
}
