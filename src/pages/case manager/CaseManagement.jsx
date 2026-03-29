/**
 * Case Management page.
 *
 * Responsibilities:
 * - Aggregates case datasets (CASE, CICL/CAR, FAC, FAR, IVAC, SP, FA, PWD, SC) via online Supabase hooks.
 * - Applies role-based visibility filtering for case managers.
 * - Persists active tab selection in `sessionStorage`.
 */

import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCases } from "@/hooks/useCases";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";
import { useFacCases } from "@/hooks/useFacCases";
import { useIvacCases } from "@/hooks/useIvacCases";
import { useSpCases } from "@/hooks/useSpCases";
import { useFaCases } from "@/hooks/useFaCases";
import { usePwdCases } from "@/hooks/usePwdCases";
import { useScCases } from "@/hooks/useScCases";
import { useHiddenCases } from "@/hooks/useHiddenCases";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * @typedef {"CASE"|"CICLCAR"|"FAC"|"FAR"|"IVAC"|"SP"|"FA"|"PWD"|"SC"} CaseManagementTabId
 */

export default function CaseManagement() {
	// Load dynamic CASE rows from Supabase
	const {
		data: caseRows,
		loading: casesLoading,
		error: casesError,
		reload,
		deleteCase,
		pendingCount: casePendingCount,
		syncing: caseSyncing,
		syncStatus: caseSyncStatus,
		runSync: runCaseSync,
	} = useCases();
	const {
		data: ciclcarRows,
		loading: ciclcarLoading,
		error: ciclcarError,
		reload: reloadCiclcar,
		deleteCiclcarCase,
		pendingCount: ciclcarPendingCount,
		syncing: ciclcarSyncing,
		syncStatus: ciclcarSyncStatus,
		runSync: runCiclcarSync,
		programEnrollments: ciclcarProgramEnrollments,
		programEnrollmentsLoading: ciclcarProgramEnrollmentsLoading,
	} = useCiclcarCases();
	const {
		data: farRows,
		loading: farLoading,
		error: farError,
		reload: reloadFar,
		deleteFarCase,
		pendingCount: farPendingCount,
		syncing: farSyncing,
		syncStatus: farSyncStatus,
		runSync: runFarSync,
	} = useFarCases();
	const {
		data: facRows,
		loading: facLoading,
		error: facError,
		reload: reloadFac,
		deleteFacCase,
		pendingCount: facPendingCount,
		syncing: facSyncing,
		syncStatus: facSyncStatus,
		runSync: runFacSync,
	} = useFacCases();
	const {
		data: ivacRows,
		loading: ivacLoading,
		error: ivacError,
		reload: reloadIvac,
		deleteIvacCase,
		pendingCount: ivacPendingCount,
		syncing: ivacSyncing,
		syncStatus: ivacSyncStatus,
		runSync: runIvacSync,
	} = useIvacCases();
	const {
		data: spRows,
		loading: spLoading,
		error: spError,
		reload: reloadSp,
		deleteSpCase,
		pendingCount: spPendingCount,
		syncing: spSyncing,
		syncStatus: spSyncStatus,
		runSync: runSpSync,
	} = useSpCases();
	const {
		data: faRows,
		loading: faLoading,
		error: faError,
		reload: reloadFa,
		deleteFaCase,
		pendingCount: faPendingCount,
		syncing: faSyncing,
		syncStatus: faSyncStatus,
		runSync: runFaSync,
	} = useFaCases();
	const {
		data: pwdRows,
		loading: pwdLoading,
		error: pwdError,
		reload: reloadPwd,
		deletePwdCase,
		pendingCount: pwdPendingCount,
		syncing: pwdSyncing,
		syncStatus: pwdSyncStatus,
		runSync: runPwdSync,
	} = usePwdCases();
	const {
		data: scRows,
		loading: scLoading,
		error: scError,
		reload: reloadSc,
		deleteScCase,
		pendingCount: scPendingCount,
		syncing: scSyncing,
		syncStatus: scSyncStatus,
		runSync: runScSync,
	} = useScCases();

	// Filter hidden cases for case managers
	const { filterVisibleCases } = useHiddenCases();
	const isOnline = useNetworkStatus();
	/** @type {[CaseManagementTabId, (t: CaseManagementTabId) => void]} */
	const [initialTab, setInitialTab] = useState("CASE");

	/**
	 * Persists the user-selected tab so the view can restore it after refresh.
	 * @param {CaseManagementTabId} tabValue
	 */
	const persistActiveTab = useCallback((tabValue) => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", tabValue);
	}, []);

	/** Bootstraps the initial tab selection on first mount. */
	useEffect(() => {
		if (typeof window === "undefined") return;
		const storedTab = sessionStorage.getItem("caseManagement.activeTab");
		setInitialTab(storedTab || "CASE");
	}, []);

	/** Mirrors `initialTab` into sessionStorage so other flows can read it. */
	useEffect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", initialTab);
	}, [initialTab]);

	/** Applies visibility filtering to each dataset before handing to the table UI. */
	const filteredCaseRows = React.useMemo(
		() => filterVisibleCases(caseRows || []),
		[caseRows, filterVisibleCases],
	);
	const filteredCiclcarRows = React.useMemo(
		() => filterVisibleCases(ciclcarRows || []),
		[ciclcarRows, filterVisibleCases],
	);
	const filteredFarRows = React.useMemo(
		() => filterVisibleCases(farRows || []),
		[farRows, filterVisibleCases],
	);
	const filteredFacRows = React.useMemo(
		() => filterVisibleCases(facRows || []),
		[facRows, filterVisibleCases],
	);
	const filteredIvacRows = React.useMemo(
		() => filterVisibleCases(ivacRows || []),
		[ivacRows, filterVisibleCases],
	);
	const filteredSpRows = React.useMemo(
		() => filterVisibleCases(spRows || []),
		[spRows, filterVisibleCases],
	);
	const filteredFaRows = React.useMemo(
		() => filterVisibleCases(faRows || []),
		[faRows, filterVisibleCases],
	);
	const filteredPwdRows = React.useMemo(
		() => filterVisibleCases(pwdRows || []),
		[pwdRows, filterVisibleCases],
	);
	const filteredScRows = React.useMemo(
		() => filterVisibleCases(scRows || []),
		[scRows, filterVisibleCases],
	);

	return (
		<>
			<div className="flex items-start justify-between gap-4 px-4 lg:px-6 pb-4">
				<div>
					<h2 className="text-base font-bold tracking-tight">
						Case Management
					</h2>
					<p className="text-muted-foreground text-[11px]">
						View and manage all case records and intake forms
					</p>
				</div>
				<div className="hidden sm:block max-w-[520px] text-right text-[11px] leading-snug text-muted-foreground">
					<p>
						<span className="font-semibold text-foreground">
							CICL/CAR
						</span>{" "}
						- Children In Conflict with the Law (CICL) and Child at
						Risk (CAR)
					</p>
					<p>
						<span className="font-semibold text-foreground">
							Incidence on VAC
						</span>{" "}
						- Incidence on Violence Against Children
					</p>
				</div>
			</div>

			<div className="px-4 lg:px-6">
				<Card>
					<CardContent className="pt-4">
						{/* Optional: simple loading/error states */}
						{casesError ? (
							<div className="text-sm text-red-600">
								Failed to load cases.{" "}
								<button className="underline" onClick={reload}>
									Retry
								</button>
							</div>
						) : null}
						{ciclcarError ? (
							<div className="text-sm text-red-600">
								Failed to load CICL-CAR cases.{" "}
								<button
									className="underline"
									onClick={reloadCiclcar}
								>
									Retry
								</button>
							</div>
						) : null}
						{farError ? (
							<div className="text-sm text-red-600">
								Failed to load FAR cases.{" "}
								<button
									className="underline"
									onClick={reloadFar}
								>
									Retry
								</button>
							</div>
						) : null}
						{facError ? (
							<div className="text-sm text-red-600">
								Failed to load FAC cases.{" "}
								<button
									className="underline"
									onClick={reloadFac}
								>
									Retry
								</button>
							</div>
						) : null}
						{ivacError ? (
							<div className="text-sm text-red-600">
								Failed to load IVAC cases.{" "}
								<button
									className="underline"
									onClick={reloadIvac}
								>
									Retry
								</button>
							</div>
						) : null}
						{spError ? (
							<div className="text-sm text-red-600">
								Failed to load Single Parents cases.{" "}
								<button
									className="underline"
									onClick={reloadSp}
								>
									Retry
								</button>
							</div>
						) : null}
						{faError ? (
							<div className="text-sm text-red-600">
								Failed to load Financial Assistance cases.{" "}
								<button
									className="underline"
									onClick={reloadFa}
								>
									Retry
								</button>
							</div>
						) : null}
						{pwdError ? (
							<div className="text-sm text-red-600">
								Failed to load Persons with Disabilities cases.{" "}
								<button
									className="underline"
									onClick={reloadPwd}
								>
									Retry
								</button>
							</div>
						) : null}
						{scError ? (
							<div className="text-sm text-red-600">
								Failed to load Senior Citizen cases.{" "}
								<button
									className="underline"
									onClick={reloadSc}
								>
									Retry
								</button>
							</div>
						) : null}

						<DataTable
							caseData={casesLoading ? [] : filteredCaseRows}
							ciclcarData={
								ciclcarLoading ? [] : filteredCiclcarRows
							}
							farData={farLoading ? [] : filteredFarRows}
							facData={facLoading ? [] : filteredFacRows}
							ivacData={ivacLoading ? [] : filteredIvacRows}
							spData={spLoading ? [] : filteredSpRows}
							faData={faLoading ? [] : filteredFaRows}
							pwdData={pwdLoading ? [] : filteredPwdRows}
							scData={scLoading ? [] : filteredScRows}
							reloadCases={reload}
							reloadCiclcar={reloadCiclcar}
							reloadFar={reloadFar}
							reloadFac={reloadFac}
							reloadIvac={reloadIvac}
							reloadSp={reloadSp}
							reloadFa={reloadFa}
							reloadPwd={reloadPwd}
							reloadSc={reloadSc}
							deleteCase={deleteCase}
							deleteCiclcarCase={deleteCiclcarCase}
							deleteFarCase={deleteFarCase}
							deleteFacCase={deleteFacCase}
							deleteIvacCase={deleteIvacCase}
							deleteSpCase={deleteSpCase}
							deleteFaCase={deleteFaCase}
							deletePwdCase={deletePwdCase}
							deleteScCase={deleteScCase}
							initialTab={initialTab}
							onTabChange={persistActiveTab}
							caseSync={{
								pendingCount: casePendingCount,
								syncing: caseSyncing,
								syncStatus: caseSyncStatus,
								onSync: runCaseSync,
							}}
							ciclcarSync={{
								pendingCount: ciclcarPendingCount,
								syncing: ciclcarSyncing,
								syncStatus: ciclcarSyncStatus,
								onSync: runCiclcarSync,
							}}
							facSync={{
								pendingCount: facPendingCount,
								syncing: facSyncing,
								syncStatus: facSyncStatus,
								onSync: runFacSync,
							}}
							farSync={{
								pendingCount: farPendingCount,
								syncing: farSyncing,
								syncStatus: farSyncStatus,
								onSync: runFarSync,
							}}
							ivacSync={{
								pendingCount: ivacPendingCount,
								syncing: ivacSyncing,
								syncStatus: ivacSyncStatus,
								onSync: runIvacSync,
							}}
							spSync={{
								pendingCount: spPendingCount,
								syncing: spSyncing,
								syncStatus: spSyncStatus,
								onSync: runSpSync,
							}}
							faSync={{
								pendingCount: faPendingCount,
								syncing: faSyncing,
								syncStatus: faSyncStatus,
								onSync: runFaSync,
							}}
							pwdSync={{
								pendingCount: pwdPendingCount,
								syncing: pwdSyncing,
								syncStatus: pwdSyncStatus,
								onSync: runPwdSync,
							}}
							scSync={{
								pendingCount: scPendingCount,
								syncing: scSyncing,
								syncStatus: scSyncStatus,
								onSync: runScSync,
							}}
							ciclcarProgramEnrollments={
								ciclcarProgramEnrollments
							}
							ciclcarProgramEnrollmentsLoading={
								ciclcarProgramEnrollmentsLoading
							}
							isOnline={isOnline}
						/>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
