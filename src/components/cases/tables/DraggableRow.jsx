// =============================================
// DraggableRow Component
// ---------------------------------------------
// Purpose: Renders a sortable table row with drag-and-drop functionality
// for reordering delivery records in the PRRM table. Integrates with
// @dnd-kit for smooth drag interactions and TanStack Table for row rendering.
//
// Key Responsibilities:
// - Provide drag handle for row reordering via @dnd-kit/sortable
// - Render table cells with proper styling and event handling
// - Prevent modal opening when clicking the drag handle
// - Apply visual feedback during drag operations (opacity, z-index)
//
// Dependencies:
// - @dnd-kit/sortable for drag-and-drop state management
// - @tanstack/react-table for table row and cell rendering
// - @dnd-kit/utilities for CSS transform utilities
// - shadcn/ui Table components for consistent styling
//
// Notes:
// - Only the "drag" column receives drag attributes to avoid conflicts
// - Click events on drag handle are stopped to prevent row selection
// - Dragging state applies visual cues for better UX
// =============================================
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { TableCell, TableRow } from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import { CSS } from "@dnd-kit/utilities";

/**
 * DraggableRow
 * 
 * @description Renders a table row that supports drag-and-drop reordering
 * using @dnd-kit. Applies sortable behavior only to the drag handle column
 * while maintaining full row clickability for other interactions like modal opening.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.row - TanStack Table row object containing cell data
 * @param {string} props.cellClass - CSS class for table cells
 * @param {Function} props.onClick - Callback for row click events
 * 
 * @returns {JSX.Element} Sortable table row with drag functionality
 * 
 * @example
 * <DraggableRow 
 *   row={tableRow}
 *   cellClass="px-2"
 *   onClick={() => openModal(row.original)}
 * />
 * 
 * @remarks
 * - Drag attributes are conditionally applied only to the "drag" column
 * - Prevents event bubbling on drag handle to avoid triggering row onClick
 * - Uses CSS transforms for smooth drag animations
 */
export default function DraggableRow({ row, cellClass, onClick }) {
  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      onClick={onClick} // ✅ clickable row
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {/* 🔹 Render row cells (including your existing DragHandle column) */}
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cellClass}
          // ✅ Pass drag props only to the drag handle cell
          {...(cell.column.id === "drag"
            ? { ...attributes, ...listeners }
            : {})}
          onClick={(e) => {
            if (cell.column.id === "drag") {
              e.stopPropagation(); // prevent modal on drag handle click
            }
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
