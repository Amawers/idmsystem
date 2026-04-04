/**
 * Resource management store (Zustand).
 *
 * Centralizes state and operations for:
 * - resource requests (submission + approval flow)
 * - inventory items + stock updates
 * - transactions/disbursements
 * - alerts
 *
 * Data behavior:
 * - Uses Supabase as the single source of truth.
 * - Network failures are surfaced through store error state.
 */

import { create } from "zustand";
import supabase from "@/../config/supabase";

/** @typedef {{ from?: string, to?: string }} DateRange */
/**
 * @typedef {Object} ResourceRequestFilters
 * @property {string} [status]
 * @property {string} [program_id]
 * @property {string} [barangay]
 * @property {string} [request_type]
 * @property {string} [beneficiary_type]
 * @property {string} [priority]
 * @property {DateRange} [dateRange]
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

const EMPTY_REQUEST_STATS = {
	total: 0,
	submitted: 0,
	approved: 0,
	rejected: 0,
	disbursed: 0,
	totalAmount: 0,
	pendingAmount: 0,
};

const EMPTY_INVENTORY_STATS = {
	totalItems: 0,
	totalValue: 0,
	lowStock: 0,
	criticalStock: 0,
	available: 0,
	depleted: 0,
};

const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined || value === "") return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const computeInventoryStatus = (currentStock, minimumStock) => {
	if (currentStock <= 0) return "depleted";
	if (currentStock < minimumStock * 0.5) return "critical_stock";
	if (currentStock <= minimumStock) return "low_stock";
	return "available";
};

const INVENTORY_REQUEST_TIMEOUT_MS = 20000;

const withTimeout = async (promise, timeoutMs, label) => {
	let timeoutId;
	const timeoutPromise = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(
				new Error(
					`${label} timed out. Please check your connection and try again.`,
				),
			);
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		clearTimeout(timeoutId);
	}
};

/**
 * Hook-style access to the resource store.
 *
 * @example
 * const { requests, fetchRequests, submitRequest } = useResourceStore();
 */
