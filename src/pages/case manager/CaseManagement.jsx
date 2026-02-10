/**
 * Case Management page.
 *
 * Responsibilities:
 * - Aggregates case datasets (CASE, CICL/CAR, FAC, FAR, IVAC, SP, FA, PWD, SC) via offline-capable hooks.
 * - Applies role-based visibility filtering for case managers.
 * - Coordinates tab persistence and post-reload auto-sync using `sessionStorage` flags.
 * - Auto-triggers sync when coming back online and there are pending offline operations.
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
import { usePwdCases } from "@/hooks/usePwdCases";
import { useScCases } from "@/hooks/useScCases";
import { useHiddenCases } from "@/hooks/useHiddenCases";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * @typedef {"CASE"|"CICLCAR"|"FAC"|"FAR"|"IVAC"|"SP"|"FA"|"PWD"|"SC"} CaseManagementTabId
 */

/**
 * Key used to force a specific tab selection after a full reload.
 *
 * This is separate from `caseManagement.activeTab` so callers can temporarily override tab selection
 * (e.g., after create/update flows) without permanently changing user preference.
 */
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
	/** @type {[CaseManagementTabId | null, (t: CaseManagementTabId | null) => void]} */
	const [autoSyncAfterReloadTab, setAutoSyncAfterReloadTab] = useState(null);
	const hasBootstrappedTab = useRef(false);
	const previousOnline = useRef(isOnline);
	/**
	 * Used as a simple in-memory lock map to prevent overlapping auto-sync attempts per tab.
	 * @type {React.MutableRefObject<Record<CaseManagementTabId, boolean>>}
	 */
	const autoSyncTriggeredRef = useRef({
		CASE: false,
		CICLCAR: false,
		FAC: false,
		FAR: false,
		IVAC: false,
		SP: false,
		FA: false,
		PWD: false,
		SC: false,
	});

	/**
	 * Persists the user-selected tab so the view can restore it after refresh.
	 * @param {CaseManagementTabId} tabValue
	 */
	const persistActiveTab = useCallback((tabValue) => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", tabValue);
	}, []);

	/**
	 * Bootstraps the initial tab selection on first mount.
	 *
	 * Priority order:
	 * 1) A forced tab override (`FORCED_TAB_AFTER_RELOAD_KEY`)
	 * 2) A one-shot sync flag (e.g., `caseManagement.forceCaseSync`)
	 * 3) Previously persisted tab (`caseManagement.activeTab`)
	 */
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
		const forcedPwdSync =
			sessionStorage.getItem("caseManagement.forcePwdSync") === "true";
		const forcedScSync =
			sessionStorage.getItem("caseManagement.forceScSync") === "true";
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
										: forcedPwdSync
											? "PWD"
											: forcedScSync
												? "SC"
												: storedTab || "CASE");
		setInitialTab(nextTab);
		if (forcedCaseSync) {
			setAutoSyncAfterReloadTab("CASE");
		} else if (forcedCiclcarSync) {
			setAutoSyncAfterReloadTab("CICLCAR");
		} else if (forcedSpSync) {
			setAutoSyncAfterReloadTab("SP");
		} else if (forcedPwdSync) {
			setAutoSyncAfterReloadTab("PWD");
		} else if (forcedScSync) {
			setAutoSyncAfterReloadTab("SC");
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
		sessionStorage.removeItem("caseManagement.forcePwdSync");
		sessionStorage.removeItem("caseManagement.forceScSync");
		if (forcedTab) {
			sessionStorage.removeItem(FORCED_TAB_AFTER_RELOAD_KEY);
		}
	}, []);

	/** Mirrors `initialTab` into sessionStorage so other flows can read it. */
	useEffect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", initialTab);
	}, [initialTab]);

	/**
	 * When the app transitions from offline -> online and there are pending operations,
	 * trigger a reload that lands the user on the most relevant tab and forces a sync.
	 */
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
				if (pwdPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "PWD");
					sessionStorage.setItem(
						"caseManagement.forcePwdSync",
						"true",
					);
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (scPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "SC");
					sessionStorage.setItem(
						"caseManagement.forceScSync",
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
		pwdPendingCount,
		scPendingCount,
	]);

	/**
	 * If a create/update flow forced a reload with a specific sync flag, run that sync once.
	 * The actual sync function is selected based on `autoSyncAfterReloadTab`.
	 */
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
									: autoSyncAfterReloadTab === "PWD"
										? runPwdSync
										: autoSyncAfterReloadTab === "SC"
											? runScSync
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
		runPwdSync,
		runScSync,
		runFaSync,
	]);

	/**
	 * While online, opportunistically auto-sync pending queues per case type.
	 * Uses `autoSyncTriggeredRef` as a lightweight guard against overlapping sync attempts.
	 */
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
				PWD: false,
				SC: false,
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
		if (pwdPendingCount > 0 && !pwdSyncing && !triggers.PWD) {
			triggers.PWD = true;
			runPwdSync()
				.catch((err) => console.error("Auto PWD sync failed:", err))
				.finally(() => {
					triggers.PWD = false;
				});
		}
		if (scPendingCount > 0 && !scSyncing && !triggers.SC) {
			triggers.SC = true;
			runScSync()
				.catch((err) => console.error("Auto SC sync failed:", err))
				.finally(() => {
					triggers.SC = false;
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
		runPwdSync,
		runScSync,
		runFaSync,
		casePendingCount,
		ciclcarPendingCount,
		facPendingCount,
		farPendingCount,
		ivacPendingCount,
		spPendingCount,
		faPendingCount,
		pwdPendingCount,
		scPendingCount,
		caseSyncing,
		ciclcarSyncing,
		facSyncing,
		farSyncing,
		ivacSyncing,
		spSyncing,
		faSyncing,
		pwdSyncing,
		scSyncing,
	]);

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
