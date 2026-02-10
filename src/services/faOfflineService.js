/**
 * Offline-first helpers for Financial Assistance (FA) cases.
 *
 * Responsibilities:
 * - Cache FA cases in Dexie for offline reads.
 * - Stage mutations into an ordered queue for eventual sync to Supabase.
 * - Preserve local edits by skipping remote upserts when `hasPendingWrites` is set.
 *
 * Identity notes:
 * - Dexie uses an auto-increment `localId` key; some historical rows may be missing `localId`.
 * - `ensureLocalIdField()` backfills `localId` and removes duplicate server rows (same remote `id`).
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

/**
 * @typedef {Object} FaLocalMeta
 * @property {number} [localId]
 * @property {boolean} [hasPendingWrites]
 * @property {"create"|"update"|"delete"|null} [pendingAction]
 * @property {string|null} [syncError]
 * @property {number|null} [lastLocalChange]
 */

/**
 * @typedef {Object} FaCaseRecord
 * @property {string} [id] Supabase id (may be missing for offline-created rows)
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {FaLocalMeta} [local]
 */

/**
 * @typedef {Object} FaQueueOp
 * @property {"create"|"update"|"delete"} operationType
 * @property {number} targetLocalId Dexie primary key for `fa_cases`
 * @property {string|null} targetId Supabase id (null until created remotely)
 * @property {any} payload
 * @property {number} createdAt
 * @property {number} [queueId]
 */

const TABLE_NAME = "fa_case";
const CASE_TABLE = offlineCaseDb.table("fa_cases");
const QUEUE_TABLE = offlineCaseDb.table("fa_queue");
const LOCAL_META_FIELDS = [
	"localId",
	"hasPendingWrites",
	"pendingAction",
	"syncError",
	"lastLocalChange",
];

/** @returns {number} */
const nowTs = () => Date.now();

/** @returns {boolean} */
const browserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Removes duplicate local rows that point to the same Supabase `id`.
 * This is a safety net for older data where duplicates can occur.
 * @returns {Promise<void>}
 */
async function removeDuplicateServerRows() {
	const rows = await CASE_TABLE.orderBy("localId").toArray();
	const seen = new Map();
	const duplicates = [];
	for (const row of rows) {
		if (!row?.id || row?.localId == null) continue;
		if (seen.has(row.id)) {
			duplicates.push(row.localId);
			continue;
		}
		seen.set(row.id, row.localId);
	}
	if (duplicates.length) {
		await CASE_TABLE.bulkDelete(duplicates);
	}
}

let localIdSetupPromise;

/**
 * Ensures all cached rows have a `localId` field set to the Dexie primary key.
 * Also de-dupes duplicate server rows after backfill.
 * @returns {Promise<void>}
 */
function ensureLocalIdField() {
	if (!localIdSetupPromise) {
		localIdSetupPromise = (async () => {
			await CASE_TABLE.toCollection().modify((value, ref, key) => {
				if (value.localId == null) {
					value.localId = key;
				}
			});
			await removeDuplicateServerRows();
		})();
	}
	return localIdSetupPromise;
}

const localIdReady = ensureLocalIdField();

/**
 * Removes local-only metadata before syncing to Supabase.
 * @param {Object} [payload]
 * @returns {Object}
 */
function sanitizeCasePayload(payload = {}) {
	const clone = { ...payload };
	LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
	return clone;
}

/**
 * Builds a normalized local record with default local metadata fields.
 * @param {Object} [base]
 * @param {Object} [overrides]
 * @returns {Object}
 */
function buildLocalRecord(base = {}, overrides = {}) {
	return {
		...base,
		...overrides,
		hasPendingWrites: overrides.hasPendingWrites ?? false,
		pendingAction: overrides.pendingAction ?? null,
		syncError: overrides.syncError ?? null,
		lastLocalChange: overrides.lastLocalChange ?? null,
	};
}

/**
 * LiveQuery stream of FA cases, newest-first by `localId`.
 * Performs a small amount of hygiene (localId backfill + de-dupe) before returning.
 * @returns {import('dexie').LiveQuery<any[]>}
 */
export const faLiveQuery = () =>
	liveQuery(async () => {
		await localIdReady;
		await removeDuplicateServerRows();
		const rows = await CASE_TABLE.orderBy("localId").reverse().toArray();
		return rows.map((row) => ({ ...row }));
	});

/** @returns {Promise<number>} */
export async function getFaPendingOperationCount() {
	return QUEUE_TABLE.count();
}

/**
 * Fetches a cached FA case by Supabase `id`.
 * @param {string} targetId
 * @returns {Promise<any|null>}
 */
export async function getFaCaseById(targetId) {
	if (!targetId) return null;
	await localIdReady;
	return CASE_TABLE.where("id").equals(targetId).first();
}

/**
 * Fetches a cached FA case by Dexie `localId`.
 * @param {number} localId
 * @returns {Promise<any|null>}
 */
