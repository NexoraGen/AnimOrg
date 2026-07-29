import { BackendStatusManager, BackendStatus } from './BackendStatusManager';

export enum QueuePriority {
    HIGH = 1,       // Blocking user action (Anime Details)
    NORMAL = 2,     // Standard fetch (Home screen visible)
    LOW = 3         // Background refresh
}

interface QueuedRequest {
    priority: QueuePriority;
    resolve: () => void;
    timestamp: number;
}

class QueueManager {
    private queue: QueuedRequest[] = [];

    addRequest(priority: QueuePriority): Promise<void> {
        return new Promise<void>((resolve) => {
            this.queue.push({
                priority,
                resolve,
                timestamp: Date.now()
            });
            // Sort ascending by priority so 1 (HIGH) is first
            this.queue.sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp);
        });
    }

    flush() {
        if (this.queue.length === 0) return;
        console.log(`[WarmupQueue] Flushing ${this.queue.length} prioritized requests...`);

        // Execute sequentially with a micro-delay to prevent bursting the Event Loop/Network layer
        const executeNext = () => {
            if (this.queue.length === 0) return;
            const req = this.queue.shift();
            if (req) {
                req.resolve();
            }
            setTimeout(executeNext, 10);
        };

        executeNext();
    }

    failAll() {
        if (this.queue.length === 0) return;
        console.warn(`[WarmupQueue] Failing ${this.queue.length} queued requests due to CircuitBreaker trip.`);
        // Resolve them all anyway so fetch kicks in, fails natively, and CacheManager's offline fallback engages
        this.queue.forEach(req => req.resolve());
        this.queue = [];
    }
}

export const WarmupQueue = new QueueManager();

BackendStatusManager.subscribe((status) => {
    if (status === BackendStatus.READY) {
        WarmupQueue.flush();
    } else if (status === BackendStatus.FAILED) {
        WarmupQueue.failAll();
    }
});
