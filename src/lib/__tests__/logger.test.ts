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
    logger.error("Error occurred", { err: error });
    expect(spy).toHaveBeenCalled();
  });

  it("should log warnings", () => {
    const spy = vi.spyOn(logger, "warn");
    logger.warn("Warning message", { key: "value" });
    expect(spy).toHaveBeenCalled();
  });

  it("should handle structured logging", () => {
    const spy = vi.spyOn(logger, "info");
    logger.info("User logged in", { userId: "123", action: "login" });
    expect(spy).toHaveBeenCalled();
  });
});
