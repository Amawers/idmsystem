"use client";

/**
 * Table UI primitives.
 *
 * Lightweight wrappers around native table elements that:
 * - apply consistent Tailwind styles
 * - add `data-slot` attributes for design-system targeting
 * - provide an overflow container for horizontal scrolling
 *
 * These components intentionally do not manage sorting/pagination/state; they
 * are purely presentational building blocks used across feature tables.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * @typedef {import("react").HTMLAttributes<HTMLDivElement>} DivProps
 * @typedef {import("react").TableHTMLAttributes<HTMLTableElement>} TableProps
 * @typedef {import("react").HTMLAttributes<HTMLTableSectionElement>} TableSectionProps
 * @typedef {import("react").HTMLAttributes<HTMLTableRowElement>} TableRowProps
 * @typedef {import("react").ThHTMLAttributes<HTMLTableCellElement>} TableHeadCellProps
 * @typedef {import("react").TdHTMLAttributes<HTMLTableCellElement>} TableDataCellProps
 * @typedef {import("react").HTMLAttributes<HTMLTableCaptionElement>} TableCaptionProps
 */

function Table({ className, ...props }) {
	return (
		<div
			data-slot="table-container"
			className="relative w-full overflow-x-auto"
		>
			<table
				data-slot="table"
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
}

function TableHeader({ className, ...props }) {
	return (
		<thead
			data-slot="table-header"
			className={cn("[&_tr]:border-b", className)}
			{...props}
		/>
	);
}

function TableBody({ className, ...props }) {
	return (
		<tbody
			data-slot="table-body"
			className={cn("[&_tr:last-child]:border-0", className)}
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn(
				"bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableRow({ className, ...props }) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }) {
	return (
		<th
			data-slot="table-head"
			className={cn(
				"text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }) {
	return (
		<td
			data-slot="table-cell"
			className={cn(
				"p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("text-muted-foreground mt-4 text-sm", className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
};
