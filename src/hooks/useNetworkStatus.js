import { useEffect, useState } from "react";

/**
 * Network status hook.
 *
 * Responsibilities:
 * - Track the browser online/offline state using `navigator.onLine`.
 * - Subscribe to `online`/`offline` window events to keep React state in sync.
 *
 * Notes:
 * - In non-browser environments, defaults to `true`.
 */

/**
 * @typedef {boolean} IsOnline
 */

const getOnlineStatus = () =>
	typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Get the current online status and keep it updated.
 * @returns {IsOnline}
 */
export function useNetworkStatus() {
	const [isOnline, setIsOnline] = useState(getOnlineStatus);

	useEffect(() => {
		const update = () => setIsOnline(getOnlineStatus());
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

	return isOnline;
}

export default useNetworkStatus;
