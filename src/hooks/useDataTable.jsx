import React from "react";
import {
  useReactTable,          // Main hook from TanStack Table
  getCoreRowModel,        // Basic row model (core table rows)
  getPaginationRowModel,  // Handles pagination logic
  getSortedRowModel,      // Handles sorting logic
} from "@tanstack/react-table";

// Custom hook: builds a reusable table instance with state
export default function useDataTable({ initialData, columns }) {

  // Table data state (rows)
  const [data, setData] = React.useState(() => initialData);

  // Row selection state (checkboxes, highlights, etc.)
  const [rowSelection, setRowSelection] = React.useState({});

  // Column visibility state (show/hide columns)
  const [columnVisibility, setColumnVisibility] = React.useState({});

  // Column filters state (for filtering rows)
  const [columnFilters, setColumnFilters] = React.useState([]);

  // Sorting state (ASC/DESC per column)
  const [sorting, setSorting] = React.useState([]);

  // Pagination state (current page + rows per page)
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Build the table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnVisibility,
      columnFilters,
      sorting,
      pagination,
    },
    // Update state handlers (so React Table can control these states)
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,

    // Row models for features
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Return the table instance + state updater for data
  return { table, data, setData };
}
