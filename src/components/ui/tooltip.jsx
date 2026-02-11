/**
 * Radix Tooltip wrappers.
 *
 * These components provide a small, app-wide abstraction over
 * `@radix-ui/react-tooltip` with:
 * - consistent Tailwind styling via `cn()`
 * - stable `data-slot` attributes used by the local design system
 * - sane defaults for `delayDuration` and `sideOffset`
 *
 * Note: `Tooltip` intentionally wraps its own `TooltipProvider` so usage is
 * ergonomic at call sites. If you ever need a single provider for many tooltips
 * (shared delay settings), prefer placing `TooltipProvider` at a higher level.
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/**
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>} TooltipProviderProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>} TooltipRootProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>} TooltipTriggerProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>} TooltipContentProps
 */

function TooltipProvider({ delayDuration = 0, ...props }) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	);
}

function Tooltip({ ...props }) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	);
}

function TooltipTrigger({ ...props }) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({ className, sideOffset = 0, children, ...props }) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					"bg-foreground text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
					className,
				)}
				{...props}
			>
				{children}
				<TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
