import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Dialog (Radix)
 *
 * Wrapper components around `@radix-ui/react-dialog` primitives.
 *
 * Design system conventions:
 * - `data-slot` attributes are applied for consistent styling hooks.
 * - `DialogContent` renders a default close button (top-right) which can be
 *   disabled via `showCloseButton={false}`.
 *
 * Accessibility:
 * - Focus trapping, escape-to-close, and ARIA semantics are implemented by Radix.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>} DialogProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>} DialogTriggerProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>} DialogPortalProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>} DialogCloseProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>} DialogOverlayProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>} DialogContentPrimitiveProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} DialogHeaderProps */
/** @typedef {React.ComponentPropsWithoutRef<"div">} DialogFooterProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>} DialogTitleProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>} DialogDescriptionProps */

/**
 * @typedef DialogContentProps
 * @property {boolean=} showCloseButton When true (default), renders the top-right close button.
 */

/** @param {DialogProps} props */
function Dialog({ ...props }) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/** @param {DialogTriggerProps} props */
function DialogTrigger({ ...props }) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/** @param {DialogPortalProps} props */
function DialogPortal({ ...props }) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/** @param {DialogCloseProps} props */
function DialogClose({ ...props }) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** @param {DialogOverlayProps} props */
function DialogOverlay({ className, ...props }) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * @param {DialogContentPrimitiveProps & DialogContentProps} props
 */
function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

/** @param {DialogHeaderProps} props */
function DialogHeader({ className, ...props }) {
	return (
		<div
			data-slot="dialog-header"
			className={cn(
				"flex flex-col gap-2 text-center sm:text-left",
				className,
			)}
			{...props}
		/>
	);
}

/** @param {DialogFooterProps} props */
function DialogFooter({ className, ...props }) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

/** @param {DialogTitleProps} props */
function DialogTitle({ className, ...props }) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg leading-none font-semibold", className)}
			{...props}
		/>
	);
}

/** @param {DialogDescriptionProps} props */
function DialogDescription({ className, ...props }) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
