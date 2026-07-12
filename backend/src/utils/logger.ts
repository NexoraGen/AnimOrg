/**
 * Centralized logging utility for AnimOrg backend.
 * Provides consistent formatting for hits, misses, retries, failures, durations, and errors.
 */

export const logger = {
    info: (msg: string, context?: string) => {
        console.log(`[INFO]${context ? ` [${context}]` : ""} ${msg}`);
    },

    cacheHit: (key: string, durationMs?: number) => {
        console.log(`⚡ [CACHE HIT] Key: "${key}"${durationMs !== undefined ? ` (${durationMs}ms)` : ""}`);
    },

    cacheMiss: (key: string) => {
        console.log(`🎯 [CACHE MISS] Key: "${key}"`);
    },

    retry: (attempt: number, errorMsg: string, delayMs: number) => {
        console.warn(`🔁 [RETRY #${attempt}] Waiting ${delayMs}ms | Due to error: "${errorMsg}"`);
    },

    jikanError: (endpoint: string, status: number, details: string) => {
        console.error(`❌ [JIKAN FAILURE] Endpoint: "${endpoint}" | Status: ${status} | Details: "${details}"`);
    },

    error: (msg: string, err?: any) => {
        const errorStack = err instanceof Error ? err.stack : undefined;
        console.error(`💥 [ERROR] ${msg} ${errorStack ? `\nStack: ${errorStack}` : JSON.stringify(err || "")}`);
    },

    duration: (method: string, path: string, durationMs: number, status?: number) => {
        console.log(`⏱️ [DURATION] ${method} ${path} - Status: ${status || 200} in ${durationMs}ms`);
    }
};

export default logger;
