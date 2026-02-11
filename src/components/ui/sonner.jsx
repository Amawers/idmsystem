/**
 * Sonner toaster wrapper.
 *
 * Centralizes toast rendering and styling so the rest of the app can call
 * `toast.*` without needing to manage provider placement.
 *
 * Responsibilities:
 * - Reads the active theme from `next-themes`.
 * - Applies app CSS variables to Sonner's base styles.
 * - Forwards remaining props to Sonner's `<Toaster />`.
 */

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/**
 * @typedef {import("react").ComponentPropsWithoutRef<typeof Sonner>} SonnerToasterProps
 */

/**
 * @param {SonnerToasterProps} props
 * @returns {import("react").ReactNode}
 */
const Toaster = ({ ...props }) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			style={{
				"--normal-bg": "var(--popover)",
				"--normal-text": "var(--popover-foreground)",
				"--normal-border": "var(--border)",
			}}
			{...props}
		/>
	);
};

export { Toaster };
