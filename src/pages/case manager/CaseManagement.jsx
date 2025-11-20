/**
 * @file CaseManagement.jsx
 * @description Case Management - Main table view for managing cases
 * @module pages/case-manager/CaseManagement
 */

import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";
import { useFacCases } from "@/hooks/useFacCases";
import { useIvacCases } from "@/hooks/useIvacCases";
import { useHiddenCases } from "@/hooks/useHiddenCases";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const FORCED_TAB_AFTER_RELOAD_KEY = "caseManagement.forceTabAfterReload";

export default function CaseManagement() {
	// Track whether the user is currently at (or past) the DataTable section
	const [atTable, setAtTable] = useState(false);

	// Reference to the DataTable container for scrolling
	const dataTableRef = useRef(null);

	// Load dynamic CASE rows from Supabase
	const { data: caseRows, loading: casesLoading, error: casesError, reload, deleteCase } = useCases();
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
	} = useIvacCases();

	// Filter hidden cases for case managers
	const { filterVisibleCases } = useHiddenCases();
	const isOnline = useNetworkStatus();
	const [initialTab, setInitialTab] = useState("CASE");
	const [autoSyncAfterReloadTab, setAutoSyncAfterReloadTab] = useState(null);
	const hasBootstrappedTab = useRef(false);
	const previousOnline = useRef(isOnline);
	const autoSyncTriggeredRef = useRef({ CICLCAR: false, FAC: false, FAR: false });

	const persistActiveTab = useCallback((tabValue) => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", tabValue);
	}, []);

	useEffect(() => {
		if (hasBootstrappedTab.current) return;
		hasBootstrappedTab.current = true;
		if (typeof window === "undefined") return;
		const forcedTab = sessionStorage.getItem(FORCED_TAB_AFTER_RELOAD_KEY);
		const forcedCiclcarSync = sessionStorage.getItem("caseManagement.forceCiclcarSync") === "true";
		const forcedFacSync = sessionStorage.getItem("caseManagement.forceFacSync") === "true";
		const forcedFarSync = sessionStorage.getItem("caseManagement.forceFarSync") === "true";
		const storedTab = sessionStorage.getItem("caseManagement.activeTab");
		const nextTab = forcedTab
			|| (forcedCiclcarSync
				? "CICLCAR"
				: forcedFacSync
				? "FAC"
				: forcedFarSync
				? "FAR"
				: storedTab || "CASE");
		setInitialTab(nextTab);
		if (forcedCiclcarSync) {
			setAutoSyncAfterReloadTab("CICLCAR");
		} else if (forcedFacSync) {
			setAutoSyncAfterReloadTab("FAC");
		} else if (forcedFarSync) {
			setAutoSyncAfterReloadTab("FAR");
		}
		sessionStorage.removeItem("caseManagement.forceCiclcarSync");
		sessionStorage.removeItem("caseManagement.forceFacSync");
		sessionStorage.removeItem("caseManagement.forceFarSync");
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
				if (ciclcarPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "CICLCAR");
					sessionStorage.setItem("caseManagement.forceCiclcarSync", "true");
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (facPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "FAC");
					sessionStorage.setItem("caseManagement.forceFacSync", "true");
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
				if (farPendingCount > 0) {
					sessionStorage.setItem("caseManagement.activeTab", "FAR");
					sessionStorage.setItem("caseManagement.forceFarSync", "true");
					window.location.reload();
					previousOnline.current = isOnline;
					return;
				}
			}
		}
		previousOnline.current = isOnline;
		}, [isOnline, ciclcarPendingCount, facPendingCount, farPendingCount]);

	useEffect(() => {
		if (!autoSyncAfterReloadTab) return;
		if (!isOnline) return;
		const runSync = autoSyncAfterReloadTab === "CICLCAR"
			? runCiclcarSync
			: autoSyncAfterReloadTab === "FAC"
			? runFacSync
			: autoSyncAfterReloadTab === "FAR"
			? runFarSync
			: null;
		if (!runSync) return;
		runSync()
			.catch((err) => console.error("Auto sync failed:", err))
			.finally(() => setAutoSyncAfterReloadTab(null));
	}, [autoSyncAfterReloadTab, isOnline, runCiclcarSync, runFacSync, runFarSync]);

	useEffect(() => {
		if (!isOnline) {
			autoSyncTriggeredRef.current = { CICLCAR: false, FAC: false, FAR: false };
			return;
		}
		if (autoSyncAfterReloadTab) return;
		const triggers = autoSyncTriggeredRef.current;
		if (ciclcarPendingCount > 0 && !ciclcarSyncing && !triggers.CICLCAR) {
			triggers.CICLCAR = true;
			runCiclcarSync()
				.catch((err) => console.error("Auto CICL/CAR sync failed:", err))
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
	}, [
		isOnline,
		autoSyncAfterReloadTab,
		runCiclcarSync,
		runFacSync,
		runFarSync,
		ciclcarPendingCount,
		facPendingCount,
		farPendingCount,
		ciclcarSyncing,
		facSyncing,
		farSyncing,
	]);

	// Apply filtering to all case data
	const filteredCaseRows = React.useMemo(() => filterVisibleCases(caseRows || []), [caseRows, filterVisibleCases]);
	const filteredCiclcarRows = React.useMemo(() => filterVisibleCases(ciclcarRows || []), [ciclcarRows, filterVisibleCases]);
	const filteredFarRows = React.useMemo(() => filterVisibleCases(farRows || []), [farRows, filterVisibleCases]);
	const filteredFacRows = React.useMemo(() => filterVisibleCases(facRows || []), [facRows, filterVisibleCases]);
	const filteredIvacRows = React.useMemo(() => filterVisibleCases(ivacRows || []), [ivacRows, filterVisibleCases]);

	// Effect: watch scroll position and update "atTable" state
	useEffect(() => {
		const handleScroll = () => {
			if (!dataTableRef.current) return;
			const rect = dataTableRef.current.getBoundingClientRect();
			// If DataTable's top is close to the viewport (<= 100px), mark as "at table"
			setAtTable(rect.top <= 100);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Smoothly scroll back to the very top of the page
	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Smoothly scroll down to the DataTable section
	const scrollToDataTable = () => {
		dataTableRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<>
			{/* ================= HEADER ================= */}
			<div className="flex items-center justify-between px-4 lg:px-6 pb-4">
				<div>
					<h2 className="text-base font-bold tracking-tight">Case Management</h2>
					<p className="text-muted-foreground text-[11px]">View and manage all case records and intake forms</p>
				</div>
			</div>

			{/* ================= DATA TABLE ================= */}
			<div ref={dataTableRef} className="px-4 lg:px-6">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle className="text-lg">Case Records</CardTitle>
						<CardDescription>
							Manage and track all case intake forms and records across different categories
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
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
								<button className="underline" onClick={reloadCiclcar}>
									Retry
								</button>
							</div>
						) : null}
						{farError ? (
							<div className="text-sm text-red-600">
								Failed to load FAR cases.{" "}
								<button className="underline" onClick={reloadFar}>
									Retry
								</button>
							</div>
						) : null}
						{facError ? (
							<div className="text-sm text-red-600">
								Failed to load FAC cases.{" "}
								<button className="underline" onClick={reloadFac}>
									Retry
								</button>
							</div>
						) : null}
						{ivacError ? (
							<div className="text-sm text-red-600">
								Failed to load IVAC cases.{" "}
								<button className="underline" onClick={reloadIvac}>
									Retry
								</button>
							</div>
						) : null}

						<DataTable
							caseData={casesLoading ? [] : filteredCaseRows}
							ciclcarData={ciclcarLoading ? [] : filteredCiclcarRows}
							farData={farLoading ? [] : filteredFarRows}
							facData={facLoading ? [] : filteredFacRows}
							ivacData={ivacLoading ? [] : filteredIvacRows}
							reloadCases={reload}
							reloadCiclcar={reloadCiclcar}
							reloadFar={reloadFar}
							reloadFac={reloadFac}
							reloadIvac={reloadIvac}
							deleteCase={deleteCase}
							deleteCiclcarCase={deleteCiclcarCase}
							deleteFarCase={deleteFarCase}
							deleteFacCase={deleteFacCase}
							deleteIvacCase={deleteIvacCase}
							initialTab={initialTab}
							onTabChange={persistActiveTab}
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
							ciclcarProgramEnrollments={ciclcarProgramEnrollments}
							ciclcarProgramEnrollmentsLoading={ciclcarProgramEnrollmentsLoading}
							isOnline={isOnline}
						/>
					</CardContent>
				</Card>
			</div>

			{/* ================= FLOATING SCROLL BUTTON ================= */}
			<div className="fixed bottom-6 right-6 z-10">
				<Button
					size="icon"
					className="rounded-full shadow-lg cursor-pointer"
					onClick={atTable ? scrollToTop : scrollToDataTable}
				>
					{atTable ? (
						<ArrowUp className="h-5 w-5" />
					) : (
						<ArrowDown className="h-5 w-5" />
					)}
				</Button>
			</div>
		</>
	);
}
