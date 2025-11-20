/**
 * @file useCasesOffline.js
 * @description Hook for Cases tab with offline + sync support
 * @module hooks/useCasesOffline
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    caseLiveQuery,
    getPendingOperationCount,
    loadRemoteSnapshotIntoCache,
    deleteCaseNow,
    syncCaseQueue,
} from "@/services/caseOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceCaseTabReload = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("caseManagement.activeTab", "CASE");
    sessionStorage.setItem("caseManagement.forceTabAfterReload", "CASE");
    sessionStorage.setItem("caseManagement.forceCaseSync", "true");
    window.location.reload();
};

/**
 * Map DB row to the shape the CASE table expects
 */
function mapCaseRow(row) {
    return {
        // Table ID
        id: row.id,

        // Used by intake prefill (opens intake with name)
        header: row.identifying_name ?? null,

        // Direct fields
        case_manager: row.case_manager ?? null,
        status: row.status ?? null,
        priority: row.priority ?? null,

        // The CASE table expects "date_filed" for Time Open/Date selector.
        date_filed: row.identifying_intake_date ?? row.created_at ?? null,

        // The CASE table expects "last_updated"
        last_updated: row.updated_at ?? row.created_at ?? null,

        // Keep raw timestamps
        identifying_intake_date: row.identifying_intake_date ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,

        // All other identifying fields
        identifying_referral_source: row.identifying_referral_source ?? null,
        identifying_alias: row.identifying_alias ?? null,
        identifying_age: row.identifying_age ?? null,
        identifying_status: row.identifying_status ?? null,
        identifying_occupation: row.identifying_occupation ?? null,
        identifying_income: row.identifying_income ?? null,
        identifying_sex: row.identifying_sex ?? null,
        identifying_address: row.identifying_address ?? null,
        identifying_case_type: row.identifying_case_type ?? null,
        identifying_religion: row.identifying_religion ?? null,
        identifying_educational_attainment: row.identifying_educational_attainment ?? null,
        identifying_contact_person: row.identifying_contact_person ?? null,
        identifying_birth_place: row.identifying_birth_place ?? null,
        identifying_respondent_name: row.identifying_respondent_name ?? null,
        identifying_birthday: row.identifying_birthday ?? null,

        // Perpetrator fields
        perpetrator_name: row.perpetrator_name ?? null,
        perpetrator_age: row.perpetrator_age ?? null,
        perpetrator_alias: row.perpetrator_alias ?? null,
        perpetrator_sex: row.perpetrator_sex ?? null,
        perpetrator_address: row.perpetrator_address ?? null,
        perpetrator_victim_relation: row.perpetrator_victim_relation ?? null,
        perpetrator_offence_type: row.perpetrator_offence_type ?? null,
        perpetrator_commission_datetime: row.perpetrator_commission_datetime ?? null,

        // Problem / assessment / recommendation
        presenting_problem: row.presenting_problem ?? null,
        background_info: row.background_info ?? null,
        community_info: row.community_info ?? null,
        assessment: row.assessment ?? null,
        recommendation: row.recommendation ?? null,

        // Identifying2 (secondary person) fields
        identifying2_intake_date: row.identifying2_intake_date ?? null,
        identifying2_name: row.identifying2_name ?? null,
        identifying2_referral_source: row.identifying2_referral_source ?? null,
        identifying2_alias: row.identifying2_alias ?? null,
        identifying2_age: row.identifying2_age ?? null,
        identifying2_status: row.identifying2_status ?? null,
        identifying2_occupation: row.identifying2_occupation ?? null,
        identifying2_income: row.identifying2_income ?? null,
        identifying2_sex: row.identifying2_sex ?? null,
        identifying2_address: row.identifying2_address ?? null,
        identifying2_case_type: row.identifying2_case_type ?? null,
        identifying2_religion: row.identifying2_religion ?? null,
        identifying2_educational_attainment: row.identifying2_educational_attainment ?? null,
        identifying2_contact_person: row.identifying2_contact_person ?? null,
        identifying2_birth_place: row.identifying2_birth_place ?? null,
        identifying2_respondent_name: row.identifying2_respondent_name ?? null,
        identifying2_birthday: row.identifying2_birthday ?? null,

        // Victim2 / secondary victim fields
        victim2_name: row.victim2_name ?? null,
        victim2_age: row.victim2_age ?? null,
        victim2_alias: row.victim2_alias ?? null,
        victim2_sex: row.victim2_sex ?? null,
        victim2_address: row.victim2_address ?? null,
        victim2_victim_relation: row.victim2_victim_relation ?? null,
        victim2_offence_type: row.victim2_offence_type ?? null,
        victim2_commission_datetime: row.victim2_commission_datetime ?? null,
        presenting_problem2: row.presenting_problem2 ?? null,
        background_info2: row.background_info2 ?? null,
        community_info2: row.community_info2 ?? null,
        assessment2: row.assessment2 ?? null,
        recommendation2: row.recommendation2 ?? null,

        // Include family members
        family_members: (row.family_members || []).map((fm) => ({
            id: fm.id,
            case_id: fm.case_id,
            group_no: fm.group_no,
            name: fm.name,
            age: fm.age,
            relation: fm.relation,
            status: fm.status,
            education: fm.education,
            occupation: fm.occupation,
            income: fm.income,
        })),

        // Offline metadata
        localId: row.localId,
        hasPendingWrites: row.hasPendingWrites,
        pendingAction: row.pendingAction,
        syncError: row.syncError,
        lastLocalChange: row.lastLocalChange,
    };
}