export async function getFaCaseByLocalId(localId) {
	if (localId == null) return null;
	await localIdReady;
	return CASE_TABLE.get(localId);
}

/**
 * Upserts remote rows into the local cache.
 * Skips any local rows with `hasPendingWrites` to prevent overwriting offline edits.
 * Also removes stale local rows that no longer exist remotely.
 * @param {Array<Object>} [rows]
 * @returns {Promise<void>}
 */
export async function upsertLocalFromSupabase(rows = []) {
	await localIdReady;
	await offlineCaseDb.transaction("rw", CASE_TABLE, async () => {
		const remoteIds = new Set();
		for (const row of rows) {
			if (!row) continue;
			remoteIds.add(row.id);
			const existing = await CASE_TABLE.where("id")
				.equals(row.id)
				.first();
			if (existing?.hasPendingWrites) {
				continue;
			}
			const record = buildLocalRecord(row, {
				hasPendingWrites: false,
				pendingAction: null,
				lastLocalChange: null,
				syncError: null,
			});
			if (existing?.localId != null) {
				await CASE_TABLE.update(existing.localId, {
					...record,
					localId: existing.localId,
				});
			} else {
				const newLocalId = await CASE_TABLE.add(record);
				await CASE_TABLE.update(newLocalId, {
					...record,
					localId: newLocalId,
				});
			}
		}
		const stale = await CASE_TABLE.filter(
			(rec) => !rec.hasPendingWrites && rec.id && !remoteIds.has(rec.id),
		).toArray();
		if (stale.length) {
			await CASE_TABLE.bulkDelete(stale.map((rec) => rec.localId));
		}
	});
}

/**
 * Loads the remote snapshot (ordered by `updated_at`) into the local cache.
 * @returns {Promise<number>} Count of rows received from Supabase.
 */
export async function loadFaRemoteSnapshotIntoCache() {
	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("*")
		.order("updated_at", { ascending: false });
	if (error) throw error;
	await upsertLocalFromSupabase(data ?? []);
	await removeDuplicateServerRows();
	return data?.length ?? 0;
}

/**
 * Creates or updates a local FA case and enqueues an operation.
 * @param {{casePayload: Object, targetId?: string|null, localId?: number|null, mode?: "create"|"update"}} params
 * @returns {Promise<{localId: number}>}
 */
export async function createOrUpdateLocalFaCase({
	casePayload,
	targetId = null,
	localId = null,
	mode = "create",
}) {
	if (!casePayload)
		throw new Error("Missing Financial Assistance case payload");
	await localIdReady;
	return offlineCaseDb.transaction(
		"rw",
		CASE_TABLE,
		QUEUE_TABLE,
		async () => {
			let record = null;
			if (localId != null) {
				record = await CASE_TABLE.get(localId);
			} else if (targetId) {
				record = await CASE_TABLE.where("id").equals(targetId).first();
				localId = record?.localId ?? null;
			}

			const mergedCase = {
				...(record ?? {}),
				...casePayload,
			};

			const baseRecord = buildLocalRecord(mergedCase, {
				id: targetId ?? record?.id ?? null,
				hasPendingWrites: true,
				pendingAction: mode,
				lastLocalChange: nowTs(),
			});

			let resolvedLocalId = localId;
			if (resolvedLocalId != null) {
				await CASE_TABLE.update(resolvedLocalId, {
					...baseRecord,
					localId: resolvedLocalId,
				});
			} else {
				resolvedLocalId = await CASE_TABLE.add(baseRecord);
				await CASE_TABLE.update(resolvedLocalId, {
					...baseRecord,
					localId: resolvedLocalId,
				});
			}

			await QUEUE_TABLE.add({
				operationType: mode,
				targetLocalId: resolvedLocalId,
				targetId: targetId ?? record?.id ?? null,
				payload: sanitizeCasePayload(casePayload),
				createdAt: nowTs(),
			});

			return { localId: resolvedLocalId };
		},
	);
}

/**
 * Marks a local record for deletion and enqueues a delete operation.
 * @param {{targetId?: string|null, localId?: number|null}} params
 * @returns {Promise<{success: boolean}>}
 */
export async function markFaLocalDelete({ targetId = null, localId = null }) {
	await localIdReady;
	return offlineCaseDb.transaction(
		"rw",
		CASE_TABLE,
		QUEUE_TABLE,
		async () => {
			let record = null;
			if (localId != null) {
				record = await CASE_TABLE.get(localId);
			} else if (targetId) {
				record = await CASE_TABLE.where("id").equals(targetId).first();
			}
			if (!record) {
				return { success: false };
			}
			await CASE_TABLE.update(record.localId, {
				pendingAction: "delete",
				hasPendingWrites: true,
				lastLocalChange: nowTs(),
			});
			await QUEUE_TABLE.add({
				operationType: "delete",
				targetLocalId: record.localId,
				targetId: record.id ?? null,
				payload: null,
				createdAt: nowTs(),
			});
			return { success: true };
		},
	);
}

