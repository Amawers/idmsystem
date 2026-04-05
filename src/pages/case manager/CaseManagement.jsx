/**
 * Case Management page.
 *
 * Responsibilities:
 * - Aggregates case datasets (CASE, CICL/CAR, FAC, FAR, IVAC, SP, FA, PWD, SC) via online hooks.
 * - Applies role-based visibility filtering for case managers.
 * - Persists active tab selection in session storage.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/cases/data-table";
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

/**
 * @typedef {"CASE"|"CICLCAR"|"FAC"|"FAR"|"IVAC"|"SP"|"FA"|"PWD"|"SC"} CaseManagementTabId
 */

const readStoredTab = () => {
	if (typeof window === "undefined") return "CASE";
	return sessionStorage.getItem("caseManagement.activeTab") || "CASE";
};

export default function CaseManagement() {
	const {
		data: caseRows,
		loading: casesLoading,
		error: casesError,
		reload,
		deleteCase,
	} = useCases();
	const {
		data: ciclcarRows,
		loading: ciclcarLoading,
		error: ciclcarError,
		reload: reloadCiclcar,
		deleteCiclcarCase,
		programEnrollments: ciclcarProgramEnrollments,
		programEnrollmentsLoading: ciclcarProgramEnrollmentsLoading,
	} = useCiclcarCases();
	const {
		data: farRows,
		loading: farLoading,
		error: farError,
		reload: reloadFar,
		deleteFarCase,
	} = useFarCases();
	const {
		data: facRows,
		loading: facLoading,
		error: facError,
		reload: reloadFac,
		deleteFacCase,
	} = useFacCases();
	const {
		data: ivacRows,
		loading: ivacLoading,
		error: ivacError,
		reload: reloadIvac,
		deleteIvacCase,
	} = useIvacCases();
	const {
		data: spRows,
		loading: spLoading,
		error: spError,
		reload: reloadSp,
		deleteSpCase,
	} = useSpCases();
	const {
		data: faRows,
		loading: faLoading,
		error: faError,
		reload: reloadFa,
		deleteFaCase,
	} = useFaCases();
	const {
		data: pwdRows,
		loading: pwdLoading,
		error: pwdError,
		reload: reloadPwd,
		deletePwdCase,
	} = usePwdCases();
	const {
		data: scRows,
		loading: scLoading,
		error: scError,
		reload: reloadSc,
		deleteScCase,
	} = useScCases();

	const { filterVisibleCases } = useHiddenCases();
	/** @type {[CaseManagementTabId, (t: CaseManagementTabId) => void]} */
	const [initialTab, setInitialTab] = useState("CASE");

	const persistActiveTab = useCallback((tabValue) => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", tabValue);
	}, []);

	useEffect(() => {
		setInitialTab(readStoredTab());
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("caseManagement.activeTab", initialTab);
	}, [initialTab]);

	const filteredCaseRows = useMemo(
		() => filterVisibleCases(caseRows || []),
		[caseRows, filterVisibleCases],
	);
	const filteredCiclcarRows = useMemo(
		() => filterVisibleCases(ciclcarRows || []),
		[ciclcarRows, filterVisibleCases],
	);
	const filteredFarRows = useMemo(
		() => filterVisibleCases(farRows || []),
		[farRows, filterVisibleCases],
	);
	const filteredFacRows = useMemo(
		() => filterVisibleCases(facRows || []),
		[facRows, filterVisibleCases],
	);
	const filteredIvacRows = useMemo(
		() => filterVisibleCases(ivacRows || []),
		[ivacRows, filterVisibleCases],
	);
	const filteredSpRows = useMemo(
		() => filterVisibleCases(spRows || []),
		[spRows, filterVisibleCases],
	);
	const filteredFaRows = useMemo(
		() => filterVisibleCases(faRows || []),
		[faRows, filterVisibleCases],
	);
	const filteredPwdRows = useMemo(
		() => filterVisibleCases(pwdRows || []),
		[pwdRows, filterVisibleCases],
	);
	const filteredScRows = useMemo(
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
						{spError ? (
							<div className="text-sm text-red-600">
								Failed to load Single Parents cases.{" "}
								<button className="underline" onClick={reloadSp}>
									Retry
								</button>
							</div>
						) : null}
						{faError ? (
							<div className="text-sm text-red-600">
								Failed to load Financial Assistance cases.{" "}
								<button className="underline" onClick={reloadFa}>
									Retry
								</button>
							</div>
						) : null}
						{pwdError ? (
							<div className="text-sm text-red-600">
								Failed to load Persons with Disabilities cases.{" "}
								<button className="underline" onClick={reloadPwd}>
									Retry
								</button>
							</div>
						) : null}
						{scError ? (
							<div className="text-sm text-red-600">
								Failed to load Senior Citizen cases.{" "}
								<button className="underline" onClick={reloadSc}>
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
							ciclcarProgramEnrollments={
								ciclcarProgramEnrollments
							}
							ciclcarProgramEnrollmentsLoading={
								ciclcarProgramEnrollmentsLoading
							}
						/>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
