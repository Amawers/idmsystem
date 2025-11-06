/**
 * @file CaseManagement.jsx
 * @description Case Management - Main table view for managing cases
 * @module pages/case-manager/CaseManagement
 */

import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCases } from "@/hooks/useCases";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";
import { useFacCases } from "@/hooks/useFacCases";
import { useIvacCases } from "@/hooks/useIvacCases";

export default function CaseManagement() {
	// Track whether the user is currently at (or past) the DataTable section
	const [atTable, setAtTable] = useState(false);

	// Active/Closed filter state
	const [caseFilter, setCaseFilter] = useState("active");

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

	// Filter cases based on active/closed status
	const filteredCaseRows = useMemo(() => {
		if (!caseRows) return [];
		if (caseFilter === "all") return caseRows;
		
		return caseRows.filter(row => {
			const status = row.status?.toLowerCase();
			if (caseFilter === "active") {
				// Active = not closed/resolved
				return status !== "closed" && status !== "resolved";
			} else {
				// Closed = closed or resolved
				return status === "closed" || status === "resolved";
			}
		});
	}, [caseRows, caseFilter]);

	// Filter CICL/CAR cases based on active/closed status
	const filteredCiclcarRows = useMemo(() => {
		if (!ciclcarRows) return [];
		if (caseFilter === "all") return ciclcarRows;
		
		return ciclcarRows.filter(row => {
			const status = row.status?.toLowerCase();
			if (caseFilter === "active") {
				// Active = not closed/resolved
				return status !== "closed" && status !== "resolved";
			} else {
				// Closed = closed or resolved
				return status === "closed" || status === "resolved";
			}
		});
	}, [ciclcarRows, caseFilter]);

	// Calculate counts for all case types combined
	const caseCounts = useMemo(() => {
		const allCases = [...(caseRows || []), ...(ciclcarRows || [])];
		
		const active = allCases.filter(row => {
			const status = row.status?.toLowerCase();
			return status !== "closed" && status !== "resolved";
		}).length;

		const closed = allCases.filter(row => {
			const status = row.status?.toLowerCase();
			return status === "closed" || status === "resolved";
		}).length;

		return { active, closed, all: allCases.length };
	}, [caseRows, ciclcarRows]);

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
				
				{/* Active/Closed Filter Tabs */}
				<Tabs value={caseFilter} onValueChange={setCaseFilter} className="w-auto">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="active" className="text-xs gap-1.5">
							Active Cases
							<Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-[10px]">
								{caseCounts.active}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="closed" className="text-xs gap-1.5">
							Closed Cases
							<Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-[10px]">
								{caseCounts.closed}
							</Badge>
						</TabsTrigger>
						<TabsTrigger value="all" className="text-xs gap-1.5">
							All Cases
							<Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-[10px]">
								{caseCounts.all}
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* ================= DATA TABLE ================= */}
			<div ref={dataTableRef}>
				{/* Optional: simple loading/error states */}
				{casesError ? (
					<div className="px-4 text-sm text-red-600">
						Failed to load cases.{" "}
						<button className="underline" onClick={reload}>
							Retry
						</button>
					</div>
				) : null}
				{ciclcarError ? (
					<div className="px-4 text-sm text-red-600">
						Failed to load CICL-CAR cases.{" "}
						<button className="underline" onClick={reloadCiclcar}>
							Retry
						</button>
					</div>
				) : null}
				{farError ? (
					<div className="px-4 text-sm text-red-600">
						Failed to load FAR cases.{" "}
						<button className="underline" onClick={reloadFar}>
							Retry
						</button>
					</div>
				) : null}
				{facError ? (
					<div className="px-4 text-sm text-red-600">
						Failed to load FAC cases.{" "}
						<button className="underline" onClick={reloadFac}>
							Retry
						</button>
					</div>
				) : null}
				{ivacError ? (
					<div className="px-4 text-sm text-red-600">
						Failed to load IVAC cases.{" "}
						<button className="underline" onClick={reloadIvac}>
							Retry
						</button>
					</div>
				) : null}

				<DataTable
					caseData={casesLoading ? [] : filteredCaseRows}
					ciclcarData={ciclcarLoading ? [] : filteredCiclcarRows}
					farData={farLoading ? [] : farRows}
					facData={facLoading ? [] : facRows}
					ivacData={ivacLoading ? [] : ivacRows}
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
				/>
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
