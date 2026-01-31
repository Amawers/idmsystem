//! ===========================================
//! TO BE MODIFIED, SAMPLE DATA ONLY FOR RENDER
//! ===========================================

// =============================================
// DataTable Component
// ---------------------------------------------
// Purpose: Renders a tabbed data table for cases, CICL/CAR, FAR, FAC, IVAC, and Single Parents with drag-and-drop, selection, and intake sheet modals.
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
	IconAlertTriangle,
	IconClipboardText,
	IconCheckbox,
	IconDotsVertical,
	IconLayoutColumns,
	IconCloudUpload,
	IconLoader,
	IconPlus,
	IconRefresh,
} from "@tabler/icons-react";
import { Edit, ChevronLeft, ChevronRight, WifiOff, Search } from "lucide-react";

// Other utilities
// import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

// Permission Guard
import { PermissionGuard } from "@/components/PermissionGuard";

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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import IntakeSheetSP from "@/pages/case manager/IntakeSheetSP";
// ADD THIS IMPORT
import IntakeSheetEdit from "@/pages/case manager/intakeSheetCaseEdit";
import useDataTable from "@/hooks/useDataTable";
import TableRenderer from "@/components/cases/tables/TableRenderer";
import EnrollCaseDialog from "@/components/cases/EnrollCaseDialog";
import ProgramEnrollmentBadge from "@/components/cases/ProgramEnrollmentBadge";
import { useCaseManagers } from "@/store/useCaseManagerStore";
import DocumentManager from "@/components/documents/DocumentManager";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

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

const createCaseColumns = (
	handleEnrollClick,
	handleEditClick,
	handleDeleteClick,
	handleDocumentsClick,
) => [
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "CASE");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "CASE");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							handleEnrollClick(row.original, "CASE");
						}}
					>
						Enroll Program
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								console.log(
									"[CASE DELETE] Dropdown item clicked, event:",
									e,
								);
								console.log(
									"[CASE DELETE] Row data:",
									row.original,
								);
								e.stopPropagation();
								handleDeleteClick(row.original, "CASE");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* CICLCAR Table COLUMN DEFINITIONS
// =================================
const ciclcarColumns = (
	handleEnrollClick,
	handleEditClick,
	handleDeleteClick,
	getPrefetchedEnrollments,
	handleDocumentsClick,
) => [
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "CICLCAR");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "CICLCAR");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							handleEnrollClick(row.original, "CICLCAR");
						}}
					>
						Enroll Program
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "CICLCAR");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* FAR Table COLUMN DEFINITIONS
// =================================
const farColumns = (
	handleEnrollClick,
	handleEditClick,
	handleDeleteClick,
	handleDocumentsClick,
) => [
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "FAR");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "FAR");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							handleEnrollClick(row.original, "FAR");
						}}
					>
						Enroll Program
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "FAR");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* FAC Table COLUMN DEFINITIONS
// =================================
const facColumns = (
	handleEditClick,
	handleDeleteClick,
	handleDocumentsClick,
) => [
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "FAC");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "FAC");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "FAC");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* IVAC Table COLUMN DEFINITIONS
// =================================
const ivacColumns = (
	handleEditClick,
	handleDeleteClick,
	handleDocumentsClick,
) => [
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
			const total = records.reduce(
				(sum, record) => sum + parseInt(record.vacVictims || 0, 10),
				0,
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
						<Badge
							key={index}
							variant="secondary"
							className="text-xs"
						>
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "IVAC");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "IVAC");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "IVAC");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

// =================================
//* SINGLE PARENTS Table COLUMN DEFINITIONS
// =================================
const spColumns = (handleDeleteClick, handleDocumentsClick) => [
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

	//* FULL NAME
	{
		accessorKey: "full_name",
		header: "Full Name",
		cell: ({ row }) => {
			const firstName =
				row.original.first_name || row.original.firstName || "";
			const lastName =
				row.original.last_name || row.original.lastName || "";
			const fallback =
				row.original.full_name ||
				row.original.client_name ||
				row.original.respondent_name ||
				row.original.parent_name ||
				"N/A";
			const fullName = `${firstName} ${lastName}`.trim() || fallback;
			return <div>{fullName}</div>;
		},
	},

	//* CONTACT NUMBER
	{
		accessorKey: "contact_number",
		header: "Contact Number",
		cell: ({ row }) => {
			const contact =
				row.original.contact_number ||
				row.original.contactNumber ||
				row.original.phone ||
				row.original.mobile ||
				"-";
			return <div>{contact}</div>;
		},
	},

	//* EMAIL
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row }) => {
			const email =
				row.original.email || row.original.email_address || "-";
			return <div>{email}</div>;
		},
	},

	//* ADDRESS
	{
		accessorKey: "address",
		header: "Address",
		cell: ({ row }) => {
			const address =
				row.original.address || row.original.location_address || "-";
			return <div>{address}</div>;
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
				{formatToMMDDYYYY(
					row.original.created_at || row.original.date_created,
				) || "-"}
			</div>
		),
	},

	//* UPDATED AT
	{
		accessorKey: "updated_at",
		header: "Last Updated",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(
					row.original.updated_at || row.original.last_updated,
				) || "-"}
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "SP");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "SP");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];
//!!!!!!!!!!!!!!!!!!!
// ! NEW ADDED TYPES	==========================================================================================================================================================================
//!!!!!!!!!!!!!!!!!!!

