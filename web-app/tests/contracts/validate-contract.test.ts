import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateContract } from "../../core/contracts/validate-contract";
import { AppException } from "@core/exceptions";

const schema = z.object({ id: z.string(), count: z.number().int() });

describe("validateContract", () => {
  it("returns the parsed, typed payload on success", () => {
    const result = validateContract(schema, { id: "a", count: 3 }, "test:ok");
    expect(result).toEqual({ id: "a", count: 3 });
  });

  it("throws an AppException with the calling context on failure", () => {
    try {
      validateContract(schema, { id: "a", count: "not-a-number" }, "test:fail");
      expect.unreachable("validateContract should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      const appErr = err as AppException;
      expect(appErr.code).toBe("CONTRACT_VALIDATION_ERROR");
      expect(appErr.statusCode).toBe(400);
      expect(appErr.context).toBe("test:fail");
    }
  });
});
