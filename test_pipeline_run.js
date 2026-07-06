// Comprehensive episode pipeline diagnostic
// Simulates the exact same code path the live app uses:
// EpisodeList -> animeApi.getAnimeEpisodes -> apiManager.fetchWithSWR -> jikanApi.getAnimeEpisodesAllPages

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'react-native') {
        return {
            Platform: { OS: 'web' },
            StyleSheet: { create: (s) => s },
            useWindowDimensions: () => ({ width: 1024, height: 768 })
        };
    }
    if (id === '@react-native-async-storage/async-storage') {
        return {
            default: {
                getItem: async () => null,
                setItem: async () => { },
                removeItem: async () => { },
                clear: async () => { },
            }
        };
    }
    if (id === 'expo-constants') {
        return {
            default: {
                appOwnership: 'expo',
                executionEnvironment: 'storeClient'
            },
            ExecutionEnvironment: { StoreClient: 'storeClient' }
        };
    }
    return originalRequire.apply(this, arguments);
};

async function run() {
    // Test multiple anime IDs
    const testIds = ["11061", "1535", "21"];
    const animeNames = ["Hunter x Hunter (2011)", "Death Note", "One Piece"];

    // Import the COMPILED services (same as what gets bundled)
    const { jikanApi } = require('./scripts/dist/src/services/api/jikan');
    const { apiManager } = require('./scripts/dist/src/services/api/apiManager');

    for (let i = 0; i < testIds.length; i++) {
        const id = testIds[i];
        const name = animeNames[i];
        console.log(`\n${"=".repeat(60)}`);
        console.log(`TESTING: ${name} (ID: ${id})`);
        console.log(`${"=".repeat(60)}`);

        // PATH A: Direct Jikan call (bypasses SWR)
        console.log("\n--- PATH A: Direct jikanApi.getAnimeEpisodesAllPages ---");
        try {
            const directResult = await jikanApi.getAnimeEpisodesAllPages(id);
            console.log(`  Result: ${directResult.data.length} episodes, totalCount: ${directResult.totalCount}`);
            if (directResult.data.length > 0) {
                console.log(`  First episode: #${directResult.data[0].number} "${directResult.data[0].title}"`);
                console.log(`  Last episode:  #${directResult.data[directResult.data.length - 1].number} "${directResult.data[directResult.data.length - 1].title}"`);
            }
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
        }

        // PATH B: Through apiManager.fetchWithSWR (same as animeApi.getAnimeEpisodes)
        console.log("\n--- PATH B: Through apiManager.fetchWithSWR ---");
        try {
            const swrResult = await apiManager.fetchWithSWR(
                'details',
                `episodes_${id}_all`,
                () => jikanApi.getAnimeEpisodesAllPages(id)
            );
            console.log(`  Result: ${swrResult.data?.length ?? 'undefined'} episodes, totalCount: ${swrResult.totalCount ?? 'undefined'}`);
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
        }

        // PATH C: Through the updated animeApi.getAnimeEpisodes (with cache details and interpolation)
        console.log("\n--- PATH C: Through animeApi.getAnimeEpisodes (Interpolated) ---");
        try {
            const { animeApi } = require('./scripts/dist/src/services/animeApi');
            // 1. Fetch details to seed the details cache (as details page does)
            console.log("  Seeding details cache...");
            const details = await animeApi.getAnimeDetails(id);
            console.log(`  Details episodes: ${details?.episodes ?? 'null'}, nextAiringEpisode: ${JSON.stringify(details?.nextAiringEpisode)}`);

            // 2. Fetch episodes list (interpolated)
            const epResult = await animeApi.getAnimeEpisodes(id);
            console.log(`  Result: ${epResult.data.length} episodes, totalCount: ${epResult.totalCount}`);
            if (epResult.data.length > 0) {
                const lastIdx = epResult.data.length - 1;
                console.log(`  Last 5 episodes in list:`);
                for (let j = Math.max(0, lastIdx - 4); j <= lastIdx; j++) {
                    const ep = epResult.data[j];
                    console.log(`    #${ep.number}: "${ep.title}" (aired: ${ep.aired}, id: ${ep.id})`);
                }
            }
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
        }

        // Wait between anime to avoid rate limits
        if (i < testIds.length - 1) {
            console.log("\n  (waiting 2s for rate limit...)");
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("DIAGNOSTIC COMPLETE");
    console.log(`${"=".repeat(60)}`);
}

run().catch(err => console.error("FATAL:", err));
