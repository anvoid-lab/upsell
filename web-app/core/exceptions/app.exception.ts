export type AppExceptionOptions = {
  code?: string;
  statusCode?: number;
  context?: string;
  details?: unknown;
  cause?: unknown;
};

export class AppException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: string;
  public readonly details?: unknown;

  constructor(message: string, options: AppExceptionOptions = {}) {
    super(message);
    this.name = "AppException";
    this.code = options.code ?? "INTERNAL_ERROR";
    this.statusCode = options.statusCode ?? 500;
    this.context = options.context;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  static wrap(error: unknown, context: string): AppException {
    if (error instanceof AppException) {
      return error;
    }

    if (error instanceof Error) {
      return new AppException(error.message, {
        code: "INTERNAL_ERROR",
        statusCode: 500,
        context,
        cause: error,
      });
    }

    return new AppException("Unknown error", {
      code: "UNKNOWN_ERROR",
      statusCode: 500,
      context,
      details: error,
    });
  }
}
