import { DataTable } from "@/components/data-table";
import React from "react";
import data from "../../data.json";
import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

export default function Case() {
	return (
		<>
			{/* ================= SECTION CARDS ================= */}
			<SectionCards />

			{/* ================= INTERACTIVE CHART ================= */}
			<div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			{/* ================= DATA TABLE ================= */}
			<DataTable data={data} />
		</>
	)
}
