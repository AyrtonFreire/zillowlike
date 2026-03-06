import { describe, it, expect, beforeAll, afterAll } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3001";

(runIntegration ? describe : describe.skip)("GET /api/properties (integration)", () => {
  let prisma: any;
  let createPublicCode: any;

  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma as any;
    createPublicCode = (await import("@/lib/public-code")).createPublicCode as any;
  });

  beforeAll(async () => {
    // Setup: Create test data
    await (prisma as any).property.create({
      data: {
        publicCode: createPublicCode("P"),
        title: "Test Property",
        description: "Test description",
        price: 100000,
        type: "HOUSE",
        street: "Test Street",
        city: "Petrolina",
        state: "PE",
        latitude: -9.39,
        longitude: -40.5,
      },
    });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await prisma.property.deleteMany({
      where: { title: "Test Property" },
    });
    await prisma.$disconnect();
  });

  it("should return properties list", async () => {
    const response = await fetch(`${baseUrl}/api/properties`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.properties)).toBe(true);
    expect(data.total).toBeGreaterThan(0);
  });

  it("should filter by city", async () => {
    const response = await fetch(`${baseUrl}/api/properties?city=Petrolina`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.properties.every((p: any) => p.city === "Petrolina")).toBe(true);
  });

  it("should filter by type", async () => {
    const response = await fetch(`${baseUrl}/api/properties?type=HOUSE`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.properties.every((p: any) => p.type === "HOUSE")).toBe(true);
  });

  it("should filter by price range", async () => {
    const response = await fetch(
      `${baseUrl}/api/properties?minPrice=50000&maxPrice=200000`
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(
      data.properties.every((p: any) => p.price >= 5000000 && p.price <= 20000000)
    ).toBe(true);
  });

  it("should paginate results", async () => {
    const response = await fetch(`${baseUrl}/api/properties?page=1&pageSize=5`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.properties.length).toBeLessThanOrEqual(5);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(5);
  });

  it("should return property by id", async () => {
    // First get a property
    const listResponse = await fetch(`${baseUrl}/api/properties?pageSize=1`);
    const listData = await listResponse.json();
    const propertyId = listData.properties[0]?.id;

    if (!propertyId) {
      console.warn("No properties found for ID test");
      return;
    }

    const response = await fetch(`${baseUrl}/api/public/properties/${propertyId}`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.item).toBeDefined();
    expect(data.item.id).toBe(propertyId);
  });

  it("should return 404 for non-existent property", async () => {
    const response = await fetch(`${baseUrl}/api/public/properties/non-existent-id`);
    
    expect(response.status).toBe(404);
  });

  it("should validate query parameters", async () => {
    const response = await fetch(`${baseUrl}/api/properties?type=INVALID_TYPE`);
    
    // Should either filter out invalid or return validation error
    expect([200, 400]).toContain(response.status);
  });
});
