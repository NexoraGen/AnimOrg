import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Centrally manages all Express errors (including custom AppErrors and third party errors).
 * Logs the complete detailed error trace (including Axios specifics) to prevent masking.
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    // 1. Log the complete error directly to console for target platform (Render, Railway, etc.) logs
    console.error("=== DETAILED ERROR ENCOUNTERED ===");
    console.error(`- Error Name: ${err?.name || "Error"}`);
    console.error(`- Error Message: ${err?.message || "N/A"}`);
    console.error(`- Error Stack: ${err?.stack || "No Stack Trace"}`);

    if (err?.response) {
        console.error(`- Axios Response Status: ${err.response.status}`);
        console.error(`- Axios Response Body: ${JSON.stringify(err.response.data || {})}`);
    } else {
        console.error("- Axios Response: N/A");
    }

    if (err?.config) {
        console.error(`- Axios Request URL: ${err.config.method?.toUpperCase() || "GET"} ${err.config.url || "N/A"}`);
        console.error(`- Axios Request Params: ${JSON.stringify(err.config.params || {})}`);
        console.error(`- Axios Request Timeout config: ${err.config.timeout || "N/A"}`);
    } else {
        console.error("- Axios Request Config: N/A");
    }
    console.error("===================================");

    // Also run original logger just in case
    logger.error(`Error encountered while processing request [${req.method}] ${req.originalUrl}:`, err);

    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
    const message = err.message || "An unexpected error occurred.";

    res.status(statusCode).json({
        success: false,
        message,
        code: errorCode,
        details: err.message || undefined,
        stack: err.stack || undefined,
    });
};
