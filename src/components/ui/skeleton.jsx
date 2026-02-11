/**
 * Skeleton UI primitive.
 *
 * A presentational placeholder used to indicate loading state.
 *
 * Conventions:
 * - Uses `data-slot="skeleton"` for design-system targeting.
 * - Accepts any `div` props and merges Tailwind classes via `cn()`.
 */

import { cn } from "@/lib/utils";

/**
 * @typedef {import("react").HTMLAttributes<HTMLDivElement>} SkeletonProps
 */

function Skeleton({ className, ...props }) {
	return (
		<div
			data-slot="skeleton"
			className={cn("bg-accent animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
