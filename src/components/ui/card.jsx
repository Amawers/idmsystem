import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card
 *
 * Simple layout primitives for grouping related content.
 *
 * Design system conventions:
 * - `data-slot` attributes are applied for consistent styling hooks.
 * - `CardHeader` uses container queries and a `card-action` slot to support
 *   right-aligned actions without extra wrapper markup.
 */

/** @typedef {React.ComponentPropsWithoutRef<"div">} CardProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardHeaderProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardTitleProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardDescriptionProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardActionProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardContentProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} CardFooterProps */

/** @param {CardProps} props */
function Card({ className, ...props }) {
	return (
		<div
			data-slot="card"
			className={cn(
				"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
				className,
			)}
			{...props}
		/>
	);
}

/** @param {CardHeaderProps} props */
function CardHeader({ className, ...props }) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
				className,
			)}
			{...props}
		/>
	);
}

/** @param {CardTitleProps} props */
function CardTitle({ className, ...props }) {
	return (
		<div
			data-slot="card-title"
			className={cn("leading-none font-semibold", className)}
			{...props}
		/>
	);
}

/** @param {CardDescriptionProps} props */
function CardDescription({ className, ...props }) {
	return (
		<div
			data-slot="card-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

/** @param {CardActionProps} props */
function CardAction({ className, ...props }) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className,
			)}
			{...props}
		/>
	);
}

/** @param {CardContentProps} props */
function CardContent({ className, ...props }) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-6", className)}
			{...props}
		/>
	);
}

/** @param {CardFooterProps} props */
function CardFooter({ className, ...props }) {
	return (
		<div
			data-slot="card-footer"
			className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};
