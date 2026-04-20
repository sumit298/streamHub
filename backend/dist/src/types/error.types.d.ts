import { MongoServerError } from "mongodb";
export declare enum ErrorCode {
    AUTH_FAILED = "AUTH_FAILED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_INVALID = "TOKEN_INVALID",
    FORBIDDEN = "FORBIDDEN",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    DUPLICATE_KEY = "DUPLICATE_KEY",
    NOT_FOUND = "NOT_FOUND",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export declare enum HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503
}
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare class ValidationError extends AppError {
    errors?: Record<string, string> | undefined;
    constructor(message: string, errors?: Record<string, string> | undefined);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class TokenExpiredError extends AppError {
    constructor(message?: string);
}
export declare class TokenInvalidError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class DuplicateError extends AppError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string);
}
export declare function isMongoError(error: unknown): error is MongoServerError;
export declare function isJWTError(error: unknown): error is Error & {
    name: string;
};
export declare function normalizeError(error: unknown): AppError;
