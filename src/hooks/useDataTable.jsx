import React from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from "@tanstack/react-table";

/**
 * TanStack Table helper hook.
 *
 * Provides a small, reusable wrapper around `useReactTable` with common UI state
 * (sorting, pagination, column filters/visibility, row selection) managed inside the hook.
 *
 * @template TData
 * @typedef {Object} UseDataTableArgs
 * @property {TData[]} initialData
 * @property {any[]} columns
 */

/**
 * @template TData
 * @typedef {Object} UseDataTableResult
 * @property {any} table TanStack Table instance
 * @property {TData[]} data Current table data
 * @property {React.Dispatch<React.SetStateAction<TData[]>>} setData Data setter
 */

/**
 * Build a table instance and manage its common state.
 * @template TData
 * @param {UseDataTableArgs<TData>} params
 * @returns {UseDataTableResult<TData>}
 */
export default function useDataTable({ initialData, columns }) {
	const [data, setData] = React.useState(() => initialData);

	React.useEffect(() => {
		setData(initialData);
	}, [initialData]);

	const [rowSelection, setRowSelection] = React.useState({});

	const [columnVisibility, setColumnVisibility] = React.useState({});

	const [columnFilters, setColumnFilters] = React.useState([]);

	const [sorting, setSorting] = React.useState([]);

	const [pagination, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: 10,
	});

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
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: setColumnFilters,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return { table, data, setData };
}
