/**
 * @file useAuditLogs.js
 * @description Custom hook for managing audit logs
 * @module hooks/useAuditLogs
 */

import { useState, useEffect, useCallback } from "react";
import { fetchAuditLogs } from "@/lib/auditLog";

/**
 * Custom hook for fetching and managing audit logs
 * 
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Hook state and methods
 * 
 * @example
 * const { data, loading, error, reload, filters, setFilters } = useAuditLogs();
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
		limit: 50,
		offset: 0,
		...initialFilters,
	});

	const loadAuditLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		const result = await fetchAuditLogs(filters);

		if (result.error) {
			setError(result.error);
			setData([]);
			setCount(0);
		} else {
			setData(result.data || []);
			setCount(result.count || 0);
		}

		setLoading(false);
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

	return {
		data,
		count,
		loading,
		error,
		reload,
		filters,
		setFilters: updateFilters,
		nextPage,
		prevPage,
	};
}
