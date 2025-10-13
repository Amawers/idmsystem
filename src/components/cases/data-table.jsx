//! ===========================================
//! TO BE MODIFIED, SAMPLE DATA ONLY FOR RENDER
//! ===========================================

// =============================================
// DataTable Component
// ---------------------------------------------
// Purpose: Renders a tabbed data table for cases, CICL/CAR, FAR, IVAC, and FAC with drag-and-drop, selection, and intake sheet modals.
//
// Key Responsibilities:
// - Display data in tables with customizable columns
// - Handle row selection and drag-and-drop reordering
// - Provide intake sheet buttons for each tab
// - Manage state for active tab and modal visibility
//
// Dependencies:
// - React hooks (useState)
// - UI components from shadcn/ui
// - Custom hooks (useDataTable)
// - Icons from Tabler
// - Utilities (toast, formatDistanceToNow)
//
// Notes:
// - Sample data is used; integrate with real data sources later.
// - Drag-and-drop implemented via dnd-kit.
// =============================================

import * as React from "react";
// Icons
import {
	IconChevronDown,
	IconCircleCheckFilled,
	IconClipboardText,
	IconCheckbox,
	IconDotsVertical,
	IconLayoutColumns,
	IconLoader,
	IconPlus,
} from "@tabler/icons-react";

// Other utilities
// import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

// UI components from shadcn
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import IntakeSheetCaseCreate from "@/pages/case manager/IntakeSheetCaseCreate";
import IntakeSheetCICLCARCreate from "@/pages/case manager/IntakeSheetCICLCARCreate";
import IntakeSheetFAR from "@/pages/case manager/IntakeSheetFAR";
import IntakeSheetFAC from "@/pages/case manager/IntakeSheetFAC";
// ADD THIS IMPORT
import IntakeSheetEdit from "@/pages/case manager/intakeSheetCaseEdit";
import DragHandle from "@/components/cases/tables/DragHandle";
import useDataTable from "@/hooks/useDataTable";
import TableRenderer from "@/components/cases/tables/TableRenderer";

// =============================================
// DATA VALIDATION SCHEMA
// =============================================
// eslint-disable-next-line react-refresh/only-export-components
export const schema = z.object({
	id: z.number(),
	header: z.string(),
	type: z.string(),
	status: z.string(),
	target: z.string(),
	limit: z.string(),
	caseManager: z.string(),
});

/**
 * formatDateTime
 *
 * @description Formats an ISO string into a readable date-time string for display.
 *
 * @param {string} isoString - The ISO date-time string to format.
 *
 * @returns {string} Formatted date-time string.
 *
 * @example
 * const formatted = formatDateTime("2023-10-01T12:00:00Z"); // "Oct 1, 2023, 12:00 PM"
 */
function formatDateTime(isoString) {
	const date = new Date(isoString);
	const options = {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	};
	return date.toLocaleString("en-US", options);
}

// =================================
//* CASE Table COLUMN DEFINITIONS
// =================================
// Replace previous `const caseColumns = [ ... ]` with the factory below.

const createCaseColumns = [
	//* =====================
	//* START OF DATA COLUMNS
	//* =====================

	//* CASE ID
	{
		accessorKey: "case ID",
		header: "Case ID",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const caseId = row.original["case ID"] ?? row.original.id;
			return <div className="font-medium">{caseId}</div>;
		},
		enableHiding: false,
	},

	//* CASE MANAGER
	{
		accessorKey: "case manager",
		header: "Case Manager",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const caseManager = row.original["case_manager"] ?? "None";
			return <div>{caseManager}</div>;
		},
	},
	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const status = row.original["status"] ?? "None";
			return <div>{status}</div>;
		},
	},
	//* PRIORITY
	{
		accessorKey: "priority",
		header: "Priority",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const priority = row.original["priority"] ?? "None";
			return <div>{priority}</div>;
		},
	},
	//* DATE FILED
	{
		accessorKey: "date filed",
		header: "Date Filed",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.date_filed) || "-"}
			</div>
		),
	},
	//* TIME OPEN
	{
		accessorKey: "time open",
		header: "Time Open",
		cell: ({ row }) => {
			const filedDate = row.original.date_filed
				? new Date(row.original.date_filed)
				: null;

			return (
				<div>
					{filedDate
						? formatDistanceToNow(filedDate, { addSuffix: false })
						: "N/A"}
				</div>
			);
		},
	},
	//! REFACTOR SOON VISIBILITY TO EXCLUDE SPECIFIC CASE MANAGER
	//* VISIBILITY
	{
		accessorKey: "visibility",
		header: "Visibility",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const visibility = row.original["visibility"] ?? "None";
			return <div>{visibility}</div>;
		},
	},

	//* LAST UPDATED
	{
		accessorKey: "last updated",
		header: () => (
			<div className="w-full flex justify-center">
				<span className="w-32 text-center">Last Updated</span>
			</div>
		),
		cell: ({ row }) => (
			<div className="w-full flex justify-center">
				<span className="w-32 text-center">
					{formatDateTime(row.original.last_updated)}
				</span>
			</div>
		),
	},
];

