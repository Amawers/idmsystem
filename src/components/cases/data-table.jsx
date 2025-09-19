//! ===========================================
//! TO BE MODIFIED, SAMPLE DATA ONLY FOR RENDER
//! ===========================================

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
import IntakeSheet from "@/pages/case manager/IntakeSheet";
import DragHandle from "@/components/cases/tables/DragHandle";
import TableCellViewer from "@/components/cases/tables/TableCellViewer";
import useDataTable from "@/hooks/useDataTable";
import TableRenderer from "@/components/cases/tables/TableRenderer";
// ====================
// Data validation schema (Zod)
// ====================
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

// =================================
//! CASE Table COLUMN DEFINITIONS
// =================================
const caseColumns = [
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

	// Other data columns (header, type, status, etc.)
	{
		accessorKey: "header",
		header: "Header",
		cell: ({ row }) => {
			return <TableCellViewer item={row.original} />;
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
			// Input form for editing target
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
			// Input form for editing limit
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

			// If not assigned → show dropdown
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
			// Row actions dropdown
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
//! FAR Table COLUMN DEFINITIONS
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

	// Other data columns (header, type, status, etc.)
	{
		accessorKey: "header",
		header: "Header",
		cell: ({ row }) => {
			return <TableCellViewer item={row.original} />;
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
			// Input form for editing target
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
			// Input form for editing limit
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

			// If not assigned → show dropdown
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
			// Row actions dropdown
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
// ==========================
//! Main DataTable wrapper
// ==========================
export function DataTable({ caseData, farData }) {
	// State to control Intake Sheet modal visibility (open/close)
	const [openIntakeSheet, setOpenIntakeSheet] = useState(false);

	// Tracks which tab is currently active (default: "CASE")
	const [activeTab, setActiveTab] = useState("CASE");

	// Table instance for CASE tab with its own data and column definitions
	const caseTable = useDataTable({
		initialData: caseData,
		columns: caseColumns,
	});

	// Table instance for FAR tab with its own data and column definitions
	const farTable = useDataTable({
		initialData: farData,
		columns: farColumns,
	});

	// ============================
	//! TAB TRIGGER SECTION WAPPER
	// ============================
	return (
		<Tabs
			defaultValue="CASE"
			onValueChange={setActiveTab}
			className="w-full flex-col justify-start gap-6"
		>
			<div className="flex items-center justify-between px-4 lg:px-6">
				<Label htmlFor="view-selector" className="sr-only">
					View
				</Label>
				{/*
         //! =====================
         //! MOBILE SCREEN - logic not yet implemented
         //! =====================
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
						<SelectItem value="FAR">
							Family Assistance Record
						</SelectItem>
						<SelectItem value="IVAC">Incidence on VAC</SelectItem>
						<SelectItem value="FAC">Family Access Card</SelectItem>
					</SelectContent>
				</Select>
				{/*
         //! =====================
         //! DESKTOP SCREEN 
         //! =====================
         */}
				<div className="hidden items-center gap-2 @4xl/main:flex">
					<TabsList>
						<TabsTrigger value="CASE">Cases</TabsTrigger>
						<TabsTrigger value="FAR">Assistance Record</TabsTrigger>
						<TabsTrigger value="IVAC">Incidence on VAC</TabsTrigger>
						<TabsTrigger value="FAC">
							Family Access Card
						</TabsTrigger>
					</TabsList>
				</div>
				{/*
         //! =====================
         //! RIGHT BUTTONS
         //! =====================
         */}
				<div className="flex items-center gap-2">
					{/*//! CASES SECTION */}
					{activeTab === "CASE" && (
						<>
							{/* Customize Columns Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns />
										<span className="hidden lg:inline">
											Customize Columns
										</span>
										<span className="lg:hidden">
											Columns
										</span>
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

							{/* Intake buttons */}
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

					{/*//! FAR SECTION */}
					{activeTab === "FAR" && (
						<>
							{/* Customize Columns Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns />
										<span className="hidden lg:inline">
											Customize Columns far
										</span>
										<span className="lg:hidden">
											Columns
										</span>
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
						</>
					)}
				</div>
			</div>
			{/*
        //! =====================
        //! CASES VIEW
        //! =====================
        */}
			<TabsContent
				value="CASE"
				className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
			>
				<TableRenderer
					table={caseTable.table}
					setData={caseTable.setData}
					columns={caseColumns}
				/>
			</TabsContent>
			{/*
        //! =====================
        //! FAR VIEW
        //! =====================
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
        //! =====================
        //! IVAC VIEW
        //! =====================
        */}
			<TabsContent value="IVAC" className="flex flex-col px-4 lg:px-6">
				<div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
					IVAC PAGE
				</div>
			</TabsContent>
			{/*
      //! =====================
      //! FAC VIEW
      //! =====================
      */}
			<TabsContent value="FAC" className="flex flex-col px-4 lg:px-6">
				<div className="aspect-video w-full flex-1 rounded-lg border border-dashed">
					FAC PAGE
				</div>
			</TabsContent>
		</Tabs>
	);
}
