import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(async () => [{ ok: 1 }]),
    },
  };
});

import { GET, HEAD } from "../health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return health status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services).toBeDefined();
    expect(data.services.database).toBeDefined();
    expect(data.services.redis).toBeDefined();
  });

  it("should respond to HEAD requests (readiness probe)", async () => {
    const response = await HEAD();

    expect(response.status).toBe(200);
  });

  it("should include uptime", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe("number");
    expect(data.uptime).toBeGreaterThan(0);
  });

  it("should include timestamp", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe("string");
  });
});
