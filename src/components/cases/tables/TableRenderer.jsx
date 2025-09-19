import React from "react";

// DnD-kit imports for drag-and-drop support
import {
	DndContext, // Main drag-and-drop context provider
	closestCenter, // Collision detection strategy
	useSensor, // Hook to define individual sensor
	useSensors, // Hook to group multiple sensors
	MouseSensor, // Drag with mouse
	TouchSensor, // Drag with touch
	KeyboardSensor, // Drag with keyboard
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"; // Restrict dragging only vertically
import { flexRender } from "@tanstack/react-table"; // Utility to render table cells/headers

// DnD-kit sortable imports
import {
	SortableContext, // Wraps sortable items
	verticalListSortingStrategy, // Sorting logic for vertical lists
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable"; // Utility to reorder array after drag

// UI table components (shadcn/ui)
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Custom draggable row component
import DraggableRow from "@/components/cases/tables/DraggableRow";

// Example CaseTable component
export default function TableRenderer({ table, setData, columns }) {
	// Unique id for sortable context
	const sortableId = React.useId();

	// Sensors to detect mouse, touch, or keyboard drag actions
	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor)
	);

	// Get array of row IDs (used by SortableContext)
	const dataIds = React.useMemo(
		() => table.getRowModel().rows.map((row) => row.original.id),
		[table]
	);

	// Function to handle drag end (reorder rows)
	const handleDragEnd = (event) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		// Reorder data using arrayMove
		setData((oldData) => {
			const oldIndex = oldData.findIndex((item) => item.id === active.id);
			const newIndex = oldData.findIndex((item) => item.id === over.id);
			return arrayMove(oldData, oldIndex, newIndex);
		});
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			modifiers={[restrictToVerticalAxis]}
			onDragEnd={handleDragEnd}
			id={sortableId}
		>
			<Table>
				{/* Table Header */}
				<TableHeader className="bg-muted sticky top-0 z-10">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
									>
										{/* Render header cell */}
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef
														.header,
													header.getContext()
											  )}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>

				{/* Table Body */}
				<TableBody className="**:data-[slot=table-cell]:first:w-8">
					{table.getRowModel().rows?.length ? (
						// Wrap rows in SortableContext for drag-and-drop
						<SortableContext
							items={dataIds}
							strategy={verticalListSortingStrategy}
						>
							{/* Render each row as draggable */}
							{table.getRowModel().rows.map((row) => (
								<DraggableRow key={row.id} row={row} />
							))}
						</SortableContext>
					) : (
						// Empty state when no rows exist
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center"
							>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</DndContext>
	);
}
