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
	IconRefresh,
} from "@tabler/icons-react";
import { Edit } from "lucide-react";

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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import IntakeSheetCaseCreate from "@/pages/case manager/IntakeSheetCaseCreate";
import IntakeSheetCICLCARCreate from "@/pages/case manager/IntakeSheetCICLCARCreate";
import IntakeSheetCICLCAREdit from "@/pages/case manager/IntakeSheetCICLCAREdit";
import IntakeSheetFAR from "@/pages/case manager/IntakeSheetFAR";
import IntakeSheetFAC from "@/pages/case manager/IntakeSheetFAC";
import IntakeSheetIVAC from "@/pages/case manager/IntakeSheetIVAC";
// ADD THIS IMPORT
import IntakeSheetEdit from "@/pages/case manager/intakeSheetCaseEdit";
import useDataTable from "@/hooks/useDataTable";
import TableRenderer from "@/components/cases/tables/TableRenderer";
import EnrollCaseDialog from "@/components/cases/EnrollCaseDialog";
import ProgramEnrollmentBadge from "@/components/cases/ProgramEnrollmentBadge";

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

const createCaseColumns = (handleEnrollClick, handleEditClick, handleDeleteClick) => [
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
	//* PROGRAMS (ENROLLMENT BADGE)
	{
		accessorKey: "programs",
		header: "Programs",
		cell: ({ row }) => {
			const caseId = row.original["case ID"] ?? row.original.id;
			return (
				<ProgramEnrollmentBadge 
					caseId={caseId} 
					caseType="CASE"
					onEnrollClick={() => handleEnrollClick(row.original, "CASE")}
				/>
			);
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

	//* ACTIONS
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-6 px-2 text-xs"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEditClick(row.original, "CASE");
					}}>Edit</DropdownMenuItem>
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEnrollClick(row.original, "CASE");
					}}>Enroll Program</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={(e) => {
						e.stopPropagation();
						handleDeleteClick(row.original, "CASE");
					}}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* CICLCAR Table COLUMN DEFINITIONS
// =================================
const ciclcarColumns = (handleEnrollClick, handleEditClick, handleDeleteClick) => [
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
	//* PROGRAMS (ENROLLMENT BADGE)
	{
		accessorKey: "programs",
		header: "Programs",
		cell: ({ row }) => {
			const caseId = row.original["case ID"] ?? row.original.id;
			return (
				<ProgramEnrollmentBadge 
					caseId={caseId} 
					caseType="CICLCAR"
					onEnrollClick={() => handleEnrollClick(row.original, "CICLCAR")}
				/>
			);
		},
	},
	//* DATE FILED
	{
		accessorKey: "date filed",
		header: "Date Filed",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.created_at) || "-"}
			</div>
		),
	},
	//* TIME OPEN
	{
		accessorKey: "time open",
		header: "Time Open",
		cell: ({ row }) => {
			const filedDate = row.original.created_at
				? new Date(row.original.created_at)
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
					{formatDateTime(row.original.updated_at)}
				</span>
			</div>
		),
	},

	//* ACTIONS
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-6 px-2 text-xs"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEditClick(row.original, "CICLCAR");
					}}>Edit</DropdownMenuItem>
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEnrollClick(row.original, "CICLCAR");
					}}>Enroll Program</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={(e) => {
						e.stopPropagation();
						handleDeleteClick(row.original, "CICLCAR");
					}}>
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
const farColumns = (handleEnrollClick, handleEditClick, handleDeleteClick) => [
	//* =====================
	//* START OF DATA COLUMNS
	//* =====================
	
	//* CASE ID
	{
		accessorKey: "id",
		header: "Case ID",
		cell: ({ row }) => {
			const caseId = row.original.id || "N/A";
			return <div className="font-medium">{caseId}</div>;
		},
		enableHiding: false,
	},

	//* DATE
	{
		accessorKey: "date",
		header: "Date",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.date) || "-"}
			</div>
		),
	},

	//* RECEIVING MEMBER
	{
		accessorKey: "receiving_member",
		header: "Receiving Member",
		cell: ({ row }) => {
			const member = row.original.receiving_member || "N/A";
			return <div>{member}</div>;
		},
	},

	//* EMERGENCY
	{
		accessorKey: "emergency",
		header: "Emergency",
		cell: ({ row }) => {
			const emergency = row.original.emergency || "N/A";
			return <div>{emergency}</div>;
		},
	},

	//* ASSISTANCE
	{
		accessorKey: "assistance",
		header: "Assistance",
		cell: ({ row }) => {
			const assistance = row.original.assistance || "N/A";
			return <div>{assistance}</div>;
		},
	},

	//* UNIT
	{
		accessorKey: "unit",
		header: "Unit",
		cell: ({ row }) => {
			const unit = row.original.unit || "N/A";
			return <div>{unit}</div>;
		},
	},

	//* QUANTITY
	{
		accessorKey: "quantity",
		header: "Quantity",
		cell: ({ row }) => {
			const quantity = row.original.quantity || "0";
			return <div>{quantity}</div>;
		},
	},

	//* COST
	{
		accessorKey: "cost",
		header: "Cost (₱)",
		cell: ({ row }) => {
			const cost = row.original.cost || "0.00";
			return <div>₱{parseFloat(cost).toFixed(2)}</div>;
		},
	},

	//* PROVIDER
	{
		accessorKey: "provider",
		header: "Provider",
		cell: ({ row }) => {
			const provider = row.original.provider || "N/A";
			return <div>{provider}</div>;
		},
	},

	//* CASE MANAGER
	{
		accessorKey: "case_manager",
		header: "Case Manager",
		cell: ({ row }) => {
			const caseManager = row.original.case_manager || "-";
			return <div>{caseManager}</div>;
		},
	},

	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status || "-";
			return <div>{status}</div>;
		},
	},

	//* PRIORITY
	{
		accessorKey: "priority",
		header: "Priority",
		cell: ({ row }) => {
			const priority = row.original.priority || "-";
			return <div>{priority}</div>;
		},
	},

	//* ACTIONS
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-6 px-2 text-xs"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEditClick(row.original, "FAR");
					}}>Edit</DropdownMenuItem>
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEnrollClick(row.original, "FAR");
					}}>Enroll Program</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={(e) => {
						e.stopPropagation();
						handleDeleteClick(row.original, "FAR");
					}}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* FAC Table COLUMN DEFINITIONS
