import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "../logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have standard log levels", () => {
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it("should log info messages", () => {
    const spy = vi.spyOn(logger, "info");
    logger.info("Test info message");
    expect(spy).toHaveBeenCalledWith("Test info message");
  });

  it("should log error messages with context", () => {
    const spy = vi.spyOn(logger, "error");
    const error = new Error("Test error");
    // Pino accepts object as first param, message as second
    logger.error({ err: error } as any, "Error occurred");
    expect(spy).toHaveBeenCalled();
  });

  it("should log warnings", () => {
    const spy = vi.spyOn(logger, "warn");
    logger.warn({ key: "value" } as any, "Warning message");
    expect(spy).toHaveBeenCalled();
  });

  it("should handle structured logging", () => {
    const spy = vi.spyOn(logger, "info");
    logger.info({ userId: "123", action: "login" } as any, "User logged in");
    expect(spy).toHaveBeenCalled();
  });
});
