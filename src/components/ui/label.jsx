import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/**
 * Label primitive.
 *
 * Thin wrapper around Radix Label that:
 * - Applies a stable `data-slot="label"` attribute for styling/testing.
 * - Uses peer/group disabled selectors so labels visually match disabled inputs.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>} LabelProps */

/** @param {LabelProps & { className?: string }} props */
function Label({ className, ...props }) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
