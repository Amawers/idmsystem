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
			};

export default safeBridge;
