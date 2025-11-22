/**
 * @file programSyncUtils.js
 * @description Shared utilities for coordinating Program Catalog reload + sync behavior
 * @module components/programs/programSyncUtils
 */

/** SessionStorage key used to signal that Program Catalog must auto-sync after reload */
export const PROGRAM_FORCE_SYNC_KEY = "programCatalog.forceSync";
export const PROGRAM_DEFERRED_RELOAD_KEY = "programCatalog.deferReload";
export const PROGRAM_ACTIVE_TAB_KEY = "programManagement.activeTab";
export const PROGRAM_FORCE_TAB_KEY = "programManagement.forceTabAfterReload";

const DEFAULT_PROGRAM_TAB = "programs";

/**
 * Schedule a Program Catalog reload that will trigger an immediate sync afterwards.
 * Mirrors the Case Management pattern: mark intent in session storage and reload the page.
 */
export function scheduleProgramSyncReload(targetTab = DEFAULT_PROGRAM_TAB) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(PROGRAM_FORCE_SYNC_KEY, "true");
        window.sessionStorage.setItem(PROGRAM_ACTIVE_TAB_KEY, targetTab);
        window.sessionStorage.setItem(PROGRAM_FORCE_TAB_KEY, targetTab);
    } catch {
        // Swallow storage errors silently; reload still proceeds.
    }
    window.location.reload();
}

export function forceProgramTabReload(targetTab = DEFAULT_PROGRAM_TAB) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(PROGRAM_ACTIVE_TAB_KEY, targetTab);
        window.sessionStorage.setItem(PROGRAM_FORCE_TAB_KEY, targetTab);
    } catch {
        // Ignore storage issues; reload still proceeds even without tab hints.
    }
    window.location.reload();
}

/**
 * Flag the Program Catalog to reload once connectivity returns.
 * Useful when an operation was queued offline so the UI can refresh immediately on reconnection.
 */
export function markProgramReloadOnReconnect() {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(PROGRAM_DEFERRED_RELOAD_KEY, "true");
    } catch {
        // Ignore storage issues; at worst the UI won't auto-reload.
    }
}
