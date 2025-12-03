import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "idm.auth.tokens";

const createJsonResponse = (body, status = 200, headers = { "content-type": "application/json" }) => ({
	ok: status >= 200 && status < 300,
	status,
	headers: {
		get: (key) => headers[key.toLowerCase()] ?? headers[key],
	},
	json: async () => body,
	text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

const createLocalStorage = () => {
	let store = {};
	return {
		getItem: (key) => (key in store ? store[key] : null),
		setItem: (key, value) => {
			store[key] = String(value);
		},
		removeItem: (key) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
};

let fetchMock;

async function loadClientModule() {
	vi.resetModules();
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	vi.stubGlobal("window", { localStorage: createLocalStorage() });
	return import("../httpClient.js");
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("httpClient", () => {
	it("persists tokens to localStorage", async () => {
		const { setAuthTokens, getAuthTokens } = await loadClientModule();

		setAuthTokens({ accessToken: "abc", refreshToken: "def" });

		const stored = JSON.parse(window.localStorage.getItem(TOKEN_KEY));
		expect(stored.accessToken).toBe("abc");
		expect(getAuthTokens().refreshToken).toBe("def");
	});

	it("attaches bearer token to requests", async () => {
		const { apiFetch, setAuthTokens } = await loadClientModule();
		setAuthTokens({ accessToken: "token-123", refreshToken: "refresh-123" });

		fetchMock.mockResolvedValueOnce(createJsonResponse({ data: { ok: true } }));

		await apiFetch("/profiles/me", { method: "GET" });

		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers.get("Authorization")).toBe("Bearer token-123");
	});

	it("refreshes access token on 401 responses", async () => {
		const { apiFetch, setAuthTokens, getAuthTokens } = await loadClientModule();
		setAuthTokens({ accessToken: "expired", refreshToken: "refresh-token" });

		fetchMock
			.mockResolvedValueOnce(createJsonResponse({ error: { message: "Unauthorized" } }, 401))
			.mockResolvedValueOnce(
				createJsonResponse({ data: { accessToken: "new-token", refreshToken: "new-refresh" } })
			)
			.mockResolvedValueOnce(createJsonResponse({ data: { ok: true } }));

		const result = await apiFetch("/protected", { method: "GET" });

		expect(result.data.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:4000/api/auth/refresh");
		expect(getAuthTokens().accessToken).toBe("new-token");
	});
});
