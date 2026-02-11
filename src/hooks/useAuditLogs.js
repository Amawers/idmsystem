/**
 * Audit logs hook.
 *
 * Responsibilities:
 * - Fetch audit log rows with pagination/filtering via `fetchAuditLogs()`.
 * - Keep filter state in the hook and expose helpers for pagination and resets.
 *
 * Notes:
 * - Despite the legacy header mentioning real-time updates, this hook currently fetches on demand
 *   whenever `filters` change.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchAuditLogs } from "@/lib/auditLog";

/**
 * @typedef {Object} AuditLogFilters
 * @property {string|null} [userId]
 * @property {string|null} [actionCategory]
 * @property {string|null} [actionType]
 * @property {string|null} [severity]
 * @property {string|null} [startDate]
 * @property {string|null} [endDate]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object<string, any>} AuditLogRow
 * Audit log row shape (loose).
 */

/**
 * @typedef {Object} UseAuditLogsResult
 * @property {AuditLogRow[]} data
 * @property {number} count
 * @property {boolean} loading
 * @property {any} error
 * @property {() => void} reload
 * @property {AuditLogFilters} filters
 * @property {(newFilters: Partial<AuditLogFilters>) => void} setFilters
 * @property {() => void} resetFilters
 * @property {() => void} nextPage
 * @property {() => void} prevPage
 */

/**
 * Fetch and manage audit logs using local filter state.
 * @param {Partial<AuditLogFilters>} [initialFilters]
 * @returns {UseAuditLogsResult}
 */
export function useAuditLogs(initialFilters = {}) {
	const [data, setData] = useState([]);
	const [count, setCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filters, setFilters] = useState({
		userId: null,
		actionCategory: null,
		actionType: null,
		severity: null,
		startDate: null,
		endDate: null,
		limit: 10,
		offset: 0,
		...initialFilters,
	});

	const loadAuditLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await fetchAuditLogs(filters);

			if (result.error) {
				setError(result.error);
				setData([]);
				setCount(0);
			} else {
				setData(result.data || []);
				setCount(result.count || 0);
			}
		} catch (err) {
			setError(err);
			setData([]);
			setCount(0);
		} finally {
			setLoading(false);
		}
	}, [filters]);

	useEffect(() => {
		loadAuditLogs();
	}, [loadAuditLogs]);

	const reload = useCallback(() => {
		loadAuditLogs();
	}, [loadAuditLogs]);

	const updateFilters = useCallback((newFilters) => {
		setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 }));
	}, []);

	const nextPage = useCallback(() => {
		setFilters((prev) => ({
			...prev,
			offset: prev.offset + prev.limit,
		}));
	}, []);

	const prevPage = useCallback(() => {
		setFilters((prev) => ({
			...prev,
			offset: Math.max(0, prev.offset - prev.limit),
		}));
	}, []);

	const resetFilters = useCallback(() => {
		setFilters({
			userId: null,
			actionCategory: null,
			actionType: null,
			severity: null,
			startDate: null,
			endDate: null,
			limit: 10,
			offset: 0,
		});
	}, []);

	return {
		data,
		count,
		loading,
		error,
		reload,
		filters,
		setFilters: updateFilters,
		resetFilters,
		nextPage,
		prevPage,
	};
}
