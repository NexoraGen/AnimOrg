import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

/**
 * Validates that the Anime ID path parameter is a positive integer.
 */
export const validateAnimeId = (req: Request, _res: Response, next: NextFunction) => {
    const id = req.params.id;
    if (!id || typeof id !== "string" || !/^\d+$/.test(id)) {
        return next(new AppError("Anime ID must be a standard positive integer", 400, "INVALID_ANIME_ID"));
    }
    next();
};

/**
 * Validates that the search query parameter 'q' exists and is not empty.
 */
export const validateSearchQuery = (req: Request, _res: Response, next: NextFunction) => {
    const q = req.query.q;
    if (q === undefined || typeof q !== "string" || q.trim().length === 0) {
        return next(new AppError("Search query parameter 'q' is required and cannot be empty", 400, "MISSING_SEARCH_QUERY"));
    }
    next();
};

/**
 * Validates pagination options (page, limit).
 */
export const validatePaginationParams = (req: Request, _res: Response, next: NextFunction) => {
    const { page, limit } = req.query;

    if (page !== undefined) {
        const pageNum = Number(page);
        if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
            return next(new AppError("Page number must be a valid positive integer >= 1", 400, "INVALID_PAGE_NUMBER"));
        }
    }

    if (limit !== undefined) {
        const limitNum = Number(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100 || !Number.isInteger(limitNum)) {
            return next(new AppError("Limit must be a positive integer between 1 and 100", 400, "INVALID_LIMIT"));
        }
    }

    next();
};
