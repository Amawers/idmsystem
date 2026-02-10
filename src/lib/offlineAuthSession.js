/**
 * Offline auth session helpers.
 *
 * Persists a lightweight auth context in `localStorage` so users can reopen the app while offline
 * when “Remember me” is enabled.
 *
 * Security note:
 * - This intentionally does not store Supabase credentials/tokens.
 * - Store only the minimum UI/profile context needed for offline cached flows.
 */

/**
 * @typedef {Object} OfflineSessionPayload
 * Arbitrary, sanitized auth/profile snapshot used by the app UI.
 * @property {string} [userId]
 * @property {string} [email]
 * @property {string} [role]
 * @property {string} [avatar_url]
 * @property {string} [status]
 */

/**
 * @typedef {OfflineSessionPayload & { timestamp: number }} OfflineSessionRecord
 */

const STORAGE_KEY = "idmsystem.offlineSession";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** @returns {boolean} True when executed in a browser-like environment. */
const isBrowserEnv = () => typeof window !== "undefined";

/** @returns {boolean} True when the browser reports an offline network state. */
export const isOffline = () =>
	typeof navigator !== "undefined" && navigator.onLine === false;

/** Clears the stored offline session record. */
export const clearOfflineSession = () => {
	if (!isBrowserEnv()) return;
	window.localStorage.removeItem(STORAGE_KEY);
};

/**
 * Stores a sanitized offline session snapshot, with a TTL timestamp.
 * @param {OfflineSessionPayload} payload
 */
export const saveOfflineSession = (payload) => {
	if (!isBrowserEnv()) return;
	/** @type {OfflineSessionRecord} */
	const record = {
		...payload,
		timestamp: Date.now(),
	};
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

/**
 * Loads and validates the offline session snapshot (returns null if missing/invalid/expired).
 * @returns {OfflineSessionRecord | null}
 */
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
