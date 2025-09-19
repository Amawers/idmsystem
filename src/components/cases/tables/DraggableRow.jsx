import { useSortable } from "@dnd-kit/sortable";
import { TableCell, TableRow } from "@/components/ui/table";
// React Table imports (tanstack)
import { flexRender } from "@tanstack/react-table";
import { CSS } from "@dnd-kit/utilities";

// ====================
//! Row component with drag-and-drop applied
// ====================
export default function DraggableRow({ row }) {
	// useSortable hook: provides drag-and-drop behavior for each row
	const { transform, transition, setNodeRef, isDragging } = useSortable({
		id: row.original.id, // unique identifier for the row
	});

	return (
		<TableRow
			// Adds "selected" state when row is selected
			data-state={row.getIsSelected() && "selected"}
			// Adds "dragging" state when row is being dragged
			data-dragging={isDragging}
			// Ref required for dnd-kit to control DOM node
			ref={setNodeRef}
			// Tailwind styles to handle z-index and opacity while dragging
			className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
			// Apply transform & transition for smooth drag movement
			style={{
				transform: CSS.Transform.toString(transform),
				transition: transition,
			}}
		>
			{/* Render all visible cells for this row */}
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{/* flexRender makes sure cell renders properly (supports JSX/functions) */}
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	);
}
