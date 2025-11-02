// =============================================
// Inventory Helper Functions
// ---------------------------------------------
// Purpose: Utility functions for inventory management and calculations
// 
// Key Responsibilities:
// - Calculate stock levels and percentages
// - Determine reorder points
// - Format inventory data
// - Generate inventory reports
//
// Dependencies:
// - None (pure utility functions)
//
// Notes:
// - Includes stock level algorithms
// - Supports multiple unit types
// - Handles expiration tracking
// =============================================

/**
 * Calculate stock status and health metrics
 * 
 * @param {Object} item - Inventory item
 * @returns {Object} Stock status info
 * 
 * @example
 * const status = calculateStockStatus(inventoryItem);
 * console.log(status.health); // "healthy", "warning", "critical", "depleted"
 */
export function calculateStockStatus(item) {
	const { current_stock, minimum_stock } = item;
	
	if (current_stock === 0) {
		return {
			health: 'depleted',
			status: 'Out of Stock',
			color: 'red',
			percentage: 0,
			badge: 'destructive',
			severity: 'critical',
			action: 'Reorder immediately',
		};
	}
	
	const percentage = (current_stock / minimum_stock) * 100;
	
	if (current_stock < minimum_stock * 0.5) {
		return {
			health: 'critical',
			status: 'Critical Stock',
			color: 'red',
			percentage,
			badge: 'destructive',
			severity: 'critical',
			action: 'Urgent reorder required',
		};
	}
	
	if (current_stock <= minimum_stock) {
		return {
			health: 'warning',
			status: 'Low Stock',
			color: 'yellow',
			percentage,
			badge: 'warning',
			severity: 'warning',
			action: 'Reorder recommended',
		};
	}
	
	return {
		health: 'healthy',
		status: 'Sufficient Stock',
		color: 'green',
		percentage,
		badge: 'success',
		severity: 'info',
		action: 'No action needed',
	};
}

/**
 * Calculate expiration status
 * 
 * @param {string|Date} expirationDate - Expiration date
 * @returns {Object} Expiration status info
 */
export function calculateExpirationStatus(expirationDate) {
	if (!expirationDate) {
		return {
			status: 'no_expiration',
			daysRemaining: null,
			isExpired: false,
			isExpiringSoon: false,
			severity: 'info',
			message: 'No expiration date',
		};
	}
	
	const expiry = new Date(expirationDate);
	const today = new Date();
	const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
	
	if (daysRemaining < 0) {
		return {
			status: 'expired',
			daysRemaining: Math.abs(daysRemaining),
			isExpired: true,
			isExpiringSoon: false,
			severity: 'critical',
			message: `Expired ${Math.abs(daysRemaining)} days ago`,
			color: 'red',
		};
	}
	
	if (daysRemaining <= 7) {
		return {
			status: 'expiring_critical',
			daysRemaining,
			isExpired: false,
			isExpiringSoon: true,
			severity: 'critical',
			message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
			color: 'red',
		};
	}
	
	if (daysRemaining <= 30) {
		return {
			status: 'expiring_soon',
			daysRemaining,
			isExpired: false,
			isExpiringSoon: true,
			severity: 'warning',
			message: `Expires in ${daysRemaining} days`,
			color: 'yellow',
		};
	}
	
	if (daysRemaining <= 60) {
		return {
			status: 'expiring_moderate',
			daysRemaining,
			isExpired: false,
			isExpiringSoon: false,
			severity: 'info',
			message: `Expires in ${daysRemaining} days`,
			color: 'blue',
		};
	}
	
	return {
		status: 'fresh',
		daysRemaining,
		isExpired: false,
		isExpiringSoon: false,
		severity: 'info',
		message: `Expires in ${daysRemaining} days`,
		color: 'green',
	};
}

/**
 * Calculate reorder point using Economic Order Quantity (EOQ) principles
 * 
 * @param {Object} item - Inventory item
 * @param {number} averageUsagePerDay - Average daily usage
 * @param {number} leadTimeDays - Supplier lead time in days
 * @returns {Object} Reorder information
 */
