/**
 * @file CaseManagement.jsx
 * @description Case Management - Main table view for managing cases
 * @module pages/case-manager/CaseManagement
 */

import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCasesOffline } from "@/hooks/useCasesOffline";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";
import { useFacCases } from "@/hooks/useFacCases";
import { useIvacCases } from "@/hooks/useIvacCases";
import { useSpCases } from "@/hooks/useSpCases";
import { useFaCases } from "@/hooks/useFaCases";
import { useHiddenCases } from "@/hooks/useHiddenCases";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const FORCED_TAB_AFTER_RELOAD_KEY = "caseManagement.forceTabAfterReload";

export default function CaseManagement() {
	// Load dynamic CASE rows from Supabase with offline support
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
	} = useCasesOffline();
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

	// Filter hidden cases for case managers
	const { filterVisibleCases } = useHiddenCases();
	const isOnline = useNetworkStatus();
	const [initialTab, setInitialTab] = useState("CASE");
	const [autoSyncAfterReloadTab, setAutoSyncAfterReloadTab] = useState(null);
	const hasBootstrappedTab = useRef(false);
	const previousOnline = useRef(isOnline);
	const autoSyncTriggeredRef = useRef({
		CASE: false,
		CICLCAR: false,
		FAC: false,
		FAR: false,
		IVAC: false,
		SP: false,
		FA: false,
	});

	const persistActiveTab = useCallback((tabValue) => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", tabValue);
	}, []);

	useEffect(() => {
		if (hasBootstrappedTab.current) return;
		hasBootstrappedTab.current = true;
		if (typeof window === "undefined") return;
		const forcedTab = sessionStorage.getItem(FORCED_TAB_AFTER_RELOAD_KEY);
		const forcedCaseSync =
			sessionStorage.getItem("caseManagement.forceCaseSync") === "true";
		const forcedCiclcarSync =
			sessionStorage.getItem("caseManagement.forceCiclcarSync") ===
			"true";
		const forcedSpSync =
			sessionStorage.getItem("caseManagement.forceSpSync") === "true";
		const forcedFaSync =
			sessionStorage.getItem("caseManagement.forceFaSync") === "true";
		const forcedFacSync =
			sessionStorage.getItem("caseManagement.forceFacSync") === "true";
		const forcedFarSync =
			sessionStorage.getItem("caseManagement.forceFarSync") === "true";
		const forcedIvacSync =
			sessionStorage.getItem("caseManagement.forceIvacSync") === "true";
		const storedTab = sessionStorage.getItem("caseManagement.activeTab");
		const nextTab =
			forcedTab ||
			(forcedCaseSync
				? "CASE"
				: forcedCiclcarSync
					? "CICLCAR"
					: forcedSpSync
						? "SP"
						: forcedFaSync
							? "FA"
							: forcedFacSync
								? "FAC"
								: forcedFarSync
									? "FAR"
									: forcedIvacSync
										? "IVAC"
										: storedTab || "CASE");
		setInitialTab(nextTab);
		if (forcedCaseSync) {
			setAutoSyncAfterReloadTab("CASE");
		} else if (forcedCiclcarSync) {
			setAutoSyncAfterReloadTab("CICLCAR");
		} else if (forcedSpSync) {
			setAutoSyncAfterReloadTab("SP");
		} else if (forcedFaSync) {
			setAutoSyncAfterReloadTab("FA");
		} else if (forcedFacSync) {
			setAutoSyncAfterReloadTab("FAC");
		} else if (forcedFarSync) {
			setAutoSyncAfterReloadTab("FAR");
		} else if (forcedIvacSync) {
			setAutoSyncAfterReloadTab("IVAC");
		}
		sessionStorage.removeItem("caseManagement.forceCaseSync");
		sessionStorage.removeItem("caseManagement.forceCiclcarSync");
		sessionStorage.removeItem("caseManagement.forceSpSync");
		sessionStorage.removeItem("caseManagement.forceFaSync");
		sessionStorage.removeItem("caseManagement.forceFacSync");
		sessionStorage.removeItem("caseManagement.forceFarSync");
		sessionStorage.removeItem("caseManagement.forceIvacSync");
		if (forcedTab) {
			sessionStorage.removeItem(FORCED_TAB_AFTER_RELOAD_KEY);
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", initialTab);
	}, [initialTab]);

	useEffect(() => {
		if (!previousOnline.current && isOnline) {
			if (typeof window !== "undefined") {
				if (casePendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "CASE");
					sessionStorage.setItem(
						"caseManagement.forceCaseSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (ciclcarPendingCount > 0) {
					sessionStorage.setItem(
						"caseManagement.activeTab",
						"CICLCAR",
					);
					sessionStorage.setItem(
						"caseManagement.forceCiclcarSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (facPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "FAC");
					sessionStorage.setItem(
						"caseManagement.forceFacSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (farPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "FAR");
					sessionStorage.setItem(
						"caseManagement.forceFarSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (ivacPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "IVAC");
					sessionStorage.setItem(
						"caseManagement.forceIvacSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (spPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "SP");
					sessionStorage.setItem(
						"caseManagement.forceSpSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (faPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "FA");
					sessionStorage.setItem(
						"caseManagement.forceFaSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
			}
		}
		previousOnline.current = isOnline;
	}, [
		isOnline,
		casePendingCount,
		ciclcarPendingCount,
		facPendingCount,
		farPendingCount,
		ivacPendingCount,
		spPendingCount,
		faPendingCount,
	]);

	useEffect(() => {
		if (!autoSyncAfterReloadTab) return;
		if (!isOnline) return;
		const runSync =
			autoSyncAfterReloadTab === "CASE"
				? runCaseSync
				: autoSyncAfterReloadTab === "CICLCAR"
					? runCiclcarSync
					: autoSyncAfterReloadTab === "FAC"
						? runFacSync
						: autoSyncAfterReloadTab === "FAR"
							? runFarSync
							: autoSyncAfterReloadTab === "IVAC"
								? runIvacSync
								: autoSyncAfterReloadTab === "SP"
									? runSpSync
									: autoSyncAfterReloadTab === "FA"
										? runFaSync
										: null;
		if (!runSync) return;
		runSync()
			.catch((err) => console.error("Auto sync failed:", err))
			.finally(() => setAutoSyncAfterReloadTab(null));
	}, [
		autoSyncAfterReloadTab,
		isOnline,
		runCaseSync,
		runCiclcarSync,
		runFacSync,
		runFarSync,
		runIvacSync,
		runSpSync,
		runFaSync,
	]);

	useEffect(() => {
		if (!isOnline) {
			autoSyncTriggeredRef.current = {
				CASE: false,
				CICLCAR: false,
				FAC: false,
				FAR: false,
				IVAC: false,
				SP: false,
				FA: false,
			};
			return;
		}
		if (autoSyncAfterReloadTab) return;
		const triggers = autoSyncTriggeredRef.current;
		if (casePendingCount > 0 && !caseSyncing && !triggers.CASE) {
			triggers.CASE = true;
			runCaseSync()
				.catch((err) => console.error("Auto CASE sync failed:", err))
				.finally(() => {
					triggers.CASE = false;
				});
		}
		if (ciclcarPendingCount > 0 && !ciclcarSyncing && !triggers.CICLCAR) {
			triggers.CICLCAR = true;
			runCiclcarSync()
				.catch((err) =>
					console.error("Auto CICL/CAR sync failed:", err),
				)
				.finally(() => {
					triggers.CICLCAR = false;
				});
		}
		if (facPendingCount > 0 && !facSyncing && !triggers.FAC) {
			triggers.FAC = true;
			runFacSync()
				.catch((err) => console.error("Auto FAC sync failed:", err))
				.finally(() => {
					triggers.FAC = false;
				});
		}
		if (farPendingCount > 0 && !farSyncing && !triggers.FAR) {
			triggers.FAR = true;
			runFarSync()
				.catch((err) => console.error("Auto FAR sync failed:", err))
				.finally(() => {
					triggers.FAR = false;
				});
		}
		if (ivacPendingCount > 0 && !ivacSyncing && !triggers.IVAC) {
			triggers.IVAC = true;
			runIvacSync()
				.catch((err) => console.error("Auto IVAC sync failed:", err))
				.finally(() => {
					triggers.IVAC = false;
				});
		}
		if (spPendingCount > 0 && !spSyncing && !triggers.SP) {
			triggers.SP = true;
			runSpSync()
				.catch((err) => console.error("Auto SP sync failed:", err))
				.finally(() => {
					triggers.SP = false;
				});
		}
		if (faPendingCount > 0 && !faSyncing && !triggers.FA) {
			triggers.FA = true;
			runFaSync()
				.catch((err) => console.error("Auto FA sync failed:", err))
				.finally(() => {
					triggers.FA = false;
				});
		}
	}, [
		isOnline,
		autoSyncAfterReloadTab,
		runCaseSync,
		runCiclcarSync,
		runFacSync,
		runFarSync,
		runIvacSync,
		runSpSync,
		casePendingCount,
		ciclcarPendingCount,
		facPendingCount,
		farPendingCount,
		ivacPendingCount,
		spPendingCount,
		faPendingCount,
		caseSyncing,
		ciclcarSyncing,
		facSyncing,
		farSyncing,
		ivacSyncing,
		spSyncing,
		faSyncing,
	]);

	// Apply filtering to all case data
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

	return (
		<>
			{/* ================= HEADER ================= */}
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

			{/* ================= DATA TABLE ================= */}
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
							reloadCases={reload}
							reloadCiclcar={reloadCiclcar}
							reloadFar={reloadFar}
							reloadFac={reloadFac}
							reloadIvac={reloadIvac}
							reloadSp={reloadSp}
							reloadFa={reloadFa}
							deleteCase={deleteCase}
							deleteCiclcarCase={deleteCiclcarCase}
							deleteFarCase={deleteFarCase}
							deleteFacCase={deleteFacCase}
							deleteIvacCase={deleteIvacCase}
							deleteSpCase={deleteSpCase}
							deleteFaCase={deleteFaCase}
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
