/**
 * Offline-first service delivery cache + sync.
 *
 * Responsibilities:
 * - Maintain a local IndexedDB cache of `service_delivery` rows (Dexie table
 *   `service_delivery`, primary key `localId`).
 * - Queue create/update/delete operations while offline (Dexie table
 *   `service_delivery_queue`).
 * - Reconcile queued operations to Supabase when online.
 *
 * Notes:
 * - `hasPendingWrites` protects local edits from being overwritten by remote
 *   snapshots.
 * - The Supabase `select` uses relationship expansion to fetch linked
 *   enrollment and program details for display.
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";
import {
	fetchAndCacheCasesByType,
	getCachedCasesByType,
	getCachedPrograms,
	fetchAndCachePrograms,
} from "@/services/enrollmentOfflineService";

const SERVICE_TABLE_NAME = "service_delivery";
const SERVICE_TABLE = offlineCaseDb.table("service_delivery");
const SERVICE_QUEUE = offlineCaseDb.table("service_delivery_queue");
const PROGRAMS_TABLE = offlineCaseDb.table("programs");

const SERVICE_SELECT = `
  *,
  enrollment:program_enrollments(
    id,
    case_id,
    case_number,
    case_type,
    beneficiary_name,
    status
  ),
  program:programs(
    id,
    program_name,
    program_type,
    coordinator
  )
`;

/** @returns {boolean} True when the browser reports network connectivity. */
const isBrowserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/** @returns {number} Epoch milliseconds. */
const nowTs = () => Date.now();
const SERVICE_REMOTE_EXCLUDED_FIELDS = ["created_by"];

/**
 * Local-only metadata fields used by offline state management.
 * @typedef {object} ServiceDeliveryLocalMeta
 * @property {number} localId
 * @property {boolean} hasPendingWrites
 * @property {"create"|"update"|"delete"|null} pendingAction
 * @property {string|null} syncError
 * @property {number|null} lastLocalChange Epoch milliseconds
 */

/**
 * Minimal record shape used throughout this service.
 * This is intentionally loose because the service delivery schema can evolve.
 * @typedef {Record<string, any> & Partial<ServiceDeliveryLocalMeta> & { id?: string|null }} ServiceDeliveryRecord
 */

/**
 * Queue row used by `service_delivery_queue`.
 * @typedef {object} ServiceDeliveryQueueOp
 * @property {number} queueId
 * @property {"create"|"update"|"delete"} operationType
 * @property {number} targetLocalId
 * @property {string|null} targetId Supabase row id (required for update/delete)
 * @property {Record<string, any>|null} payload
 * @property {number} createdAt Epoch milliseconds
 */

/**
 * Removes fields that should never be sent back to Supabase.
 * @param {Record<string, any>} [payload]
 * @returns {Record<string, any>}
 */
function sanitizeServicePayload(payload = {}) {
	if (!payload || typeof payload !== "object") return {};
	const sanitized = { ...payload };
	SERVICE_REMOTE_EXCLUDED_FIELDS.forEach((field) => {
		if (field in sanitized) delete sanitized[field];
	});
	return sanitized;
}

/**
 * Upserts remote service delivery rows into the local cache.
 *
 * If a row already exists locally it is updated in-place and marked clean.
 * @param {ServiceDeliveryRecord[]} [records]
 * @returns {Promise<{ success: true, count: number }>}
 */
export async function upsertServiceDeliveryRecords(records = []) {
	if (!Array.isArray(records) || !records.length)
		return { success: true, count: 0 };

	await offlineCaseDb.transaction("rw", SERVICE_TABLE, async () => {
		for (const record of records) {
			if (!record) continue;

			if (record.id) {
				const existing = await SERVICE_TABLE.where("id")
					.equals(record.id)
					.first();
				if (existing) {
					await SERVICE_TABLE.update(existing.localId, {
						...existing,
						...record,
						hasPendingWrites: false,
						pendingAction: null,
						syncError: null,
						lastLocalChange: null,
					});
					continue;
				}
			}

			await SERVICE_TABLE.add({
				...record,
				hasPendingWrites: false,
				pendingAction: null,
				syncError: null,
				lastLocalChange: null,
			});
		}
	});

	return { success: true, count: records.length };
}

/**
 * LiveQuery stream of cached service delivery rows (newest first).
 * Consumers should treat returned rows as immutable.
 * @returns {import('dexie').Observable<ServiceDeliveryRecord[]>}
 */
export const servicesLiveQuery = () =>
	liveQuery(async () => {
		const rows = await SERVICE_TABLE.orderBy("service_date")
			.reverse()
			.toArray();
		return rows.map((r) => ({ ...r }));
	});

/** @returns {Promise<number>} Number of queued operations awaiting sync. */
export async function getPendingOperationCount() {
	return SERVICE_QUEUE.count();
}

