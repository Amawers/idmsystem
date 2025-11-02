// =============================================
// Resource Management Store - Zustand
// ---------------------------------------------
// Purpose: Centralized state management for resource allocation and inventory
// 
// Key Responsibilities:
// - Manage resource requests state
// - Handle inventory items and transactions
// - Track disbursements and allocations
// - Manage alerts and notifications
//
// Dependencies:
// - zustand (state management)
// - Sample JSON data files for dummy data
//
// Notes:
// - Uses local JSON files instead of Supabase for demo purposes
// - Implements full CRUD operations with optimistic updates
// - Includes audit trail integration points
// =============================================

import { create } from "zustand";

//* ================================================
//* IMPORT SAMPLE DATA
//* ================================================
import SAMPLE_REQUESTS from "../../SAMPLE_RESOURCE_REQUESTS.json";
import SAMPLE_INVENTORY from "../../SAMPLE_INVENTORY_ITEMS.json";
import SAMPLE_TRANSACTIONS from "../../SAMPLE_INVENTORY_TRANSACTIONS.json";
import SAMPLE_DISBURSEMENTS from "../../SAMPLE_RESOURCE_DISBURSEMENTS.json";
import SAMPLE_ALERTS from "../../SAMPLE_INVENTORY_ALERTS.json";

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
	 * Fetch all resource requests with optional filters
	 * @param {Object} filters - Filter criteria (status, program, barangay, etc.)
	 */
	fetchRequests: async (filters = {}) => {
		set({ loading: true, error: null });
		
		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 500));
			
			let filteredData = [...SAMPLE_REQUESTS];
			
			// Apply filters
			if (filters.status) {
				filteredData = filteredData.filter(req => req.status === filters.status);
			}
			
			if (filters.program_id) {
				filteredData = filteredData.filter(req => req.program_id === filters.program_id);
			}
			
			if (filters.barangay) {
				filteredData = filteredData.filter(req => req.barangay === filters.barangay);
			}
			
			if (filters.request_type) {
				filteredData = filteredData.filter(req => req.request_type === filters.request_type);
			}
			
			if (filters.beneficiary_type) {
				filteredData = filteredData.filter(req => req.beneficiary_type === filters.beneficiary_type);
			}
			
			if (filters.priority) {
				filteredData = filteredData.filter(req => req.priority === filters.priority);
			}
			
			// Date range filter
			if (filters.dateRange) {
				const { from, to } = filters.dateRange;
				filteredData = filteredData.filter(req => {
					const reqDate = new Date(req.created_at);
					return reqDate >= new Date(from) && reqDate <= new Date(to);
				});
			}
			
			// Compute statistics
			const stats = get().computeRequestStats(filteredData);
			
			set({ 
				requests: SAMPLE_REQUESTS,
				filteredRequests: filteredData,
				requestStats: stats,
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Submit a new resource request
	 * @param {Object} requestData - Request details
	 * @returns {Object} Created request
	 */
	submitRequest: async (requestData) => {
		set({ loading: true, error: null });
		
		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 800));
			
			const newRequest = {
				id: `req-${Date.now()}`,
				request_number: `REQ-2025-${String(get().requests.length + 1).padStart(4, '0')}`,
				...requestData,
				status: 'submitted',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			
			// Optimistic update
			set(state => ({
				requests: [...state.requests, newRequest],
				filteredRequests: [...state.filteredRequests, newRequest],
				loading: false,
			}));
			
			// Recompute stats
			const stats = get().computeRequestStats(get().filteredRequests);
			set({ requestStats: stats });
			
			return newRequest;
			
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	/**
	 * Update request status (for Head approval/rejection)
	 * @param {string} requestId - Request ID
	 * @param {string} newStatus - New status
	 * @param {string} notes - Optional notes/reason
	 */
	updateRequestStatus: async (requestId, newStatus, notes = '') => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 600));
			
			set(state => ({
				requests: state.requests.map(req => 
					req.id === requestId 
						? { 
								...req, 
								status: newStatus, 
								updated_at: new Date().toISOString(),
								...(newStatus === 'rejected' && { rejection_reason: notes })
							}
						: req
				),
				loading: false,
			}));
			
			// Update filtered requests and stats
			const filteredData = get().requests;
			const stats = get().computeRequestStats(filteredData);
			set({ 
				filteredRequests: filteredData,
				requestStats: stats 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
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
	 * Fetch inventory items with optional filters
	 * @param {Object} filters - Filter criteria
	 */
	fetchInventory: async (filters = {}) => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 500));
			
			let filteredData = [...SAMPLE_INVENTORY];
			
			// Apply filters
			if (filters.category) {
				filteredData = filteredData.filter(item => item.category === filters.category);
			}
			
			if (filters.status) {
				filteredData = filteredData.filter(item => item.status === filters.status);
			}
			
			if (filters.location) {
				filteredData = filteredData.filter(item => item.location === filters.location);
			}
			
			if (filters.low_stock) {
				filteredData = filteredData.filter(item => item.current_stock <= item.minimum_stock);
			}
			
			if (filters.critical_stock) {
				filteredData = filteredData.filter(item => item.status === 'critical_stock');
			}
			
			// Search by name or code
			if (filters.search) {
				const searchTerm = filters.search.toLowerCase();
				filteredData = filteredData.filter(item => 
					item.item_name.toLowerCase().includes(searchTerm) ||
					item.item_code.toLowerCase().includes(searchTerm)
				);
			}
			
			// Compute statistics
			const stats = get().computeInventoryStats(filteredData);
			
			set({ 
				inventoryItems: SAMPLE_INVENTORY,
				filteredInventory: filteredData,
				inventoryStats: stats,
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Update stock level for an item
	 * @param {string} itemId - Item ID
	 * @param {number} quantity - Quantity change (positive or negative)
	 * @param {string} transactionType - Type of transaction
	 */
	updateStock: async (itemId, quantity, transactionType = 'adjustment') => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 600));
			
			set(state => ({
				inventoryItems: state.inventoryItems.map(item => {
					if (item.id === itemId) {
						const newStock = item.current_stock + quantity;
						let newStatus = 'available';
						
						if (newStock <= 0) {
							newStatus = 'depleted';
						} else if (newStock < item.minimum_stock * 0.5) {
							newStatus = 'critical_stock';
						} else if (newStock <= item.minimum_stock) {
							newStatus = 'low_stock';
						}
						
						return {
							...item,
							current_stock: newStock,
							status: newStatus,
							updated_at: new Date().toISOString(),
						};
					}
					return item;
				}),
				loading: false,
			}));
			
			// Create transaction record
			const item = get().inventoryItems.find(i => i.id === itemId);
			const newTransaction = {
				id: `txn-${Date.now()}`,
				item_id: itemId,
				item_name: item?.item_name,
				transaction_type: transactionType,
				quantity: quantity,
				transaction_date: new Date().toISOString(),
				performed_by: 'current-user', // Would come from auth store
				performed_by_name: 'Current User',
				notes: `${transactionType} transaction`,
				created_at: new Date().toISOString(),
			};
			
			set(state => ({
				transactions: [newTransaction, ...state.transactions],
			}));
			
		} catch (err) {
			set({ error: err.message, loading: false });
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
		
		try {
			await new Promise(resolve => setTimeout(resolve, 400));
			
			let filteredData = [...SAMPLE_TRANSACTIONS];
			
			if (filters.item_id) {
				filteredData = filteredData.filter(txn => txn.item_id === filters.item_id);
			}
			
			if (filters.transaction_type) {
				filteredData = filteredData.filter(txn => txn.transaction_type === filters.transaction_type);
			}
			
			if (filters.program_id) {
				filteredData = filteredData.filter(txn => txn.program_id === filters.program_id);
			}
			
			set({ 
				transactions: filteredData,
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
		
		try {
			await new Promise(resolve => setTimeout(resolve, 400));
			
			set({ 
				disbursements: SAMPLE_DISBURSEMENTS,
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Fetch inventory alerts
	 */
	fetchAlerts: async () => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 300));
			
			const unresolvedAlerts = SAMPLE_ALERTS.filter(alert => !alert.is_resolved);
			
			set({ 
				alerts: SAMPLE_ALERTS,
				unresolvedAlerts,
				loading: false 
			});
			
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	/**
	 * Resolve an alert
	 * @param {string} alertId - Alert ID
	 */
	resolveAlert: async (alertId) => {
		set({ loading: true, error: null });
		
		try {
			await new Promise(resolve => setTimeout(resolve, 400));
			
			set(state => ({
				alerts: state.alerts.map(alert => 
					alert.id === alertId 
						? { 
								...alert, 
								is_resolved: true, 
								resolved_at: new Date().toISOString(),
								resolved_by: 'current-user' 
							}
						: alert
				),
				loading: false,
			}));
			
			// Update unresolved alerts
			const unresolvedAlerts = get().alerts.filter(alert => !alert.is_resolved);
			set({ unresolvedAlerts });
			
		} catch (err) {
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
