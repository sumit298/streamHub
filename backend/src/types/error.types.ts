import { MongoServerError } from "mongodb";

export enum ErrorCode {
  // Auth errors
  AUTH_FAILED = "AUTH_FAILED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  FORBIDDEN = "FORBIDDEN",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DUPLICATE_KEY = "DUPLICATE_KEY",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",

  // Server errors
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.AUTH_FAILED);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = "Token has expired") {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED);
  }
}

export class TokenInvalidError extends AppError {
  constructor(message: string = "Invalid token") {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_INVALID);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND);
  }
}

export class DuplicateError extends AppError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, HttpStatus.CONFLICT, ErrorCode.DUPLICATE_KEY);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SERVICE_UNAVAILABLE,
    );
  }
}

export function isMongoError(error: unknown): error is MongoServerError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as MongoServerError).code === "number"
  );
}

export function isJWTError(error: unknown): error is Error & { name: string } {
  return (
    error instanceof Error &&
    (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError")
  );
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isMongoError(error)) {
    if (error.code === 11000) {
      const fields = Object.keys(error.keyPattern || {});
      return new DuplicateError(
        `Duplicate value for ${fields.join(", ")}`,
        fields[0],
      );
    }
    return new AppError("Database error");
  }

  if (isJWTError(error)) {
    return error.name === "TokenExpiredError"
      ? new TokenExpiredError()
      : new TokenInvalidError();
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError("An unknown error occurred");
}
