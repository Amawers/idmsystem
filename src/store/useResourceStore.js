// =============================================
// Resource Management Store - Zustand
// ---------------------------------------------
// Purpose: Centralized state management for resource allocation and inventory
// 
// Key Responsibilities:
// - Manage resource requests state with Supabase integration
// - Handle inventory items and transactions
// - Track disbursements and allocations
// - Manage alerts and notifications with real-time updates
//
// Dependencies:
// - zustand (state management)
// - Supabase client for database operations
//
// Notes:
// - Integrates with Supabase for real-time data
// - Implements full CRUD operations with optimistic updates
// - Includes real-time subscriptions for alerts
// - Includes audit trail integration points
// =============================================

import { create } from "zustand";
import supabase from "@/../config/supabase";

/**
 * Resource Store - Zustand State Store
 * 
 * @description Central store for resource allocation and inventory management
 * 
 * @typedef {Object} ResourceStoreState
 * @property {Array} requests - All resource requests
 * @property {Array} inventoryItems - All inventory items
 * @property {Array} transactions - Inventory transaction history
 * @property {Array} disbursements - Disbursement records
 * @property {Array} alerts - Inventory alerts
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message
 * 
 * @example
 * const { requests, fetchRequests, submitRequest } = useResourceStore();
 * await fetchRequests({ status: 'submitted' });
 */