export function calculateReorderPoint(item, averageUsagePerDay, leadTimeDays = 7) {
	const safetyStock = averageUsagePerDay * 3; // 3 days safety buffer
	const reorderPoint = (averageUsagePerDay * leadTimeDays) + safetyStock;
	const shouldReorder = item.current_stock <= reorderPoint;
	const recommendedOrderQuantity = Math.max(
		item.minimum_stock * 2, 
		averageUsagePerDay * 30
	); // 30 days supply or double minimum
	
	return {
		reorder_point: Math.ceil(reorderPoint),
		should_reorder: shouldReorder,
		recommended_order_quantity: Math.ceil(recommendedOrderQuantity),
		safety_stock: Math.ceil(safetyStock),
		days_until_stockout: item.current_stock / averageUsagePerDay,
	};
}

/**
 * Calculate inventory turnover rate
 * 
 * @param {Array} transactions - Transaction history
 * @param {number} currentStock - Current stock level
 * @param {number} days - Period in days
 * @returns {number} Turnover rate
 */
export function calculateTurnoverRate(transactions, currentStock, days = 30) {
	const allocations = transactions.filter(
		t => t.transaction_type === 'allocation' && 
		new Date(t.transaction_date) >= new Date(Date.now() - days * 24 * 60 * 60 * 1000)
	);
	
	const totalAllocated = allocations.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
	const averageStock = currentStock + (totalAllocated / 2);
	
	return averageStock > 0 ? totalAllocated / averageStock : 0;
}

/**
 * Calculate total inventory value
 * 
 * @param {Array} items - Inventory items
 * @returns {Object} Value breakdown
 */
export function calculateInventoryValue(items) {
	const totalValue = items.reduce((sum, item) => 
		sum + (item.current_stock * item.unit_cost), 0
	);
	
	const valueByCategory = items.reduce((acc, item) => {
		const category = item.category || 'uncategorized';
		if (!acc[category]) acc[category] = 0;
		acc[category] += item.current_stock * item.unit_cost;
		return acc;
	}, {});
	
	const valueByLocation = items.reduce((acc, item) => {
		const location = item.location || 'unassigned';
		if (!acc[location]) acc[location] = 0;
		acc[location] += item.current_stock * item.unit_cost;
		return acc;
	}, {});
	
	return {
		total_value: totalValue,
		by_category: valueByCategory,
		by_location: valueByLocation,
	};
}

/**
 * Generate stock alert
 * 
 * @param {Object} item - Inventory item
 * @returns {Object|null} Alert object or null if no alert needed
 */
