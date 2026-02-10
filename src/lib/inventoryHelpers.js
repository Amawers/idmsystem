/**
 * Inventory helper utilities.
 *
 * Responsibilities:
 * - Derive stock-health and expiration status for display and alerting.
 * - Compute reorder recommendations and basic aggregates (value/turnover).
 * - Provide small formatting helpers (currency, labels/icons).
 *
 * Design notes:
 * - Functions are intended to be pure and side-effect free.
 * - The only “dependency” is built-in `Intl.NumberFormat` for currency formatting.
 */

/**
 * @typedef {Object} InventoryItem
 * @property {string} [id]
 * @property {string} [item_code]
 * @property {string} [item_name]
 * @property {string} [category]
 * @property {string} [location]
 * @property {number} current_stock
 * @property {number} minimum_stock
 * @property {number} unit_cost
 * @property {string|Date|null} [expiration_date]
 */

/**
 * @typedef {Object} StockStatus
 * @property {"healthy"|"warning"|"critical"|"depleted"} health
 * @property {string} status
 * @property {string} color
 * @property {number} percentage
 * @property {string} badge
 * @property {"info"|"warning"|"critical"} severity
 * @property {string} action
 */

/**
 * @typedef {Object} ExpirationStatus
 * @property {"no_expiration"|"expired"|"expiring_critical"|"expiring_soon"|"expiring_moderate"|"fresh"} status
 * @property {number|null} daysRemaining
 * @property {boolean} isExpired
 * @property {boolean} isExpiringSoon
 * @property {"info"|"warning"|"critical"} severity
 * @property {string} message
 * @property {string} [color]
 */

/**
 * @typedef {Object} ReorderInfo
 * @property {number} reorder_point
 * @property {boolean} should_reorder
 * @property {number} recommended_order_quantity
 * @property {number} safety_stock
 * @property {number} days_until_stockout
 */

/**
 * @typedef {Object} InventoryValueBreakdown
 * @property {number} total_value
 * @property {Record<string, number>} by_category
 * @property {Record<string, number>} by_location
 */

/**
 * @typedef {Object} StockAlert
 * @property {string} type
 * @property {"warning"|"critical"} severity
 * @property {string} message
 * @property {string} [item_id]
 * @property {string} [item_code]
 * @property {string} [item_name]
 * @property {number} [current_stock]
 * @property {number} [minimum_stock]
 * @property {string|Date|null} [expiration_date]
 * @property {number} [days_remaining]
 */

/**
 * @typedef {Object} InventoryTransaction
 * @property {string} transaction_type
 * @property {string|Date} transaction_date
 * @property {number} quantity
 */

/**
 * @typedef {Object} CategoryInfo
 * @property {string} icon
 * @property {string} color
 * @property {string} bgColor
 */

/**
 * @typedef {Object} TransactionTypeInfo
 * @property {string} label
 * @property {string} color
 * @property {string} bgColor
 * @property {string} icon
 */

/**
 * Calculate stock health and a UI-friendly status object.
 * @param {InventoryItem} item
 * @returns {StockStatus}
 *
 * @example
 * const status = calculateStockStatus(inventoryItem);
 * console.log(status.health); // "healthy", "warning", "critical", "depleted"
 */
export function calculateStockStatus(item) {
	const { current_stock, minimum_stock } = item;

	if (current_stock === 0) {
		return {
			health: "depleted",
			status: "Out of Stock",
			color: "red",
			percentage: 0,
			badge: "destructive",
			severity: "critical",
			action: "Reorder immediately",
		};
	}

	const percentage = (current_stock / minimum_stock) * 100;

	if (current_stock < minimum_stock * 0.5) {
		return {
			health: "critical",
			status: "Critical Stock",
			color: "red",
			percentage,
			badge: "destructive",
			severity: "critical",
			action: "Urgent reorder required",
		};
	}

	if (current_stock <= minimum_stock) {
		return {
			health: "warning",
			status: "Low Stock",
			color: "yellow",
			percentage,
			badge: "warning",
			severity: "warning",
			action: "Reorder recommended",
		};
	}

	return {
		health: "healthy",
		status: "Sufficient Stock",
		color: "green",
		percentage,
		badge: "success",
		severity: "info",
		action: "No action needed",
	};
}

/**
 * Calculate expiration status relative to “today”.
 * @param {string|Date|null|undefined} expirationDate
 * @returns {ExpirationStatus}
 */