export const useResourceStore = create((set, get) => ({
	//* ================================================
	//* STATE PROPERTIES
	//* ================================================
	
	// Resource Requests
	requests: [],
	filteredRequests: [],
	
	// Inventory Management
	inventoryItems: [],
	filteredInventory: [],
	
	// Transactions & History
	transactions: [],
	disbursements: [],
	
	// Alerts & Notifications
	alerts: [],
	unresolvedAlerts: [],
	
	// UI State
	loading: false,
	error: null,
	
	// Statistics
	requestStats: {
		total: 0,
		submitted: 0,
		approved: 0,
		rejected: 0,
		disbursed: 0,
		totalAmount: 0,
	},
	
	inventoryStats: {
		totalItems: 0,
		totalValue: 0,
		lowStock: 0,
		criticalStock: 0,
		available: 0,
	},

	//* ================================================
	//* RESOURCE REQUEST ACTIONS
	//* ================================================

	/**
	 * Fetch all resource requests with optional filters from Supabase
	 * @param {Object} filters - Filter criteria (status, program, barangay, etc.)
	 */
	fetchRequests: async (filters = {}) => {
		set({ loading: true, error: null });

		// Short-circuit when browser is offline to avoid long/hanging network calls
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			set({ loading: false });
			return;
		}
		
		try {
			// First, fetch resource requests
			let query = supabase
				.from('resource_requests')
				.select('*')
				.order('created_at', { ascending: false });
			
			// Apply filters
			if (filters.status) {
				query = query.eq('status', filters.status);
			}
			
			if (filters.program_id) {
				query = query.eq('program_id', filters.program_id);
			}
			
			if (filters.barangay) {
				query = query.eq('barangay', filters.barangay);
			}
			
			if (filters.request_type) {
				query = query.eq('request_type', filters.request_type);
			}
			
			if (filters.beneficiary_type) {
				query = query.eq('beneficiary_type', filters.beneficiary_type);
			}
			
			if (filters.priority) {
				query = query.eq('priority', filters.priority);
			}
			
			// Date range filter
			if (filters.dateRange) {
				const { from, to } = filters.dateRange;
				query = query.gte('created_at', from).lte('created_at', to);
			}
			
			const { data: requests, error } = await query;
			
			if (error) {
				console.error('Supabase error:', error);
				set({ 
					requests: [],
					filteredRequests: [],
					requestStats: {
						total: 0,
						submitted: 0,
						approved: 0,
						rejected: 0,
						disbursed: 0,
						totalAmount: 0,
					},
					loading: false,
					error: 'Database connection issue'
				});
				return;
			}
			
			// Manually join with profile table
			// Get unique user IDs from requested_by field
			const userIds = [...new Set(
				(requests || [])
					.map(req => req.requested_by)
					.filter(id => id !== null)
			)];
			
			let profiles = {};
			
			// Fetch profiles for all requesters
			if (userIds.length > 0) {
				const { data: profileData, error: profileError } = await supabase
					.from('profile')
					.select('id, full_name, email, role')
					.in('id', userIds);
				
				if (!profileError && profileData) {
					// Create a map of user_id -> profile for quick lookup
					profiles = profileData.reduce((acc, profile) => {
						acc[profile.id] = profile;
						return acc;
					}, {});
				}
			}
			
			// Attach requester profile to each request
			const data = (requests || []).map(request => ({
				...request,
				requester: request.requested_by ? profiles[request.requested_by] || null : null
			}));
			
			// Compute statistics
			const stats = get().computeRequestStats(data || []);
			
			set({ 
				requests: data || [],
				filteredRequests: data || [],
				requestStats: stats,
				loading: false 
			});
			
		} catch (err) {
			console.error('Error fetching requests:', err);
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Submit a new resource request to Supabase
	 * @param {Object} requestData - Request details
	 * @returns {Object} Created request
	 */
	submitRequest: async (requestData) => {
		set({ loading: true, error: null });
		
		try {
			// Get current user
			const { data: { user } } = await supabase.auth.getUser();
			
			if (!user) {
				throw new Error('User not authenticated. Please log in and try again.');
			}
			
			const newRequest = {
				...requestData,
				requested_by: user.id,
				status: 'submitted',
				submitted_at: new Date().toISOString(),
			};
			
			// Remove any undefined or null values that aren't needed
			Object.keys(newRequest).forEach(key => {
				if (newRequest[key] === undefined || newRequest[key] === null && key !== 'item_id') {
					delete newRequest[key];
				}
			});
			
			console.log('Submitting request:', newRequest); // Debug log
			
			const { data, error } = await supabase
				.from('resource_requests')
				.insert([newRequest])
				.select()
				.single();
			
			if (error) {
				console.error('Supabase insert error:', error);
				throw new Error(error.message || 'Failed to submit request to database');
			}
			
			// Optimistic update
			set(state => ({
				requests: [data, ...state.requests],
				filteredRequests: [data, ...state.filteredRequests],
				loading: false,
			}));
			
			// Recompute stats
			const stats = get().computeRequestStats(get().filteredRequests);
			set({ requestStats: stats });
			
			return data;
			
		} catch (err) {
			console.error('Error submitting request:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Update request status (for Head approval/rejection) in Supabase
	 * @param {string} requestId - Request ID
	 * @param {string} newStatus - New status
	 * @param {string} notes - Optional notes/reason
	 */
	updateRequestStatus: async (requestId, newStatus, notes = '') => {
		set({ loading: true, error: null });
		
		try {
			const updateData = {
				status: newStatus,
				updated_at: new Date().toISOString(),
			};
			
			if (newStatus === 'rejected' && notes) {
				updateData.rejection_reason = notes;
			}
			
			const { data, error } = await supabase
				.from('resource_requests')
				.update(updateData)
				.eq('id', requestId)
				.select()
				.single();
			
			if (error) {
				console.error('Supabase update error:', error);
				throw error;
			}
			
			set(state => ({
				requests: state.requests.map(req => req.id === requestId ? data : req),
				filteredRequests: state.filteredRequests.map(req => req.id === requestId ? data : req),
				loading: false,
			}));
			
			// Update stats
			const stats = get().computeRequestStats(get().filteredRequests);
			set({ requestStats: stats });
			
		} catch (err) {
			console.error('Error updating request status:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Record a disbursement for an approved request
	 * @param {Object} disbursementData - Disbursement details
	 */
	recordDisbursement: async (disbursementData) => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 700));
			
			const newDisbursement = {
				id: `disb-${Date.now()}`,
				voucher_number: `DV-2025-${String(get().disbursements.length + 1).padStart(4, '0')}`,
				...disbursementData,
				created_at: new Date().toISOString(),
			};
			
			// Update request status to disbursed
			set(state => ({
				requests: state.requests.map(req => 
					req.id === disbursementData.request_id 
						? { 
								...req, 
								status: 'disbursed',
								disbursement_date: disbursementData.disbursement_date,
								disbursement_method: disbursementData.disbursement_method,
								updated_at: new Date().toISOString()
							}
						: req
				),
				disbursements: [...state.disbursements, newDisbursement],
				loading: false,
			}));
			
			return newDisbursement;
			
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	//* ================================================
	//* INVENTORY ACTIONS
	//* ================================================

	/**
	 * Fetch inventory items with optional filters from Supabase
	 * @param {Object} filters - Filter criteria
	 */
	fetchInventory: async (filters = {}) => {
		set({ loading: true, error: null });
		
		try {
			let query = supabase
				.from('inventory_items')
				.select('*')
				.order('item_name', { ascending: true });
			
			// Apply filters
			if (filters.category) {
				query = query.eq('category', filters.category);
			}
			
			if (filters.status) {
				query = query.eq('status', filters.status);
			}
			
			if (filters.location) {
				query = query.eq('location', filters.location);
			}
			
			if (filters.low_stock) {
				query = query.lte('current_stock', supabase.raw('minimum_stock'));
			}
			
			if (filters.critical_stock) {
				query = query.eq('status', 'critical_stock');
			}
			
			// Search by name or code
			if (filters.search) {
				query = query.or(`item_name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%`);
			}
			
			const { data, error } = await query;
			
			if (error) {
				console.error('Supabase error:', error);
				set({ 
					inventoryItems: [],
					filteredInventory: [],
					inventoryStats: {
						totalItems: 0,
						totalValue: 0,
						lowStock: 0,
						criticalStock: 0,
						available: 0,
					},
					loading: false,
					error: 'Database connection issue'
				});
				return;
			}
			
			// Compute statistics
			const stats = get().computeInventoryStats(data || []);
			
			set({ 
				inventoryItems: data || [],
				filteredInventory: data || [],
				inventoryStats: stats,
				loading: false 
			});
			
		} catch (err) {
			console.error('Error fetching inventory:', err);
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Update stock level for an item
	 * @param {string} itemId - Item ID
	 * @param {number} quantity - Quantity change (positive or negative)
	 * @param {string} transactionType - Type of transaction (stock_in, stock_out, adjustment, allocation, transfer)
	 * @param {string} notes - Transaction notes
	 */
	updateStock: async (itemId, quantity, transactionType = 'adjustment', notes = '') => {
		set({ loading: true, error: null });
		
		try {
			// Get current user
			const { data: { user } } = await supabase.auth.getUser();
			
			if (!user) {
				throw new Error('User not authenticated');
			}

			// Get current item
			const { data: currentItem, error: fetchError } = await supabase
				.from('inventory_items')
				.select('*')
				.eq('id', itemId)
				.single();

			if (fetchError) throw fetchError;

			// Calculate new stock
			const newStock = transactionType === 'adjustment' 
				? quantity 
				: currentItem.current_stock + quantity;

			if (newStock < 0) {
				throw new Error('Insufficient stock. Cannot reduce below zero.');
			}

			// Determine new status
			let newStatus = 'available';
			if (newStock <= 0) {
				newStatus = 'depleted';
			} else if (newStock < currentItem.minimum_stock * 0.5) {
				newStatus = 'critical_stock';
			} else if (newStock <= currentItem.minimum_stock) {
				newStatus = 'low_stock';
			}

			// Update inventory item in Supabase
			const { error: updateError } = await supabase
				.from('inventory_items')
				.update({
					current_stock: newStock,
					status: newStatus,
					updated_at: new Date().toISOString(),
				})
				.eq('id', itemId);

			if (updateError) throw updateError;

			// Create transaction record
			const transactionData = {
				item_id: itemId,
				transaction_type: transactionType,
				quantity: transactionType === 'adjustment' ? quantity - currentItem.current_stock : quantity,
				unit_cost: currentItem.unit_cost,
				performed_by: user.id,
				notes: notes || `${transactionType} transaction`,
			};

			const { error: transactionError } = await supabase
				.from('inventory_transactions')
				.insert([transactionData]);

			if (transactionError) console.error('Transaction log error:', transactionError);

			// Refresh inventory to update local state
			await get().fetchInventory();
			
			set({ loading: false });
			
		} catch (err) {
			console.error('Error updating stock:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Add new inventory item
	 * @param {Object} itemData - New item data
	 */
	addInventoryItem: async (itemData) => {
		set({ loading: true, error: null });
		
		try {
			// Get current user
			const { data: { user } } = await supabase.auth.getUser();
			
			if (!user) {
				throw new Error('User not authenticated');
			}

			// Determine initial status based on stock level
			let status = 'available';
			const currentStock = parseFloat(itemData.current_stock);
			const minStock = parseFloat(itemData.minimum_stock);
			
			if (currentStock <= 0) {
				status = 'depleted';
			} else if (currentStock < minStock * 0.5) {
				status = 'critical_stock';
			} else if (currentStock <= minStock) {
				status = 'low_stock';
			}

		// Prepare item data (total_value removed - computed on read)
		const newItem = {
			item_name: itemData.item_name,
			category: itemData.category,
			current_stock: currentStock,
			minimum_stock: minStock,
			unit_cost: parseFloat(itemData.unit_cost),
			unit_of_measure: itemData.unit_of_measure,
			location: itemData.location || null,
			description: itemData.description || null,
			status: status,
		};

		// Insert into Supabase
		const { data, error } = await supabase
			.from('inventory_items')
			.insert([newItem])
			.select()
			.single();

		if (error) {
			console.error('Supabase insert error:', error);
			throw error;
		}			// Update local state
			set(state => ({
				inventoryItems: [...state.inventoryItems, data],
				loading: false,
			}));

			// Refresh inventory to update stats
			await get().fetchInventory();

			return data;
			
		} catch (err) {
			console.error('Error adding inventory item:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Delete inventory item
	 * @param {string} itemId - Item ID to delete
	 */
	deleteInventoryItem: async (itemId) => {
		set({ loading: true, error: null });
		
		try {
			// Delete from Supabase
			const { error } = await supabase
				.from('inventory_items')
				.delete()
				.eq('id', itemId);

			if (error) {
				console.error('Supabase delete error:', error);
				throw error;
			}

			// Update local state
			set(state => ({
				inventoryItems: state.inventoryItems.filter(item => item.id !== itemId),
				filteredInventory: state.filteredInventory.filter(item => item.id !== itemId),
				loading: false,
			}));

			// Recompute stats
			const stats = get().computeInventoryStats(get().inventoryItems);
			set({ inventoryStats: stats });

		} catch (err) {
			console.error('Error deleting inventory item:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Update inventory item details (excluding stock quantity)
	 * @param {string} itemId - Item ID to update
	 * @param {Object} updateData - Updated item data
	 */
	updateInventoryItem: async (itemId, updateData) => {
		set({ loading: true, error: null });
		
		try {
			// Prepare update data
			const updates = {
				item_name: updateData.item_name,
				category: updateData.category,
				unit_cost: parseFloat(updateData.unit_cost),
				minimum_stock: parseFloat(updateData.minimum_stock),
				unit_of_measure: updateData.unit_of_measure,
				location: updateData.location || null,
				description: updateData.description || null,
				updated_at: new Date().toISOString(),
			};

			// Update in Supabase
			const { data, error } = await supabase
				.from('inventory_items')
				.update(updates)
				.eq('id', itemId)
				.select()
				.single();

			if (error) {
				console.error('Supabase update error:', error);
				throw error;
			}

			// Update local state
			set(state => ({
				inventoryItems: state.inventoryItems.map(item => 
					item.id === itemId ? data : item
				),
				filteredInventory: state.filteredInventory.map(item => 
					item.id === itemId ? data : item
				),
				loading: false,
			}));

			// Recompute stats
			const stats = get().computeInventoryStats(get().inventoryItems);
			set({ inventoryStats: stats });

			return data;

		} catch (err) {
			console.error('Error updating inventory item:', err);
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Allocate inventory items to a program/request
	 * @param {Object} allocationData - Allocation details
	 */
	allocateResource: async (allocationData) => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 700));
			
			const { item_id, quantity, program_id, to_location, notes } = allocationData;
			
			// Reduce stock
			await get().updateStock(item_id, -quantity, 'allocation');
			
			// Create allocation transaction
			const item = get().inventoryItems.find(i => i.id === item_id);
			const newTransaction = {
				id: `txn-${Date.now()}`,
				item_id,
				item_name: item?.item_name,
				transaction_type: 'allocation',
				quantity,
				transaction_date: new Date().toISOString(),
				from_location: item?.location,
				to_location,
				program_id,
				performed_by: 'current-user',
				performed_by_name: 'Current User',
				notes,
				created_at: new Date().toISOString(),
			};
			
			set(state => ({
				transactions: [newTransaction, ...state.transactions],
				loading: false,
			}));
			
			return newTransaction;
			
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	//* ================================================
	//* TRANSACTION & ALERT ACTIONS
	//* ================================================

	/**
	 * Fetch inventory transactions
	 * @param {Object} filters - Filter criteria
	 */
	fetchTransactions: async (filters = {}) => {
		set({ loading: true, error: null });

		// Short-circuit when offline to avoid waiting on network requests
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			set({ loading: false });
			return;
		}
		
		try {
			let query = supabase
				.from('inventory_transactions')
				.select('*')
				.order('created_at', { ascending: false });
			
			// Apply filters
			if (filters.item_id) {
				query = query.eq('item_id', filters.item_id);
			}
			
			if (filters.transaction_type) {
				query = query.eq('transaction_type', filters.transaction_type);
			}
			
			if (filters.program_id) {
				query = query.eq('program_id', filters.program_id);
			}
			
			const { data, error } = await query;
			
			if (error) {
				console.error('Supabase error:', error);
				set({ 
					transactions: [],
					loading: false,
					error: 'Database connection issue'
				});
				return;
			}
			
			set({ 
				transactions: data || [],
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Fetch disbursement records
	 */
	fetchDisbursements: async () => {
		set({ loading: true, error: null });

		// Avoid remote fetch when offline
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			set({ loading: false });
			return;
		}
		
		try {
			const { data, error } = await supabase
				.from('resource_disbursements')
				.select('*')
				.order('created_at', { ascending: false });
			
			if (error) {
				console.error('Supabase error:', error);
				set({ 
					disbursements: [],
					loading: false,
					error: 'Database connection issue'
				});
				return;
			}
			
			set({ 
				disbursements: data || [],
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Fetch inventory alerts from Supabase
	 */
	fetchAlerts: async () => {
		set({ loading: true, error: null });
		
		try {
			const { data, error } = await supabase
				.from('inventory_alerts')
				.select('*')
				.order('created_at', { ascending: false });
			
			if (error) {
				console.error('Supabase error:', error);
				set({ 
					alerts: [],
					unresolvedAlerts: [],
					loading: false,
					error: 'Database connection issue'
				});
				return;
			}
			
			const unresolvedAlerts = (data || []).filter(alert => !alert.is_resolved);
			
			set({ 
				alerts: data || [],
				unresolvedAlerts,
				loading: false 
			});
			
		} catch (err) {
			console.error('Error fetching alerts:', err);
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Resolve an alert in Supabase
	 * @param {string} alertId - Alert ID
	 */
	resolveAlert: async (alertId) => {
		set({ loading: true, error: null });
		
		try {
			const { data: { user } } = await supabase.auth.getUser();
			
			const { data, error } = await supabase
				.from('inventory_alerts')
				.update({
					is_resolved: true,
					resolved_at: new Date().toISOString(),
					resolved_by: user?.id
				})
				.eq('id', alertId)
				.select()
				.single();
			
			if (error) throw error;
			
			set(state => ({
				alerts: state.alerts.map(alert => alert.id === alertId ? data : alert),
				loading: false,
			}));
			
			// Update unresolved alerts
			const unresolvedAlerts = get().alerts.filter(alert => !alert.is_resolved);
			set({ unresolvedAlerts });
			
		} catch (err) {
			console.error('Error resolving alert:', err);
			set({ error: err.message, loading: false });
		}
	},

	//* ================================================
	//* STATISTICS COMPUTATION HELPERS
	//* ================================================

	/**
	 * Compute request statistics
	 * @param {Array} requests - Array of requests
	 * @returns {Object} Statistics object
	 */
	computeRequestStats: (requests) => {
		return {
			total: requests.length,
			submitted: requests.filter(r => r.status === 'submitted').length,
			approved: requests.filter(r => r.status === 'head_approved').length,
			rejected: requests.filter(r => r.status === 'rejected').length,
			disbursed: requests.filter(r => r.status === 'disbursed').length,
			totalAmount: requests.reduce((sum, r) => sum + (r.total_amount || 0), 0),
			pendingAmount: requests
				.filter(r => r.status === 'submitted' || r.status === 'head_approved')
				.reduce((sum, r) => sum + (r.total_amount || 0), 0),
		};
	},

	/**
	 * Compute inventory statistics
	 * @param {Array} items - Array of inventory items
	 * @returns {Object} Statistics object
	 */
	computeInventoryStats: (items) => {
		return {
			totalItems: items.length,
			totalValue: items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0),
			lowStock: items.filter(item => 
				item.current_stock <= item.minimum_stock && item.current_stock > 0
			).length,
			criticalStock: items.filter(item => 
				item.status === 'critical_stock' || item.current_stock === 0
			).length,
			available: items.filter(item => item.status === 'available').length,
			depleted: items.filter(item => item.status === 'depleted').length,
		};
	},

	//* ================================================
	//* UTILITY ACTIONS
	//* ================================================

	/**
	 * Reset error state
	 */
	clearError: () => set({ error: null }),

	/**
	 * Initialize store (load all data)
	 */
	init: async () => {
		await get().fetchRequests();
		await get().fetchInventory();
		await get().fetchTransactions();
		await get().fetchDisbursements();
		await get().fetchAlerts();
	},
}));
