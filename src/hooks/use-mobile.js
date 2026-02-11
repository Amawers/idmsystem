import * as React from "react";

/**
 * Mobile breakpoint helper hook.
 *
 * Tracks whether the current viewport width is below the mobile breakpoint.
 * Intended for browser/Electron renderer usage (relies on `window`).
 *
 * @typedef {Object} UseIsMobileResult
 * @property {boolean} isMobile
 */

/**
 * Screen width threshold for mobile.
 * `useIsMobile()` returns `true` when `window.innerWidth < MOBILE_BREAKPOINT`.
 */
const MOBILE_BREAKPOINT = 768;

/**
 * Detect if the viewport is currently in the mobile breakpoint.
 * @returns {boolean}
 */
export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(undefined);

	React.useEffect(() => {
		const mql = window.matchMedia(
			`(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
		);

		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};

		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

		return () => mql.removeEventListener("change", onChange);
	}, []);

	return !!isMobile;
}
