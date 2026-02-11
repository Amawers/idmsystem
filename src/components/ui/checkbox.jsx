import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox (Radix)
 *
 * A styled wrapper around `@radix-ui/react-checkbox`.
 *
 * Design system conventions:
 * - Uses `data-slot` attributes (`checkbox`, `checkbox-indicator`) as stable styling hooks.
 * - Visual state is driven by Radix `data-state` (e.g. `checked`) and Tailwind selectors.
 *
 * Accessibility:
 * - ARIA semantics and keyboard interactions are handled by Radix.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>} CheckboxProps */

/** @param {CheckboxProps} props */
function Checkbox({ className, ...props }) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current transition-none"
			>
				<CheckIcon className="size-3.5" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