// =================================
const facColumns = (handleEditClick, handleDeleteClick) => [
	//* =====================
	//* START OF DATA COLUMNS
	//* =====================
	
	//* CASE ID
	{
		accessorKey: "id",
		header: "Case ID",
		cell: ({ row }) => {
			const caseId = row.original.id || "N/A";
			return <div className="font-medium">{caseId}</div>;
		},
		enableHiding: false,
	},

	//* HEAD OF FAMILY NAME
	{
		accessorKey: "head_first_name",
		header: "Head of Family",
		cell: ({ row }) => {
			const firstName = row.original.head_first_name || "";
			const lastName = row.original.head_last_name || "";
			const fullName = `${firstName} ${lastName}`.trim() || "N/A";
			return <div>{fullName}</div>;
		},
	},

	//* BARANGAY
	{
		accessorKey: "location_barangay",
		header: "Barangay",
		cell: ({ row }) => {
			const barangay = row.original.location_barangay || "N/A";
			return <div>{barangay}</div>;
		},
	},

	//* CITY/MUNICIPALITY
	{
		accessorKey: "location_city_municipality",
		header: "City/Municipality",
		cell: ({ row }) => {
			const city = row.original.location_city_municipality || "N/A";
			return <div>{city}</div>;
		},
	},

	//* EVACUATION CENTER
	{
		accessorKey: "location_evacuation_center",
		header: "Evacuation Center",
		cell: ({ row }) => {
			const center = row.original.location_evacuation_center || "N/A";
			return <div>{center}</div>;
		},
	},

	//* FAMILY MEMBERS COUNT
	{
		accessorKey: "family_member_count",
		header: "Family Members",
		cell: ({ row }) => {
			const count = row.original.family_member_count || 0;
			return <div className="text-center">{count}</div>;
		},
	},

	//* DATE REGISTERED
	{
		accessorKey: "date_registered",
		header: "Date Registered",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.date_registered) || "-"}
			</div>
		),
	},

	//* HOUSE OWNERSHIP
	{
		accessorKey: "house_ownership",
		header: "House Ownership",
		cell: ({ row }) => {
			const ownership = row.original.house_ownership || "-";
			return <div className="capitalize">{ownership}</div>;
		},
	},

	//* SHELTER DAMAGE
	{
		accessorKey: "shelter_damage",
		header: "Shelter Damage",
		cell: ({ row }) => {
			const damage = row.original.shelter_damage || "-";
			const displayText = damage.replace(/-/g, " ");
			return <div className="capitalize">{displayText}</div>;
		},
	},

	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status || "-";
			return <div className="capitalize">{status}</div>;
		},
	},

	//* ACTIONS
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-6 px-2 text-xs"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEditClick(row.original, "FAC");
					}}>Edit</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={(e) => {
						e.stopPropagation();
						handleDeleteClick(row.original, "FAC");
					}}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* IVAC Table COLUMN DEFINITIONS
