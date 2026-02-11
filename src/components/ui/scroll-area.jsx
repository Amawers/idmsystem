import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

/**
 * Scroll area primitives.
 *
 * Thin wrappers around Radix ScrollArea components that:
 * - Apply stable `data-slot` attributes for styling/testing.
 * - Provide a default vertical `ScrollBar` and a `Corner`.
 * - Ensure the viewport can receive focus styles for keyboard users.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>} ScrollAreaRootProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>} ScrollAreaScrollbarProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaThumb>} ScrollAreaThumbProps */

/** @typedef {"vertical" | "horizontal"} ScrollBarOrientation */

/**
 * @param {ScrollAreaRootProps & { className?: string }} props
 */
function ScrollArea({ className, children, ...props }) {
	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn("relative", className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				data-slot="scroll-area-viewport"
				className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

/**
 * @param {ScrollAreaScrollbarProps & { className?: string; orientation?: ScrollBarOrientation }} props
 */
function ScrollBar({ className, orientation = "vertical", ...props }) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			className={cn(
				"flex touch-none p-px transition-colors select-none",
				orientation === "vertical" &&
					"h-full w-2.5 border-l border-l-transparent",
				orientation === "horizontal" &&
					"h-2.5 flex-col border-t border-t-transparent",
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				data-slot="scroll-area-thumb"
				className="bg-border relative flex-1 rounded-full"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

export { ScrollArea, ScrollBar };
