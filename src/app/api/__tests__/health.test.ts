import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("should return health status", async () => {
    const response = await fetch("http://localhost:3001/api/health");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services).toBeDefined();
    expect(data.services.database).toBeDefined();
    expect(data.services.redis).toBeDefined();
  });

  it("should respond to HEAD requests (readiness probe)", async () => {
    const response = await fetch("http://localhost:3001/api/health", {
      method: "HEAD",
    });

    expect(response.status).toBe(200);
  });

  it("should include uptime", async () => {
    const response = await fetch("http://localhost:3001/api/health");
    const data = await response.json();

    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe("number");
    expect(data.uptime).toBeGreaterThan(0);
  });

  it("should include timestamp", async () => {
    const response = await fetch("http://localhost:3001/api/health");
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe("string");
  });
});