/**
 * Attempts an immediate delete when online; otherwise falls back to a queued delete.
 * Also cleans up any queued operations for the local row when a remote delete succeeds.
 * @param {{targetId?: string|null, localId?: number|null}} params
 * @returns {Promise<{success: boolean, queued: boolean}>}
 */
export async function deleteFaCaseNow({ targetId = null, localId = null }) {
	await localIdReady;
	const isOnline = browserOnline();
	let record = null;
	if (localId != null) {
		record = await CASE_TABLE.get(localId);
	} else if (targetId != null) {
		record = await CASE_TABLE.where("id").equals(targetId).first();
	}

	const resolvedLocalId = record?.localId ?? localId ?? null;
	const resolvedTargetId = record?.id ?? targetId ?? null;

	if (isOnline && resolvedTargetId) {
		const { error } = await supabase
			.from(TABLE_NAME)
			.delete()
			.eq("id", resolvedTargetId);
		if (!error) {
			await offlineCaseDb.transaction(
				"rw",
				CASE_TABLE,
				QUEUE_TABLE,
				async () => {
					if (resolvedLocalId != null) {
						await CASE_TABLE.delete(resolvedLocalId);
					}
					const pendingOps = await QUEUE_TABLE.where("targetLocalId")
						.equals(resolvedLocalId)
						.toArray();
					if (pendingOps.length) {
						await QUEUE_TABLE.bulkDelete(
							pendingOps.map((op) => op.queueId),
						);
					}
				},
			);
			return { success: true, queued: false };
		}
	}

	const fallback = await markFaLocalDelete({
		targetId: resolvedTargetId,
		localId: resolvedLocalId,
	});
	return { success: fallback.success !== false, queued: true };
}

let faSyncInFlight = null;

/**
 * Replays queued FA operations against Supabase.
 * Uses an in-flight guard to prevent concurrent sync runs.
 * Stops on first error to avoid re-ordering side effects.
 *
 * @param {(status: any) => void} [statusCb]
 * @returns {Promise<{synced: number, error?: any}>}
 */
export function syncFaQueue(statusCb) {
	if (faSyncInFlight) {
		return faSyncInFlight;
	}

	faSyncInFlight = (async () => {
		await localIdReady;
		const operations = await QUEUE_TABLE.orderBy("queueId").toArray();
		if (!operations.length) return { synced: 0 };
		let synced = 0;

		for (const op of operations) {
			try {
				if (typeof statusCb === "function") {
					statusCb({ current: op, synced });
				}

				if (op.operationType === "create") {
					const { data, error } = await supabase
						.from(TABLE_NAME)
						.insert([sanitizeCasePayload(op.payload ?? {})])
						.select()
						.single();
					if (error) throw error;
					await offlineCaseDb.transaction(
						"rw",
						CASE_TABLE,
						QUEUE_TABLE,
						async () => {
							await CASE_TABLE.update(op.targetLocalId, {
								...op.payload,
								id: data.id,
								created_at: data.created_at,
								updated_at: data.updated_at,
								hasPendingWrites: false,
								pendingAction: null,
								syncError: null,
								lastLocalChange: null,
							});
							await QUEUE_TABLE.delete(op.queueId);
						},
					);
				} else if (op.operationType === "update") {
					if (!op.targetId) {
						throw new Error(
							"Cannot update Financial Assistance case without Supabase id",
						);
					}
					const { data, error } = await supabase
						.from(TABLE_NAME)
						.update(sanitizeCasePayload(op.payload ?? {}))
						.eq("id", op.targetId)
						.select()
						.single();
					if (error) throw error;
					await offlineCaseDb.transaction(
						"rw",
						CASE_TABLE,
						QUEUE_TABLE,
						async () => {
							await CASE_TABLE.update(op.targetLocalId, {
								...op.payload,
								id: data.id,
								created_at: data.created_at,
								updated_at: data.updated_at,
								hasPendingWrites: false,
								pendingAction: null,
								syncError: null,
								lastLocalChange: null,
							});
							await QUEUE_TABLE.delete(op.queueId);
						},
					);
				} else if (op.operationType === "delete") {
					if (op.targetId) {
						const { error } = await supabase
							.from(TABLE_NAME)
							.delete()
							.eq("id", op.targetId);
						if (error) throw error;
					}
					await offlineCaseDb.transaction(
						"rw",
						CASE_TABLE,
						QUEUE_TABLE,
						async () => {
							await CASE_TABLE.delete(op.targetLocalId);
							await QUEUE_TABLE.delete(op.queueId);
						},
					);
				}
				synced += 1;
			} catch (error) {
				await CASE_TABLE.update(op.targetLocalId, {
					syncError: error.message,
				});
				return { synced, error };
			}
		}

		await removeDuplicateServerRows();
		return { synced };
	})().finally(() => {
		faSyncInFlight = null;
	});

	return faSyncInFlight;
}
