export class CircuitBreakerManager {
    private failureCount = 0;
    private maxFailures = 5;
    private lastFailureTime = 0;
    private cooldownMs = 60000; // 1 minute cooldown

    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        console.warn(`[CircuitBreaker] Failure recorded: ${this.failureCount}/${this.maxFailures}`);
    }

    recordSuccess() {
        if (this.failureCount > 0) {
            console.log(`[CircuitBreaker] Resetting failures due to success.`);
        }
        this.failureCount = 0;
        this.lastFailureTime = 0;
    }

    canRequest(): boolean {
        if (this.failureCount < this.maxFailures) {
            return true;
        }

        // If max failures reached, check cooldown
        const timeSince = Date.now() - this.lastFailureTime;
        if (timeSince > this.cooldownMs) {
            console.log(`[CircuitBreaker] Cooldown expired. Half-opening circuit...`);
            // Half-open state: allow one request
            this.failureCount = this.maxFailures - 1;
            return true;
        }

        console.log(`[CircuitBreaker] BLOCKING request. Circuit is OPEN (Cooldown: ${Math.round((this.cooldownMs - timeSince) / 1000)}s remaining)`);
        return false;
    }

    isTripped(): boolean {
        return this.failureCount >= this.maxFailures && (Date.now() - this.lastFailureTime) <= this.cooldownMs;
    }
}

export const CircuitBreaker = new CircuitBreakerManager();
