"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.ForbiddenError = exports.DuplicateError = exports.NotFoundError = exports.TokenInvalidError = exports.TokenExpiredError = exports.AuthenticationError = exports.ValidationError = exports.AppError = exports.HttpStatus = exports.ErrorCode = void 0;
exports.isMongoError = isMongoError;
exports.isJWTError = isJWTError;
exports.normalizeError = normalizeError;
var ErrorCode;
(function (ErrorCode) {
    // Auth errors
    ErrorCode["AUTH_FAILED"] = "AUTH_FAILED";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["TOKEN_INVALID"] = "TOKEN_INVALID";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    // Validation errors
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["DUPLICATE_KEY"] = "DUPLICATE_KEY";
    // Resource errors
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    // Server errors
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
    HttpStatus[HttpStatus["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
})(HttpStatus || (exports.HttpStatus = HttpStatus = {}));
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    errors;
    constructor(message, errors) {
        super(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, HttpStatus.UNAUTHORIZED, ErrorCode.AUTH_FAILED);
    }
}
exports.AuthenticationError = AuthenticationError;
class TokenExpiredError extends AppError {
    constructor(message = "Token has expired") {
        super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED);
    }
}
exports.TokenExpiredError = TokenExpiredError;
class TokenInvalidError extends AppError {
    constructor(message = "Invalid token") {
        super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_INVALID);
    }
}
exports.TokenInvalidError = TokenInvalidError;
class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND);
    }
}
exports.NotFoundError = NotFoundError;
class DuplicateError extends AppError {
    field;
    constructor(message, field) {
        super(message, HttpStatus.CONFLICT, ErrorCode.DUPLICATE_KEY);
        this.field = field;
    }
}
exports.DuplicateError = DuplicateError;
class ForbiddenError extends AppError {
    constructor(message = "Access forbidden") {
        super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN);
    }
}
exports.ForbiddenError = ForbiddenError;
class ServiceUnavailableError extends AppError {
    constructor(message = "Service temporarily unavailable") {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVICE_UNAVAILABLE);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
function isMongoError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "number");
}
function isJWTError(error) {
    return (error instanceof Error &&
        (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError"));
}
function normalizeError(error) {
    if (error instanceof AppError)
        return error;
    if (isMongoError(error)) {
        if (error.code === 11000) {
            const fields = Object.keys(error.keyPattern || {});
            return new DuplicateError(`Duplicate value for ${fields.join(", ")}`, fields[0]);
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
//# sourceMappingURL=error.types.js.map