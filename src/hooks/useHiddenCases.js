/**
 * Hidden cases hook.
 *
 * Responsibilities:
 * - Allow privileged users to hide a case from a specific user by writing to `hidden_cases`.
 * - Provide lookup helpers to check visibility and filter UI lists accordingly.
 * - Load hidden-case rows for management UIs (including mapping basic profile info).
 */

import { useState, useEffect, useCallback } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

/**
 * @typedef {Object} ProfileBrief
 * @property {string} id
 * @property {string} [email]
 * @property {string} [full_name]
 */

/**
 * @typedef {Object} HiddenCaseRow
 * @property {string} id
 * @property {string} case_id
 * @property {string} table_type
 * @property {string} hidden_from_user_id
 * @property {string} hidden_by
 * @property {string|null} [reason]
 * @property {string} [hidden_at]
 * @property {ProfileBrief} [hidden_from_user]
 */

/**
 * @typedef {Object} UseHiddenCasesResult
 * @property {HiddenCaseRow[]} hiddenCases
 * @property {boolean} loading
 * @property {(caseId: string, userId: string, tableType: string, reason?: string) => Promise<boolean>} hideCase
 * @property {(hiddenCaseId: string) => Promise<boolean>} unhideCase
 * @property {(userId: string) => string[]} getHiddenCasesForUser
 * @property {(caseId: string, userId: string) => boolean} isHiddenFromUser
 * @property {(cases: Array<{id?: string}>) => Array<any>} filterVisibleCases
 * @property {() => Promise<void>} refresh
 */

/**
 * Manage hidden cases for per-user visibility.
 * @returns {UseHiddenCasesResult}
 */
export function useHiddenCases() {
	const { user } = useAuthStore();
	/** @type {[HiddenCaseRow[], (next: HiddenCaseRow[]) => void]} */
	const [hiddenCases, setHiddenCases] = useState([]);
	const [loading, setLoading] = useState(true);

	/**
	 * Load hidden cases and map basic profile info for `hidden_from_user_id`.
	 * @returns {Promise<void>}
	 */
	const loadHiddenCases = useCallback(async () => {
		if (!user) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			// Load full details for the management UI
			let data, error;
			const result = await supabase
				.from("hidden_cases")
				.select(
					`
					id,
					case_id,
					table_type,
					hidden_from_user_id,
					hidden_by,
					reason,
					hidden_at
			`,
				)
				.order("hidden_at", { ascending: false });

			data = result.data;
			error = result.error;

			// Manually fetch user details for each hidden case
			if (data && data.length > 0) {
				const userIds = [
					...new Set(data.map((hc) => hc.hidden_from_user_id)),
				];
				const { data: users } = await supabase
					.from("profile")
					.select("id, email, full_name")
					.in("id", userIds);

				// Map user details back to hidden cases
				if (users) {
					data = data.map((hc) => ({
						...hc,
						hidden_from_user: users.find(
							(u) => u.id === hc.hidden_from_user_id,
						),
					}));
				}
			}

			if (error) throw error;

			setHiddenCases(data || []);
		} catch (err) {
			console.error("Error loading hidden cases:", err);
			toast.error("Failed to load hidden cases");
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		loadHiddenCases();
	}, [loadHiddenCases]);

	/**
	 * Hide a case from a specific user.
	 * @param {string} caseId Case ID to hide.
	 * @param {string} userId User ID to hide from.
	 * @param {string} tableType Table type label used by the UI.
	 * @param {string} [reason=""] Optional reason for hiding.
	 * @returns {Promise<boolean>}
	 */
	const hideCase = async (caseId, userId, tableType, reason = "") => {
		if (!user) return false;

		try {
			const { error } = await supabase.from("hidden_cases").insert({
				case_id: caseId,
				table_type: tableType,
				hidden_from_user_id: userId,
				hidden_by: user.id,
				reason: reason,
			});

			if (error) throw error;

			toast.success("Case hidden successfully");
			await loadHiddenCases();
			return true;
		} catch (err) {
			console.error("Error hiding case:", err);

			// Check if it's a unique constraint violation
			if (err.code === "23505") {
				toast.error("This case is already hidden from this user");
			} else {
				toast.error("Failed to hide case");
			}
			return false;
		}
	};

	/**
	 * Unhide a case for a specific user.
	 * @param {string} hiddenCaseId Hidden case record ID.
	 * @returns {Promise<boolean>}
	 */
	const unhideCase = async (hiddenCaseId) => {
		if (!user) return false;

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
	 * Get all case ids hidden from a user.
	 * @param {string} userId
	 * @returns {string[]}
	 */
	const getHiddenCasesForUser = useCallback(
		(userId) => {
			return hiddenCases
				.filter((hc) => hc.hidden_from_user_id === userId)
				.map((hc) => hc.case_id);
		},
		[hiddenCases],
	);

	/**
	 * Check whether a case is hidden from a user.
	 * @param {string} caseId
	 * @param {string} userId
	 * @returns {boolean}
	 */
	const isHiddenFromUser = useCallback(
		(caseId, userId) => {
			return hiddenCases.some(
				(hc) =>
					hc.case_id === caseId && hc.hidden_from_user_id === userId,
			);
		},
		[hiddenCases],
	);

	/**
	 * Filter a case list to only show items visible to the current user.
	 * @param {Array<{id?: string}>} cases
	 * @returns {Array<any>}
	 */
	const filterVisibleCases = useCallback(
		(cases) => {
			if (!user) return cases;
			const hiddenCaseIds = hiddenCases
				.filter((hc) => hc.hidden_from_user_id === user.id)
				.map((hc) => hc.case_id);
			return cases.filter((c) => !hiddenCaseIds.includes(c.id));
		},
		[user, hiddenCases],
	);

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