export const useResourceStore = create((set, get) => ({
	// State
	requests: [],
	filteredRequests: [],
	inventoryItems: [],
	filteredInventory: [],
	transactions: [],
	disbursements: [],
	alerts: [],
	unresolvedAlerts: [],
	loading: false,
	error: null,
	requestStats: { ...EMPTY_REQUEST_STATS },
	inventoryStats: { ...EMPTY_INVENTORY_STATS },

	/**
	 * Fetches resource requests with optional filters.
	 * @param {ResourceRequestFilters} filters
	 */
	fetchRequests: async (filters = {}) => {
		set({ loading: true, error: null });

		try {
			let query = supabase
				.from("resource_requests")
				.select("*")
				.order("created_at", { ascending: false });

			if (filters.status) query = query.eq("status", filters.status);
			if (filters.program_id)
				query = query.eq("program_id", filters.program_id);
			if (filters.barangay) query = query.eq("barangay", filters.barangay);
			if (filters.request_type)
				query = query.eq("request_type", filters.request_type);
			if (filters.beneficiary_type)
				query = query.eq("beneficiary_type", filters.beneficiary_type);
			if (filters.priority)
				query = query.eq("priority", filters.priority);

			if (filters.dateRange?.from) {
				query = query.gte("created_at", filters.dateRange.from);
			}
			if (filters.dateRange?.to) {
				query = query.lte("created_at", filters.dateRange.to);
			}

			const { data: requestsData, error } = await query;
			if (error) throw error;

			const requests = Array.isArray(requestsData) ? requestsData : [];
			const userIds = [
				...new Set(requests.map((req) => req.requested_by).filter(Boolean)),
			];

			let profileMap = {};
			if (userIds.length > 0) {
				const { data: profileData, error: profileError } = await supabase
					.from("profile")
					.select("id, full_name, email, role")
					.in("id", userIds);

				if (profileError) {
					console.warn("Failed to join profile records for requests", profileError);
				} else {
					profileMap = (profileData || []).reduce((acc, profile) => {
						acc[profile.id] = profile;
						return acc;
					}, {});
				}
			}

			const rows = requests.map((request) => ({
				...request,
				requester: request.requested_by
					? profileMap[request.requested_by] || null
					: null,
			}));

			set({
				requests: rows,
				filteredRequests: rows,
				requestStats: get().computeRequestStats(rows),
				loading: false,
			});

			return rows;
		} catch (err) {
			console.error("Error fetching requests:", err);
			set({
				error: err.message,
				loading: false,
				requests: [],
				filteredRequests: [],
				requestStats: { ...EMPTY_REQUEST_STATS },
			});
			return [];
		}
	},

	/**
	 * Submit a new resource request to Supabase.
	 * @param {Object} requestData
	 */
	submitRequest: async (requestData) => {
		set({ loading: true, error: null });

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("User not authenticated. Please log in and try again.");
			}

			const payload = {
				...requestData,
				requested_by: user.id,
				status: "submitted",
				submitted_at: new Date().toISOString(),
			};

			Object.keys(payload).forEach((key) => {
				if (payload[key] === undefined) delete payload[key];
				if (payload[key] === null && key !== "item_id") delete payload[key];
			});

			const { data, error } = await supabase
				.from("resource_requests")
				.insert([payload])
				.select("*")
				.single();

			if (error) throw error;

			const created = {
				...data,
				requester: {
					id: user.id,
					full_name: user.user_metadata?.full_name || user.email || "You",
					email: user.email || null,
					role: user.user_metadata?.role || null,
				},
			};

			set((state) => {
				const next = [created, ...state.requests];
				return {
					requests: next,
					filteredRequests: next,
					requestStats: get().computeRequestStats(next),
					loading: false,
				};
			});

			return created;
		} catch (err) {
			console.error("Error submitting request:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Update request status in Supabase.
	 * @param {string} requestId
	 * @param {string} newStatus
	 * @param {string} notes
	 */
	updateRequestStatus: async (requestId, newStatus, notes = "") => {
		set({ loading: true, error: null });

		try {
			const updateData = {
				status: newStatus,
				updated_at: new Date().toISOString(),
			};

			if (newStatus === "rejected") {
				updateData.rejection_reason = notes || "No reason provided";
			}

			if (newStatus === "disbursed") {
				updateData.disbursement_date = new Date().toISOString();
			}

			const { data, error } = await supabase
				.from("resource_requests")
				.update(updateData)
				.eq("id", requestId)
				.select("*")
				.single();

			if (error) throw error;

			set((state) => {
				const updateRow = (row) => {
					if (row.id !== requestId) return row;
					return {
						...data,
						requester: row.requester || null,
					};
				};

				const nextRequests = state.requests.map(updateRow);
				const nextFiltered = state.filteredRequests.map(updateRow);

				return {
					requests: nextRequests,
					filteredRequests: nextFiltered,
					requestStats: get().computeRequestStats(nextFiltered),
					loading: false,
				};
			});

			return data;
		} catch (err) {
			console.error("Error updating request status:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Record a disbursement by moving the request to disbursed status.
	 * @param {Object} disbursementData
	 */
	recordDisbursement: async (disbursementData) => {
		const result = await get().updateRequestStatus(
			disbursementData.request_id,
			"disbursed",
			disbursementData.notes || "",
		);
		await get().fetchDisbursements();
		return result;
	},

	/**
	 * Fetches inventory items with optional filters.
	 * @param {InventoryFilters} filters
	 */
	fetchInventory: async (filters = {}) => {
		set({ loading: true, error: null });

		try {
			let query = supabase
				.from("inventory_items")
				.select("*")
				.order("item_name", { ascending: true });

			if (filters.category) query = query.eq("category", filters.category);
			if (filters.status) query = query.eq("status", filters.status);
			if (filters.location) query = query.eq("location", filters.location);
			if (filters.critical_stock) {
				query = query.eq("status", "critical_stock");
			}
			if (filters.search) {
				query = query.or(
					`item_name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%`,
				);
			}

			const { data, error } = await withTimeout(
				query,
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Fetching inventory",
			);
			if (error) throw error;

			const source = Array.isArray(data) ? data : [];
			const filtered = filters.low_stock
				? source.filter(
						(item) =>
							Number(item.current_stock) <= Number(item.minimum_stock) &&
							Number(item.current_stock) > 0,
					)
				: source;

			set({
				inventoryItems: source,
				filteredInventory: filtered,
				inventoryStats: get().computeInventoryStats(filtered),
				loading: false,
			});

			return filtered;
		} catch (err) {
			console.error("Error fetching inventory:", err);
			set({
				error: err.message,
				loading: false,
				inventoryItems: [],
				filteredInventory: [],
				inventoryStats: { ...EMPTY_INVENTORY_STATS },
			});
			return [];
		}
	},

	/**
	 * Update stock level for an item.
	 * @param {string} itemId
	 * @param {number} quantity
	 * @param {string} transactionType
	 * @param {string} notes
	 */
	updateStock: async (
		itemId,
		quantity,
		transactionType = "adjustment",
		notes = "",
	) => {
		set({ loading: true, error: null });

		try {
			const sessionResult = await withTimeout(
				supabase.auth.getUser(),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Verifying user session",
			);

			const {
				data: { user },
			} = sessionResult;

			if (!user) throw new Error("User not authenticated");

			const { data: currentItem, error: fetchError } = await withTimeout(
				supabase
					.from("inventory_items")
					.select("*")
					.eq("id", itemId)
					.single(),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Loading inventory item",
			);

			if (fetchError) throw fetchError;

			const currentStock = toNumber(currentItem.current_stock);
			const minStock = toNumber(currentItem.minimum_stock);
			const newStock =
				transactionType === "adjustment"
					? toNumber(quantity)
					: currentStock + toNumber(quantity);

			if (newStock < 0) {
				throw new Error("Insufficient stock. Cannot reduce below zero.");
			}

			const newStatus = computeInventoryStatus(newStock, minStock);

			const { data: updatedItem, error: updateError } = await withTimeout(
				supabase
					.from("inventory_items")
					.update({
						current_stock: newStock,
						status: newStatus,
						updated_at: new Date().toISOString(),
					})
					.eq("id", itemId)
					.select("*")
					.single(),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Updating inventory stock",
			);

			if (updateError) throw updateError;

			const quantityDelta =
				transactionType === "adjustment"
					? newStock - currentStock
					: toNumber(quantity);

			if (quantityDelta !== 0) {
				const performedByName =
					user.user_metadata?.full_name || user.email || "System User";

				try {
					const { error: transactionError } = await withTimeout(
						supabase
							.from("inventory_transactions")
							.insert([
								{
									item_id: itemId,
									transaction_type: transactionType,
									quantity: quantityDelta,
									unit_cost: toNumber(currentItem.unit_cost),
									performed_by: user.id,
									performed_by_name: performedByName,
									notes: notes || `${transactionType} transaction`,
								},
							]),
						INVENTORY_REQUEST_TIMEOUT_MS,
						"Recording stock transaction",
					);

					if (transactionError) {
						console.error("Transaction log error:", transactionError);
					}
				} catch (transactionError) {
					console.error("Transaction log timeout/error:", transactionError);
				}
			}

			set((state) => {
				const mapUpdate = (item) =>
					item.id === updatedItem.id ? updatedItem : item;
				const nextInventory = state.inventoryItems.map(mapUpdate);
				const nextFiltered = state.filteredInventory.map(mapUpdate);
				return {
					inventoryItems: nextInventory,
					filteredInventory: nextFiltered,
					inventoryStats: get().computeInventoryStats(nextFiltered),
					loading: false,
				};
			});

			void get().fetchTransactions({ item_id: itemId, silent: true });
			return updatedItem;
		} catch (err) {
			console.error("Error updating stock:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Add a new inventory item.
	 * @param {Object} itemData
	 */
	addInventoryItem: async (itemData) => {
		set({ loading: true, error: null });

		try {
			const currentStock = toNumber(itemData.current_stock);
			const minimumStock = toNumber(itemData.minimum_stock);
			const status = computeInventoryStatus(currentStock, minimumStock);

			const payload = {
				item_name: itemData.item_name,
				category: itemData.category,
				current_stock: currentStock,
				minimum_stock: minimumStock,
				unit_cost: toNumber(itemData.unit_cost),
				unit_of_measure: itemData.unit_of_measure,
				location: itemData.location || null,
				description: itemData.description || null,
				status,
			};

			const { data, error } = await withTimeout(
				supabase
					.from("inventory_items")
					.insert([payload])
					.select("*")
					.single(),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Adding inventory item",
			);

			if (error) throw error;

			set((state) => {
				const nextInventory = [...state.inventoryItems, data];
				const nextFiltered = [...state.filteredInventory, data];
				return {
					inventoryItems: nextInventory,
					filteredInventory: nextFiltered,
					inventoryStats: get().computeInventoryStats(nextFiltered),
					loading: false,
				};
			});

			return data;
		} catch (err) {
			console.error("Error adding inventory item:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Delete inventory item.
	 * @param {string} itemId
	 */
	deleteInventoryItem: async (itemId) => {
		set({ loading: true, error: null });

		try {
			const { error } = await withTimeout(
				supabase
					.from("inventory_items")
					.delete()
					.eq("id", itemId),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Deleting inventory item",
			);

			if (error) throw error;

			set((state) => {
				const nextInventory = state.inventoryItems.filter(
					(item) => item.id !== itemId,
				);
				const nextFiltered = state.filteredInventory.filter(
					(item) => item.id !== itemId,
				);
				return {
					inventoryItems: nextInventory,
					filteredInventory: nextFiltered,
					inventoryStats: get().computeInventoryStats(nextFiltered),
					loading: false,
				};
			});
		} catch (err) {
			console.error("Error deleting inventory item:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Update inventory item metadata (excluding stock quantity).
	 * @param {string} itemId
	 * @param {Object} updateData
	 */
	updateInventoryItem: async (itemId, updateData) => {
		set({ loading: true, error: null });

		try {
			const updates = {
				item_name: updateData.item_name,
				category: updateData.category,
				unit_cost: toNumber(updateData.unit_cost),
				minimum_stock: toNumber(updateData.minimum_stock),
				unit_of_measure: updateData.unit_of_measure,
				location: updateData.location || null,
				description: updateData.description || null,
				updated_at: new Date().toISOString(),
			};

			const { data, error } = await withTimeout(
				supabase
					.from("inventory_items")
					.update(updates)
					.eq("id", itemId)
					.select("*")
					.single(),
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Updating inventory item",
			);

			if (error) throw error;

			set((state) => {
				const mapUpdate = (item) => (item.id === itemId ? data : item);
				const nextInventory = state.inventoryItems.map(mapUpdate);
				const nextFiltered = state.filteredInventory.map(mapUpdate);
				return {
					inventoryItems: nextInventory,
					filteredInventory: nextFiltered,
					inventoryStats: get().computeInventoryStats(nextFiltered),
					loading: false,
				};
			});

			return data;
		} catch (err) {
			console.error("Error updating inventory item:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Allocate resource by applying stock-out transaction.
	 * @param {Object} allocationData
	 */
	allocateResource: async (allocationData) => {
		const { item_id, quantity, notes } = allocationData;
		return get().updateStock(
			item_id,
			-Math.abs(toNumber(quantity)),
			"allocation",
			notes || "Allocation transaction",
		);
	},

	/**
	 * Fetch inventory transactions.
	 * @param {Object} filters
	 */
	fetchTransactions: async (filters = {}) => {
		const { silent = false, ...queryFilters } = filters || {};
		if (!silent) {
			set({ loading: true, error: null });
		}

		try {
			let query = supabase
				.from("inventory_transactions")
				.select("*")
				.order("created_at", { ascending: false });

			if (queryFilters.item_id) query = query.eq("item_id", queryFilters.item_id);
			if (queryFilters.transaction_type) {
				query = query.eq("transaction_type", queryFilters.transaction_type);
			}
			if (queryFilters.program_id) {
				query = query.eq("program_id", queryFilters.program_id);
			}

			const { data, error } = await withTimeout(
				query,
				INVENTORY_REQUEST_TIMEOUT_MS,
				"Fetching inventory transactions",
			);
			if (error) throw error;

			if (silent) {
				set({ transactions: data || [] });
			} else {
				set({
					transactions: data || [],
					loading: false,
				});
			}

			return data || [];
		} catch (err) {
			console.error("Error fetching transactions:", err);
			if (silent) {
				set({ transactions: [] });
			} else {
				set({ transactions: [], error: err.message, loading: false });
			}
			return [];
		}
	},

	/**
	 * Fetch disbursement records from disbursed resource requests.
	 */
	fetchDisbursements: async () => {
		set({ loading: true, error: null });

		try {
			const { data, error } = await supabase
				.from("resource_requests")
				.select("*")
				.eq("status", "disbursed")
				.order("updated_at", { ascending: false });

			if (error) throw error;

			set({
				disbursements: data || [],
				loading: false,
			});

			return data || [];
		} catch (err) {
			console.error("Error fetching disbursements:", err);
			set({ disbursements: [], error: err.message, loading: false });
			return [];
		}
	},

	/**
	 * Fetch inventory alerts from Supabase.
	 */
	fetchAlerts: async () => {
		set({ loading: true, error: null });

		try {
			const { data, error } = await supabase
				.from("inventory_alerts")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;

			const alerts = data || [];
			const unresolvedAlerts = alerts.filter((alert) => !alert.is_resolved);

			set({
				alerts,
				unresolvedAlerts,
				loading: false,
			});

			return alerts;
		} catch (err) {
			console.error("Error fetching alerts:", err);
			set({
				alerts: [],
				unresolvedAlerts: [],
				error: err.message,
				loading: false,
			});
			return [];
		}
	},

	/**
	 * Resolve an alert in Supabase.
	 * @param {string} alertId
	 */
	resolveAlert: async (alertId) => {
		set({ loading: true, error: null });

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			const { data, error } = await supabase
				.from("inventory_alerts")
				.update({
					is_resolved: true,
					resolved_at: new Date().toISOString(),
					resolved_by: user?.id || null,
				})
				.eq("id", alertId)
				.select("*")
				.single();

			if (error) throw error;

			set((state) => {
				const nextAlerts = state.alerts.map((alert) =>
					alert.id === alertId ? data : alert,
				);
				return {
					alerts: nextAlerts,
					unresolvedAlerts: nextAlerts.filter((alert) => !alert.is_resolved),
					loading: false,
				};
			});

			return data;
		} catch (err) {
			console.error("Error resolving alert:", err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Compute request statistics.
	 * @param {Array} requests
	 * @returns {Object}
	 */
	computeRequestStats: (requests) => {
		const rows = Array.isArray(requests) ? requests : [];
		return {
			total: rows.length,
			submitted: rows.filter((r) => r.status === "submitted").length,
			approved: rows.filter((r) => r.status === "head_approved").length,
			rejected: rows.filter((r) => r.status === "rejected").length,
			disbursed: rows.filter((r) => r.status === "disbursed").length,
			totalAmount: rows.reduce((sum, r) => sum + toNumber(r.total_amount), 0),
			pendingAmount: rows
				.filter(
					(r) => r.status === "submitted" || r.status === "head_approved",
				)
				.reduce((sum, r) => sum + toNumber(r.total_amount), 0),
		};
	},

	/**
	 * Compute inventory statistics.
	 * @param {Array} items
	 * @returns {Object}
	 */
	computeInventoryStats: (items) => {
		const rows = Array.isArray(items) ? items : [];
		return {
			totalItems: rows.length,
			totalValue: rows.reduce(
				(sum, item) =>
					sum + toNumber(item.current_stock) * toNumber(item.unit_cost),
				0,
			),
			lowStock: rows.filter(
				(item) =>
					toNumber(item.current_stock) <= toNumber(item.minimum_stock) &&
					toNumber(item.current_stock) > 0,
			).length,
			criticalStock: rows.filter(
				(item) =>
					item.status === "critical_stock" || toNumber(item.current_stock) === 0,
			).length,
			available: rows.filter((item) => item.status === "available").length,
			depleted: rows.filter((item) => item.status === "depleted").length,
		};
	},

	/** Reset error state. */
	clearError: () => set({ error: null }),

	/**
	 * Initialize store (load all resource datasets).
	 */
	init: async () => {
		await Promise.all([
			get().fetchRequests(),
			get().fetchInventory(),
			get().fetchTransactions(),
			get().fetchDisbursements(),
			get().fetchAlerts(),
		]);
	},
}));
