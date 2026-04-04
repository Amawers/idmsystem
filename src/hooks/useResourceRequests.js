import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import {
	formatDisbursement,
	formatResourceRequest,
	generateRequestNumber,
	generateVoucherNumber,
	validateDisbursement,
	validateResourceRequest,
} from "@/lib/resourceSubmission";
import { useAuthStore } from "@/store/authStore";

function toNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getCurrentUserContext() {
	const auth = useAuthStore.getState();
	const user = auth.user;
	const profile = auth.profile;
	const userId = user?.id ?? null;
	const userName =
		profile?.full_name ||
		user?.user_metadata?.full_name ||
		user?.email ||
		"Unknown User";

	return { userId, userName };
}

function normalizeRequest(row) {
	const requestCategory = row.request_category || row.resource_category || "other";
	const requesterName = row.requester_name || row.requester?.full_name || "Unknown";

	return {
		...row,
		request_category: requestCategory,
		resource_category: requestCategory,
		quantity: toNumber(row.quantity),
		unit_cost: toNumber(row.unit_cost),
		total_amount:
			toNumber(row.total_amount) || toNumber(row.quantity) * toNumber(row.unit_cost),
		priority: row.priority || "medium",
		status: row.status || "submitted",
		requester: row.requester || {
			full_name: requesterName,
		},
	};
}

async function fetchTableCount(tableName) {
	const { count, error } = await supabase
		.from(tableName)
		.select("id", { count: "exact", head: true });

	if (error) {
		console.warn(`[useResourceRequests] Failed count for ${tableName}:`, error);
		return 0;
	}

	return count || 0;
}

