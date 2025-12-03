// =============================================
// Offline Auth Session Helpers
// ---------------------------------------------
// Purpose: Persist lightweight auth context locally so users
// can reopen the desktop app while offline when "Remember me"
// is enabled. Supabase credentials are not stored—only the
// minimum profile data required for UI access to cached flows.
// =============================================

const STORAGE_KEY = "idmsystem.offlineSession";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const isBrowserEnv = () => typeof window !== "undefined";

export const isOffline = () =>
	typeof navigator !== "undefined" && navigator.onLine === false;

export const clearOfflineSession = () => {
	if (!isBrowserEnv()) return;
	window.localStorage.removeItem(STORAGE_KEY);
};

export const saveOfflineSession = (payload) => {
	if (!isBrowserEnv()) return;
	const record = {
		...payload,
		timestamp: Date.now(),
	};
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

export const loadOfflineSession = () => {
	if (!isBrowserEnv()) return null;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw);
		if (!parsed?.timestamp) {
			clearOfflineSession();
			return null;
		}

		const isExpired = Date.now() - parsed.timestamp > SESSION_TTL_MS;
		if (isExpired) {
			clearOfflineSession();
			return null;
		}

		return parsed;
	} catch (err) {
		console.error("Failed to parse offline session", err);
		clearOfflineSession();
		return null;
	}
};
