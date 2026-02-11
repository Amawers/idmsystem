/**
 * Radix Tabs wrappers.
 *
 * These components wrap `@radix-ui/react-tabs` to standardize:
 * - Tailwind styling via `cn()`
 * - `data-slot` attributes used by the local component system
 *
 * Exports:
 * - `Tabs`: root container (controls value / defaultValue)
 * - `TabsList`: tab list container
 * - `TabsTrigger`: clickable trigger bound to a `value`
 * - `TabsContent`: content panel bound to a `value`
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TabsPrimitive.Root>} TabsRootProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TabsPrimitive.List>} TabsListProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>} TabsTriggerProps
 * @typedef {import("react").ComponentPropsWithoutRef<typeof TabsPrimitive.Content>} TabsContentProps
 */

function Tabs({ className, ...props }) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function TabsList({ className, ...props }) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-lg data-[state=active]:scale-105 data-[state=active]:font-semibold data-[state=active]:-translate-y-0.5 hover:bg-muted/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
