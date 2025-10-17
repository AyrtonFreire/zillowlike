import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000, // 1 second
      maxRequests: 3,
    });
  });

  it("should allow requests within limit", async () => {
    const ip = "192.168.1.1";
    
    expect(await limiter.check(ip)).toBe(true);
    expect(await limiter.check(ip)).toBe(true);
    expect(await limiter.check(ip)).toBe(true);
  });

  it("should block requests exceeding limit", async () => {
    const ip = "192.168.1.2";
    
    await limiter.check(ip);
    await limiter.check(ip);
    await limiter.check(ip);
    
    // 4th request should be blocked
    expect(await limiter.check(ip)).toBe(false);
  });

  it("should reset after window expires", async () => {
    const ip = "192.168.1.3";
    
    // Fill up the limit
    await limiter.check(ip);
    await limiter.check(ip);
    await limiter.check(ip);
    
    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));
    
    // Should allow again
    expect(await limiter.check(ip)).toBe(true);
  });

  it("should track different IPs independently", async () => {
    const ip1 = "192.168.1.4";
    const ip2 = "192.168.1.5";
    
    // Fill up ip1
    await limiter.check(ip1);
    await limiter.check(ip1);
    await limiter.check(ip1);
    
    // ip2 should still work
    expect(await limiter.check(ip2)).toBe(true);
  });

  it("should return remaining requests", async () => {
    const ip = "192.168.1.6";
    
    const result1 = await limiter.checkWithInfo(ip);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);
    
    const result2 = await limiter.checkWithInfo(ip);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
    
    const result3 = await limiter.checkWithInfo(ip);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
    
    const result4 = await limiter.checkWithInfo(ip);
    expect(result4.allowed).toBe(false);
    expect(result4.remaining).toBe(0);
  });
});
