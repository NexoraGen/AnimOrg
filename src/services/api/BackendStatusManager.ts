export enum BackendStatus {
    UNKNOWN = 'UNKNOWN',
    WAKING = 'WAKING',
    READY = 'READY',
    FAILED = 'FAILED',
    OFFLINE = 'OFFLINE'
}

type Listener = (status: BackendStatus) => void;

class StatusManager {
    private status: BackendStatus = BackendStatus.UNKNOWN;
    private listeners: Set<Listener> = new Set();

    getStatus(): BackendStatus {
        return this.status;
    }

    setStatus(newStatus: BackendStatus) {
        if (this.status === newStatus) return;
        this.status = newStatus;
        this.notifyListeners();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.status));
    }
}

export const BackendStatusManager = new StatusManager();
