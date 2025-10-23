// =============================================
// TableRenderer Component
// ---------------------------------------------
// Purpose: Renders the main table UI for PRRM delivery records with drag-and-drop
// reordering capabilities. Integrates with TanStack Table for data display and
// @dnd-kit for row reordering. Handles row selection and modal opening for editing.
//
// Key Responsibilities:
// - Provide drag-and-drop interface for table rows using @dnd-kit
// - Render table headers and body with sortable context
// - Manage row click events for opening edit modals based on user role
// - Integrate with IntakeSheetCaseEdit for record editing
// - Enforce role-based access (super_admin can edit, others can view)
//
// Dependencies:
// - @dnd-kit/core and related libraries for drag-and-drop functionality
// - TanStack React Table for table rendering and state management
// - IntakeSheetCaseEdit component for editing records
// - DraggableRow component for sortable table rows
// - useAuthStore for role-based access control
//
// Notes:
// - Drag-and-drop is restricted to vertical axis for table rows
// - Row click opens modal only for allowed roles (super_admin, hr_assistant, logistics_manager, viewer)
// - ScrollArea is used for large datasets to maintain performance
// - TableRenderer receives table instance and data setters from parent DataTable
// =============================================

import React from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { flexRender } from "@tanstack/react-table";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import IntakeSheetCaseEdit from "@/../src/pages/case manager/intakeSheetCaseEdit";
import DraggableRow from "@/components/cases/tables/DraggableRow";
import { useAuthStore } from "@/store/authStore";

/**
 * TableRenderer
 *
 * @description Renders the table UI with drag-and-drop reordering for PRRM delivery records.
 * Wraps the table in DndContext for sortable rows and handles row interactions based on user roles.
 * Integrates with IntakeSheetCaseEdit for editing selected records.
 *
 * @param {Object} props - Component props
 * @param {Object} props.table - TanStack Table instance with row data and methods
 * @param {Function} props.setData - Function to update the table data array
 * @param {Array} props.columns - Column definitions for the table
 * @param {Function} [props.onRowClick] - Optional custom row click handler (for FAR, etc.)
 *
 * @returns {JSX.Element} Rendered table with drag-and-drop functionality
 *
 * @example
 * <TableRenderer
 *   table={tableInstance}
 *   setData={setTableData}
 *   columns={columnDefinitions}
 *   onRowClick={customHandler} // Optional
 * />
 *
 * @remarks
 * - Uses sensors for mouse, touch, and keyboard drag interactions
 * - Restricts dragging to vertical axis to prevent horizontal movement
 * - Role-based access: super_admin can edit, others can view modal but not edit
 * - ScrollArea enables scrolling for tables with more than 10 rows
 * - If onRowClick is provided, it will be used instead of the default modal behavior
 */
export default function TableRenderer({ table, setData, columns, onRowClick }) {
  //* ================================================
  //* DRAG-AND-DROP SETUP
  //* ================================================
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  // Memoize data IDs for sortable context to optimize re-renders
  const dataIds = React.useMemo(
    () => table.getRowModel().rows.map((row) => row.original.id),
    [table]
  );

  // Ensure we have a columns array to compute widths
  const colCount = Array.isArray(columns) ? columns.length : table.getAllColumns().length;

  // Per-column minimum width (px) — tweak this to taste. This controls how many columns fit in the visible area.
  const colWidth = 180;
  const tableMinWidth = colCount * colWidth;
  const visibleCols = 8;
  const visibleWidth = visibleCols * colWidth;

  //* ================================================
  //* MODAL STATE MANAGEMENT
  //* ================================================
  const [open, setOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState(null);

  // Fetch user role from auth store for access control
  const role = useAuthStore((state) => state.role);

  //* ================================================
  //* DRAG END HANDLER
  //* ================================================
  /**
   * handleDragEnd
   *
   * @description Handles the end of a drag operation by reordering the data array.
   * Uses arrayMove to update the data order based on drag positions.
   *
   * @param {Object} event - Drag end event from @dnd-kit
   * @param {Object} event.active - The dragged item
   * @param {Object} event.over - The item being dropped over
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setData((oldData) => {
      const oldIndex = oldData.findIndex((item) => item.id === active.id);
      const newIndex = oldData.findIndex((item) => item.id === over.id);
      return arrayMove(oldData, oldIndex, newIndex);
    });
  };

  //* ================================================
  //* ROW CLICK HANDLER
  //* ================================================
  /**
   * handleRowClick
   *
   * @description Handles row click events to open the edit modal for the selected row.
   * If a custom onRowClick is provided, use that instead of the default behavior.
   * Access is restricted based on user role: super_admin can edit, others can view.
   *
   * @param {Object} row - The clicked table row object from TanStack Table
   */
  const handleRowClick = (row) => {
    // If custom onRowClick handler is provided, use it instead
    if (onRowClick) {
      onRowClick(row.original);
      return;
    }
    
    // Default behavior: open IntakeSheetCaseEdit modal
    setSelectedRow(row.original);
    setOpen(true);
  };

  // Calculate row count for conditional scrolling
  const rowCount = table.getRowModel().rows.length;

  //* ================================================
  //* MAIN COMPONENT RENDER
  //* ================================================
  return (
    <>
      <ScrollArea className={rowCount > 10 ? "h-[60dvh] w-full" : "w-full"} style={{ maxWidth: `${visibleWidth}px`, overflowX: "auto" }}>
        <div className="min-w-max" style={{ minWidth: `${tableMinWidth}px` }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
        

                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={`text-center`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow
                        key={row.id}
                        row={row}
                        cellClass={`text-center ${
                          role === "super_admin" || role === "hr_assistant"
                            ? "cursor-pointer hover:bg-muted/50"
                            : "cursor-default"
                         }`}
                        onClick={() => handleRowClick(row)}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No records from database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Only show modal when a row is selected to prevent unnecessary renders */}
      {selectedRow && (
        <IntakeSheetCaseEdit open={open} onOpenChange={setOpen} row={selectedRow} />
      )}
    </>
  );
}
