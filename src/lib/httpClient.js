const DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const TOKEN_STORAGE_KEY = "idm.auth.tokens";

const apiBaseUrl = (import.meta.env?.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

let authTokens = loadStoredTokens();
let refreshPromise = null;

function loadStoredTokens() {
	if (typeof window === "undefined") {
		return { accessToken: null, refreshToken: null, expiresAt: null, tokenId: null };
	}

	try {
		const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
		return raw
			? JSON.parse(raw)
			: { accessToken: null, refreshToken: null, expiresAt: null, tokenId: null };
	} catch (error) {
		console.warn("Failed to parse stored auth tokens", error);
		return { accessToken: null, refreshToken: null, expiresAt: null, tokenId: null };
	}
}

function persistTokens() {
	if (typeof window === "undefined") return;

	if (!authTokens?.accessToken && !authTokens?.refreshToken) {
		window.localStorage.removeItem(TOKEN_STORAGE_KEY);
		return;
	}

	window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(authTokens));
}

export function getApiBaseUrl() {
	return apiBaseUrl;
}

export function getAuthTokens() {
	return { ...authTokens };
}

export function setAuthTokens(tokens) {
	authTokens = {
		accessToken: tokens.accessToken ?? authTokens.accessToken ?? null,
		refreshToken: tokens.refreshToken ?? authTokens.refreshToken ?? null,
		expiresAt: tokens.expiresAt ?? authTokens.expiresAt ?? null,
		tokenId: tokens.tokenId ?? authTokens.tokenId ?? null,
	};
	persistTokens();
}

export function clearAuthTokens() {
	authTokens = { accessToken: null, refreshToken: null, expiresAt: null, tokenId: null };
	persistTokens();
}

async function refreshAccessToken() {
	if (!authTokens.refreshToken) {
		return false;
	}

	if (refreshPromise) {
		return refreshPromise;
	}

	const url = `${apiBaseUrl}/auth/refresh`;

	refreshPromise = fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken: authTokens.refreshToken }),
	})
		.then(async (response) => {
			if (!response.ok) {
				throw new Error("Unable to refresh session");
			}

			const payload = await response.json();
			const tokens = payload?.data;
			if (!tokens?.accessToken) {
				throw new Error("Malformed refresh response");
			}

			setAuthTokens(tokens);
			return true;
		})
		.catch((error) => {
			console.error("Refresh token flow failed", error);
			clearAuthTokens();
			return false;
		})
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

function buildRequestUrl(path) {
	if (!path) return apiBaseUrl;
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}
	if (path.startsWith("/")) {
		return `${apiBaseUrl}${path}`;
	}
	return `${apiBaseUrl}/${path}`;
}

function prepareBody(body, headers = new Headers()) {
	if (!body || body instanceof FormData || body instanceof Blob) {
		return { body, headers };
	}

	if (typeof body === "string") {
		headers.set("Content-Type", headers.get("Content-Type") || "text/plain" );
		return { body, headers };
	}

	headers.set("Content-Type", headers.get("Content-Type") || "application/json" );
	return { body: JSON.stringify(body), headers };
}

export async function apiFetch(path, options = {}, config = {}) {
	const { skipAuth = false, retryOnAuthFailure = true } = config;
	const url = buildRequestUrl(path);
	const headers = new Headers(options.headers || {});

	if (!skipAuth && authTokens.accessToken) {
		headers.set("Authorization", `Bearer ${authTokens.accessToken}`);
	}

	let body = options.body;
	const prepared = prepareBody(body, headers);

	const response = await fetch(url, {
		...options,
		headers: prepared.headers,
		body: prepared.body,
	});

	if (response.status === 401 && !skipAuth && retryOnAuthFailure) {
		const refreshed = await refreshAccessToken();
		if (refreshed) {
			return apiFetch(path, options, { skipAuth, retryOnAuthFailure: false });
		}
	}

	const contentType = response.headers.get("content-type") || "";
	let payload = null;

	if (contentType.includes("application/json")) {
		payload = await response.json();
	} else {
		const text = await response.text();
		payload = text ? { data: text } : { data: null };
	}

	if (!response.ok) {
		const error = new Error(payload?.error?.message || response.statusText);
		error.status = response.status;
		error.details = payload?.error?.details;
		throw error;
	}

	return {
		data: payload?.data ?? null,
		meta: payload?.meta ?? null,
		raw: payload,
	};
}

export async function authorizedJsonFetch(path, body, method = "POST") {
	return apiFetch(path, { method, body }, { skipAuth: false });
}

export async function loginRequest(credentials) {
	const result = await apiFetch("/auth/login", { method: "POST", body: credentials }, { skipAuth: true });
	setAuthTokens(result.data);
	return result.data;
}

export async function logoutRequest() {
	try {
		await apiFetch("/auth/logout", { method: "POST" }, { skipAuth: false });
	} finally {
		clearAuthTokens();
	}
}
