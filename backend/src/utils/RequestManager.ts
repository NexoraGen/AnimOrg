class RequestManager {
    private pendingRequests = new Map<string, Promise<any>>();

    async execute<T>(
        key: string,
        request: () => Promise<T>
    ): Promise<T> {
        // Request already in progress
        if (this.pendingRequests.has(key)) {
            console.log(`🔄 Reusing pending request: ${key}`);
            return this.pendingRequests.get(key)!;
        }

        console.log(`🚀 Starting new request: ${key}`);

        // Bind cleanup directly to the promise chain so it executes immediately on settlement
        const promise = request()
            .then((result) => {
                this.pendingRequests.delete(key);
                return result;
            })
            .catch((error) => {
                this.pendingRequests.delete(key);
                throw error;
            });

        this.pendingRequests.set(key, promise);

        return promise;
    }
}

export default new RequestManager();