// =================================
const ivacColumns = (handleEditClick, handleDeleteClick) => [
	//* =====================
	//* START OF DATA COLUMNS
	//* =====================
	
	//* CASE ID
	{
		accessorKey: "id",
		header: "Case ID",
		cell: ({ row }) => {
			const caseId = row.original.id || "N/A";
			return <div className="font-medium">{caseId}</div>;
		},
		enableHiding: false,
	},

	//* PROVINCE
	{
		accessorKey: "province",
		header: "Province",
		cell: ({ row }) => {
			const province = row.original.province || "N/A";
			return <div>{province}</div>;
		},
	},

	//* MUNICIPALITY
	{
		accessorKey: "municipality",
		header: "Municipality",
		cell: ({ row }) => {
			const municipality = row.original.municipality || "N/A";
			return <div>{municipality}</div>;
		},
	},

	//* TOTAL VAC VICTIMS (calculated from records)
	{
		accessorKey: "total_vac_victims",
		header: "Total VAC Victims",
		cell: ({ row }) => {
			const records = row.original.records || [];
			const total = records.reduce((sum, record) => 
				sum + parseInt(record.vacVictims || 0, 10), 0
			);
			return <div className="text-center font-semibold">{total}</div>;
		},
	},

	//* CASE MANAGER
	{
		accessorKey: "case_manager",
		header: "Case Manager",
		cell: ({ row }) => {
			const caseManagers = row.original.case_managers;
			if (!caseManagers || caseManagers.length === 0) {
				return <div>N/A</div>;
			}
			if (caseManagers.length === 1) {
				return <div>{caseManagers[0]}</div>;
			}
			return (
				<div className="flex flex-wrap gap-1">
					{caseManagers.map((manager, index) => (
						<Badge key={index} variant="secondary" className="text-xs">
							{manager}
						</Badge>
					))}
				</div>
			);
		},
	},

	//* STATUS
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status || "N/A";
			return (
				<Badge variant="outline" className="capitalize">
					{status}
				</Badge>
			);
		},
	},

	//* CREATED AT
	{
		accessorKey: "created_at",
		header: "Created",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.created_at) || "-"}
			</div>
		),
	},

	//* UPDATED AT
	{
		accessorKey: "updated_at",
		header: "Last Updated",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.updated_at) || "-"}
			</div>
		),
	},

	//* ACTIONS
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-6 px-2 text-xs"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={(e) => {
						e.stopPropagation();
						handleEditClick(row.original, "IVAC");
					}}>Edit</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={(e) => {
						e.stopPropagation();
						handleDeleteClick(row.original, "IVAC");
					}}>
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
 * @param {Function} props.reloadCases - Function to reload case data
 * @param {Function} props.reloadCiclcar - Function to reload CICLCAR data
 * @param {Function} props.reloadFar - Function to reload FAR data
 *
 * @returns {JSX.Element} Rendered DataTable component
 *
 * @example
 * <DataTable 
 *   caseData={cases} 
 *   ciclcarData={ciclcar} 
 *   farData={far}
 *   reloadCases={reloadCases}
 *   reloadCiclcar={reloadCiclcar}
 *   reloadFar={reloadFar}
 * />
 */