// =================================
//* CICLCAR Table COLUMN DEFINITIONS
// =================================
const ciclcarColumns = [
	//* =====================
	//* START OF DATA COLUMNS
	//* =====================

	//* CASE ID
	{
		accessorKey: "case ID",
		header: "Case ID",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const caseId = row.original["case ID"] ?? row.original.id;
			return <div className="font-medium">{caseId}</div>;
		},
		enableHiding: false,
	},

	//* CASE MANAGER
	{
		accessorKey: "case manager",
		header: "Case Manager",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const caseManager = row.original["case_manager"] ?? "None";
			return <div>{caseManager}</div>;
		},
	},
	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const status = row.original["status"] ?? "None";
			return <div>{status}</div>;
		},
	},
	//* PRIORITY
	{
		accessorKey: "priority",
		header: "Priority",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const priority = row.original["priority"] ?? "None";
			return <div>{priority}</div>;
		},
	},
	//* DATE FILED
	{
		accessorKey: "date filed",
		header: "Date Filed",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.date_filed) || "-"}
			</div>
		),
	},
	//* TIME OPEN
	{
		accessorKey: "time open",
		header: "Time Open",
		cell: ({ row }) => {
			const filedDate = row.original.date_filed
				? new Date(row.original.date_filed)
				: null;

			return (
				<div>
					{filedDate
						? formatDistanceToNow(filedDate, { addSuffix: false })
						: "N/A"}
				</div>
			);
		},
	},
	//! REFACTOR SOON VISIBILITY TO EXCLUDE SPECIFIC CASE MANAGER
	//* VISIBILITY
	{
		accessorKey: "visibility",
		header: "Visibility",
		cell: ({ row }) => {
			// Render plain text instead of a clickable viewer to avoid unnecessary navigation
			const visibility = row.original["visibility"] ?? "None";
			return <div>{visibility}</div>;
		},
	},

	//* LAST UPDATED
	{
		accessorKey: "last updated",
		header: () => (
			<div className="w-full flex justify-center">
				<span className="w-32 text-center">Last Updated</span>
			</div>
		),
		cell: ({ row }) => (
			<div className="w-full flex justify-center">
				<span className="w-32 text-center">
					{formatDateTime(row.original.last_updated)}
				</span>
			</div>
		),
	},
];

