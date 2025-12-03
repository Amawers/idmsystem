import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/lib/httpClient", () => ({
	apiFetch: apiFetchMock,
}));

const { createAuditLog, fetchAuditLogs } = await import("../auditLog.js");

beforeEach(() => {
	apiFetchMock.mockReset();
});

describe("auditLog helper", () => {
	it("creates audit entries via API", async () => {
		apiFetchMock.mockResolvedValue({ data: { id: "log-1" } });

		const payload = {
			actionType: "login",
			actionCategory: "auth",
			description: "Logged in",
			resourceType: "user",
			resourceId: "user-1",
			metadata: { ip: "127.0.0.1" },
			severity: "info",
		};

		const data = await createAuditLog(payload);

		expect(apiFetchMock).toHaveBeenCalledWith("/audit", {
			method: "POST",
			body: payload,
		});
		expect(data.id).toBe("log-1");
	});

	it("fetches audit logs with filters and pagination", async () => {
		apiFetchMock.mockResolvedValue({
			data: [{ id: "log-2" }],
			meta: { count: 12 },
		});

		const filters = {
			userId: "54d5e1ac-0f76-4a2f-9fca-8f8d899f2c1e",
			actionCategory: "case",
			actionType: "create_case",
			severity: "warning",
			startDate: new Date("2024-01-01T00:00:00.000Z"),
			endDate: "2024-02-01T00:00:00.000Z",
			limit: 25,
			offset: 0,
		};

		const result = await fetchAuditLogs(filters);

		expect(apiFetchMock).toHaveBeenCalledTimes(1);
		const [url] = apiFetchMock.mock.calls[0];
		expect(url).toContain("/audit?");
		expect(url).toContain("userId=54d5e1ac-0f76-4a2f-9fca-8f8d899f2c1e");
		expect(url).toContain("limit=25");
		expect(result.count).toBe(12);
		expect(result.data).toHaveLength(1);
	});
});
