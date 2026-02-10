/**
 * Offline-first Persons With Disability (PWD) case service.
 *
 * Responsibilities:
 * - Maintain a local IndexedDB cache of PWD cases (Dexie table `pwd_cases`).
 * - Queue create/update/delete operations while offline (Dexie table `pwd_queue`).
 * - Reconcile queued operations to Supabase (`pwd_case`) when online.
 *
 * Notes:
 * - `localId` is the local primary key used to address rows consistently even
 *   before Supabase assigns an `id`.
 * - `hasPendingWrites` prevents remote snapshots from overwriting local edits.
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

const TABLE_NAME = "pwd_case";
const CASE_TABLE = offlineCaseDb.table("pwd_cases");
const QUEUE_TABLE = offlineCaseDb.table("pwd_queue");

/**
 * Local-only bookkeeping fields that must never be persisted back to Supabase.
 * @type {string[]}
 */
const LOCAL_META_FIELDS = [
	"localId",
	"hasPendingWrites",
	"pendingAction",
	"syncError",
	"lastLocalChange",
];

/** @returns {number} Epoch milliseconds. */
const nowTs = () => Date.now();

/** @returns {boolean} True when the browser reports network connectivity. */
const browserOnline = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * @typedef {object} PwdLocalMeta
 * @property {number} localId
 * @property {boolean} hasPendingWrites
 * @property {"create"|"update"|"delete"|null} pendingAction
 * @property {string|null} syncError
 * @property {number|null} lastLocalChange Epoch milliseconds
 */

/**
 * Minimal shape used throughout the cache/queue.
 * The PWD schema may evolve, so this is intentionally loose.
 * @typedef {Record<string, any> & Partial<PwdLocalMeta> & { id?: string|null }} PwdCaseRecord
 */

/**
 * Queue row shape used by `pwd_queue`.
 * @typedef {object} PwdQueueOp
 * @property {number} queueId
 * @property {"create"|"update"|"delete"} operationType
 * @property {number} targetLocalId
 * @property {string|null} targetId Supabase row id (required for update/delete)
 * @property {any|null} payload
 * @property {number} createdAt Epoch milliseconds
 */

/**
 * Removes duplicate cached rows that reference the same Supabase `id`.
 *
 * This can happen if older cache versions inserted without first checking for
 * an existing row; keeping only the earliest `localId` stabilizes updates.
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
 * Backfills `localId` on existing rows (and then de-dupes).
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
 * Strips local-only metadata from a payload before syncing to Supabase.
 * @param {Record<string, any>} [payload]
 * @returns {Record<string, any>}
 */
function sanitizeCasePayload(payload = {}) {
	const clone = { ...payload };
	LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
	return clone;
}

/**
 * Ensures local metadata fields have stable defaults.
 * @param {Record<string, any>} [base]
 * @param {Partial<PwdLocalMeta> & Record<string, any>} [overrides]
 * @returns {PwdCaseRecord}
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
 * LiveQuery stream of cached PWD cases (newest first).
 * Consumers should treat returned rows as immutable.
 * @returns {import('dexie').Observable<PwdCaseRecord[]>}
 */
export const pwdLiveQuery = () =>
	liveQuery(async () => {
		await localIdReady;
		await removeDuplicateServerRows();
		const rows = await CASE_TABLE.orderBy("localId").reverse().toArray();
		return rows.map((row) => ({ ...row }));
	});

/** @returns {Promise<number>} Number of queued operations awaiting sync. */
export async function getPwdPendingOperationCount() {
	return QUEUE_TABLE.count();
}

/**
 * Fetches a cached PWD case by Supabase `id`.
 * @param {string|null|undefined} targetId
 * @returns {Promise<PwdCaseRecord|null>}
 */
export async function getPwdCaseById(targetId) {
	if (!targetId) return null;
	await localIdReady;
	return CASE_TABLE.where("id").equals(targetId).first();
}

/**
 * Fetches a cached PWD case by local Dexie primary key.
 * @param {number|null|undefined} localId
 * @returns {Promise<PwdCaseRecord|null>}
 */
export async function getPwdCaseByLocalId(localId) {
	if (localId == null) return null;
	await localIdReady;
	return CASE_TABLE.get(localId);
}

/**
 * Upserts a Supabase snapshot into the local cache.
 *
 * Policy: rows with `hasPendingWrites` are not overwritten.
 * @param {PwdCaseRecord[]} [rows]
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
 * Loads the latest PWD snapshot from Supabase into the local cache.
 * @returns {Promise<number>} Number of remote rows loaded.
 */
export async function loadPwdRemoteSnapshotIntoCache() {
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
 * Creates/updates a local PWD case row and enqueues a sync operation.
 *
 * Prefer using `localId` when editing a draft that might not yet have a
 * Supabase `id`.
 * @param {object} params
 * @param {Record<string, any>} params.casePayload
 * @param {string|null} [params.targetId]
 * @param {number|null} [params.localId]
 * @param {"create"|"update"} [params.mode]
 * @returns {Promise<{ localId: number }>}
 */
export async function createOrUpdateLocalPwdCase({
	casePayload,
	targetId = null,
	localId = null,
	mode = "create",
}) {
	if (!casePayload) throw new Error("Missing PWD case payload");
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
 * Marks a cached row as pending delete and enqueues the delete operation.
 * @param {object} params
 * @param {string|null} [params.targetId]
 * @param {number|null} [params.localId]
 * @returns {Promise<{ success: boolean }>}
 */
export async function markPwdLocalDelete({ targetId = null, localId = null }) {
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
 * Deletes immediately when online; otherwise marks local delete and queues sync.
 *
 * When a remote delete succeeds, any queued ops for the same `localId` are
 * removed to avoid replaying stale work.
 * @param {object} params
 * @param {string|null} [params.targetId]
 * @param {number|null} [params.localId]
 * @returns {Promise<{ success: boolean, queued: boolean }>}
 */
export async function deletePwdCaseNow({ targetId = null, localId = null }) {
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

	const fallback = await markPwdLocalDelete({
		targetId: resolvedTargetId,
		localId: resolvedLocalId,
	});
	return { success: fallback.success !== false, queued: true };
}

let pwdSyncInFlight = null;

/**
 * Replays queued operations to Supabase in FIFO order.
 *
 * Returns the in-flight promise if sync is already running.
 * @param {(info: { current: PwdQueueOp, synced: number }) => void} [statusCb]
 * @returns {Promise<{ synced: number, error?: any }|{ synced: 0 }|{ synced: number }>}
 */
export function syncPwdQueue(statusCb) {
	if (pwdSyncInFlight) {
		return pwdSyncInFlight;
	}

	pwdSyncInFlight = (async () => {
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
							"Cannot update PWD case without Supabase id",
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
		pwdSyncInFlight = null;
	});

	return pwdSyncInFlight;
}