// =================================
//* FAR Table COLUMN DEFINITIONS
// =================================
const farColumns = [
	{
		id: "drag",
		header: () => null,
		cell: ({ row }) => <DragHandle id={row.original.id} />,
	},

	// Checkbox column (select rows)
	{
		id: "select",
		header: ({ table }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(!!value)
					}
					aria-label="Select all"
				/>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
	},

	//* =====================
	//* START OF DATA COLUMNS
	//* =====================
	{
		accessorKey: "date",
		header: "Date",
		cell: () => <div>Date</div>,
	},
	{
		accessorKey: "member",
		header: "Receiving Member",
		cell: () => <div>Receiving member</div>,
	},
	{
		accessorKey: "emergency",
		header: "Emergency",
		cell: () => <div>Emergency</div>,
	},
	{
		accessorKey: "assistance",
		header: "Assistance",
		cell: () => <div>Assistance</div>,
	},
	{
		accessorKey: "unit",
		header: "Unit",
		cell: () => <div>Unit</div>,
	},
	{
		accessorKey: "quantiy",
		header: "Quantity",
		cell: () => <div>Quantity</div>,
	},
	{
		accessorKey: "cost",
		header: "Cost",
		cell: () => <div>Cost</div>,
	},
	{
		accessorKey: "provider",
		header: "Provider",
		cell: () => <div>Provider</div>,
	},
	{
		id: "actions",
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<IconDotsVertical />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem>Edit</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// --- Date normalization/format helpers (module scope)
// Convert either MM-DD-YYYY or ISO (YYYY-MM-DD) or Date-like strings to ISO (YYYY-MM-DD)
const toISODate = (str) => {
	if (!str) return null;
	const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
	const mmddyyyy = /^\d{2}-\d{2}-\d{4}$/;
	if (isoRegex.test(str)) return str;
	if (mmddyyyy.test(str)) {
		const [mm, dd, yyyy] = str.split("-");
		return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
	}
	// fallback: try Date parse
	const d = new Date(str);
	if (!isNaN(d)) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	}
	return null;
};

// Format any recognized date-ish value to MM-DD-YYYY for display
const formatToMMDDYYYY = (str) => {
	if (!str) return "";
	const mmddyyyy = /^\d{2}-\d{2}-\d{4}$/;
	if (mmddyyyy.test(str)) return str;
	const iso = toISODate(str);
	if (!iso) return String(str);
	const [yyyy, mm, dd] = iso.split("-");
	return `${mm}-${dd}-${yyyy}`;
};

// ==========================
//* Main DataTable wrapper
// ==========================

/**
 * DataTable
 *
 * @description Main component for displaying tabbed data tables with intake functionality.
 *
 * @param {Object} props - Component props
 * @param {Array} props.caseData - Data for CASE tab
 * @param {Array} props.ciclcarData - Data for CICLCAR tab
 * @param {Array} props.farData - Data for FAR tab
 *
 * @returns {JSX.Element} Rendered DataTable component
 *
 * @example
 * <DataTable caseData={cases} ciclcarData={ciclcar} farData={far} />
 */
export function DataTable({ caseData, ciclcarData, farData }) {
	// State to control Intake Sheet modal visibility (open/close)
	const [openIntakeSheet, setOpenIntakeSheet] = useState(false);

	// ADD: edit modal state
	const [openEditSheet, setOpenEditSheet] = useState(false);
	// const [editingRecord, setEditingRecord] = useState(null);

	// Tracks which tab is currently active (default: "CASE")
	const [activeTab, setActiveTab] = useState("CASE");

	//  // ADD: when user clicks Edit, open IntakeSheetEdit modal instead of IntakeSheetCaseCreate
	// function handleEditRow(record) {
	// 	console.log("Editing record:", record);
	// 	setEditingRecord(record);
	// 	setOpenEditSheet(true);
	// }

	// Initialize CASE table with dynamic columns (handler referenced above)
	const caseTable = useDataTable({
		initialData: caseData,
		// CHANGED: pass edit handler so actions column calls this for “Edit”
		columns: createCaseColumns,
	});

	// Table instance for CICLCAR tab with its own data and column definitions
	const ciclcarTable = useDataTable({
		initialData: ciclcarData,
		columns: ciclcarColumns,
	});

	// Table instance for FAR tab with its own data and column definitions
	const farTable = useDataTable({
		initialData: farData,
		columns: farColumns,
	});

	// ============================
	//* TAB TRIGGER SECTION WAPPER
	// ============================
	React.useEffect(() => {
		function onOpen() {
			setOpenIntakeSheet(true);
		}
		window.addEventListener("open-intake-modal", onOpen);
		return () => window.removeEventListener("open-intake-modal", onOpen);
	}, []);

	return (
		<Tabs
			value={activeTab}
			defaultValue="CASE"
			onValueChange={setActiveTab}
			className="w-full flex-col justify-start gap-6"
		>
			<div className="flex items-center justify-between px-4 lg:px-6">
				<Label htmlFor="view-selector" className="sr-only">
					View
				</Label>
				{/*
         // ==============
         // *MOBILE SCREEN
         // ==============
         */}
				<Select value={activeTab} onValueChange={setActiveTab}>
					<SelectTrigger
						className="flex w-fit @4xl/main:hidden"
						size="sm"
						id="view-selector"
					>
						<SelectValue placeholder="Select a view" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="CASE">Cases</SelectItem>
						<SelectItem value="CICLCAR">CICL/CAR</SelectItem>
						<SelectItem value="FAR">
							Family Assistance Record
						</SelectItem>
						<SelectItem value="IVAC">Incidence on VAC</SelectItem>
						<SelectItem value="FAC">
							Family Assistance Card
						</SelectItem>
					</SelectContent>
				</Select>
				{/*
         // ================
         // * DESKTOP SCREEN
         // ================
         */}
				<div className="hidden items-center gap-2 @4xl/main:flex">
					<TabsList>
						<TabsTrigger value="CASE">Cases</TabsTrigger>
						<TabsTrigger value="CICLCAR">CICL/CAR</TabsTrigger>
						<TabsTrigger value="FAR">
							Family Assistance Record
						</TabsTrigger>
						<TabsTrigger value="IVAC">Incidence on VAC</TabsTrigger>
						<TabsTrigger value="FAC">
							Family Assistance Card
						</TabsTrigger>
					</TabsList>
				</div>
				{/*
         // ==============
         // *RIGHT BUTTONS
         // ==============
         */}
				<div className="flex items-center gap-2">
					{/* CASES SECTION */}
					{activeTab === "CASE" && (
						<>
							{/* Customize Columns Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns />
										<span>COLUMNS</span>
										<IconChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56"
								>
									{caseTable.table
										.getAllColumns()
										.filter(
											(c) =>
												typeof c.accessorFn !==
													"undefined" &&
												c.getCanHide()
										)
										.map((c) => (
											<DropdownMenuCheckboxItem
												key={c.id}
												checked={c.getIsVisible()}
												onCheckedChange={(v) =>
													c.toggleVisibility(!!v)
												}
												className="capitalize"
											>
												{c.id}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* INTAKE SHEET BUTTON*/}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setOpenIntakeSheet(true)}
							>
								<IconPlus />
								<span className="hidden lg:inline">
									INTAKE SHEET
								</span>
							</Button>

							<IntakeSheetCaseCreate
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
							/>

							{/* ADD: INTAKE SHEET EDIT (Edit) */}
							<IntakeSheetEdit
								open={openEditSheet}
								setOpen={setOpenEditSheet}
								// record={editingRecord}
							/>
						</>
					)}

					{/* CICLCAR SECTION */}
					{activeTab === "CICLCAR" && (
						<>
							{/* Customize Columns Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns />
										<span>COLUMNS</span>
										<IconChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56"
								>
									{ciclcarTable.table
										.getAllColumns()
										.filter(
											(c) =>
												typeof c.accessorFn !==
													"undefined" &&
												c.getCanHide()
										)
										.map((c) => (
											<DropdownMenuCheckboxItem
												key={c.id}
												checked={c.getIsVisible()}
												onCheckedChange={(v) =>
													c.toggleVisibility(!!v)
												}
												className="capitalize"
											>
												{c.id}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* INTAKE CICL/CAR BUTTON*/}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setOpenIntakeSheet(true)}
							>
								<IconPlus />
								<span className="hidden lg:inline">
									INTAKE CICL/CAR
								</span>
							</Button>

							<IntakeSheetCICLCARCreate
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
							/>
						</>
					)}

					{/* FAR SECTION */}
					{activeTab === "FAR" && (
						<>
							{/* Customize Columns Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns />
										<span>COLUMNS</span>
										<IconChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56"
								>
									{farTable.table
										.getAllColumns()
										.filter(
											(c) =>
												typeof c.accessorFn !==
													"undefined" &&
												c.getCanHide()
										)
										.map((c) => (
											<DropdownMenuCheckboxItem
												key={c.id}
												checked={c.getIsVisible()}
												onCheckedChange={(v) =>
													c.toggleVisibility(!!v)
												}
												className="capitalize"
											>
												{c.id}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* INTAKE FAR BUTTON*/}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setOpenIntakeSheet(true)}
							>
								<IconPlus />
								<span className="hidden lg:inline">
									INTAKE FAR
								</span>
							</Button>

							<IntakeSheetFAR
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
							/>
						</>
					)}
				</div>
			</div>
			{/*
        // ============
        // *CASES VIEW
        // ============
        */}
			<TabsContent
				value="CASE"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
			>
				<TableRenderer
					table={caseTable.table}
					setData={caseTable.setData}
					columns={caseTable.table.getAllColumns()}
				/>
			</TabsContent>
			{/*
        // ==============
        // *CICL/CAR VIEW
        // ==============
        */}
			<TabsContent
				value="CICLCAR"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
			>
				<TableRenderer
					table={ciclcarTable.table}
					setData={ciclcarTable.setData}
					columns={ciclcarColumns}
				/>
			</TabsContent>
			{/*
        // ============
        // *FAR VIEW
        // ============
        */}
			<TabsContent
				value="FAR"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
			>
				<TableRenderer
					table={farTable.table}
					setData={farTable.setData}
					columns={farColumns}
				/>
			</TabsContent>

			{/*
        // ==========
        // *IVAC VIEW
        // ==========
        */}
			<TabsContent value="IVAC" className="flex flex-col px-4 lg:px-6">
				<div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
					IVAC PAGE
				</div>
			</TabsContent>
			{/*
        // ============
        // *FAC VIEW
        // ============
        */}
			<TabsContent value="FAC" className="flex flex-col px-4 lg:px-6">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">
						Family Assistance Card
					</h2>
					{/* INTAKE FAC BUTTON*/}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setOpenIntakeSheet(true)}
					>
						<IconPlus />
						<span className="hidden lg:inline">INTAKE FAC</span>
					</Button>

					<IntakeSheetFAC
						open={openIntakeSheet}
						setOpen={setOpenIntakeSheet}
					/>
				</div>
				<div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
					Family Assistance Card entries will be displayed here
				</div>
			</TabsContent>
		</Tabs>
	);
}