export function generateStockAlert(item) {
	const stockStatus = calculateStockStatus(item);
	const expirationStatus = calculateExpirationStatus(item.expiration_date);
	
	// Critical stock alert
	if (stockStatus.health === 'depleted' || stockStatus.health === 'critical') {
		return {
			type: stockStatus.health === 'depleted' ? 'critical_stock' : 'low_stock',
			severity: 'critical',
			message: `${item.item_name} - ${stockStatus.status}. ${stockStatus.action}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			current_stock: item.current_stock,
			minimum_stock: item.minimum_stock,
		};
	}
	
	// Low stock warning
	if (stockStatus.health === 'warning') {
		return {
			type: 'low_stock',
			severity: 'warning',
			message: `${item.item_name} - ${stockStatus.status}. ${stockStatus.action}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			current_stock: item.current_stock,
			minimum_stock: item.minimum_stock,
		};
	}
	
	// Expiration alerts
	if (expirationStatus.isExpired) {
		return {
			type: 'expired',
			severity: 'critical',
			message: `${item.item_name} - ${expirationStatus.message}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			expiration_date: item.expiration_date,
		};
	}
	
	if (expirationStatus.isExpiringSoon && expirationStatus.daysRemaining <= 7) {
		return {
			type: 'expiring_soon',
			severity: 'critical',
			message: `${item.item_name} - ${expirationStatus.message}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			expiration_date: item.expiration_date,
			days_remaining: expirationStatus.daysRemaining,
		};
	}
	
	if (expirationStatus.isExpiringSoon && expirationStatus.daysRemaining <= 30) {
		return {
			type: 'expiring_soon',
			severity: 'warning',
			message: `${item.item_name} - ${expirationStatus.message}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			expiration_date: item.expiration_date,
			days_remaining: expirationStatus.daysRemaining,
		};
	}
	
	return null;
}

/**
 * Format inventory item for display
 * 
 * @param {Object} item - Inventory item
 * @returns {Object} Formatted item data
 */
export function formatInventoryItem(item) {
	const stockStatus = calculateStockStatus(item);
	const expirationStatus = calculateExpirationStatus(item.expiration_date);
	const totalValue = item.current_stock * item.unit_cost;
	
	return {
		...item,
		stock_status: stockStatus,
		expiration_status: expirationStatus,
		total_value: totalValue,
		formatted_value: formatCurrency(totalValue),
		formatted_unit_cost: formatCurrency(item.unit_cost),
	};
}

/**
 * Get category icon and color
 * 
 * @param {string} category - Category name
 * @returns {Object} Icon info { icon: string, color: string }
 */
export function getCategoryInfo(category) {
	const categoryMap = {
		material: { icon: 'Package', color: 'text-blue-600', bgColor: 'bg-blue-100' },
		equipment: { icon: 'Tool', color: 'text-purple-600', bgColor: 'bg-purple-100' },
		financial: { icon: 'DollarSign', color: 'text-green-600', bgColor: 'bg-green-100' },
		human_resource: { icon: 'Users', color: 'text-orange-600', bgColor: 'bg-orange-100' },
	};
	return categoryMap[category] || { icon: 'Box', color: 'text-gray-600', bgColor: 'bg-gray-100' };
}

/**
 * Format currency value
 * 
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
	return new Intl.NumberFormat('en-PH', {
		style: 'currency',
		currency: 'PHP',
	}).format(amount || 0);
}

/**
 * Get transaction type display info
 * 
 * @param {string} transactionType - Transaction type
 * @returns {Object} Display info { label: string, color: string, icon: string }
 */
export function getTransactionTypeInfo(transactionType) {
	const typeMap = {
		stock_in: { 
			label: 'Stock In', 
			color: 'text-green-600', 
			bgColor: 'bg-green-100',
			icon: 'ArrowDownCircle' 
		},
		allocation: { 
			label: 'Allocation', 
			color: 'text-blue-600', 
			bgColor: 'bg-blue-100',
			icon: 'Send' 
		},
		return: { 
			label: 'Return', 
			color: 'text-purple-600', 
			bgColor: 'bg-purple-100',
			icon: 'ArrowLeftCircle' 
		},
		transfer: { 
			label: 'Transfer', 
			color: 'text-indigo-600', 
			bgColor: 'bg-indigo-100',
			icon: 'ArrowRightLeft' 
		},
		adjustment: { 
			label: 'Adjustment', 
			color: 'text-yellow-600', 
			bgColor: 'bg-yellow-100',
			icon: 'Edit' 
		},
		expired: { 
			label: 'Expired', 
			color: 'text-red-600', 
			bgColor: 'bg-red-100',
			icon: 'XCircle' 
		},
		damaged: { 
			label: 'Damaged', 
			color: 'text-orange-600', 
			bgColor: 'bg-orange-100',
			icon: 'AlertTriangle' 
		},
	};
	return typeMap[transactionType] || { 
		label: 'Unknown', 
		color: 'text-gray-600', 
		bgColor: 'bg-gray-100',
		icon: 'HelpCircle' 
	};
}

/**
 * Generate item code
 * 
 * @param {string} category - Item category
 * @param {number} sequence - Sequence number
 * @returns {string} Generated item code
 * 
 * @example
 * generateItemCode('material', 42); // "MAT-042"
 */
export function generateItemCode(category, sequence) {
	const prefixMap = {
		material: 'MAT',
		equipment: 'EQUIP',
		financial: 'FIN',
		human_resource: 'HR',
	};
	
	const prefix = prefixMap[category] || 'ITEM';
	const paddedSequence = String(sequence).padStart(3, '0');
	
	return `${prefix}-${paddedSequence}`;
}
