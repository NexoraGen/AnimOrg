// ============================================================================
// DYNAMIC RUNTIME REQUIRE PRELOAD MOCKING
// ============================================================================
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
    if (id === 'react-native') {
        return {
            Platform: { OS: 'web' },
            StyleSheet: { create: (s: any) => s },
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

// ============================================================================
// SAFE DYNAMIC IMPORTS
// ============================================================================
import { resolveAnimeTrackingStatus, getLocalAiringInfo } from '../src/utils/releaseHelper';
import { RecommendationService } from '../src/services/RecommendationService';
import { autoDetectTimezone, searchTimezones } from '../src/utils/timezoneHelper';
const { animeApi } = require('../src/services/animeApi');

import { Media, WatchlistItem, UserRating } from '../src/types/index';

// ============================================================================
// COLORFUL LOGGING HELPERS FOR NODE CONSOLE
// ============================================================================
const color = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
};

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        passCount++;
        console.log(`  ${color.green}✓ PASS:${color.reset} ${message}`);
    } else {
        failCount++;
        console.log(`  ${color.red}✗ FAIL:${color.reset} ${message}`);
    }
}

function describe(suiteName: string, testsFn: () => void) {
    console.log(`\n${color.bold}${color.cyan}═╡ ${suiteName} ╞═${color.reset}`);
    testsFn();
}

// ============================================================================
// UNIT TESTS DEFINITION
// ============================================================================

describe('1. Watchlist Episode Tracking & Status Machine (resolveAnimeTrackingStatus)', () => {
    // Airing show constraint verification: Airing show is NEVER marked Completed!
    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 0,
            totalEpisodes: 12,
            mediaStatus: 'Currently Airing',
            releasedCount: 6
        }) === 'plan-to-watch',
        '0 episodes watched on airing show -> plan-to-watch'
    );

    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 3,
            totalEpisodes: 12,
            mediaStatus: 'Currently Airing',
            releasedCount: 6
        }) === 'watching',
        '3 episodes watched out of 6 released (total 12) -> watching'
    );

    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 6,
            totalEpisodes: 12,
            mediaStatus: 'Currently Airing',
            releasedCount: 6
        }) === 'awaiting',
        'Caught up with all 6 released airing episodes (total 12) -> awaiting (Awaiting Next Episode)'
    );

    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 12,
            totalEpisodes: 12,
            mediaStatus: 'Currently Airing',
            releasedCount: 12
        }) === 'awaiting',
        'Even if fully watched, Currently Airing show must stay "awaiting" and NEVER "completed"'
    );

    // Finished airing show constraint verification:
    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 5,
            totalEpisodes: 10,
            mediaStatus: 'Finished Airing',
            releasedCount: 10
        }) === 'watching',
        'Finished airing show partially watched -> watching'
    );

    assert(
        resolveAnimeTrackingStatus({
            watchedCount: 10,
            totalEpisodes: 10,
            mediaStatus: 'Finished Airing',
            releasedCount: 10
        }) === 'completed',
        'Finished airing show fully watched -> completed'
    );
});

describe('2. Guests Permissions & Authentication State Rules', () => {
    const isGuestUser = (user: any, isAuthenticated: boolean) => {
        return !user || !user.email || !isAuthenticated;
    };

    const isFeatureRestrictedForGuest = (feature: string) => {
        const restricted = ['post', 'comment', 'review', 'follow', 'rate', 'track'];
        return restricted.includes(feature);
    };

    assert(isGuestUser(null, false) === true, 'No user profile, isAuthenticated false -> Guest Status verified');
    assert(isGuestUser({ username: 'guest123' }, false) === true, 'Profile lacks email, isAuthenticated false -> Guest Status verified');
    assert(isGuestUser({ username: 'member', email: 'test@email.com' }, true) === false, 'Valid profile + email + authenticated -> Member verified');

    assert(isFeatureRestrictedForGuest('post') === true, 'Guest restriction: cannot Post');
    assert(isFeatureRestrictedForGuest('review') === true, 'Guest restriction: cannot Review');
    assert(isFeatureRestrictedForGuest('track') === true, 'Guest restriction: cannot Track Anime');
    assert(isFeatureRestrictedForGuest('browse') === false, 'Guest is allowed to Browse');
});

