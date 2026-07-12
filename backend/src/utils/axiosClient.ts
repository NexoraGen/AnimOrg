import axios, { InternalAxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import logger from "./logger";

// Extend Axios request config interface to support custom metadata
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    metadata?: {
        startTime?: Date;
    };
}

const axiosClient = axios.create({
    timeout: 10000,
});

// Request Interceptor to log startTime and ensure browser-like headers
axiosClient.interceptors.request.use(
    (config: CustomAxiosRequestConfig) => {
        config.metadata = { startTime: new Date() };

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
            logger.duration(
                config.method?.toUpperCase() || "GET",
                config.url || "",
                duration,
                response.status
            );
        }
        return response;
    },
    (error) => {
        const config = error.config as CustomAxiosRequestConfig | undefined;
        if (config?.metadata?.startTime) {
            const duration = new Date().getTime() - config.metadata.startTime.getTime();
            logger.duration(
                config.method?.toUpperCase() || "GET",
                config.url || "",
                duration,
                error.response?.status || 500
            );
        }

        // Log Jikan query failures
        const status = error.response?.status || 500;
        const details = error.response?.data?.error || error.message || "Unknown error";
        logger.jikanError(config?.url || "", status, details);

        return Promise.reject(error);
    }
);

// Configure retry policy with custom logging
axiosRetry(axiosClient, {
    retries: 3,
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

        // Exponential backoff with jitter
        const baseDelay = 1000;
        const maxDelay = 10000;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000;
        const delayMs = Math.min(maxDelay, exponentialDelay + jitter);

        const errorMsg = status ? `HTTP status ${status}` : error.message || "Axios retry triggered";
        logger.retry(retryCount, errorMsg, delayMs);
        return delayMs;
    },
    retryCondition: (error) => {
        const DangerStatusCodes = [400, 401, 403, 404];
        const status = error.response?.status;

        if (status && DangerStatusCodes.includes(status)) {
            return false;
        }

        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            status === 408 ||
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504
        );
    },
});

export default axiosClient;