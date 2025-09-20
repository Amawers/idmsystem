import { DataTable } from "@/components/cases/data-table";
import React, { useEffect, useState, useRef } from "react";

//! TEMPLATE DATA
import CASEDATA from "../../SAMPLE_CASE-TABLE.json";
import CICLCARDATA from "../../SAMPLE_CICL-CAR-TABLE.json";
import FARDATA from "../../SAMPLE_FAR-TABLE.json";

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function Case() {
	// Track whether the user is currently at (or past) the DataTable section
	const [atTable, setAtTable] = useState(false);

	// Reference to the DataTable container for scrolling
	const dataTableRef = useRef(null);

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
			{/* ================= SECTION CARDS ================= */}
			<SectionCards />

			{/* ================= INTERACTIVE CHART ================= */}
			<div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			{/* ================= DATA TABLE ================= */}
			{/* Attach ref so we know where this section is on the page */}
			<div ref={dataTableRef}>
				<DataTable
					caseData={CASEDATA}
					ciclcarData={CICLCARDATA}
					farData={FARDATA}
				/>
			</div>

			{/* ================= FLOATING SCROLL BUTTON ================= */}
			{/* 
        - Stays fixed at bottom-right corner
        - Shows ArrowDown when near the top (to go down to DataTable)
        - Shows ArrowUp once user reached DataTable (to go back up to top)
      */}
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
