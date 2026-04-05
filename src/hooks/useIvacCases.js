import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

/**
 * @typedef {Object} IvacCaseRow
 * Cached IVAC case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 */

const TABLE_NAME = "ivac_cases";

const normalizeRow = (row) => ({
	...row,
	id: row?.id ?? row?.case_id ?? row?.localId,
});

/**
 * Subscribe to and manage IVAC cases.
 * @returns {UseIvacCasesResult}
 */
export function useIvacCases() {
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
			console.error("Error loading IVAC cases:", err);
			setError(err);
			return { success: false, error: err };
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const deleteIvacCase = useCallback(
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
				console.error("Error deleting IVAC case:", err);
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
			deleteIvacCase,
		}),
		[data, loading, error, load, deleteIvacCase],
	);
}
