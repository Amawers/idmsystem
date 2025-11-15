/**
 * @file useHiddenCases.js
 * @description Hook to manage hidden case records (for heads only)
 * @module hooks/useHiddenCases
 * 
 * @overview
 * Provides functionality for heads to hide sensitive cases from specific case managers.
 * Also provides filtering to exclude hidden cases for case managers.
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

/**
 * Hook to manage hidden cases
 * 
 * @returns {Object}
 * @property {Array} hiddenCases - Array of hidden case records
 * @property {boolean} loading - Loading state
 * @property {Function} hideCase - Hide a case from a specific user
 * @property {Function} unhideCase - Unhide a case for a specific user
 * @property {Function} getHiddenCasesForUser - Get all cases hidden from a specific user
 * @property {Function} isHiddenFromUser - Check if a case is hidden from a specific user
 * @property {Function} filterVisibleCases - Filter cases array to only show visible cases
 * @property {Function} refresh - Reload hidden cases data
 */
export function useHiddenCases() {
	const { user, role } = useAuthStore();
	const [hiddenCases, setHiddenCases] = useState([]);
	const [loading, setLoading] = useState(true);

	/**
	 * Load all hidden cases (for heads)
	 */
	const loadHiddenCases = useCallback(async () => {
		if (!user) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			
			// Different queries for heads vs case managers
			let data, error;
			
			if (role === 'head') {
				// Heads need full details including user info for the management UI
				const result = await supabase.from("hidden_cases").select(`
					id,
					case_id,
					table_type,
					hidden_from_user_id,
					hidden_by,
					reason,
					hidden_at
				`).order("hidden_at", { ascending: false });
				
				data = result.data;
				error = result.error;
				
				// Manually fetch user details for each hidden case
				if (data && data.length > 0) {
					const userIds = [...new Set(data.map(hc => hc.hidden_from_user_id))];
					const { data: users } = await supabase
						.from("profile")
						.select("id, email, full_name")
						.in("id", userIds);
					
					// Map user details back to hidden cases
					if (users) {
						data = data.map(hc => ({
							...hc,
							hidden_from_user: users.find(u => u.id === hc.hidden_from_user_id)
						}));
					}
				}
			} else if (role === 'case_manager') {
				// Case managers only need case IDs for filtering
				const result = await supabase.from("hidden_cases").select(`
					id,
					case_id,
					table_type,
					hidden_from_user_id,
					hidden_by,
					reason,
					hidden_at
				`)
				.eq('hidden_from_user_id', user.id)
				.order("hidden_at", { ascending: false });
				
				data = result.data;
				error = result.error;
			}

			if (error) throw error;
			
			setHiddenCases(data || []);
		} catch (err) {
			console.error("Error loading hidden cases:", err);
			if (role === 'head') {
				toast.error("Failed to load hidden cases");
			}
		} finally {
			setLoading(false);
		}
	}, [user, role]);

	useEffect(() => {
		loadHiddenCases();
	}, [loadHiddenCases]);

	/**
	 * Hide a case from a specific user
	 * @param {string} caseId - Case ID to hide
	 * @param {string} userId - User ID to hide from
	 * @param {string} tableType - Table type ('Cases', 'CICL/CAR', or 'Incidence on VAC')
	 * @param {string} reason - Optional reason for hiding
	 */
	const hideCase = async (caseId, userId, tableType, reason = "") => {
		if (role !== 'head') {
			toast.error("Only heads can hide cases");
			return false;
		}

		try {
			const { error } = await supabase
				.from("hidden_cases")
				.insert({
					case_id: caseId,
					table_type: tableType,
					hidden_from_user_id: userId,
					hidden_by: user.id,
					reason: reason
				});

			if (error) throw error;

			toast.success("Case hidden successfully");
			await loadHiddenCases();
			return true;
		} catch (err) {
			console.error("Error hiding case:", err);
			
			// Check if it's a unique constraint violation
			if (err.code === '23505') {
				toast.error("This case is already hidden from this user");
			} else {
				toast.error("Failed to hide case");
			}
			return false;
		}
	};

	/**
	 * Unhide a case for a specific user
	 * @param {string} hiddenCaseId - Hidden case record ID
	 */
	const unhideCase = async (hiddenCaseId) => {
		if (role !== 'head') {
			toast.error("Only heads can unhide cases");
			return false;
		}

		try {
			const { error } = await supabase
				.from("hidden_cases")
				.delete()
				.eq("id", hiddenCaseId);

			if (error) throw error;

			toast.success("Case unhidden successfully");
			await loadHiddenCases();
			return true;
		} catch (err) {
			console.error("Error unhiding case:", err);
			toast.error("Failed to unhide case");
			return false;
		}
	};

	/**
	 * Get all cases hidden from a specific user
	 * @param {string} userId - User ID
	 * @returns {Array} Array of case IDs hidden from this user
	 */
	const getHiddenCasesForUser = useCallback((userId) => {
		return hiddenCases
			.filter(hc => hc.hidden_from_user_id === userId)
			.map(hc => hc.case_id);
	}, [hiddenCases]);

	/**
	 * Check if a case is hidden from a specific user
	 * @param {string} caseId - Case ID
	 * @param {string} userId - User ID
	 * @returns {boolean}
	 */
	const isHiddenFromUser = useCallback((caseId, userId) => {
		return hiddenCases.some(
			hc => hc.case_id === caseId && hc.hidden_from_user_id === userId
		);
	}, [hiddenCases]);

	/**
	 * Filter cases array to only show visible cases for current user
	 * @param {Array} cases - Array of case objects
	 * @returns {Array} Filtered array
	 */
	const filterVisibleCases = useCallback((cases) => {

		// Heads see all cases
		if (role === 'head') {
			return cases;
		}

		// Case managers see only non-hidden cases
		if (role === 'case_manager' && user) {
			// Inline the filtering logic to avoid dependency issues
			const hiddenCaseIds = hiddenCases
				.filter(hc => hc.hidden_from_user_id === user.id)
				.map(hc => hc.case_id);

			const filtered = cases.filter(c => !hiddenCaseIds.includes(c.id));
			
			return filtered;
		}

		console.log('[filterVisibleCases] No filtering applied, returning all cases');
		return cases;
	}, [role, user, hiddenCases]);

	return {
		hiddenCases,
		loading,
		hideCase,
		unhideCase,
		getHiddenCasesForUser,
		isHiddenFromUser,
		filterVisibleCases,
		refresh: loadHiddenCases,
	};
}
