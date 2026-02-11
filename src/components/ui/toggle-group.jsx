/**
 * Radix Toggle Group wrappers.
 *
 * Provides a thin abstraction over `@radix-ui/react-toggle-group` with:
 * - consistent `data-slot` attributes
 * - shared `variant` / `size` propagation via React context
 * - styling for items composed from `toggleVariants` (see `ui/toggle.jsx`)
 */

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

/**
 * @typedef {"default" | "outline"} ToggleVariant
 * @typedef {"default" | "sm" | "lg"} ToggleSize
 */

/**
 * @typedef {Object} ToggleGroupStyleContext
 * @property {ToggleSize} size
 * @property {ToggleVariant} variant
 */

/**
 * @typedef {import("react").ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>} ToggleGroupRootProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>} ToggleGroupItemPrimitiveProps
 */

/** @type {import("react").Context<ToggleGroupStyleContext>} */
const ToggleGroupContext = React.createContext({
	size: "default",
	variant: "default",
});

function ToggleGroup({ className, variant, size, children, ...props }) {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			className={cn(
				"group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
				className,
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	);
}

/**
 * @typedef {Object} ToggleGroupProps
 * @property {string=} className
 * @property {ToggleVariant=} variant
 * @property {ToggleSize=} size
 * @property {import("react").ReactNode=} children
 * @property {ToggleGroupRootProps=} [props]
 */

function ToggleGroupItem({ className, children, variant, size, ...props }) {
	const context = React.useContext(ToggleGroupContext);

	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				"min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
				className,
			)}
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	);
}

/**
 * @typedef {Object} ToggleGroupItemProps
 * @property {string=} className
 * @property {import("react").ReactNode=} children
 * @property {ToggleVariant=} variant
 * @property {ToggleSize=} size
 * @property {ToggleGroupItemPrimitiveProps=} [props]
 */

export { ToggleGroup, ToggleGroupItem };
