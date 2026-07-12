import axios, { InternalAxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import logger from "./logger";

// Extend Axios request config interface to support custom metadata
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    metadata?: {
        startTime?: Date;
        retryCount?: number;
    };
    // Allow callers to disable retries per-request (e.g. search)
    "axios-retry"?: {
        retries?: number;
    };
}

const axiosClient = axios.create({
    timeout: 10000,
});

console.log("Axios default timeout =", axiosClient.defaults.timeout);

// Request Interceptor to log startTime and ensure browser-like headers
axiosClient.interceptors.request.use(
    (config: CustomAxiosRequestConfig) => {
        // Initialize metadata on first attempt; on retries axios-retry re-uses the config
        if (!config.metadata?.startTime) {
            config.metadata = { startTime: new Date(), retryCount: 0 };
        } else {
            // Increment retry counter on subsequent attempts
            config.metadata.retryCount = (config.metadata.retryCount || 0) + 1;
            console.log(`[Axios Retry] Retry #${config.metadata.retryCount} for ${config.url || ""}`);
        }

        // Log the exact Axios timeout configuration for this request
        console.log(`[Axios Debug] Requesting ${config.url || ""}. Config timeout =`, config.timeout);

        // Ensure browser headers are injected directly to prevent Axios defaults and Jikan rate-limiting blocks
        config.headers = config.headers || {};
        config.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        config.headers["Accept"] = "application/json, text/plain, */*";
        config.headers["Accept-Encoding"] = "gzip, deflate, br";

        logger.info(`Requesting provider URL: ${config.method?.toUpperCase() || "GET"} ${config.url || ""}`, "JikanProvider");
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor to log request duration
axiosClient.interceptors.response.use(
    (response) => {
        const config = response.config as CustomAxiosRequestConfig;
        if (config.metadata?.startTime) {
            const duration = new Date().getTime() - config.metadata.startTime.getTime();
            const retries = config.metadata.retryCount || 0;
            logger.duration(
                config.method?.toUpperCase() || "GET",
                config.url || "",
                duration,
                response.status
            );
            const cfCache = response.headers["cf-cache-status"];
            console.log(`[Axios Debug] Total duration: ${duration}ms | Retries: ${retries} | CF-Cache-Status: ${cfCache || "NONE"}`);
        }
        return response;
    },
    (error) => {
        const config = error.config as CustomAxiosRequestConfig | undefined;
        if (config?.metadata?.startTime) {
            const duration = new Date().getTime() - config.metadata.startTime.getTime();
            const retries = config.metadata.retryCount || 0;
            logger.duration(
                config.method?.toUpperCase() || "GET",
                config.url || "",
                duration,
                error.response?.status || 500
            );
            console.log(`[Axios Debug] FAILED Total duration: ${duration}ms | Retries: ${retries} | Status: ${error.response?.status || "N/A"}`);
        }

        // Log Jikan query failures
        const status = error.response?.status || 500;
        const details = error.response?.data?.error || error.message || "Unknown error";
        logger.jikanError(config?.url || "", status, details);

        return Promise.reject(error);
    }
);

// Configure retry policy with custom logging
// IMPORTANT: HTTP 504 is NOT retried — upstream gateway timeouts are terminal failures.
// Retrying 504s caused 34+ second delays per search request.
axiosRetry(axiosClient, {
    retries: 2,
    retryDelay: (retryCount, error) => {
        const status = error.response?.status;
        const headers = error.response?.headers;

        // Respect Retry-After header for HTTP 429
        if (status === 429 && headers) {
            const retryAfterHeader = headers["retry-after"];
            if (retryAfterHeader) {
                const seconds = parseInt(retryAfterHeader, 10);
                if (!isNaN(seconds)) {
                    const delayMs = seconds * 1000;
                    logger.retry(retryCount, `HTTP 429: Respecting Retry-After header. Waiting ${delayMs}ms.`, delayMs);
                    return delayMs;
                }
                const timestamp = Date.parse(retryAfterHeader);
                if (!isNaN(timestamp)) {
                    const delayMs = Math.max(0, timestamp - Date.now());
                    logger.retry(retryCount, `HTTP 429: Respecting Retry-After date. Waiting ${delayMs}ms.`, delayMs);
                    return delayMs;
                }
            }
        }

        // Fixed short delay (no exponential backoff) to keep failure fast
        const delayMs = 1000;

        const errorMsg = status ? `HTTP status ${status}` : error.message || "Axios retry triggered";
        logger.retry(retryCount, errorMsg, delayMs);
        return delayMs;
    },
    retryCondition: (error) => {
        const status = error.response?.status;

        // Never retry these statuses — they are terminal failures
        const noRetryStatuses = [400, 401, 403, 404, 504];
        if (status && noRetryStatuses.includes(status)) {
            console.log(`[Axios Retry] NOT retrying status ${status} — terminal failure`);
            return false;
        }

        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            status === 408 ||
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503
        );
    },
});

/**
 * Creates a per-request config that disables all retries.
 * Use this for search endpoints where fast failure is required.
 */
export function noRetryConfig(config?: Record<string, any>): Record<string, any> {
    return {
        ...config,
        "axios-retry": { retries: 0 },
    };
}

export default axiosClient;