// =================================
//* FA Table COLUMN DEFINITIONS
// =================================
const faColumns = (
	handleEnrollClick,
	handleEditClick,
	handleDeleteClick,
	handleDocumentsClick,
) => [
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

	//* DATE OF INTERVIEW
	{
		accessorKey: "interview_date",
		header: "Interview Date",
		cell: ({ row }) => (
			<div className="px-2">
				{formatToMMDDYYYY(row.original.interview_date) || "-"}
			</div>
		),
	},

	//* DATE RECORDED
	{
		accessorKey: "date_recorded",
		header: "Date Recorded",
		cell: ({ row }) => {
			const dateRecorded = row.original.date_recorded || "N/A";
			return <div>{dateRecorded}</div>;
		},
	},

	//* CLIENT NAME
	{
		accessorKey: "client_name",
		header: "Client Name",
		cell: ({ row }) => {
			const clientName = row.original.client_name || "N/A";
			return <div>{clientName}</div>;
		},
	},

	//* ADDRESS
	{
		accessorKey: "address",
		header: "Address",
		cell: ({ row }) => {
			const address = row.original.address || "N/A";
			return <div>{address}</div>;
		},
	},

	//* PURPOSE
	{
		accessorKey: "purpose",
		header: "Purpose",
		cell: ({ row }) => {
			const purpose = row.original.purpose || "N/A";
			return <div>{purpose}</div>;
		},
	},

	//* NAME OF BENIFICIARY
	{
		accessorKey: "benificiary_name",
		header: "Name of Beneficiary",
		cell: ({ row }) => {
			const benificiaryName = row.original.benificiary_name || "N/A";
			return <div>{benificiaryName}</div>;
		},
	},

	//* CONTACT NUMBER
	{
		accessorKey: "contact_number",
		header: "Contact Number",
		cell: ({ row }) => {
			const contactNumber = row.original.contact_number || "N/A";
			return <div>{contactNumber}</div>;
		},
	},

	//* SOCIAL CASE STUDY REPORT PREPARED BY
	{
		accessorKey: "prepared_by",
		header: "Social Case Study Report Prepared By",
		cell: ({ row }) => {
			const preparedBy = row.original.prepared_by || "N/A";
			return <div>{preparedBy}</div>;
		},
	},

	//* SOCIAL CASE STUDY REPORT STATUS
	{
		accessorKey: "status_report",
		header: "Social Case Study Report Status",
		cell: ({ row }) => {
			const statusReport = row.original.status_report || "-";
			return <div>{statusReport}</div>;
		},
	},

	//* CLIENT CATEGORY
	{
		accessorKey: "client_category",
		header: "Client Category",
		cell: ({ row }) => {
			const clientCategory = row.original.client_category || "-";
			return <div>{clientCategory}</div>;
		},
	},

	//* GENDER
	{
		accessorKey: "gender",
		header: "Gender",
		cell: ({ row }) => {
			const gender = row.original.gender || "-";
			return <div>{gender}</div>;
		},
	},

	//* 4P's Member
	{
		accessorKey: "four_ps_member",
		header: "4P's Member",
		cell: ({ row }) => {
			const fourPsMember = row.original.four_ps_member || "-";
			return <div>{fourPsMember}</div>;
		},
	},

	//* TRANSACTION
	{
		accessorKey: "transaction",
		header: "Transaction",
		cell: ({ row }) => {
			const transaction = row.original.transaction || "-";
			return <div>{transaction}</div>;
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
						className="h-6 px-2 text-xs cursor-pointer"
					>
						<Edit className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<PermissionGuard permission="edit_case">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleEditClick(row.original, "FAR");
							}}
						>
							Edit
						</DropdownMenuItem>
					</PermissionGuard>
					<PermissionGuard permission="view_documents">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleDocumentsClick(row.original, "FAR");
							}}
						>
							Documents
						</DropdownMenuItem>
					</PermissionGuard>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							handleEnrollClick(row.original, "FAR");
						}}
					>
						Enroll Program
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<PermissionGuard permission="delete_case">
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation();
								handleDeleteClick(row.original, "FAR");
							}}
						>
							Delete
						</DropdownMenuItem>
					</PermissionGuard>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
];

//! =======================================================================================================================================================================================================================

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

