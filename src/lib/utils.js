/**
 * Shared utility helpers.
 *
 * `cn()` composes conditional className values and resolves Tailwind conflicts via `tailwind-merge`.
 */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional className inputs into a single deduped Tailwind-aware string.
 *
 * @param {...import("clsx").ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
