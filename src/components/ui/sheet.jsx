"use client";

/**
 * Sheet (slide-over) primitives.
 *
 * Thin wrappers around Radix Dialog components that:
 * - Apply consistent `data-slot` attributes for Tailwind targeting.
 * - Provide a `side` prop on `SheetContent` to control slide-in direction.
 * - Render a default close button inside the sheet content.
 */

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** @typedef {"left" | "right" | "top" | "bottom"} SheetSide */

/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root>} SheetProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>} SheetTriggerProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>} SheetCloseProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>} SheetPortalProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>} SheetOverlayProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>} SheetPrimitiveContentProps */
/** @typedef {React.HTMLAttributes<HTMLDivElement>} SheetHeaderProps */
/** @typedef {React.HTMLAttributes<HTMLDivElement>} SheetFooterProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>} SheetTitleProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>} SheetDescriptionProps */

/** @param {SheetProps} props */
function Sheet({ ...props }) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

/** @param {SheetTriggerProps} props */
function SheetTrigger({ ...props }) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

/** @param {SheetCloseProps} props */
function SheetClose({ ...props }) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/** @param {SheetPortalProps} props */
function SheetPortal({ ...props }) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

/**
 * @param {SheetOverlayProps & { className?: string }} props
 */
function SheetOverlay({ className, ...props }) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * @param {SheetPrimitiveContentProps & { side?: SheetSide, className?: string }} props
 */
function SheetContent({ className, children, side = "right", ...props }) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
					side === "right" &&
						"data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
					side === "left" &&
						"data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
					side === "top" &&
						"data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
					side === "bottom" &&
						"data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
					className,
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
					<XIcon className="size-4" />
					<span className="sr-only">Close</span>
				</SheetPrimitive.Close>
			</SheetPrimitive.Content>
		</SheetPortal>
	);
}

/**
 * @param {SheetHeaderProps & { className?: string }} props
 */
function SheetHeader({ className, ...props }) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 p-4", className)}
			{...props}
		/>
	);
}

/**
 * @param {SheetFooterProps & { className?: string }} props
 */
function SheetFooter({ className, ...props }) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

/**
 * @param {SheetTitleProps & { className?: string }} props
 */
function SheetTitle({ className, ...props }) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-foreground font-semibold", className)}
			{...props}
		/>
	);
}

/**
 * @param {SheetDescriptionProps & { className?: string }} props
 */
function SheetDescription({ className, ...props }) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
};
