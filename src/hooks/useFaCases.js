import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

/**
 * @typedef {Object} FaCaseRow
 * Cached FA case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

const TABLE_NAME = "fa_case";

const normalizeRow = (row) => ({
	...row,
	id: row?.id ?? row?.case_id ?? row?.localId,
});

/**
 * Subscribe to and manage FA cases.
 * @returns {UseFaCasesResult}
 */
export function useFaCases() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data: rows, error: queryError } = await supabase
				.from(TABLE_NAME)
				.select("*");

			if (queryError) throw queryError;

			setData((rows ?? []).map(normalizeRow));
			return { success: true };
		} catch (err) {
			console.error("Error loading Financial Assistance cases:", err);
			setError(err);
			return { success: false, error: err };
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const deleteFaCase = useCallback(
		async (caseId) => {
			try {
				const { error: deleteError } = await supabase
					.from(TABLE_NAME)
					.delete()
					.eq("id", caseId);

				if (deleteError) throw deleteError;

				await load();
				return { success: true };
			} catch (err) {
				console.error("Error deleting Financial Assistance case:", err);
				return { success: false, error: err };
			}
		},
		[load],
	);

	return useMemo(
		() => ({
			data,
			loading,
			error,
			reload: load,
			deleteFaCase,
		}),
		[data, loading, error, load, deleteFaCase],
	);
}
