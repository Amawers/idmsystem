/**
 * Offline-first helpers for FAC cases (case + family members).
 *
 * Responsibilities:
 * - Cache FAC cases in Dexie for offline reads.
 * - Maintain derived family member UI state (`family_members`, `family_member_count`) in cache.
 * - Stage mutations into an ordered queue for eventual sync to Supabase.
 * - Sync family members via a “replace all” strategy (delete + insert) per case.
 *
 * Identity notes:
 * - Dexie uses an auto-increment `localId` key; some historical rows may be missing `localId`.
 * - `ensureLocalIdField()` backfills `localId` and removes duplicate server rows (same remote `id`).
 */

import { liveQuery } from "dexie";
import supabase from "@/../config/supabase";
import offlineCaseDb from "@/db/offlineCaseDb";

/**
 * @typedef {Object} FacLocalMeta
 * @property {number} [localId]
 * @property {boolean} [hasPendingWrites]
 * @property {"create"|"update"|"delete"|null} [pendingAction]
 * @property {string|null} [syncError]
 * @property {number|null} [lastLocalChange]
 */

/**
 * @typedef {Object} FacFamilyMemberUi
 * @property {string} familyMember
 * @property {string} relationToHead
 * @property {string} birthdate
 * @property {string|number} age
 * @property {string} sex
 * @property {string} educationalAttainment
 * @property {string} occupation
 * @property {string} remarks
 */

/**
 * @typedef {Object} FacFamilyMemberPayload
 * @property {string|null} family_member_name
 * @property {string|null} relation_to_head
 * @property {string|null} birthdate
 * @property {string|number|null} age
 * @property {string|null} sex
 * @property {string|null} educational_attainment
 * @property {string|null} occupation
 * @property {string|null} remarks
 */

/**
 * @typedef {Object} FacQueueOp
 * @property {"create"|"update"|"delete"} operationType
 * @property {number} targetLocalId Dexie primary key for `fac_cases`
 * @property {string|null} targetId Supabase id (null until created remotely)
 * @property {{case?: Object, family_members?: Array<FacFamilyMemberPayload>}|null} payload
 * @property {number} createdAt
 * @property {number} [queueId]
 */

