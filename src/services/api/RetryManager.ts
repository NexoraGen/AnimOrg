/**
 * Centralized Retry logic for all UnifiedAnimeService network calls.
 * Implements exponential backoff and fail-fast for specific HTTP codes.
 */
export const RetryManager = {
    /**
     * Executes a network operation with automatic exponential backoff.
     *
     * @param operation The async function to execute.
     * @param maxRetries Number of retries (Default 3).
     * @param baseDelay Ms to wait on first retry (Default 1000).
     * @returns Result of operation.
     */
    async execute<T>(
        operation: (attempt: number) => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000,
        onRetryStatus?: (msg: string) => void
    ): Promise<T> {
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                if (attempt > 1 && onRetryStatus) {
                    onRetryStatus(`Retrying (${attempt - 1}/${maxRetries})...`);
                }
                return await operation(attempt);
            } catch (error: any) {
                // Evaluate if this is a fail-fast scenario (Client errors 4xx)
                const isClientError = error?.message?.includes('400') ||
                    error?.message?.includes('401') ||
                    error?.message?.includes('403') ||
                    error?.message?.includes('404') ||
                    error?.message?.includes('409') ||
                    error?.message?.includes('422');

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
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
        throw new Error('RetryManager failed unconditionally.');
    }
};