export function DataTable({ 
	caseData, 
	ciclcarData, 
	farData,
	facData,
	ivacData,
	reloadCases,
	reloadCiclcar,
	reloadFar,
	reloadFac,
	reloadIvac,
	deleteCase,
	deleteCiclcarCase,
	deleteFarCase,
	deleteFacCase,
	deleteIvacCase,
}) {
	// State to control Intake Sheet modal visibility (open/close)
	const [openIntakeSheet, setOpenIntakeSheet] = useState(false);

	// Delete confirmation dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [caseToDelete, setCaseToDelete] = useState(null);
	const [caseTypeToDelete, setCaseTypeToDelete] = useState(null);

	// ADD: edit modal state
	const [openEditSheet, setOpenEditSheet] = useState(false);
	const [editingRecord, setEditingRecord] = useState(null);

	// CICL/CAR edit state
	const [openCiclcarEditSheet, setOpenCiclcarEditSheet] = useState(false);
	const [editingCiclcarRecord, setEditingCiclcarRecord] = useState(null);

	// Enrollment dialog state
	const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
	const [enrollingCase, setEnrollingCase] = useState(null);
	const [enrollingCaseType, setEnrollingCaseType] = useState("");

	// Refresh state
	const [isRefreshing, setIsRefreshing] = useState(false);

	// FAR edit state
	const [openFarEditSheet, setOpenFarEditSheet] = useState(false);
	const [editingFarRecord, setEditingFarRecord] = useState(null);

	// FAC edit state
	const [openFacEditSheet, setOpenFacEditSheet] = useState(false);
	const [editingFacRecord, setEditingFacRecord] = useState(null);

	// IVAC edit state
	const [openIvacEditSheet, setOpenIvacEditSheet] = useState(false);
	const [editingIvacRecord, setEditingIvacRecord] = useState(null);

	// Tracks which tab is currently active (default: "CASE")
	const [activeTab, setActiveTab] = useState("CASE");

	// Handle Case row click for editing
	function handleEditCaseRow(record) {
		console.log("Editing Case record:", record);
		setEditingRecord(record);
		setOpenEditSheet(true);
	}

	//  // ADD: when user clicks Edit, open IntakeSheetEdit modal instead of IntakeSheetCaseCreate
	// function handleEditRow(record) {
	// 	console.log("Editing record:", record);
	// 	setEditingRecord(record);
	// 	setOpenEditSheet(true);
	// }

	// Handle CICL/CAR row click for editing
	function handleEditCiclcarRow(record) {
		console.log("Editing CICL/CAR record:", record);
		setEditingCiclcarRecord(record);
		setOpenCiclcarEditSheet(true);
	}

	// Handle FAR row click for editing
	function handleEditFarRow(record) {
		console.log("Editing FAR record:", record);
		setEditingFarRecord(record);
		setOpenFarEditSheet(true);
	}

	// Handle FAC row click for editing
	function handleEditFacRow(record) {
		console.log("Editing FAC record:", record);
		setEditingFacRecord(record);
		setOpenFacEditSheet(true);
	}

	// Handle IVAC row click for editing
	function handleEditIvacRow(record) {
		console.log("Editing IVAC record:", record);
		setEditingIvacRecord(record);
		setOpenIvacEditSheet(true);
	}

	// Handle delete click - opens confirmation dialog
	function handleDeleteClick(caseData, caseType) {
		console.log("Delete requested for:", caseData, "Type:", caseType);
		setCaseToDelete(caseData);
		setCaseTypeToDelete(caseType);
		setDeleteDialogOpen(true);
	}

	// Handle confirmed deletion
	async function handleConfirmDelete() {
		if (!caseToDelete || !caseTypeToDelete) return;

		let result;
		const caseId = caseToDelete.id;

		try {
			// Call the appropriate delete function based on case type
			switch (caseTypeToDelete) {
				case "CASE":
					result = await deleteCase(caseId);
					break;
				case "CICLCAR":
					result = await deleteCiclcarCase(caseId);
					break;
				case "FAR":
					result = await deleteFarCase(caseId);
					break;
				case "FAC":
					result = await deleteFacCase(caseId);
					break;
				case "IVAC":
					result = await deleteIvacCase(caseId);
					break;
				default:
					toast.error("Unknown case type");
					return;
			}

			if (result.success) {
				toast.success("Case Deleted", {
					description: `Successfully deleted ${caseTypeToDelete} case.`,
				});
			} else {
				toast.error("Delete Failed", {
					description: result.error?.message || "Failed to delete case. Please try again.",
				});
			}
		} catch (error) {
			console.error("Error deleting case:", error);
			toast.error("Delete Failed", {
				description: "An unexpected error occurred.",
			});
		} finally {
			setDeleteDialogOpen(false);
			setCaseToDelete(null);
			setCaseTypeToDelete(null);
		}
	}

	// Handle enrollment click
	function handleEnrollClick(caseData, caseType) {
		console.log("Enrolling case:", caseData, "Type:", caseType);
		setEnrollingCase(caseData);
		setEnrollingCaseType(caseType);
		setOpenEnrollDialog(true);
	}

	// Handle refresh - reload data for active tab or all tabs
	async function handleRefresh() {
		setIsRefreshing(true);
		try {
			const promises = [];
			
			// Refresh based on active tab for efficiency, or all if needed
			switch (activeTab) {
				case "CASE":
					promises.push(reloadCases());
					break;
				case "CICLCAR":
					promises.push(reloadCiclcar());
					break;
				case "FAR":
					promises.push(reloadFar());
					break;
				case "FAC":
					promises.push(reloadFac());
					break;
				case "IVAC":
					promises.push(reloadIvac());
					break;
				default:
					// Optionally refresh all tabs
					promises.push(
						reloadCases(),
						reloadCiclcar(),
						reloadFar(),
						reloadFac(),
						reloadIvac()
					);
			}

			await Promise.all(promises);
			
			toast.success("Refreshed", {
				description: `${activeTab} data has been refreshed successfully.`,
			});
		} catch (error) {
			console.error("Error refreshing data:", error);
			toast.error("Refresh Failed", {
				description: "Failed to refresh data. Please try again.",
			});
		} finally {
			setIsRefreshing(false);
		}
	}

	// Initialize CASE table with dynamic columns (handler referenced above)
	const caseTable = useDataTable({
		initialData: caseData,
		// CHANGED: pass edit handler so actions column calls this for “Edit”
		columns: createCaseColumns(handleEnrollClick, handleEditCaseRow, handleDeleteClick),
	});

	// Table instance for CICLCAR tab with its own data and column definitions
	const ciclcarTable = useDataTable({
		initialData: ciclcarData,
		columns: ciclcarColumns(handleEnrollClick, handleEditCiclcarRow, handleDeleteClick),
		onRowClick: handleEditCiclcarRow, // Add click handler for CICL/CAR rows
	});

	// Table instance for FAR tab with its own data and column definitions
	const farTable = useDataTable({
		initialData: farData,
		columns: farColumns(handleEnrollClick, handleEditFarRow, handleDeleteClick),
		onRowClick: handleEditFarRow, // Add click handler for FAR rows
	});

	// Table instance for FAC tab with its own data and column definitions
	const facTable = useDataTable({
		initialData: facData,
		columns: facColumns(handleEditFacRow, handleDeleteClick),
		onRowClick: handleEditFacRow, // Add click handler for FAC rows
	});

	// Table instance for IVAC tab with its own data and column definitions
	const ivacTable = useDataTable({
		initialData: ivacData,
		columns: ivacColumns(handleEditIvacRow, handleDeleteClick),
		onRowClick: handleEditIvacRow, // Add click handler for IVAC rows
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

	// ============================
	//* KEYBOARD SHORTCUT FOR REFRESH
	// ============================
	React.useEffect(() => {
		function handleKeyPress(e) {
			// Ctrl+R or Cmd+R for refresh
			if ((e.ctrlKey || e.metaKey) && e.key === "r") {
				e.preventDefault();
				handleRefresh();
			}
		}
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [activeTab, isRefreshing]); // Dependencies to ensure fresh closure

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
						<SelectItem value="IVAC">Incidence on VAC</SelectItem>
						<SelectItem value="FAR">
							Family Assistance Record
						</SelectItem>
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
						<TabsTrigger value="IVAC">Incidence on VAC</TabsTrigger>
						<TabsTrigger value="FAR">
							Family Assistance Record
						</TabsTrigger>
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
							{/* Refresh Button */}
							<Button 
								variant="outline" 
								size="sm"
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="cursor-pointer"
							>
								<IconRefresh className={isRefreshing ? "animate-spin" : ""} />
								<span className="hidden lg:inline">
									{isRefreshing ? "REFRESHING..." : "REFRESH"}
								</span>
							</Button>

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
								onSuccess={reloadCases}
							/>

							{/* ADD: INTAKE SHEET EDIT (Edit) */}
							<IntakeSheetEdit
								open={openEditSheet}
								onOpenChange={setOpenEditSheet}
								row={editingRecord}
								onSuccess={reloadCases}
							/>
						</>
					)}

					{/* CICLCAR SECTION */}
					{activeTab === "CICLCAR" && (
						<>
							{/* Refresh Button */}
							<Button 
								variant="outline" 
								size="sm"
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="cursor-pointer"
							>
								<IconRefresh className={isRefreshing ? "animate-spin" : ""} />
								<span className="hidden lg:inline">
									{isRefreshing ? "REFRESHING..." : "REFRESH"}
								</span>
							</Button>

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
								onSuccess={reloadCiclcar}
							/>

							{/* CICL/CAR Edit Modal */}
							<IntakeSheetCICLCAREdit
								open={openCiclcarEditSheet}
								setOpen={setOpenCiclcarEditSheet}
								row={editingCiclcarRecord}
								onSuccess={reloadCiclcar}
							/>
						</>
					)}

					{/* FAR SECTION */}
					{activeTab === "FAR" && (
						<>
							{/* Refresh Button */}
							<Button 
								variant="outline" 
								size="sm"
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="cursor-pointer"
							>
								<IconRefresh className={isRefreshing ? "animate-spin" : ""} />
								<span className="hidden lg:inline">
									{isRefreshing ? "REFRESHING..." : "REFRESH"}
								</span>
							</Button>

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
								onSuccess={reloadFar}
							/>

							{/* FAR Edit Modal */}
							<IntakeSheetFAR
								open={openFarEditSheet}
								setOpen={setOpenFarEditSheet}
								onSuccess={reloadFar}
								editingRecord={editingFarRecord}
							/>
						</>
					)}

					{/* FAC SECTION */}
					{activeTab === "FAC" && (
						<>
							{/* Refresh Button */}
							<Button 
								variant="outline" 
								size="sm"
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="cursor-pointer"
							>
								<IconRefresh className={isRefreshing ? "animate-spin" : ""} />
								<span className="hidden lg:inline">
									{isRefreshing ? "REFRESHING..." : "REFRESH"}
								</span>
							</Button>

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
									{facTable.table
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

							{/* INTAKE FAC BUTTON */}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setOpenIntakeSheet(true)}
							>
								<IconPlus />
								<span className="hidden lg:inline">
									INTAKE FAC
								</span>
							</Button>

							{/* FAC Create Modal */}
							<IntakeSheetFAC
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
								onSuccess={reloadFac}
							/>

							{/* FAC Edit Modal */}
							<IntakeSheetFAC
								open={openFacEditSheet}
								setOpen={setOpenFacEditSheet}
								editingRecord={editingFacRecord}
								onSuccess={reloadFac}
							/>
						</>
					)}

					{/* IVAC SECTION */}
					{activeTab === "IVAC" && (
						<>
							{/* Refresh Button */}
							<Button 
								variant="outline" 
								size="sm"
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="cursor-pointer"
							>
								<IconRefresh className={isRefreshing ? "animate-spin" : ""} />
								<span className="hidden lg:inline">
									{isRefreshing ? "REFRESHING..." : "REFRESH"}
								</span>
							</Button>

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
									{ivacTable.table
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

							{/* INTAKE IVAC BUTTON */}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setOpenIntakeSheet(true)}
							>
								<IconPlus />
								<span className="hidden lg:inline">
									INTAKE IVAC
								</span>
							</Button>

							{/* IVAC Create Modal */}
							<IntakeSheetIVAC
								open={openIntakeSheet}
								setOpen={setOpenIntakeSheet}
								onSuccess={reloadIvac}
							/>

							{/* IVAC Edit Modal */}
							<IntakeSheetIVAC
								open={openIvacEditSheet}
								setOpen={setOpenIvacEditSheet}
								editingRecord={editingIvacRecord}
								onSuccess={reloadIvac}
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
					columns={ciclcarColumns(handleEnrollClick, handleEditCiclcarRow)}
					onRowClick={handleEditCiclcarRow}
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
					columns={farColumns(handleEnrollClick, handleEditFarRow, handleDeleteClick)}
					onRowClick={handleEditFarRow}
				/>
			</TabsContent>

			{/*
        // ==========
        // *IVAC VIEW
        // ==========
        */}
			<TabsContent
				value="IVAC"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
			>
				<TableRenderer
					table={ivacTable.table}
					setData={ivacTable.setData}
					columns={ivacColumns(handleEditIvacRow, handleDeleteClick)}
					onRowClick={handleEditIvacRow}
				/>
			</TabsContent>
			{/*
        // ============
        // *FAC VIEW
        // ============
        */}
			<TabsContent
				value="FAC"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
		>
			<TableRenderer
				table={facTable.table}
				setData={facTable.setData}
				columns={facColumns(handleEditFacRow, handleDeleteClick)}
				onRowClick={handleEditFacRow}
			/>
		</TabsContent>			{/* Enrollment Dialog */}
			<EnrollCaseDialog
				open={openEnrollDialog}
				onOpenChange={setOpenEnrollDialog}
				caseData={enrollingCase}
				caseType={enrollingCaseType}
				onSuccess={() => {
					// Optionally reload data here
					console.log("Enrollment successful");
				}}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete this{" "}
							{caseTypeToDelete} case from the database.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Tabs>
	);
}