/**
 * Adds an operation to the offline queue.
 * @param {Omit<ServiceDeliveryQueueOp, 'queueId'|'createdAt'> & Partial<Pick<ServiceDeliveryQueueOp, 'createdAt'>>} op
 */
async function addToQueue(op) {
	await SERVICE_QUEUE.add({ ...op, createdAt: nowTs() });
}

/**
 * Removes an operation from the offline queue.
 * @param {number} queueId
 */
async function removeFromQueue(queueId) {
	await SERVICE_QUEUE.delete(queueId);
}

/**
 * Replaces the local cache with a remote snapshot, preserving pending rows.
 * @param {ServiceDeliveryRecord[]} [rows]
 */
async function replaceAllCachedServices(rows = []) {
	await offlineCaseDb.transaction("rw", SERVICE_TABLE, async () => {
		const existingPending = await SERVICE_TABLE.where("hasPendingWrites")
			.equals(1)
			.toArray();
		await SERVICE_TABLE.clear();
		if (rows.length) {
			await SERVICE_TABLE.bulkAdd(rows.map((r) => ({ ...r })));
		}
		for (const p of existingPending) {
			await SERVICE_TABLE.put(p);
		}
	});
}

/**
 * Loads the latest remote snapshot into the local cache (no-op when offline).
 * @returns {Promise<{ success: boolean, count?: number, offline?: boolean }>}
 */
export async function loadRemoteSnapshotIntoCache() {
	if (!isBrowserOnline()) return { success: true, offline: true };
	const { data, error } = await supabase
		.from(SERVICE_TABLE_NAME)
		.select(SERVICE_SELECT)
		.order("service_date", { ascending: false });
	if (error) throw error;
	await replaceAllCachedServices(data ?? []);
	return { success: true, count: data?.length ?? 0 };
}

/**
 * Refreshes cached services for a single program.
 * @param {string|null|undefined} programId
 * @returns {Promise<{ success: boolean, count?: number, offline?: boolean }>}
 */
export async function refreshProgramServices(programId) {
	if (!programId) return { success: false };
	if (!isBrowserOnline()) return { success: false, offline: true };
	const { data, error } = await supabase
		.from(SERVICE_TABLE_NAME)
		.select(SERVICE_SELECT)
		.eq("program_id", programId)
		.order("service_date", { ascending: false });
	if (error) throw error;
	await offlineCaseDb.transaction("rw", SERVICE_TABLE, async () => {
		await SERVICE_TABLE.where("program_id").equals(programId).delete();
		if (data.length)
			await SERVICE_TABLE.bulkAdd(data.map((r) => ({ ...r })));
	});
	return { success: true, count: data?.length ?? 0 };
}

/**
 * Creates or updates a local service delivery row and enqueues a sync operation.
 * @param {Record<string, any>} payload
 * @param {string|null} [serviceId] Supabase id when updating
 * @returns {Promise<{ success: true, localOnly: true }>}
 */
export async function createOrUpdateLocalServiceDelivery(
	payload,
	serviceId = null,
) {
	const isUpdate = !!serviceId;
	const sanitized = sanitizeServicePayload(payload);

	await offlineCaseDb.transaction(
		"rw",
		[SERVICE_TABLE, SERVICE_QUEUE],
		async () => {
			let localId;
			if (isUpdate) {
				const existing = await SERVICE_TABLE.where("id")
					.equals(serviceId)
					.first();
				if (!existing)
					throw new Error(`Service ${serviceId} not found`);
				localId = existing.localId;
				await SERVICE_TABLE.update(localId, {
					...sanitized,
					hasPendingWrites: true,
					pendingAction: "update",
					lastLocalChange: nowTs(),
				});

				await addToQueue({
					operationType: "update",
					targetLocalId: localId,
					targetId: serviceId,
					payload: sanitized,
				});
			} else {
				localId = await SERVICE_TABLE.add({
					...sanitized,
					hasPendingWrites: true,
					pendingAction: "create",
					lastLocalChange: nowTs(),
				});

				await addToQueue({
					operationType: "create",
					targetLocalId: localId,
					targetId: null,
					payload: sanitized,
				});
			}
		},
	);

	return { success: true, localOnly: true };
}

/**
 * Marks a local row for deletion and enqueues the delete operation.
 * @param {string} serviceId Supabase id
 * @returns {Promise<{ success: true, localOnly: true }>}
 */
export async function markLocalDelete(serviceId) {
	await offlineCaseDb.transaction(
		"rw",
		[SERVICE_TABLE, SERVICE_QUEUE],
		async () => {
			const existing = await SERVICE_TABLE.where("id")
				.equals(serviceId)
				.first();
			if (!existing) throw new Error(`Service ${serviceId} not found`);
			const localId = existing.localId;
			await SERVICE_TABLE.update(localId, {
				hasPendingWrites: true,
				pendingAction: "delete",
				lastLocalChange: nowTs(),
			});
			await addToQueue({
				operationType: "delete",
				targetLocalId: localId,
				targetId: serviceId,
				payload: {},
			});
		},
	);
	return { success: true, localOnly: true };
}

