import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
const loginRequestMock = vi.fn();
const logoutRequestMock = vi.fn();
const getAuthTokensMock = vi.fn(() => ({ accessToken: null, refreshToken: null }));
const clearAuthTokensMock = vi.fn();

vi.mock("@/lib/httpClient", () => ({
	apiFetch: apiFetchMock,
	loginRequest: loginRequestMock,
	logoutRequest: logoutRequestMock,
	getAuthTokens: getAuthTokensMock,
	clearAuthTokens: clearAuthTokensMock,
}));

const createAuditLogMock = vi.fn();

vi.mock("@/lib/auditLog", () => ({
	createAuditLog: createAuditLogMock,
	AUDIT_ACTIONS: {
		LOGIN: "login",
		LOGOUT: "logout",
		PASSWORD_CHANGE: "password_change",
	},
	AUDIT_CATEGORIES: { AUTH: "auth" },
}));

let useAuthStore;

beforeAll(async () => {
	({ useAuthStore } = await import("../authStore.js"));
});

beforeEach(() => {
	useAuthStore.setState({
		user: null,
		avatar_url: null,
		role: null,
		loading: false,
	});
	vi.clearAllMocks();
	getAuthTokensMock.mockReturnValue({ accessToken: null, refreshToken: null });
	logoutRequestMock.mockResolvedValue();
});

describe("authStore", () => {
	it("logs in users and stores profile details", async () => {
		loginRequestMock.mockResolvedValue({
			user: { id: "user-1", email: "case@example.com", role: "case_manager" },
			accessToken: "token",
			refreshToken: "refresh",
		});

		apiFetchMock
			.mockResolvedValueOnce({
				data: {
					id: "user-1",
					email: "case@example.com",
					role: "admin",
					avatar_url: "avatars/user-1.png",
					status: "active",
				},
			})
			.mockResolvedValueOnce({ data: { signedUrl: "https://cdn.example.com/avatar.png" } });

		await useAuthStore.getState().login("case@example.com", "password123");

		const state = useAuthStore.getState();
		expect(state.user.email).toBe("case@example.com");
		expect(state.avatar_url).toBe("https://cdn.example.com/avatar.png");
		expect(state.role).toBe("admin");
		expect(createAuditLogMock).toHaveBeenCalledWith(
			expect.objectContaining({ actionType: "login" })
		);
	});

	it("initializes session when tokens exist", async () => {
		getAuthTokensMock.mockReturnValue({ accessToken: "token", refreshToken: "refresh" });

		apiFetchMock
			.mockResolvedValueOnce({
				data: {
					user: { id: "user-1", email: "session@example.com", role: "case_manager" },
				},
			})
			.mockResolvedValueOnce({
				data: {
					id: "user-1",
					email: "session@example.com",
					role: "case_manager",
					avatar_url: "avatars/user-1.png",
					status: "active",
				},
			})
			.mockResolvedValueOnce({ data: { signedUrl: "https://cdn.example.com/avatar.png" } });

		await useAuthStore.getState().init();

		const state = useAuthStore.getState();
		expect(state.user?.email).toBe("session@example.com");
		expect(state.role).toBe("case_manager");
		expect(state.avatar_url).toContain("https://cdn.example.com");
	});

	it("forces logout when profile is banned", async () => {
		getAuthTokensMock.mockReturnValue({ accessToken: "token", refreshToken: "refresh" });

		apiFetchMock
			.mockResolvedValueOnce({
				data: { user: { id: "user-1", email: "banned@example.com", role: "case_manager" } },
			})
			.mockResolvedValueOnce({
				data: {
					id: "user-1",
					email: "banned@example.com",
					role: "case_manager",
					avatar_url: null,
					status: "banned",
				},
			});

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await useAuthStore.getState().init();

		expect(logoutRequestMock).toHaveBeenCalled();
		const state = useAuthStore.getState();
		expect(state.user).toBeNull();
		expect(state.loading).toBe(false);

		consoleSpy.mockRestore();
	});
});