export function calculateExpirationStatus(expirationDate) {
	if (!expirationDate) {
		return {
			status: "no_expiration",
			daysRemaining: null,
			isExpired: false,
			isExpiringSoon: false,
			severity: "info",
			message: "No expiration date",
		};
	}

	const expiry = new Date(expirationDate);
	const today = new Date();
	const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

	if (daysRemaining < 0) {
		return {
			status: "expired",
			daysRemaining: Math.abs(daysRemaining),
			isExpired: true,
			isExpiringSoon: false,
			severity: "critical",
			message: `Expired ${Math.abs(daysRemaining)} days ago`,
			color: "red",
		};
	}

	if (daysRemaining <= 7) {
		return {
			status: "expiring_critical",
			daysRemaining,
			isExpired: false,
			isExpiringSoon: true,
			severity: "critical",
			message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`,
			color: "red",
		};
	}

	if (daysRemaining <= 30) {
		return {
			status: "expiring_soon",
			daysRemaining,
			isExpired: false,
			isExpiringSoon: true,
			severity: "warning",
			message: `Expires in ${daysRemaining} days`,
			color: "yellow",
		};
	}

	if (daysRemaining <= 60) {
		return {
			status: "expiring_moderate",
			daysRemaining,
			isExpired: false,
			isExpiringSoon: false,
			severity: "info",
			message: `Expires in ${daysRemaining} days`,
			color: "blue",
		};
	}

	return {
		status: "fresh",
		daysRemaining,
		isExpired: false,
		isExpiringSoon: false,
		severity: "info",
		message: `Expires in ${daysRemaining} days`,
		color: "green",
	};
}

/**
 * Calculate reorder point using a simple safety-stock buffer.
 * @param {InventoryItem} item
 * @param {number} averageUsagePerDay Average daily usage.
 * @param {number} [leadTimeDays=7] Supplier lead time in days.
 * @returns {ReorderInfo}
 */
export function calculateReorderPoint(
	item,
	averageUsagePerDay,
	leadTimeDays = 7,
) {
	const safetyStock = averageUsagePerDay * 3; // 3 days safety buffer
	const reorderPoint = averageUsagePerDay * leadTimeDays + safetyStock;
	const shouldReorder = item.current_stock <= reorderPoint;
	const recommendedOrderQuantity = Math.max(
		item.minimum_stock * 2,
		averageUsagePerDay * 30,
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
 * Calculate inventory turnover rate over a time window.
 * @param {InventoryTransaction[]} transactions Transaction history.
 * @param {number} currentStock Current stock level.
 * @param {number} [days=30] Period in days.
 * @returns {number} Turnover rate.
 */
export function calculateTurnoverRate(transactions, currentStock, days = 30) {
	const allocations = transactions.filter(
		(t) =>
			t.transaction_type === "allocation" &&
			new Date(t.transaction_date) >=
				new Date(Date.now() - days * 24 * 60 * 60 * 1000),
	);

	const totalAllocated = allocations.reduce(
		(sum, t) => sum + Math.abs(t.quantity),
		0,
	);
	const averageStock = currentStock + totalAllocated / 2;

	return averageStock > 0 ? totalAllocated / averageStock : 0;
}

/**
 * Calculate total inventory value and breakdowns.
 * @param {InventoryItem[]} items
 * @returns {InventoryValueBreakdown}
 */
export function calculateInventoryValue(items) {
	const totalValue = items.reduce(
		(sum, item) => sum + item.current_stock * item.unit_cost,
		0,
	);

	const valueByCategory = items.reduce((acc, item) => {
		const category = item.category || "uncategorized";
		if (!acc[category]) acc[category] = 0;
		acc[category] += item.current_stock * item.unit_cost;
		return acc;
	}, {});

	const valueByLocation = items.reduce((acc, item) => {
		const location = item.location || "unassigned";
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
 * Generate an alert based on stock health and expiration status.
 * @param {InventoryItem} item
 * @returns {StockAlert|null}
 */
export function generateStockAlert(item) {
	const stockStatus = calculateStockStatus(item);
	const expirationStatus = calculateExpirationStatus(item.expiration_date);

	// Critical stock alert
	if (
		stockStatus.health === "depleted" ||
		stockStatus.health === "critical"
	) {
		return {
			type:
				stockStatus.health === "depleted"
					? "critical_stock"
					: "low_stock",
			severity: "critical",
			message: `${item.item_name} - ${stockStatus.status}. ${stockStatus.action}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			current_stock: item.current_stock,
			minimum_stock: item.minimum_stock,
		};
	}

	// Low stock warning
	if (stockStatus.health === "warning") {
		return {
			type: "low_stock",
			severity: "warning",
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
			type: "expired",
			severity: "critical",
			message: `${item.item_name} - ${expirationStatus.message}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			expiration_date: item.expiration_date,
		};
	}

	if (
		expirationStatus.isExpiringSoon &&
		expirationStatus.daysRemaining <= 7
	) {
		return {
			type: "expiring_soon",
			severity: "critical",
			message: `${item.item_name} - ${expirationStatus.message}`,
			item_id: item.id,
			item_code: item.item_code,
			item_name: item.item_name,
			expiration_date: item.expiration_date,
			days_remaining: expirationStatus.daysRemaining,
		};
	}

	if (
		expirationStatus.isExpiringSoon &&
		expirationStatus.daysRemaining <= 30
	) {
		return {
			type: "expiring_soon",
			severity: "warning",
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
 * Enrich an inventory item with derived fields used by UI.
 * @param {InventoryItem} item
 * @returns {InventoryItem & {
 *  stock_status: StockStatus,
 *  expiration_status: ExpirationStatus,
 *  total_value: number,
 *  formatted_value: string,
 *  formatted_unit_cost: string,
 * }}
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
 * Get category icon and UI class tokens.
 * @param {string} category
 * @returns {CategoryInfo}
 */
export function getCategoryInfo(category) {
	const categoryMap = {
		material: {
			icon: "Package",
			color: "text-blue-600",
			bgColor: "bg-blue-100",
		},
		equipment: {
			icon: "Tool",
			color: "text-purple-600",
			bgColor: "bg-purple-100",
		},
		financial: {
			icon: "DollarSign",
			color: "text-green-600",
			bgColor: "bg-green-100",
		},
		human_resource: {
			icon: "Users",
			color: "text-orange-600",
			bgColor: "bg-orange-100",
		},
	};
	return (
		categoryMap[category] || {
			icon: "Box",
			color: "text-gray-600",
			bgColor: "bg-gray-100",
		}
	);
}

/**
 * Format a currency amount using the `en-PH` locale.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
	}).format(amount || 0);
}

/**
 * Get transaction type display info.
 * @param {string} transactionType
 * @returns {TransactionTypeInfo}
 */
export function getTransactionTypeInfo(transactionType) {
	const typeMap = {
		stock_in: {
			label: "Stock In",
			color: "text-green-600",
			bgColor: "bg-green-100",
			icon: "ArrowDownCircle",
		},
		allocation: {
			label: "Allocation",
			color: "text-blue-600",
			bgColor: "bg-blue-100",
			icon: "Send",
		},
		return: {
			label: "Return",
			color: "text-purple-600",
			bgColor: "bg-purple-100",
			icon: "ArrowLeftCircle",
		},
		transfer: {
			label: "Transfer",
			color: "text-indigo-600",
			bgColor: "bg-indigo-100",
			icon: "ArrowRightLeft",
		},
		adjustment: {
			label: "Adjustment",
			color: "text-yellow-600",
			bgColor: "bg-yellow-100",
			icon: "Edit",
		},
		expired: {
			label: "Expired",
			color: "text-red-600",
			bgColor: "bg-red-100",
			icon: "XCircle",
		},
		damaged: {
			label: "Damaged",
			color: "text-orange-600",
			bgColor: "bg-orange-100",
			icon: "AlertTriangle",
		},
	};
	return (
		typeMap[transactionType] || {
			label: "Unknown",
			color: "text-gray-600",
			bgColor: "bg-gray-100",
			icon: "HelpCircle",
		}
	);
}

/**
 * Generate a human-readable item code from a category prefix and sequence.
 * @param {string} category
 * @param {number} sequence
 * @returns {string}
 *
 * @example
 * generateItemCode('material', 42); // "MAT-042"
 */
export function generateItemCode(category, sequence) {
	const prefixMap = {
		material: "MAT",
		equipment: "EQUIP",
		financial: "FIN",
		human_resource: "HR",
	};

	const prefix = prefixMap[category] || "ITEM";
	const paddedSequence = String(sequence).padStart(3, "0");

	return `${prefix}-${paddedSequence}`;
}
