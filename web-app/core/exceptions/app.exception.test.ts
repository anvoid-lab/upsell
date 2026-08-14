import { describe, expect, it } from "vitest";
import { AppException } from "./app.exception";

describe("AppException", () => {
  it("defaults code and statusCode when not provided", () => {
    const err = new AppException("boom");
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppException");
  });

  it("carries context, details and cause through", () => {
    const cause = new Error("root cause");
    const err = new AppException("boom", {
      code: "CUSTOM",
      statusCode: 400,
      context: "test:ctx",
      details: { field: "x" },
      cause,
    });
    expect(err.code).toBe("CUSTOM");
    expect(err.statusCode).toBe(400);
    expect(err.context).toBe("test:ctx");
    expect(err.details).toEqual({ field: "x" });
    expect(err.cause).toBe(cause);
  });

  describe("wrap", () => {
    it("returns an AppException unchanged", () => {
      const original = new AppException("already wrapped", { code: "X" });
      expect(AppException.wrap(original, "some:context")).toBe(original);
    });

    it("wraps a plain Error, preserving its message and attaching it as cause", () => {
      const original = new Error("db exploded");
      const wrapped = AppException.wrap(original, "BaseRepository.findAll:conversations");
      expect(wrapped).toBeInstanceOf(AppException);
      expect(wrapped.message).toBe("db exploded");
      expect(wrapped.code).toBe("INTERNAL_ERROR");
      expect(wrapped.context).toBe("BaseRepository.findAll:conversations");
      expect(wrapped.cause).toBe(original);
    });

    it("wraps a non-Error throw without crashing", () => {
      const wrapped = AppException.wrap("a string was thrown", "ctx");
      expect(wrapped.code).toBe("UNKNOWN_ERROR");
      expect(wrapped.message).toBe("Unknown error");
      expect(wrapped.details).toBe("a string was thrown");
    });
  });
});