export function useCasesOffline() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    const hydratePendingCount = useCallback(async () => {
        const count = await getPendingOperationCount();
        setPendingCount(count);
    }, []);

    useEffect(() => {
        const subscription = caseLiveQuery().subscribe({
            next: (rows) => {
                setData((rows ?? []).map(mapCaseRow));
                setLoading(false);
                hydratePendingCount().catch(() => {
                    // queue count refresh best-effort
                });
            },
            error: (err) => {
                setError(err);
                setLoading(false);
            },
        });

        hydratePendingCount();

        return () => subscription.unsubscribe();
    }, [hydratePendingCount]);

    const load = useCallback(async () => {
        setError(null);

        try {
            if (!isBrowserOnline()) {
                await hydratePendingCount();
                return { success: true, offline: true };
            }
            await loadRemoteSnapshotIntoCache();
            await hydratePendingCount();
            return { success: true };
        } catch (err) {
            setError(err);
            return { success: false, error: err };
        } finally {
            // keep local data rendered; no loading toggle
        }
    }, [hydratePendingCount]);

    useEffect(() => {
        load();
    }, [load]);

    const deleteCase = useCallback(async (caseId) => {
        try {
            const result = await deleteCaseNow({ targetId: caseId });
            await hydratePendingCount();
            if (result?.success && result?.queued === false && isBrowserOnline()) {
                setTimeout(forceCaseTabReload, 0);
            }
            return { success: result?.success !== false, queued: result?.queued };
        } catch (e) {
            console.error("Error deleting case:", e);
            return { success: false, error: e };
        }
    }, [hydratePendingCount]);

    const runSync = useCallback(async () => {
        setSyncing(true);
        setSyncStatus("Preparing sync…");
        try {
            const result = await syncCaseQueue(({ current, synced }) => {
                if (!current) return;
                const label = current.operationType ? current.operationType.toUpperCase() : "";
                setSyncStatus(`Syncing ${label} (${synced + 1})`);
            });
            await load();
            await hydratePendingCount();
            setSyncStatus("All changes synced");
            return result;
        } catch (err) {
            console.error("Case sync failed:", err);
            setSyncStatus(err.message ?? "Sync failed");
            throw err;
        } finally {
            setTimeout(() => setSyncStatus(null), 2000);
            setSyncing(false);
        }
    }, [hydratePendingCount, load]);

    return useMemo(
        () => ({
            data,
            loading,
            error,
            reload: load,
            deleteCase,
            pendingCount,
            syncing,
            syncStatus,
            runSync,
        }),
        [
            data,
            loading,
            error,
            load,
            deleteCase,
            pendingCount,
            syncing,
            syncStatus,
            runSync,
        ],
    );
}
