/**
 * @file CaseManagement.jsx
 * @description Case Management - Main table view for managing cases
 * @module pages/case-manager/CaseManagement
 */

import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";
import { useFacCases } from "@/hooks/useFacCases";

export default function CaseManagement() {
	// Track whether the user is currently at (or past) the DataTable section
	const [atTable, setAtTable] = useState(false);

	// Reference to the DataTable container for scrolling
	const dataTableRef = useRef(null);

	// Load dynamic CASE rows from Supabase
	const { data: caseRows, loading: casesLoading, error: casesError, reload } = useCases();
	const {
		data: ciclcarRows,
		loading: ciclcarLoading,
		error: ciclcarError,
		reload: reloadCiclcar,
	} = useCiclcarCases();
	const {
		data: farRows,
		loading: farLoading,
		error: farError,
		reload: reloadFar,
	} = useFarCases();
	const {
		data: facRows,
		loading: facLoading,
		error: facError,
		reload: reloadFac,
	} = useFacCases();

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

				<DataTable
					caseData={casesLoading ? [] : caseRows}
					ciclcarData={ciclcarLoading ? [] : ciclcarRows}
					farData={farLoading ? [] : farRows}
					facData={facLoading ? [] : facRows}
					reloadCases={reload}
					reloadCiclcar={reloadCiclcar}
					reloadFar={reloadFar}
					reloadFac={reloadFac}
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
