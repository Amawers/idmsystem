/**
 * Progress bar primitive.
 *
 * Thin wrapper around Radix Progress that:
 * - Applies the app's default styling via `cn()`.
 * - Translates the indicator based on `value` (0–100).
 *
 * Note: Radix expects `value` to represent the current progress value. This
 * wrapper also tolerates `undefined`/`null` by treating it as 0.
 */

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/** @typedef {React.ElementRef<typeof ProgressPrimitive.Root>} ProgressRef */
/** @typedef {React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>} ProgressPrimitiveRootProps */

/**
 * @typedef ProgressProps
 * @property {string} [className]
 * @property {number | null | undefined} [value] Progress value (0–100).
 */

/**
 * @param {ProgressPrimitiveRootProps & ProgressProps} props
 * @param {React.Ref<ProgressRef>} ref
 */
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			"relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
			className,
		)}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className="h-full w-full flex-1 bg-primary transition-all"
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