const CASE_TABLE_NAME = "fac_case";
const FAMILY_TABLE_NAME = "fac_family_member";
const CASE_TABLE = offlineCaseDb.table("fac_cases");
const QUEUE_TABLE = offlineCaseDb.table("fac_queue");
const LOCAL_META_FIELDS = [
	"localId",
	"hasPendingWrites",
	"pendingAction",
	"syncError",
	"lastLocalChange",
	"family_members",
	"family_member_count",
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
 * Maps a Supabase family member row into the UI shape used by the renderer.
 * @param {Object} [member]
 * @returns {FacFamilyMemberUi}
 */
const toUiFamilyMember = (member = {}) => ({
	familyMember: member.familyMember ?? member.family_member_name ?? "",
	relationToHead: member.relationToHead ?? member.relation_to_head ?? "",
	birthdate: member.birthdate ?? "",
	age: member.age ?? "",
	sex: member.sex ?? "",
	educationalAttainment:
		member.educationalAttainment ?? member.educational_attainment ?? "",
	occupation: member.occupation ?? "",
	remarks: member.remarks ?? "",
});

/**
 * Maps a UI family member object into the Supabase payload shape.
 * @param {Object} [member]
 * @returns {FacFamilyMemberPayload}
 */
const toSupabaseFamilyMember = (member = {}) => ({
	family_member_name:
		member.familyMember ?? member.family_member_name ?? null,
	relation_to_head: member.relationToHead ?? member.relation_to_head ?? null,
	birthdate: member.birthdate ?? null,
	age: member.age ?? null,
	sex: member.sex ?? null,
	educational_attainment:
		member.educationalAttainment ?? member.educational_attainment ?? null,
	occupation: member.occupation ?? null,
	remarks: member.remarks ?? null,
});

/**
 * LiveQuery stream of FAC cases, newest-first by `localId`.
 * Performs a small amount of hygiene (localId backfill + de-dupe) before returning.
 * @returns {import('dexie').LiveQuery<any[]>}
 */
export const facLiveQuery = () =>
	liveQuery(async () => {
		await localIdReady;
		await removeDuplicateServerRows();
		const rows = await CASE_TABLE.orderBy("localId").reverse().toArray();
		return rows.map((row) => ({ ...row }));
	});

/** @returns {Promise<number>} */
export async function getFacPendingOperationCount() {
	return QUEUE_TABLE.count();
}

/**
 * Fetches a cached FAC case by Supabase `id`.
 * @param {string} targetId
 * @returns {Promise<any|null>}
 */
export async function getFacCaseById(targetId) {
	if (!targetId) return null;
	await localIdReady;
	return CASE_TABLE.where("id").equals(targetId).first();
}

/**
 * Fetches a cached FAC case by Dexie `localId`.
 * @param {number} localId
 * @returns {Promise<any|null>}
 */
export async function getFacCaseByLocalId(localId) {
	if (localId == null) return null;
	await localIdReady;
	return CASE_TABLE.get(localId);
}

/**
 * Removes local-only / derived fields before syncing the case payload to Supabase.
 * @param {Object} [payload]
 * @returns {Object}
 */
function sanitizeCasePayload(payload = {}) {
	const clone = { ...payload };
	LOCAL_META_FIELDS.forEach((key) => delete clone[key]);
	return clone;
}

/**
 * Builds a local cache record and maintains derived family member fields.
 * @param {Object} base
 * @param {Object} [overrides]
 * @returns {Object}
 */
function buildLocalRecord(base, overrides = {}) {
	const familyMembers = overrides.family_members ?? base.family_members ?? [];
	return {
		...base,
		...overrides,
		family_members: familyMembers,
		family_member_count: familyMembers.length,
		hasPendingWrites: overrides.hasPendingWrites ?? false,
		pendingAction: overrides.pendingAction ?? null,
		lastLocalChange: overrides.lastLocalChange ?? null,
	};
}

/**
 * Upserts remote case rows + their family members into the local cache.
 * Note: this implementation does not overwrite local rows with pending writes.
 * @param {Array<Object>} [rows]
 * @param {Map<string, Array<Object>>} [familyMap]
 * @returns {Promise<void>}
 */
export async function upsertLocalFromSupabase(
	rows = [],
	familyMap = new Map(),
) {
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
			const familyMembers = (familyMap.get(row.id) ?? []).map(
				toUiFamilyMember,
			);
			const record = buildLocalRecord(row, {
				family_members: familyMembers,
				family_member_count: familyMembers.length,
			});
			if (existing?.localId) {
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
 * Loads the remote FAC snapshot (cases + family members) into the local cache.
 * Family members are fetched separately and grouped by `fac_case_id`.
 * @returns {Promise<number>} Count of case rows fetched.
 */
export async function loadFacRemoteSnapshotIntoCache() {
	const { data: cases, error } = await supabase
		.from(CASE_TABLE_NAME)
		.select("*")
		.order("updated_at", { ascending: false });
	if (error) throw error;

	const { data: members, error: memberError } = await supabase
		.from(FAMILY_TABLE_NAME)
		.select("*");
	if (memberError) throw memberError;

	const familyMap = new Map();
	for (const member of members ?? []) {
		if (!member?.fac_case_id) continue;
		const list = familyMap.get(member.fac_case_id) ?? [];
		list.push(member);
		familyMap.set(member.fac_case_id, list);
	}

	await upsertLocalFromSupabase(cases ?? [], familyMap);
	await removeDuplicateServerRows();
	return cases?.length ?? 0;
}

/**
 * Creates or updates a local FAC case and enqueues an operation.
 * Stores UI-shaped family members in the cache, but queues Supabase-shaped family members.
 * @param {Object} params
 * @param {Object} params.casePayload
 * @param {Array<Object>} [params.familyMembers]
 * @param {string|null} [params.targetId]
 * @param {number|null} [params.localId]
 * @param {"create"|"update"} [params.mode]
 * @returns {Promise<{localId: number}>}
 */
export async function createOrUpdateLocalFacCase({
	casePayload,
	familyMembers = [],
	targetId = null,
	localId = null,
	mode = "create",
}) {
	if (!casePayload) throw new Error("Missing case payload");
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

			const uiFamilies = Array.isArray(familyMembers)
				? familyMembers.map(toUiFamilyMember)
				: [];
			const supabaseFamilies = uiFamilies.map(toSupabaseFamilyMember);

			const mergedCase = {
				...(record ?? {}),
				...casePayload,
			};

			const baseRecord = buildLocalRecord(mergedCase, {
				id: targetId ?? record?.id ?? null,
				family_members: uiFamilies,
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
				payload: {
					case: sanitizeCasePayload(casePayload),
					family_members: supabaseFamilies,
				},
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
export async function markFacLocalDelete({ targetId = null, localId = null }) {
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
export async function deleteFacCaseNow({ targetId = null, localId = null }) {
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
			.from(CASE_TABLE_NAME)
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

	const fallback = await markFacLocalDelete({
		targetId: resolvedTargetId,
		localId: resolvedLocalId,
	});
	return { success: fallback.success !== false, queued: true };
}

/**
 * Syncs all family members for a case using a replace-all strategy.
 * @param {string} caseId
 * @param {Array<FacFamilyMemberPayload>} [familyMembers]
 * @returns {Promise<void>}
 */
async function syncFamilyMembers(caseId, familyMembers = []) {
	await supabase.from(FAMILY_TABLE_NAME).delete().eq("fac_case_id", caseId);
	if (familyMembers.length) {
		const payload = familyMembers.map((member) => ({
			...member,
			fac_case_id: caseId,
		}));
		const { error } = await supabase
			.from(FAMILY_TABLE_NAME)
			.insert(payload);
		if (error) throw error;
	}
}

let facSyncInFlight = null;

/**
 * Replays queued FAC operations against Supabase.
 * Uses an in-flight guard to prevent concurrent sync runs.
 * Stops on first error to avoid re-ordering side effects.
 * @param {(status: any) => void} [statusCb]
 * @returns {Promise<{synced: number, error?: any}>}
 */
export function syncFacQueue(statusCb) {
	if (facSyncInFlight) {
		return facSyncInFlight;
	}

	facSyncInFlight = (async () => {
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
						.from(CASE_TABLE_NAME)
						.insert([sanitizeCasePayload(op.payload?.case ?? {})])
						.select()
						.single();
					if (error) throw error;
					if (op.payload?.family_members?.length) {
						await syncFamilyMembers(
							data.id,
							op.payload.family_members,
						);
					}
					await offlineCaseDb.transaction(
						"rw",
						CASE_TABLE,
						QUEUE_TABLE,
						async () => {
							await CASE_TABLE.update(op.targetLocalId, {
								...op.payload.case,
								id: data.id,
								created_at: data.created_at,
								updated_at: data.updated_at,
								family_members:
									op.payload.family_members?.map(
										toUiFamilyMember,
									) ?? [],
								family_member_count:
									op.payload.family_members?.length ?? 0,
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
							"Cannot update FAC case without Supabase id",
						);
					}
					const { data, error } = await supabase
						.from(CASE_TABLE_NAME)
						.update(sanitizeCasePayload(op.payload?.case ?? {}))
						.eq("id", op.targetId)
						.select()
						.single();
					if (error) throw error;
					await syncFamilyMembers(
						op.targetId,
						op.payload?.family_members ?? [],
					);
					await offlineCaseDb.transaction(
						"rw",
						CASE_TABLE,
						QUEUE_TABLE,
						async () => {
							await CASE_TABLE.update(op.targetLocalId, {
								...op.payload.case,
								id: data.id,
								created_at: data.created_at,
								updated_at: data.updated_at,
								family_members:
									op.payload.family_members?.map(
										toUiFamilyMember,
									) ?? [],
								family_member_count:
									op.payload.family_members?.length ?? 0,
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
							.from(CASE_TABLE_NAME)
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
		facSyncInFlight = null;
	});

	return facSyncInFlight;
}
