import type { ZodType } from "zod";
import { AppException } from "@core/exceptions";

export function validateContract<T>(
  schema: ZodType<T>,
  payload: unknown,
  context: string,
): T {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppException("Contract validation failed", {
      code: "CONTRACT_VALIDATION_ERROR",
      statusCode: 400,
      context,
      details: result.error.flatten(),
    });
  }

  return result.data;
}
