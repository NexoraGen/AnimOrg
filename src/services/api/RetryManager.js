"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryManager = void 0;
/**
 * Centralized Retry logic for all UnifiedAnimeService network calls.
 * Implements exponential backoff and fail-fast for specific HTTP codes.
 */
exports.RetryManager = {
    /**
     * Executes a network operation with automatic exponential backoff.
     *
     * @param operation The async function to execute.
     * @param maxRetries Number of retries (Default 3).
     * @param baseDelay Ms to wait on first retry (Default 1000).
     * @returns Result of operation.
     */
    execute(operation_1) {
        return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 3, baseDelay = 1000, onRetryStatus) {
            var _a, _b, _c, _d, _e, _f;
            for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
                try {
                    if (attempt > 1 && onRetryStatus) {
                        onRetryStatus(`Retrying (${attempt - 1}/${maxRetries})...`);
                    }
                    return yield operation(attempt);
                }
                catch (error) {
                    // Evaluate if this is a fail-fast scenario (Client errors 4xx)
                    const isClientError = ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('400')) ||
                        ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('401')) ||
                        ((_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.includes('403')) ||
                        ((_d = error === null || error === void 0 ? void 0 : error.message) === null || _d === void 0 ? void 0 : _d.includes('404')) ||
                        ((_e = error === null || error === void 0 ? void 0 : error.message) === null || _e === void 0 ? void 0 : _e.includes('409')) ||
                        ((_f = error === null || error === void 0 ? void 0 : error.message) === null || _f === void 0 ? void 0 : _f.includes('422'));
                    // Immediately abort without retries for Client Errors
                    if (isClientError) {
                        console.warn(`[RetryManager] Fail-fast triggered. Client error detected: ${error.message}`);
                        throw error;
                    }
                    // If we exhausted all attempts, throw the final error
                    if (attempt > maxRetries) {
                        console.warn(`[RetryManager] Exhausted all ${maxRetries} retries. Target operation failed.`);
                        throw error;
                    }
                    // It is a server/network error we CAN retry (500, 502, 503, 504, Timeout, Network Error)
                    console.warn(`[RetryManager] Network/Server Error (Attempt ${attempt}/${maxRetries}): ${error.message}`);
                    // Wait before next attempt (Exponential backoff: 1s, 2s, 4s...)
                    const waitTime = baseDelay * Math.pow(2, attempt - 1);
                    yield new Promise(res => setTimeout(res, waitTime));
                }
            }
            throw new Error('RetryManager failed unconditionally.');
        });
    }
};