export function useResourceRequests(options = {}) {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const autoFetch = options.autoFetch ?? true;

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const { data, error: fetchError } = await supabase
				.from("resource_requests")
				.select("*")
				.order("created_at", { ascending: false });

			if (fetchError) {
				throw fetchError;
			}

			setRequests((Array.isArray(data) ? data : []).map(normalizeRequest));
		} catch (err) {
			console.error("[useResourceRequests] Failed to fetch requests:", err);
			setError(err);
			setRequests([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!autoFetch) return;
		refresh();
	}, [autoFetch, refresh]);

	const requestsByStatus = useMemo(() => {
		return requests.reduce((acc, request) => {
			const key = request.status || "submitted";
			if (!acc[key]) acc[key] = [];
			acc[key].push(request);
			return acc;
		}, {});
	}, [requests]);

	const pendingApprovals = useMemo(
		() => requests.filter((request) => request.status === "submitted"),
		[requests],
	);

	const recentRequests = useMemo(() => requests.slice(0, 10), [requests]);

	const statistics = useMemo(() => {
		const total = requests.length;
		const submitted = requests.filter((r) => r.status === "submitted").length;
		const disbursed = requests.filter((r) => r.status === "disbursed").length;

		const pendingAmount = requests
			.filter((r) => ["submitted", "under_review", "head_approved"].includes(r.status))
			.reduce((sum, request) => sum + toNumber(request.total_amount), 0);

		const totalAmount = requests.reduce(
			(sum, request) => sum + toNumber(request.total_amount),
			0,
		);

		const totalApprovedAmount = requests
			.filter((request) => ["head_approved", "disbursed"].includes(request.status))
			.reduce((sum, request) => sum + toNumber(request.total_amount), 0);

		return {
			total,
			total_requests: total,
			submitted,
			disbursed,
			pendingAmount,
			totalAmount,
			total_approved_amount: totalApprovedAmount,
		};
	}, [requests]);

	const submitRequest = useCallback(
		async (requestData) => {
			const validation = validateResourceRequest(requestData);
			if (!validation.isValid) {
				throw new Error(validation.errors.join("\n"));
			}

			const { userId, userName } = getCurrentUserContext();
			if (!userId) {
				throw new Error("You must be logged in to submit requests.");
			}

			const formatted = formatResourceRequest(requestData, userId, userName);
			const sequence = (await fetchTableCount("resource_requests")) + 1;

			const payload = {
				request_number: generateRequestNumber(sequence),
				requester_id: userId,
				requester_name: userName,
				request_type: formatted.request_type,
				request_category:
					requestData.request_category || formatted.resource_category || "other",
				item_id: requestData.item_id || null,
				item_description: formatted.item_description,
				quantity: toNumber(formatted.quantity),
				unit: formatted.unit || "units",
				unit_cost: toNumber(formatted.unit_cost),
				total_amount: toNumber(formatted.total_amount),
				purpose: requestData.purpose || null,
				justification: formatted.justification,
				additional_notes: requestData.additional_notes || null,
				barangay: formatted.barangay || null,
				beneficiary_name: formatted.beneficiary_name || null,
				beneficiary_type: formatted.beneficiary_type || null,
				priority: formatted.priority || "medium",
				case_id: formatted.case_id,
				program_id: formatted.program_id,
				program_name: formatted.program_name,
				attachments: formatted.attachments || [],
				status: "submitted",
			};

			const { data, error: insertError } = await supabase
				.from("resource_requests")
				.insert(payload)
				.select()
				.single();

			if (insertError) {
				throw insertError;
			}

			await refresh();
			return normalizeRequest(data);
		},
		[refresh],
	);

	const updateRequestStatus = useCallback(
		async (requestId, newStatus, notes = "", options = {}) => {
			const targetId = requestId || options.localId;
			if (!targetId) {
				throw new Error("Request ID is required.");
			}

			const { userId } = getCurrentUserContext();

			const updatePayload = {
				status: newStatus,
				reviewed_at: new Date().toISOString(),
				reviewed_by: userId,
			};

			if (newStatus === "rejected") {
				updatePayload.rejection_reason = notes || "Rejected by reviewer";
			}

			const { data, error: updateError } = await supabase
				.from("resource_requests")
				.update(updatePayload)
				.eq("id", targetId)
				.select()
				.single();

			if (updateError) {
				const { data: fallbackData, error: fallbackError } = await supabase
					.from("resource_requests")
					.update({ status: newStatus })
					.eq("id", targetId)
					.select()
					.single();

				if (fallbackError) {
					throw fallbackError;
				}

				await refresh();
				return normalizeRequest(fallbackData);
			}

			await refresh();
			return normalizeRequest(data);
		},
		[refresh],
	);

	const recordDisbursement = useCallback(
		async (requestId, disbursementData = {}) => {
			const { userId, userName } = getCurrentUserContext();
			if (!userId) {
				throw new Error("You must be logged in to record disbursements.");
			}

			const validation = validateDisbursement({
				request_id: requestId,
				...disbursementData,
			});
			if (!validation.isValid) {
				throw new Error(validation.errors.join("\n"));
			}

			const formatted = formatDisbursement(
				{
					request_id: requestId,
					...disbursementData,
				},
				userId,
				userName,
			);

			const sequence = (await fetchTableCount("resource_disbursements")) + 1;
			const payload = {
				request_id: requestId,
				voucher_number: generateVoucherNumber(sequence),
				disbursement_amount: toNumber(formatted.disbursement_amount),
				disbursement_date:
					formatted.disbursement_date ||
					new Date().toISOString().slice(0, 10),
				disbursement_method: formatted.disbursement_method,
				beneficiary_name: formatted.beneficiary_name,
				beneficiary_signature: formatted.beneficiary_signature,
				notes: formatted.notes || null,
				disbursed_by: userId,
				disbursed_by_name: userName,
			};

			const { error: insertError } = await supabase
				.from("resource_disbursements")
				.insert(payload);

			if (insertError) {
				throw insertError;
			}

			await updateRequestStatus(requestId, "disbursed", "Disbursement recorded");
			await refresh();

			return { success: true };
		},
		[refresh, updateRequestStatus],
	);

	return {
		requests,
		requestsByStatus,
		pendingApprovals,
		recentRequests,
		statistics,
		loading,
		error,
		submitRequest,
		updateRequestStatus,
		recordDisbursement,
		refresh,
	};
}

export default useResourceRequests;