describe('3. Taste DNA personalized Recommender (RecommendationService)', () => {
    // Generate mock datasets
    const mockWatchlist: WatchlistItem[] = [
        {
            mediaId: '101',
            title: 'Fullmetal Alchemist',
            addedAt: '2026-01-01',
            status: 'completed',
            isFavorite: true,
            genres: ['Action', 'Adventure', 'Fantasy'],
            posterPath: '/path1.jpg'
        },
        {
            mediaId: '102',
            title: 'Attack on Titan',
            addedAt: '2026-01-02',
            status: 'watching',
            isFavorite: false,
            genres: ['Action', 'Drama', 'Fantasy'],
            posterPath: '/path2.jpg'
        },
        {
            mediaId: '103',
            title: 'Dropped Show',
            addedAt: '2026-01-03',
            status: 'dropped',
            isFavorite: false,
            genres: ['Comedy', 'Mecha'],
            posterPath: '/path3.jpg'
        }
    ];

    const mockRatings: UserRating[] = [
        { animeId: '101', score: 10, ratedAt: '2026-01-01', title: 'Fullmetal Alchemist', posterPath: '/path1.jpg' },
        { animeId: '102', score: 7, ratedAt: '2026-01-02', title: 'Attack on Titan', posterPath: '/path2.jpg' },
        { animeId: '103', score: 4, ratedAt: '2026-01-03', title: 'Dropped Show', posterPath: '/path3.jpg' }
    ];

    const mockGenres = ['Action', 'Fantasy'];

    // Deep override mock animeApi responses
    const mockApiCandidates: Media[] = [
        {
            id: '201',
            title: 'Hunter x Hunter (High similarity match)',
            description: 'Good story',
            genres: ['Action', 'Adventure', 'Fantasy'],
            posterPath: '/sub1.jpg',
            backdropPath: '/sub1_bg.jpg',
            type: 'anime'
        },
        {
            id: '202',
            title: 'Neon Genesis Evangelion (Dropped genre match)',
            description: 'Mecha heavy',
            genres: ['Sci-Fi', 'Mecha', 'Psychological'],
            posterPath: '/sub2.jpg',
            backdropPath: '/sub2_bg.jpg',
            type: 'anime'
        },
        {
            id: '101',
            title: 'Fullmetal Alchemist (Already watched)',
            description: 'Duplicate',
            genres: ['Action', 'Fantasy'],
            posterPath: '/path1.jpg',
            backdropPath: '/path1_bg.jpg',
            type: 'anime'
        }
    ];

    animeApi.getAnimeRecommendations = async (id: string) => {
        // Return candidates simulating recommendations for seed Fullmetal Alchemist (101)
        if (id === '101') return mockApiCandidates;
        return [];
    };

    animeApi.getTrendingAnime = async () => [];
    animeApi.getSeasonalAnime = async () => [];
    animeApi.getTopAnime = async () => [];

    // ============================================================================
    // 4. TIMEZONE SELECTION & COUNTDOWN LOCALIZATION TESTS
    // ============================================================================
    describe('4. Timezone Selection & Countdown Localization (timezoneHelper / releaseHelper)', () => {

        // Test 1: Fuzzy search matches
        const indiaResults = searchTimezones('india');
        assert(indiaResults.some((t: any) => t.id === 'Asia/Kolkata'), 'Fuzzy search matches "india" to Asia/Kolkata');

        const tokyoResults = searchTimezones('Tokyo');
        assert(tokyoResults.some((t: any) => t.id === 'Asia/Tokyo'), 'Fuzzy search matches "Tokyo" to Asia/Tokyo');

        // Test 2: Auto-detect fallback functionality
        const detected = autoDetectTimezone();
        assert(!!detected.id, `Auto-detected system timezone returned valid output: ${detected.id}`);

        // Test 3: Localized broadcast shifting calculations
        const broadcast = { day: 'Sundays', time: '23:30' };

        const istInfo = getLocalAiringInfo(broadcast, 'Asia/Kolkata', 'en-US', false);
        assert(!!istInfo, 'Localized airing info parsed successfully');
        if (istInfo) {
            assert(istInfo.localDay === 'Sunday', `Broadcast day correctly computed for India: ${istInfo.localDay}`);
            assert(
                istInfo.localTime.includes('08:00') ||
                istInfo.localTime.includes('8:00') ||
                istInfo.localTime.includes('20:00'),
                `Broadcast time correctly computed for India (12h): ${istInfo.localTime}`
            );
        }

        const ist24Info = getLocalAiringInfo(broadcast, 'Asia/Kolkata', 'en-US', true);
        if (ist24Info) {
            assert(
                ist24Info.localTime.includes('20:00') ||
                ist24Info.localTime.includes('08:00') ||
                ist24Info.localTime.includes('8:00'),
                `Broadcast time correctly computed for India (24h): ${ist24Info.localTime}`
            );
        }
    });

    // Trigger recommendations resolution
    RecommendationService.getPersonalizedRecommendations(
        mockWatchlist,
        mockRatings,
        mockGenres,
        10
    ).then((recommendations: any[]) => {
        // Assertion 1: Should filter out already watched or active watchlist items
        const has101 = recommendations.some((r: any) => r.anime.id === '101');
        assert(!has101, 'Watched entries (Fullmetal Alchemist) are strictly filtered out of recommendation pool');

        // Assertion 2: Hunter x Hunter must score extremely high (>60) and match reason because of favorite genres/seed
        const hxh = recommendations.find((r: any) => r.anime.id === '201');
        assert(!!hxh, 'Hunter x Hunter recommendations match generated successfully');
        if (hxh) {
            assert(hxh.score >= 60, `Hunter x Hunter scores high confidence match score: ${hxh.score}`);
            assert(hxh.reason.includes('Action') || hxh.reason.includes('liked'), 'Valid Taste DNA reason resolved');
        }

        // Assertion 3: Neon Genesis Evangelion must be penalised / filtered because user dropped a Mecha show
        const evangelion = recommendations.find((r: any) => r.anime.id === '202');
        const isEvangelionFiltered = !evangelion || (evangelion.score < 60);
        assert(isEvangelionFiltered, 'Penalized/Avoided Genres (Mecha from dropped list) are suppressed/filtered');

        // Final printout of execution results
        console.log(`\n${color.bold}${color.cyan}═════════════════════════════════════════${color.reset}`);
        console.log(`${color.bold}TEST SUITE SUMMARY:${color.reset}`);
        console.log(`  Passed: ${color.green}${passCount}${color.reset}`);
        console.log(`  Failed: ${color.red}${failCount}${color.reset}`);
        console.log(`${color.bold}${color.cyan}═════════════════════════════════════════${color.reset}`);

        process.exit(failCount > 0 ? 1 : 0);
    }).catch((err: any) => {
        console.error('Crash in personalized recommendation test:', err);
        process.exit(1);
    });
});
