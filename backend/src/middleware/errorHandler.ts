import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { AppError } from "../utils/AppError";

/**
 * Centrally manages all Express errors (including custom AppErrors and third party errors).
 * Prevents stack trace leakage in response payloads.
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
    const message = err.message || "An unexpected error occurred.";

    logger.error(`Error encountered while processing request [${req.method}] ${req.originalUrl}:`, err);

    res.status(statusCode).json({
        success: false,
        message,
        code: errorCode,
    });
};
