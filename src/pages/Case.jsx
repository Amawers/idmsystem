import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef } from "react";

//! TEMPLATE DATA - Remove after all tables have dynamic data
// import FARDATA from "../../SAMPLE_FAR-TABLE.json";

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { useCiclcarCases } from "@/hooks/useCiclcarCases";
import { useFarCases } from "@/hooks/useFarCases";

export default function Case() {
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

				<DataTable
					caseData={casesLoading ? [] : caseRows}
					ciclcarData={ciclcarLoading ? [] : ciclcarRows}
					farData={farLoading ? [] : farRows}
					reloadCases={reload}
					reloadCiclcar={reloadCiclcar}
					reloadFar={reloadFar}
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
