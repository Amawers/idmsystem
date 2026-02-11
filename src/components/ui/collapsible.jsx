import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/**
 * Collapsible (Radix)
 *
 * Lightweight wrappers around `@radix-ui/react-collapsible` primitives.
 *
 * Design system conventions:
 * - `data-slot` attributes are applied for consistent styling hooks.
 *
 * Accessibility:
 * - Keyboard/focus behavior and ARIA semantics are provided by Radix.
 */

/** @typedef {React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>} CollapsibleProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>} CollapsibleTriggerProps */
/** @typedef {React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>} CollapsibleContentProps */

/** @param {CollapsibleProps} props */
function Collapsible({ ...props }) {
	return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }) {
	return (
		<CollapsiblePrimitive.CollapsibleTrigger
			data-slot="collapsible-trigger"
			{...props}
		/>
	);
}

function CollapsibleContent({ ...props }) {
	return (
		<CollapsiblePrimitive.CollapsibleContent
			data-slot="collapsible-content"
			{...props}
		/>
	);
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