function normalizeSearchText(value) {
	return String(value ?? "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

function buildRowSearchText(row, maxDepth = 2) {
	const seen = new Set();

	function walk(value, depth) {
		if (value == null) return [];
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			return [String(value)];
		}
		if (depth <= 0) return [];
		if (Array.isArray(value)) {
			return value.flatMap((item) => walk(item, depth - 1));
		}
		if (typeof value === "object") {
			if (seen.has(value)) return [];
			seen.add(value);
			return Object.values(value).flatMap((item) =>
				walk(item, depth - 1),
			);
		}
		return [];
	}

	if (!row || typeof row !== "object") return "";

	const preferred = [
		row.id,
		row["case ID"],
		row.case_id,
		row.case_number,
		row.case_no,
		row.case_manager,
		row.case_managers,
		row.status,
		row.priority,
		row.barangay,
		row.municipality,
		row.city,
		row.province,
		row.region,
		row.beneficiary_name,
		row.client_name,
		row.child_name,
		row.victim_name,
		row.respondent_name,
		row.guardian_name,
		row.parent_name,
		row.full_name,
		row.first_name,
		row.last_name,
		row.contact_number,
		row.contactNumber,
		row.email,
		row.email_address,
		row.address,
	];

	const fallback = walk(row, maxDepth);
	return normalizeSearchText(
		[...preferred, ...fallback].filter(Boolean).join(" "),
	);
}

function getRowDateFiled(row) {
	if (!row || typeof row !== "object") return null;
	const candidate =
		row.date_filed ??
		row.filed_date ??
		row.intake_date ??
		row.created_at ??
		row.createdAt ??
		row.dateCreated;
	if (!candidate) return null;
	const parsed = new Date(candidate);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filterRowsByGlobalSearch(rows, searchQuery, advancedFilters) {
	const safeRows = Array.isArray(rows) ? rows : [];
	const query = normalizeSearchText(searchQuery);
	const statusFilter = advancedFilters?.status ?? "all";
	const priorityFilter = advancedFilters?.priority ?? "all";
	const dateFrom = advancedFilters?.dateFrom
		? new Date(`${advancedFilters.dateFrom}T00:00:00`)
		: null;
	const dateTo = advancedFilters?.dateTo
		? new Date(`${advancedFilters.dateTo}T23:59:59`)
		: null;
	const hasFrom = dateFrom && !Number.isNaN(dateFrom.getTime());
	const hasTo = dateTo && !Number.isNaN(dateTo.getTime());

	const normalizedStatus = normalizeSearchText(statusFilter);
	const normalizedPriority = normalizeSearchText(priorityFilter);

	return safeRows.filter((row) => {
		if (query) {
			const text = buildRowSearchText(row);
			if (!text.includes(query)) return false;
		}

		if (statusFilter !== "all") {
			const rowStatus = normalizeSearchText(row?.status);
			if (!rowStatus || rowStatus !== normalizedStatus) return false;
		}

		if (priorityFilter !== "all") {
			const rowPriority = normalizeSearchText(row?.priority);
			if (!rowPriority || rowPriority !== normalizedPriority)
				return false;
		}

		if (hasFrom || hasTo) {
			const filed = getRowDateFiled(row);
			if (!filed) return false;
			if (hasFrom && filed < dateFrom) return false;
			if (hasTo && filed > dateTo) return false;
		}

		return true;
	});
}

// ==========================
//* Main DataTable wrapper
// ==========================

/**
 * PaginationControls
 *
 * @description Reusable pagination component for table navigation
 *
 * @param {Object} props - Component props
 * @param {Object} props.table - TanStack Table instance
 *
 * @returns {JSX.Element} Rendered pagination controls
 */
function PaginationControls({ table }) {
	const currentPage = table.getState().pagination.pageIndex + 1;
	const totalPages = table.getPageCount();
	const pageSize = table.getState().pagination.pageSize;

	return (
		<div className="flex items-center justify-between mt-4 pt-4 border-t">
			<div className="flex items-center gap-4">
				<div className="text-sm text-muted-foreground">
					Page {currentPage} of {totalPages || 1}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Rows per page:
					</span>
					<Select
						value={String(pageSize)}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="w-[70px] h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="5">5</SelectItem>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="15">15</SelectItem>
							<SelectItem value="25">25</SelectItem>
							<SelectItem value="50">50</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

/**
 * DataTable
 *
 * @description Main component for displaying tabbed data tables with intake functionality.
 *
 * @param {Object} props - Component props
 * @param {Array} props.caseData - Data for CASE tab
 * @param {Array} props.ciclcarData - Data for CICLCAR tab
 * @param {Array} props.farData - Data for FAR tab
 * @param {Array} props.spData - Data for Single Parents tab
 * @param {Function} props.reloadCases - Function to reload case data
 * @param {Function} props.reloadCiclcar - Function to reload CICLCAR data
 * @param {Function} props.reloadFar - Function to reload FAR data
 * @param {Function} props.reloadSp - Function to reload Single Parents data
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
	spData,
	reloadCases,
	reloadCiclcar,
	reloadFar,
	reloadFac,
	reloadIvac,
	reloadSp,
	deleteCase,
	deleteCiclcarCase,
	deleteFarCase,
	deleteFacCase,
	deleteIvacCase,
	deleteSpCase,
	initialTab = "CASE",
	onTabChange,
	caseSync,
	ciclcarSync,
	facSync,
	farSync,
	ivacSync,
	spSync,
	ciclcarProgramEnrollments = {},
	ciclcarProgramEnrollmentsLoading = false,
	isOnline = true,
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

	// Documents dialog state
	const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
	const [documentsContext, setDocumentsContext] = useState({
		relatedType: "case",
		relatedId: null,
		caseType: "",
	});

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

	// Tracks which tab is currently active
	const [activeTab, setActiveTab] = useState(initialTab);

	// Global search + advanced filters across all tabs
	const [searchQuery, setSearchQuery] = useState("");
	const [advancedFilters, setAdvancedFilters] = useState({
		status: "all",
		priority: "all",
		dateFrom: "",
		dateTo: "",
	});

	const handleTabValueChange = (value) => {
		setActiveTab(value);
		onTabChange?.(value);
	};

	React.useEffect(() => {
		setActiveTab(initialTab);
	}, [initialTab]);

	// Case manager filter state for each tab
	const [caseCaseManager, setCaseCaseManager] = useState("all");
	const [ciclcarCaseManager, setCiclcarCaseManager] = useState("all");
	const [farCaseManager, setFarCaseManager] = useState("all");
	const [facCaseManager, setFacCaseManager] = useState("all");
	const [ivacCaseManager, setIvacCaseManager] = useState("all");
	const [spCaseManager, setSpCaseManager] = useState("all");

	const safeCaseData = React.useMemo(() => caseData ?? [], [caseData]);
	const safeCiclcarData = React.useMemo(
		() => ciclcarData ?? [],
		[ciclcarData],
	);
	const safeFarData = React.useMemo(() => farData ?? [], [farData]);
	const safeFacData = React.useMemo(() => facData ?? [], [facData]);
	const safeIvacData = React.useMemo(() => ivacData ?? [], [ivacData]);
	const safeSpData = React.useMemo(() => spData ?? [], [spData]);

	const allRows = React.useMemo(
		() => [
			...safeCaseData,
			...safeCiclcarData,
			...safeFarData,
			...safeFacData,
			...safeIvacData,
			...safeSpData,
		],
		[
			safeCaseData,
			safeCiclcarData,
			safeFarData,
			safeFacData,
			safeIvacData,
			safeSpData,
		],
	);

	const statusOptions = React.useMemo(() => {
		const set = new Set(
			allRows
				.map((row) => row?.status)
				.filter(
					(value) =>
						typeof value === "string" && value.trim().length > 0,
				),
		);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [allRows]);

	const priorityOptions = React.useMemo(() => {
		const set = new Set(
			allRows
				.map((row) => row?.priority)
				.filter(
					(value) =>
						typeof value === "string" && value.trim().length > 0,
				),
		);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [allRows]);

	const hasActiveGlobalFilters =
		searchQuery.trim().length > 0 ||
		advancedFilters.status !== "all" ||
		advancedFilters.priority !== "all" ||
		advancedFilters.dateFrom !== "" ||
		advancedFilters.dateTo !== "";

	const activeGlobalFilterCount =
		(searchQuery.trim().length > 0 ? 1 : 0) +
		(advancedFilters.status !== "all" ? 1 : 0) +
		(advancedFilters.priority !== "all" ? 1 : 0) +
		(advancedFilters.dateFrom !== "" ? 1 : 0) +
		(advancedFilters.dateTo !== "" ? 1 : 0);

	const clearGlobalFilters = React.useCallback(() => {
		setSearchQuery("");
		setAdvancedFilters({
			status: "all",
			priority: "all",
			dateFrom: "",
			dateTo: "",
		});
	}, []);

	const casePending = caseSync?.pendingCount ?? 0;
	const caseSyncing = caseSync?.syncing ?? false;
	const caseSyncStatus = caseSync?.syncStatus ?? null;
	const caseOnSync = caseSync?.onSync;
	const ciclcarPending = ciclcarSync?.pendingCount ?? 0;
	const ciclcarSyncing = ciclcarSync?.syncing ?? false;
	const ciclcarSyncStatus = ciclcarSync?.syncStatus ?? null;
	const ciclcarOnSync = ciclcarSync?.onSync;
	const facPending = facSync?.pendingCount ?? 0;
	const facSyncing = facSync?.syncing ?? false;
	const facSyncStatus = facSync?.syncStatus ?? null;
	const facOnSync = facSync?.onSync;
	const farPending = farSync?.pendingCount ?? 0;
	const farSyncing = farSync?.syncing ?? false;
	const farSyncStatus = farSync?.syncStatus ?? null;
	const farOnSync = farSync?.onSync;
	const ivacPending = ivacSync?.pendingCount ?? 0;
	const ivacSyncing = ivacSync?.syncing ?? false;
	const ivacSyncStatus = ivacSync?.syncStatus ?? null;
	const ivacOnSync = ivacSync?.onSync;
	const spPending = spSync?.pendingCount ?? 0;
	const spSyncing = spSync?.syncing ?? false;
	const spSyncStatus = spSync?.syncStatus ?? null;
	const spOnSync = spSync?.onSync;
	const getCiclcarPrefetchedEnrollments = React.useCallback(
		(caseId) => {
			if (!caseId) return undefined;
			if (ciclcarProgramEnrollmentsLoading) return null;
			return ciclcarProgramEnrollments?.[caseId] ?? [];
		},
		[ciclcarProgramEnrollments, ciclcarProgramEnrollmentsLoading],
	);

	// Fetch case managers
	const { caseManagers, loading: caseManagersLoading } = useCaseManagers();

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
		console.log(
			"[DELETE CLICK] Delete requested for:",
			caseData,
			"Type:",
			caseType,
		);
		console.log(
			"[DELETE CLICK] handleDeleteClick function called successfully",
		);
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
				case "SP":
					result = await deleteSpCase(caseId);
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
					description:
						result.error?.message ||
						"Failed to delete case. Please try again.",
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

	// Handle documents click (opens document manager dialog)
	function handleDocumentsClick(caseData, caseType) {
		const relatedId = caseData?.id ?? null;
		if (!relatedId) {
			toast.error("Missing case id", {
				description: "Unable to open documents for this record.",
			});
			return;
		}
		setDocumentsContext({
			relatedType: "case",
			relatedId,
			caseType,
		});
		setDocumentsDialogOpen(true);
	}

	// Handle refresh - full page reload that returns to the active tab for consistency across datasets
	const handleRefresh = React.useCallback(async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);

		if (typeof window !== "undefined") {
			sessionStorage.setItem("caseManagement.activeTab", activeTab);
			sessionStorage.setItem(
				"caseManagement.forceTabAfterReload",
				activeTab,
			);
			window.location.reload();
			return;
		}

		// Fallback for non-browser environments (keeps previous reload behavior)
		try {
			const promises = [];
			switch (activeTab) {
				case "CASE":
					promises.push(reloadCases?.());
					break;
				case "CICLCAR":
					promises.push(reloadCiclcar?.());
					break;
				case "FAR":
					promises.push(reloadFar?.());
					break;
				case "FAC":
					promises.push(reloadFac?.());
					break;
				case "IVAC":
					promises.push(reloadIvac?.());
					break;
				case "SP":
					promises.push(reloadSp?.());
					break;
				default:
					promises.push(
						reloadCases?.(),
						reloadCiclcar?.(),
						reloadFar?.(),
						reloadFac?.(),
						reloadIvac?.(),
						reloadSp?.(),
					);
			}
			await Promise.all(promises.filter(Boolean));
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
	}, [
		activeTab,
		isRefreshing,
		reloadCases,
		reloadCiclcar,
		reloadFar,
		reloadFac,
		reloadIvac,
		reloadSp,
	]);

	const caseManagerFilteredData = React.useMemo(() => {
		return caseCaseManager === "all"
			? safeCaseData
			: safeCaseData.filter(
					(row) => row.case_manager === caseCaseManager,
				);
	}, [caseCaseManager, safeCaseData]);

	const ciclcarManagerFilteredData = React.useMemo(() => {
		return ciclcarCaseManager === "all"
			? safeCiclcarData
			: safeCiclcarData.filter(
					(row) => row.case_manager === ciclcarCaseManager,
				);
	}, [ciclcarCaseManager, safeCiclcarData]);

	const farManagerFilteredData = React.useMemo(() => {
		return farCaseManager === "all"
			? safeFarData
			: safeFarData.filter((row) => row.case_manager === farCaseManager);
	}, [farCaseManager, safeFarData]);

	const facManagerFilteredData = React.useMemo(() => {
		return facCaseManager === "all"
			? safeFacData
			: safeFacData.filter((row) => row.case_manager === facCaseManager);
	}, [facCaseManager, safeFacData]);

	const ivacManagerFilteredData = React.useMemo(() => {
		if (ivacCaseManager === "all") return safeIvacData;
		return safeIvacData.filter((row) => {
			if (Array.isArray(row.case_managers)) {
				return row.case_managers.includes(ivacCaseManager);
			}
			return row.case_manager === ivacCaseManager;
		});
	}, [ivacCaseManager, safeIvacData]);

	const spManagerFilteredData = React.useMemo(() => {
		if (spCaseManager === "all") return safeSpData;
		return safeSpData.filter((row) => {
			if (Array.isArray(row.case_managers)) {
				return row.case_managers.includes(spCaseManager);
			}
			return row.case_manager === spCaseManager;
		});
	}, [spCaseManager, safeSpData]);

	const caseFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				caseManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[caseManagerFilteredData, searchQuery, advancedFilters],
	);
	const ciclcarFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				ciclcarManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[ciclcarManagerFilteredData, searchQuery, advancedFilters],
	);
	const farFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				farManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[farManagerFilteredData, searchQuery, advancedFilters],
	);
	const facFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				facManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[facManagerFilteredData, searchQuery, advancedFilters],
	);
	const ivacFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				ivacManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[ivacManagerFilteredData, searchQuery, advancedFilters],
	);
	const spFilteredData = React.useMemo(
		() =>
			filterRowsByGlobalSearch(
				spManagerFilteredData,
				searchQuery,
				advancedFilters,
			),
		[spManagerFilteredData, searchQuery, advancedFilters],
	);

	// Initialize CASE table with dynamic columns (handler referenced above)
	const caseTable = useDataTable({
		initialData: caseFilteredData,
		// CHANGED: pass edit handler so actions column calls this for “Edit”
		columns: createCaseColumns(
			handleEnrollClick,
			handleEditCaseRow,
			handleDeleteClick,
			handleDocumentsClick,
		),
	});

	// Table instance for CICLCAR tab with its own data and column definitions
	const ciclcarTable = useDataTable({
		initialData: ciclcarFilteredData,
		columns: ciclcarColumns(
			handleEnrollClick,
			handleEditCiclcarRow,
			handleDeleteClick,
			getCiclcarPrefetchedEnrollments,
			handleDocumentsClick,
		),
		onRowClick: handleEditCiclcarRow, // Add click handler for CICL/CAR rows
	});

	// Table instance for FAR tab with its own data and column definitions
	const farTable = useDataTable({
		initialData: farFilteredData,
		columns: farColumns(
			handleEnrollClick,
			handleEditFarRow,
			handleDeleteClick,
			handleDocumentsClick,
		),
		onRowClick: handleEditFarRow, // Add click handler for FAR rows
	});

	// Table instance for FAC tab with its own data and column definitions
	const facTable = useDataTable({
		initialData: facFilteredData,
		columns: facColumns(
			handleEditFacRow,
			handleDeleteClick,
			handleDocumentsClick,
		),
		onRowClick: handleEditFacRow, // Add click handler for FAC rows
	});

	// Table instance for IVAC tab with its own data and column definitions
	const ivacTable = useDataTable({
		initialData: ivacFilteredData,
		columns: ivacColumns(
			handleEditIvacRow,
			handleDeleteClick,
			handleDocumentsClick,
		),
		onRowClick: handleEditIvacRow, // Add click handler for IVAC rows
	});

	// Table instance for Single Parents tab with its own data and column definitions
	const spTable = useDataTable({
		initialData: spFilteredData,
		columns: spColumns(handleDeleteClick, handleDocumentsClick),
	});

	React.useEffect(() => {
		caseTable.table.setPageIndex(0);
		ciclcarTable.table.setPageIndex(0);
		farTable.table.setPageIndex(0);
		facTable.table.setPageIndex(0);
		ivacTable.table.setPageIndex(0);
		spTable.table.setPageIndex(0);
	}, [
		searchQuery,
		advancedFilters.status,
		advancedFilters.priority,
		advancedFilters.dateFrom,
		advancedFilters.dateTo,
		caseTable.table,
		ciclcarTable.table,
		farTable.table,
		facTable.table,
		ivacTable.table,
		spTable.table,
	]);

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
	}, [handleRefresh]); // Dependencies to ensure fresh closure

	return (
		<>
			{isRefreshing && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
					<div
						className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-background p-8 text-center shadow-xl"
						role="status"
						aria-live="polite"
					>
						<div className="rounded-full bg-muted p-4">
							<IconRefresh className="h-6 w-6 animate-spin text-primary" />
						</div>
						<div className="space-y-1">
							<p className="text-base font-medium">
								Refreshing data
							</p>
							<p className="text-sm text-muted-foreground">
								Hang tight while we reload the latest records
								for the {activeTab} tab.
							</p>
						</div>
					</div>
				</div>
			)}
			<Tabs
				value={activeTab}
				onValueChange={handleTabValueChange}
				className="w-full flex-col justify-start gap-6"
			>
				<div className="flex flex-col gap-3 px-4 lg:px-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="space-y-1">
							<h3 className="text-base font-bold leading-tight">
								Case Records
							</h3>
							<p className="text-xs text-muted-foreground">
								Manage and track all case intake forms and
								records across different categories
							</p>
						</div>
						<div className="flex items-center gap-2">
							{!isOnline && (
								<Badge
									variant="destructive"
									className="gap-1 text-[11px]"
								>
									<WifiOff className="h-3 w-3" />
									Offline
								</Badge>
							)}
							{/* CASES SECTION */}
							{activeTab === "CASE" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={caseCaseManager}
										onValueChange={setCaseCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => caseOnSync?.()}
										disabled={
											!isOnline ||
											caseSyncing ||
											casePending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												caseSyncing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{caseSyncing
												? "SYNCING..."
												: "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
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
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE SHEET BUTTON*/}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE SHEET
											</span>
										</Button>
									</PermissionGuard>

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

									{(caseSyncing ||
										casePending > 0 ||
										caseSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{caseSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{caseSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : casePending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{casePending} pending
														change
														{casePending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{caseSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}

							{/* CICLCAR SECTION */}
							{activeTab === "CICLCAR" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={ciclcarCaseManager}
										onValueChange={setCiclcarCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => ciclcarOnSync?.()}
										disabled={
											!isOnline ||
											ciclcarSyncing ||
											ciclcarPending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												ciclcarSyncing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{ciclcarSyncing
												? "SYNCING..."
												: "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
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
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE CICL/CAR BUTTON*/}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE CICL/CAR
											</span>
										</Button>
									</PermissionGuard>

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

									{(ciclcarSyncing ||
										ciclcarPending > 0 ||
										ciclcarSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{ciclcarSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{ciclcarSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : ciclcarPending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{ciclcarPending} pending
														change
														{ciclcarPending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{ciclcarSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}

							{/* FAR SECTION */}
							{activeTab === "FAR" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={farCaseManager}
										onValueChange={setFarCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => farOnSync?.()}
										disabled={
											!isOnline ||
											farSyncing ||
											farPending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												farSyncing ? "animate-spin" : ""
											}
										/>
										<span className="hidden lg:inline">
											{farSyncing ? "SYNCING..." : "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
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
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE FAR BUTTON*/}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE FAR
											</span>
										</Button>
									</PermissionGuard>

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

									{(farSyncing ||
										farPending > 0 ||
										farSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{farSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{farSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : farPending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{farPending} pending
														change
														{farPending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{farSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}

							{/* FAC SECTION */}
							{activeTab === "FAC" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={facCaseManager}
										onValueChange={setFacCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => facOnSync?.()}
										disabled={
											!isOnline ||
											facSyncing ||
											facPending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												facSyncing ? "animate-spin" : ""
											}
										/>
										<span className="hidden lg:inline">
											{facSyncing ? "SYNCING..." : "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
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
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE FAC BUTTON */}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE FAC
											</span>
										</Button>
									</PermissionGuard>

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

									{(facSyncing ||
										facPending > 0 ||
										facSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{facSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{facSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : facPending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{facPending} pending
														change
														{facPending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{facSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}

							{/* IVAC SECTION */}
							{activeTab === "IVAC" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={ivacCaseManager}
										onValueChange={setIvacCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => ivacOnSync?.()}
										disabled={
											!isOnline ||
											ivacSyncing ||
											ivacPending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												ivacSyncing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{ivacSyncing
												? "SYNCING..."
												: "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
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
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE IVAC BUTTON */}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE IVAC
											</span>
										</Button>
									</PermissionGuard>

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

									{(ivacSyncing ||
										ivacPending > 0 ||
										ivacSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{ivacSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{ivacSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : ivacPending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{ivacPending} pending
														change
														{ivacPending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{ivacSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}

							{/* SINGLE PARENTS SECTION */}
							{activeTab === "SP" && (
								<>
									{/* Case Manager Filter */}
									<Select
										value={spCaseManager}
										onValueChange={setSpCaseManager}
									>
										<SelectTrigger className="w-[180px] h-9">
											<SelectValue placeholder="Filter by Manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Managers
											</SelectItem>
											{caseManagersLoading ? (
												<SelectItem
													value="loading"
													disabled
												>
													Loading...
												</SelectItem>
											) : (
												caseManagers.map((manager) => (
													<SelectItem
														key={manager.id}
														value={
															manager.full_name
														}
													>
														{manager.full_name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>

									{/* Refresh Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="cursor-pointer"
									>
										<IconRefresh
											className={
												isRefreshing
													? "animate-spin"
													: ""
											}
										/>
										<span className="hidden lg:inline">
											{isRefreshing
												? "REFRESHING..."
												: "REFRESH"}
										</span>
									</Button>

									{/* Sync Button */}
									<Button
										variant="outline"
										size="sm"
										onClick={() => spOnSync?.()}
										disabled={
											!isOnline ||
											spSyncing ||
											spPending === 0
										}
										className="cursor-pointer"
									>
										<IconCloudUpload
											className={
												spSyncing ? "animate-spin" : ""
											}
										/>
										<span className="hidden lg:inline">
											{spSyncing ? "SYNCING..." : "SYNC"}
										</span>
									</Button>

									{/* Customize Columns Dropdown */}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="cursor-pointer"
											>
												<IconLayoutColumns />
												<span>COLUMNS</span>
												<IconChevronDown />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											className="w-56"
										>
											{spTable.table
												.getAllColumns()
												.filter(
													(c) =>
														typeof c.accessorFn !==
															"undefined" &&
														c.getCanHide(),
												)
												.map((c) => (
													<DropdownMenuCheckboxItem
														key={c.id}
														checked={c.getIsVisible()}
														onCheckedChange={(v) =>
															c.toggleVisibility(
																!!v,
															)
														}
														className="capitalize"
													>
														{c.id}
													</DropdownMenuCheckboxItem>
												))}
										</DropdownMenuContent>
									</DropdownMenu>

									{/* INTAKE SINGLE PARENT BUTTON */}
									<PermissionGuard permission="create_case">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setOpenIntakeSheet(true)
											}
											className="cursor-pointer"
										>
											<IconPlus />
											<span className="hidden lg:inline">
												INTAKE SINGLE PARENT
											</span>
										</Button>
									</PermissionGuard>

									{/* SINGLE PARENT Create Modal */}
									<IntakeSheetSP
										open={openIntakeSheet}
										setOpen={setOpenIntakeSheet}
										onSuccess={reloadSp}
									/>

									{(spSyncing ||
										spPending > 0 ||
										spSyncStatus) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
											{spSyncing ? (
												<>
													<IconLoader className="h-3 w-3 animate-spin" />
													<span>
														{spSyncStatus ||
															"Syncing queued changes..."}
													</span>
												</>
											) : spPending > 0 ? (
												<>
													<IconAlertTriangle className="h-3 w-3 text-amber-500" />
													<span className="text-amber-600">
														{spPending} pending
														change
														{spPending === 1
															? ""
															: "s"}{" "}
														waiting for sync
													</span>
												</>
											) : (
												<>
													<IconCircleCheckFilled className="h-3 w-3 text-emerald-500" />
													<span className="text-emerald-600">
														{spSyncStatus}
													</span>
												</>
											)}
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* Global Search + Advanced Filters (applies across all tabs) */}
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1 min-w-[240px] max-w-[520px]">
							<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search across all case types..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>

						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="cursor-pointer"
								>
									Advanced
									<IconChevronDown className="h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="w-[340px] p-4"
							>
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1">
											<Label className="text-xs">
												Status
											</Label>
											<Select
												value={advancedFilters.status}
												onValueChange={(value) =>
													setAdvancedFilters(
														(prev) => ({
															...prev,
															status: value,
														}),
													)
												}
											>
												<SelectTrigger className="h-9">
													<SelectValue placeholder="All" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="all">
														All
													</SelectItem>
													{statusOptions.map(
														(status) => (
															<SelectItem
																key={status}
																value={status}
															>
																{status}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-1">
											<Label className="text-xs">
												Priority
											</Label>
											<Select
												value={advancedFilters.priority}
												onValueChange={(value) =>
													setAdvancedFilters(
														(prev) => ({
															...prev,
															priority: value,
														}),
													)
												}
											>
												<SelectTrigger className="h-9">
													<SelectValue placeholder="All" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="all">
														All
													</SelectItem>
													{priorityOptions.map(
														(priority) => (
															<SelectItem
																key={priority}
																value={priority}
															>
																{priority}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1">
											<Label className="text-xs">
												Date Filed From
											</Label>
											<Input
												type="date"
												value={advancedFilters.dateFrom}
												onChange={(e) =>
													setAdvancedFilters(
														(prev) => ({
															...prev,
															dateFrom:
																e.target.value,
														}),
													)
												}
												className="h-9"
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">
												Date Filed To
											</Label>
											<Input
												type="date"
												value={advancedFilters.dateTo}
												onChange={(e) =>
													setAdvancedFilters(
														(prev) => ({
															...prev,
															dateTo: e.target
																.value,
														}),
													)
												}
												className="h-9"
											/>
										</div>
									</div>

									<div className="flex items-center justify-between pt-1">
										<div className="text-xs text-muted-foreground">
											{hasActiveGlobalFilters
												? `${activeGlobalFilterCount} active filter${activeGlobalFilterCount === 1 ? "" : "s"}`
												: "No active filters"}
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={clearGlobalFilters}
											disabled={!hasActiveGlobalFilters}
											className="h-8 px-2"
										>
											Clear
										</Button>
									</div>
								</div>
							</PopoverContent>
						</Popover>

						{hasActiveGlobalFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearGlobalFilters}
								className="h-9 px-2"
							>
								Clear
							</Button>
						)}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2">
						<Label htmlFor="view-selector" className="sr-only">
							View
						</Label>
						{/*
         // ==============
         // *MOBILE SCREEN
         // ==============
         */}
						<Select
							value={activeTab}
							onValueChange={handleTabValueChange}
						>
							<SelectTrigger
								className="flex w-fit @4xl/main:hidden"
								size="sm"
								id="view-selector"
							>
								<SelectValue placeholder="Select a view" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="CASE">Cases</SelectItem>
								<SelectItem value="CICLCAR">
									CICL/CAR
								</SelectItem>
								<SelectItem value="IVAC">
									Incidence on VAC
								</SelectItem>
								<SelectItem value="FAC">
									Family Assistance Card
								</SelectItem>
								<SelectItem value="FAR">
									Family Assistance Record
								</SelectItem>
								<SelectItem value="SP">
									Single Parents
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
								<TabsTrigger
									value="CASE"
									className="cursor-pointer"
								>
									Cases
								</TabsTrigger>
								<TabsTrigger
									value="CICLCAR"
									className="cursor-pointer"
								>
									CICL/CAR
								</TabsTrigger>
								<TabsTrigger
									value="IVAC"
									className="cursor-pointer"
								>
									Incidence on VAC
								</TabsTrigger>
								<TabsTrigger
									value="FAC"
									className="cursor-pointer"
								>
									Family Assistance Card
								</TabsTrigger>
								<TabsTrigger
									value="FAR"
									className="cursor-pointer"
								>
									Family Assistance Record
								</TabsTrigger>
								<TabsTrigger
									value="SP"
									className="cursor-pointer"
								>
									Single Parents
								</TabsTrigger>
							</TabsList>
						</div>
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
					<PaginationControls table={caseTable.table} />
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
						columns={ciclcarColumns(
							handleEnrollClick,
							handleEditCiclcarRow,
							handleDeleteClick,
							getCiclcarPrefetchedEnrollments,
							handleDocumentsClick,
						)}
						onRowClick={handleEditCiclcarRow}
					/>
					<PaginationControls table={ciclcarTable.table} />
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
						columns={farColumns(
							handleEnrollClick,
							handleEditFarRow,
							handleDeleteClick,
							handleDocumentsClick,
						)}
						onRowClick={handleEditFarRow}
					/>
					<PaginationControls table={farTable.table} />
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
						columns={ivacColumns(
							handleEditIvacRow,
							handleDeleteClick,
							handleDocumentsClick,
						)}
						onRowClick={handleEditIvacRow}
					/>
					<PaginationControls table={ivacTable.table} />
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
						columns={facColumns(
							handleEditFacRow,
							handleDeleteClick,
							handleDocumentsClick,
						)}
						onRowClick={handleEditFacRow}
					/>
					<PaginationControls table={facTable.table} />
				</TabsContent>

				{/*
        // =====================
        // *SINGLE PARENTS VIEW
        // =====================
        */}
				<TabsContent
					value="SP"
					className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
				>
					<TableRenderer
						table={spTable.table}
						setData={spTable.setData}
						columns={spColumns(
							handleDeleteClick,
							handleDocumentsClick,
						)}
					/>
					<PaginationControls table={spTable.table} />
				</TabsContent>

				{/* Documents Dialog */}
				<Dialog
					open={documentsDialogOpen}
					onOpenChange={setDocumentsDialogOpen}
				>
					<DialogContent className="min-w-5xl">
						<DialogHeader>
							<DialogTitle>Case Documents</DialogTitle>
						</DialogHeader>
						<PermissionGuard
							permission="view_documents"
							fallback={
								<div className="text-sm text-muted-foreground">
									Access denied.
								</div>
							}
						>
							<DocumentManager
								relatedType={documentsContext.relatedType}
								relatedId={documentsContext.relatedId}
								open={documentsDialogOpen}
							/>
						</PermissionGuard>
					</DialogContent>
				</Dialog>

				{/* Enrollment Dialog */}
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
				<AlertDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will
								permanently delete this {caseTypeToDelete} case
								from the database.
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
		</>
	);
}
