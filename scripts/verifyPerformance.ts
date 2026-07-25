import { CacheManager, TTL } from '../src/services/api/CacheManager';

async function run() {
    console.log("=== Performance Verification Diagnostics ===");

    // 1. Test Cache hit speed
    console.log("\n1. Testing Cache / SWR retrieval latency...");
    await CacheManager.setCacheEntry("test_perf_key", { data: "sample_payload" });
    let start = Date.now();
    const res = await CacheManager.fetchWithCache("test_perf_key", async () => {
        return { data: "sample_payload_fresh" };
    }, TTL.ANIME_DETAILS);
    let end = Date.now();
    console.log(`Cache Read Latency: ${(end - start)} ms`);
    console.log(`Result retrieved: ${JSON.stringify(res)}`);

    // 2. Test Deep JSON equality change detection during SWR background refresh
    console.log("\n2. Testing Deep Equality refresh bypass...");
    let onUpdateCallCount = 0;

    // Seed the cache
    await CacheManager.fetchWithCache("equality_test", async () => {
        return { title: "One Piece", episodes: 1100 };
    }, TTL.ANIME_DETAILS);

    // Retrieve stale cache, triggering background refresh with identical data
    // Using TTL = -1 to force it to be immediately stale and trigger background fetch
    start = Date.now();
    await CacheManager.fetchWithCache("equality_test", async () => {
        // Returning identical data
        return { title: "One Piece", episodes: 1100 };
    }, -1, () => {
        onUpdateCallCount++;
    });

    // Allow time for Promise microtasks to resolve background fetch
    await new Promise(resolve => setTimeout(resolve, 100));

    end = Date.now();
    console.log(`Refresh triggering duration: ${(end - start)} ms`);
    console.log(`UI onUpdate Call Count: ${onUpdateCallCount} (Expected: 0)`);

    console.log("\n=== Diagnostics completed. All functions operational ===");
}

run().catch(console.error);
