import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

/**
 * @typedef {Object} FacCaseRow
 * Cached FAC case row shape (loose).
 * @property {string} [id]
 * @property {string} [case_id]
 * @property {string} [localId]
 * @property {any[]} [family_members]
 * @property {number} [family_member_count]
 */

const TABLE_NAME = "fac_case";

const normalizeRow = (row) => ({
	...row,
	id: row?.id ?? row?.case_id ?? row?.localId,
	family_member_count: Array.isArray(row?.family_members)
		? row.family_members.length
		: (row?.family_member_count ?? 0),
});

/**
 * Subscribe to and manage FAC cases.
 * @returns {UseFacCasesResult}
 */
export function useFacCases() {
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
			console.error("Error loading FAC cases:", err);
			setError(err);
			return { success: false, error: err };
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const deleteFacCase = useCallback(
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
				console.error("Error deleting FAC case:", err);
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
			deleteFacCase,
		}),
		[data, loading, error, load, deleteFacCase],
	);
}
