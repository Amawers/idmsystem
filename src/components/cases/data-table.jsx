/* eslint-disable react-hooks/rules-of-hooks */
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
import { toast } from "sonner";
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

import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Lock, Globe } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import IntakeSheet from "@/pages/case manager/IntakeSheet";
import IntakeSheetCICLCAR from "@/pages/case manager/IntakeSheetCICLCAR";
import IntakeSheetFAR from "@/pages/case manager/IntakeSheetFAR";
import IntakeSheetFAC from "@/pages/case manager/IntakeSheetFAC";
import DragHandle from "@/components/cases/tables/DragHandle";
import useDataTable from "@/hooks/useDataTable";
import TableRenderer from "@/components/cases/tables/TableRenderer";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";

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

//! SAMPLE DATA FOR RENDER ONLY, SOON IMPLEMENT THIS IN AUTH STORE
//! UPON LOGGING IN AND INIT RETRIEVE CASE MANAGERS FROM PROFILES TABLE
const caseManagers = [
	{ id: "case-b83947bb", case_manager: "Elaiza Claire Q. Gamolo" },
	{ id: "case-a92d4c1f", case_manager: "Aaron S. Namoc" },
];

// =================================
//* CASE Table COLUMN DEFINITIONS
// =================================
// Replace previous `const caseColumns = [ ... ]` with the factory below.
const createCaseColumns = (onOpenRow) => [
	{
		id: "drag",
		header: () => null,
		cell: ({ row }) => <DragHandle id={row.original.id} />,
	},
	{
		id: "select",
		header: ({ table }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)
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
			return (
				<>
					<Label
						htmlFor={`${row.original.id}-caseManager`}
						className="sr-only"
					>
						Case Manager
					</Label>
					<Select>
						<SelectTrigger
							className="w-38 bg-white text-black [&_[data-slot=select-value]]:text-black"
							size="sm"
							id={`${row.original.id}-caseManager`}
						>
							<SelectValue
								placeholder={
									row.original.case_manager ?? "None"
								}
							/>
						</SelectTrigger>
						<SelectContent align="end">
							{caseManagers.map((item) => (
								<SelectItem
									key={item.id}
									value={item.case_manager}
								>
									{item.case_manager}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</>
			);
		},
	},
	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const statuses = [
				{
					value: "Filed",
					label: "Filed",
					icon: (
						<IconClipboardText
							className="text-gray-500"
							size={16}
						/>
					),
				},
				{
					value: "Assessed",
					label: "Assessed",
					icon: <IconCheckbox className="text-blue-500" size={16} />,
				},
				{
					value: "In Process",
					label: "In Process",
					icon: (
						<IconLoader
							className="text-orange-500 animate-spin"
							size={16}
						/>
					),
				},
				{
					value: "Resolved",
					label: "Resolved",
					icon: (
						<IconCircleCheckFilled
							className="text-green-500"
							size={16}
						/>
					),
				},
			];

			return (
				<Select defaultValue={row.original.status}>
					<SelectTrigger className="w-[150px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{statuses.map((status) => (
							<SelectItem key={status.value} value={status.value}>
								<div className="flex items-center gap-2">
									{status.icon}
									{status.label}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		},
	},
	//* PRIORITY
	{
		accessorKey: "priority",
		header: "Priority",
		cell: ({ row }) => {
			const priorities = [
				{
					value: "Low",
					label: "Low",
					className: "bg-green-100 text-green-700",
				},
				{
					value: "Medium",
					label: "Medium",
					className: "bg-yellow-100 text-yellow-700",
				},
				{
					value: "High",
					label: "High",
					className: "bg-red-100 text-red-700",
				},
			];

			const [value, setValue] = useState(row.original.priority);
			const current = priorities.find((p) => p.value === value);

			return (
				<Select value={value} onValueChange={setValue}>
					<SelectTrigger
						className={`w-[130px] rounded-md font-medium ${
							current?.className || ""
						}`}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{priorities.map((p) => (
							<SelectItem
								key={p.value}
								value={p.value}
								className={`px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer ${p.className}`}
							>
								{p.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		},
	},
	//* DATE FILED
	{
		accessorKey: "date filed",
		header: "Date Filed",
		cell: ({ row }) => {
			const [date, setDate] = useState(
				row.original.date_filed
					? new Date(row.original.date_filed)
					: null
			);

			return (
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="flex items-center justify-start text-left font-normal"
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{date
								? formatDateTime(date, "yyyy-MM-dd HH:mm:ss")
								: "Pick a date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={date}
							onSelect={(newDate) => setDate(newDate)}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			);
		},
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
			return (
				<>
					<Label
						htmlFor={`${row.original.id}-visibility`}
						className="sr-only"
					>
						Visibility
					</Label>
					<Select
						defaultValue={
							// treat any non "only-me" value as "everyone" for backward compatibility
							row.original.visibility === "only-me"
								? "only-me"
								: "everyone"
						}
					>
						<SelectTrigger
							className="w-38 bg-white text-black [&_[data-slot=select-value]]:text-black"
							size="sm"
							id={`${row.original.id}-visibility`}
						>
							<SelectValue
								className="text-black"
								placeholder={
									row.original.visibility === "only-me"
										? "Only Me"
										: "Everyone"
								}
							/>
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="only-me">
								<div className="flex items-center gap-2">
									<Lock className="h-4 w-4" /> Only Me
								</div>
							</SelectItem>
							<SelectItem value="everyone">
								<div className="flex items-center gap-2">
									<Globe className="h-4 w-4" /> Everyone
								</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</>
			);
		},
	},

	//* LAST UPDATED
	{
		accessorKey: "last updated",
		header: "Last Updated",
		cell: ({ row }) => (
			<div className="w-32">
				{formatDateTime(row.original.last_updated)}
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8 ml-5"
						size="icon"
						onClick={() => onOpenRow(row.original)}
					>
						<IconDotsVertical />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem onClick={() => onOpenRow(row.original)}>
						Edit Record
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* CICLCAR Table COLUMN DEFINITIONS
// =================================
const ciclcarColumns = [
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
		accessorKey: "header",
		header: "Header",
		cell: ({ row }) => {
			// Render header as plain text (no clickable viewer) to maintain consistency
			const headerText = row.original.header ?? row.original.id;
			return <div className="font-medium">{headerText}</div>;
		},
		enableHiding: false,
	},
	{
		accessorKey: "type",
		header: "Section Type",
		cell: ({ row }) => (
			<div className="w-32">
				<Badge
					variant="outline"
					className="text-muted-foreground px-1.5"
				>
					{row.original.type}
				</Badge>
			</div>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => (
			<Badge
				variant="outline"
				className="text-muted-foreground px-1.5 flex items-center gap-1"
			>
				{row.original.status === "Filed" && (
					<IconClipboardText className="text-gray-500" size={16} />
				)}
				{row.original.status === "Assessed" && (
					<IconCheckbox className="text-blue-500" size={16} />
				)}
				{row.original.status === "In Process" && (
					<IconLoader
						className="text-orange-500 animate-spin"
						size={16}
					/>
				)}
				{row.original.status === "Resolved" ? (
					<IconCircleCheckFilled
						className="text-green-500"
						size={16}
					/>
				) : null}

				{row.original.status}
			</Badge>
		),
	},
	{
		accessorKey: "target",
		header: () => <div className="w-full text-right">Target</div>,
		cell: ({ row }) => (
			// Input form for editing target to allow inline updates
			<form
				onSubmit={(e) => {
					e.preventDefault();
					toast.promise(
						new Promise((resolve) => setTimeout(resolve, 1000)),
						{
							loading: `Saving ${row.original.header}`,
							success: "Done",
							error: "Error",
						}
					);
				}}
			>
				<Label
					htmlFor={`${row.original.id}-target`}
					className="sr-only"
				>
					Target
				</Label>
				<Input
					className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
					defaultValue={row.original.target}
					id={`${row.original.id}-target`}
				/>
			</form>
		),
	},
	{
		accessorKey: "limit",
		header: () => <div className="w-full text-right">Limit</div>,
		cell: ({ row }) => (
			// Input form for editing limit to allow inline updates
			<form
				onSubmit={(e) => {
					e.preventDefault();
					toast.promise(
						new Promise((resolve) => setTimeout(resolve, 1000)),
						{
							loading: `Saving ${row.original.header}`,
							success: "Done",
							error: "Error",
						}
					);
				}}
			>
				<Label htmlFor={`${row.original.id}-limit`} className="sr-only">
					Limit
				</Label>
				<Input
					className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
					defaultValue={row.original.limit}
					id={`${row.original.id}-limit`}
				/>
			</form>
		),
	},
	{
		accessorKey: "caseManager",
		header: "Case Manager",
		cell: ({ row }) => {
			// If already assigned → show name
			const isAssigned = row.original.case_manager !== null;

			if (isAssigned) {
				return row.original.case_manager;
			}

			// If not assigned → show dropdown to enable assignment
			return (
				<>
					<Label
						htmlFor={`${row.original.id}-caseManager`}
						className="sr-only"
					>
						Case Manager
					</Label>
					<Select>
						<SelectTrigger
							className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
							size="sm"
							id={`${row.original.id}-caseManager`}
						>
							<SelectValue placeholder="Case Manager" />
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="Eddie Lake">
								Eddie Lake
							</SelectItem>
							<SelectItem value="Jamik Tashpulatov">
								Jamik Tashpulatov
							</SelectItem>
						</SelectContent>
					</Select>
				</>
			);
		},
	},
	{
		id: "actions",
		cell: () => (
			// Row actions dropdown for additional operations
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
					<DropdownMenuItem>Make a copy</DropdownMenuItem>
					<DropdownMenuItem>Favorite</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
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

	// Tracks which tab is currently active (default: "CASE")
	const [activeTab, setActiveTab] = useState("CASE");

	// Handler to open intake sheet prefilled from a CASE row
	function handleOpenCaseIntake(record) {
		// Use store static access (avoid hook usage outside component body)
		const { resetAll, setSectionField } = useIntakeFormStore.getState();
		resetAll();

		// Map basic fields (adjust when real schema available)
		const caseDetails = {
			caseManager: record["case manager"] || record.case_manager || "",
			status: record.status || "",
			priority: record.priority || "",
			visibility:
				record.visibility === "only-me"
					? "only-me"
					: record.visibility || "everyone",
		};
		setSectionField("caseDetails", caseDetails);

		// Seed identifying data if present
		const identifying = {};
		if (record.header) identifying.name = record.header;
		if (record["date filed"]) identifying.intakeDate = record["date filed"]; // original key
		if (record.date_filed) identifying.intakeDate = record.date_filed; // alt snake case
		if (Object.keys(identifying).length) {
			setSectionField("IdentifyingData", identifying);
		}

		// Open modal by updating component state via a custom event.
		// We dispatch a custom event the component listens for (simplifies since this function is outside component scope here after patch placement)
		window.dispatchEvent(new CustomEvent("open-intake-modal"));
	}

	// Initialize CASE table with dynamic columns (handler referenced above)
	const caseTable = useDataTable({
		initialData: caseData,
		columns: createCaseColumns(handleOpenCaseIntake),
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
	// Listen for custom open event to flip state
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

							<IntakeSheet
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
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

							<IntakeSheetCICLCAR
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