/**
 * Deletes immediately when online; otherwise falls back to a queued delete.
 * @param {string} serviceId Supabase id
 * @returns {Promise<{ success: true, deletedFromServer?: true }|{ success: true, localOnly: true }>}
 */
export async function deleteServiceDeliveryNow(serviceId) {
	if (!isBrowserOnline()) return markLocalDelete(serviceId);

	const { error } = await supabase
		.from(SERVICE_TABLE_NAME)
		.delete()
		.eq("id", serviceId);
	if (error) throw error;

	await offlineCaseDb.transaction(
		"rw",
		[SERVICE_TABLE, SERVICE_QUEUE],
		async () => {
			await SERVICE_TABLE.where("id").equals(serviceId).delete();
			const pendingOps = await SERVICE_QUEUE.where("targetId")
				.equals(serviceId)
				.toArray();
			for (const op of pendingOps) await removeFromQueue(op.queueId);
		},
	);

	return { success: true, deletedFromServer: true };
}

/**
 * Syncs queued operations to Supabase in FIFO order.
 *
 * Stops on first failure and records the `syncError` on the affected row.
 * @param {(status: string) => void | null} [statusCallback]
 * @returns {Promise<{ success: boolean, synced?: number, errors?: Array<{ op: ServiceDeliveryQueueOp, error: string }>, offline?: boolean }>}
 */
export async function syncServiceDeliveryQueue(statusCallback = null) {
	if (!isBrowserOnline()) return { success: false, offline: true };

	const ops = await SERVICE_QUEUE.orderBy("createdAt").toArray();
	if (!ops.length) return { success: true, synced: 0 };

	let synced = 0;
	let errors = [];

	for (const op of ops) {
		try {
			if (statusCallback)
				statusCallback(
					`Syncing ${op.operationType} (${synced + 1}/${ops.length})...`,
				);

			if (op.operationType === "create") {
				const remotePayload = sanitizeServicePayload(op.payload);
				const { data, error } = await supabase
					.from(SERVICE_TABLE_NAME)
					.insert([remotePayload])
					.select(SERVICE_SELECT)
					.single();
				if (error) throw error;
				await offlineCaseDb.transaction(
					"rw",
					[SERVICE_TABLE, SERVICE_QUEUE],
					async () => {
						await SERVICE_TABLE.update(op.targetLocalId, {
							...data,
							hasPendingWrites: false,
							pendingAction: null,
							syncError: null,
							lastLocalChange: null,
						});
						await removeFromQueue(op.queueId);
					},
				);
			} else if (op.operationType === "update") {
				if (!op.targetId)
					throw new Error("Cannot update: missing server ID");
				const remotePayload = sanitizeServicePayload(op.payload);
				const { data, error } = await supabase
					.from(SERVICE_TABLE_NAME)
					.update(remotePayload)
					.eq("id", op.targetId)
					.select(SERVICE_SELECT)
					.single();
				if (error) throw error;
				await offlineCaseDb.transaction(
					"rw",
					[SERVICE_TABLE, SERVICE_QUEUE],
					async () => {
						await SERVICE_TABLE.update(op.targetLocalId, {
							...data,
							hasPendingWrites: false,
							pendingAction: null,
							syncError: null,
							lastLocalChange: null,
						});
						await removeFromQueue(op.queueId);
					},
				);
			} else if (op.operationType === "delete") {
				if (op.targetId) {
					const { error } = await supabase
						.from(SERVICE_TABLE_NAME)
						.delete()
						.eq("id", op.targetId);
					if (error) throw error;
				}
				await offlineCaseDb.transaction(
					"rw",
					[SERVICE_TABLE, SERVICE_QUEUE],
					async () => {
						await SERVICE_TABLE.delete(op.targetLocalId);
						await removeFromQueue(op.queueId);
					},
				);
			}

			synced++;
		} catch (err) {
			console.error(`Failed to sync op ${op.queueId}:`, err);
			errors.push({ op, error: err.message });
			await SERVICE_TABLE.update(op.targetLocalId, {
				syncError: err.message,
			});
			break;
		}
	}

	if (statusCallback) {
		if (errors.length) statusCallback(`Sync stopped: ${errors[0].error}`);
		else statusCallback(`Successfully synced ${synced} operations`);
	}

	return { success: errors.length === 0, synced, errors };
}

// Expose existing case/program caching helpers
export {
	fetchAndCacheCasesByType,
	getCachedCasesByType,
	getCachedPrograms,
	fetchAndCachePrograms,
};
