/**
 * Electron preload bridge wrapper.
 *
 * In Electron builds, `preload.js` exposes a safe API on `window.electronAPI`.
 * In web/renderer-only builds, that API does not exist, so this module provides
 * a minimal no-op fallback to keep imports stable.
 */

/**
 * @typedef {Object} ElectronAPI
 * @property {() => Promise<string>} getAppVersion
 * @property {() => Promise<{success: boolean, message?: string}>} reloadWindow
 */

/**
 * A safe subset of the Electron preload API.
 * @type {ElectronAPI}
 */
const safeBridge =
	typeof window !== "undefined" && window.electronAPI
		? window.electronAPI
		: {
				getAppVersion: async () => "web",
				reloadWindow: async () => ({
					success: false,
					message: "Electron bridge is unavailable.",
				}),
			};

export default safeBridge;
