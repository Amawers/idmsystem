import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/../config/supabase";

const TABLE_NAME = "ciclcar_case";

const normalizeRow = (row) => ({
	...row,
	id: row?.id ?? row?.case_id ?? row?.case_code ?? row?.uuid ?? row?.localId,
});

export function useCiclcarCases() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [programEnrollments, setProgramEnrollments] = useState({});
	const [programEnrollmentsLoading, setProgramEnrollmentsLoading] =
		useState(false);
	const enrollmentCaseIdSignatureRef = useRef("");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		enrollmentCaseIdSignatureRef.current = "";

		try {
			const { data: rows, error: queryError } = await supabase
				.from(TABLE_NAME)
				.select("*");

			if (queryError) throw queryError;

			setData((rows ?? []).map(normalizeRow));
			return { success: true };
		} catch (err) {
			console.error("Error loading CICL/CAR cases:", err);
			setError(err);
			return { success: false, error: err };
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const currentRows = data ?? [];
		const caseIds = Array.from(
			new Set(
				currentRows
					.map((row) => row?.id)
					.filter(
						(caseId) =>
							typeof caseId !== "undefined" && caseId !== null,
					),
			),
		);

		if (caseIds.length === 0) {
			enrollmentCaseIdSignatureRef.current = "";
			setProgramEnrollments({});
			setProgramEnrollmentsLoading(false);
			return;
		}

		const signature = caseIds.join("|");
		if (signature === enrollmentCaseIdSignatureRef.current) {
			return;
		}

		let isActive = true;
		enrollmentCaseIdSignatureRef.current = signature;
		setProgramEnrollmentsLoading(true);

		const loadEnrollments = async () => {
			try {
				const { data: rows, error: queryError } = await supabase
					.from("program_enrollments")
					.select(
						`
							*,
							program:programs(
								id,
								program_name,
								program_type,
								duration_weeks,
								coordinator,
								location,
								schedule
							)
						`,
					)
					.in("case_id", caseIds)
					.eq("status", "active")
					.order("enrollment_date", { ascending: false });

				if (queryError) throw queryError;
				if (!isActive) return;

				const grouped = (rows ?? []).reduce((acc, enrollment) => {
					const key = enrollment.case_id;
					if (!key) return acc;
					if (!acc[key]) acc[key] = [];
					acc[key].push(enrollment);
					return acc;
				}, {});

				setProgramEnrollments(grouped);
			} catch (err) {
				if (!isActive) return;
				console.error("Error fetching CICL/CAR program enrollments:", err);
				setProgramEnrollments({});
			} finally {
				if (isActive) {
					setProgramEnrollmentsLoading(false);
				}
			}
		};

		void loadEnrollments();

		return () => {
			isActive = false;
		};
	}, [data]);

	const deleteCiclcarCase = useCallback(
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
				console.error("Error deleting CICL/CAR case:", err);
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
			deleteCiclcarCase,
			programEnrollments,
			programEnrollmentsLoading,
		}),
		[
			data,
			loading,
			error,
			load,
			deleteCiclcarCase,
			programEnrollments,
			programEnrollmentsLoading,
		],
	);
}
