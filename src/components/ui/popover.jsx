import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

/**
 * Popover primitives.
 *
 * Thin wrappers around Radix Popover components that:
 * - Apply stable `data-slot` attributes for styling/testing.
 * - Provide a styled `PopoverContent` with sensible defaults for alignment and offset.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>} PopoverProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>} PopoverTriggerProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>} PopoverContentPrimitiveProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>} PopoverAnchorProps */

/** @param {PopoverProps} props */
function Popover({ ...props }) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

/** @param {PopoverTriggerProps} props */
function PopoverTrigger({ ...props }) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * @param {PopoverContentPrimitiveProps & { className?: string }} props
 */
function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	...props
}) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot="popover-content"
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

/** @param {PopoverAnchorProps} props */
function PopoverAnchor({ ...props }) {
	return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
