import { BACKEND_BASE } from './apiClient';
import { BackendStatusManager, BackendStatus } from './BackendStatusManager';
import { CircuitBreaker } from './CircuitBreaker';

const fetchWithTimeout = (url: string, options: any, timeoutMs: number): Promise<Response> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
        fetch(url, options)
            .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

function throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

class BackendWarmupManager {
    private warmupStarted = false;
    private wakeupPromise: Promise<void> | null = null;

    // Throttled feature warmup prevents massive bursts of requests
    public triggerFeatureWarmup = throttle((featureName: string) => {
        if (BackendStatusManager.getStatus() === BackendStatus.READY) return;

        console.log(`[Warmup] Trigger: ${featureName} / Feature-Aware Wake Request Sent`);
        this.startWarmup();
    }, 10000); // 10 seconds throttle

    startWarmup() {
        if (this.warmupStarted) return;
        const currentStatus = BackendStatusManager.getStatus();
        if (currentStatus === BackendStatus.READY) return;

        if (!CircuitBreaker.canRequest()) {
            console.log(`[Warmup] Blocked by Circuit Breaker.`);
            BackendStatusManager.setStatus(BackendStatus.FAILED);
            return;
        }

        this.warmupStarted = true;
        BackendStatusManager.setStatus(BackendStatus.WAKING);
        console.log(`[Warmup] Started background wake sequence. Targeting: ${BACKEND_BASE}`);

        if (!this.wakeupPromise) {
            this.wakeupPromise = this.attemptWakeup(0).finally(() => {
                this.wakeupPromise = null;
                this.warmupStarted = false;
            });
        }
    }

    private async attemptWakeup(attempt: number): Promise<void> {
        if (!CircuitBreaker.canRequest()) {
            BackendStatusManager.setStatus(BackendStatus.FAILED);
            return;
        }

        const delays = [0, 5000, 10000, 20000, 30000];

        if (attempt >= delays.length) {
            console.warn(`[Warmup] Exhausted retries. Marking FAILED.`);
            BackendStatusManager.setStatus(BackendStatus.FAILED);
            return;
        }

        const delay = delays[attempt];
        const jitter = Math.random() * 1000;

        if (delay > 0) {
            console.log(`[Warmup] Retry scheduled in ${Math.round((delay + jitter) / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }

        console.log(`[Warmup] Attempt ${attempt + 1}`);
        const attemptStart = Date.now();

        try {
            const res = await fetchWithTimeout(
                `${BACKEND_BASE}/healthz`,
                { method: 'GET' },
                5000 + (attempt * 2500)
            );

            if (res.ok) {
                console.log(`[Warmup] Backend READY! Total wake time: ${Date.now() - attemptStart}ms`);
                CircuitBreaker.recordSuccess();
                BackendStatusManager.setStatus(BackendStatus.READY);
                return;
            } else {
                throw new Error(`Non-OK Response: ${res.status}`);
            }
        } catch (error: any) {
            console.log(`[Warmup] Attempt ${attempt + 1} failed:`, error?.message || 'Unknown network error');

            if (error?.message === 'Network request failed' && attempt === 0) {
                console.warn(`[Warmup] Network request failed completely. Assumed OFFLINE.`);
                BackendStatusManager.setStatus(BackendStatus.OFFLINE);
            }

            CircuitBreaker.recordFailure();
            return this.attemptWakeup(attempt + 1);
        }
    }

    retryIfFailed() {
        if (BackendStatusManager.getStatus() === BackendStatus.FAILED || BackendStatusManager.getStatus() === BackendStatus.OFFLINE) {
            this.startWarmup();
        }
    }
}

export const BackendWarmupService = new BackendWarmupManager();
