import AnimeService from "./AnimeService";
// Trigger cache flush by auto-reloading (run 2)
import { getFreshCache, saveCache } from "../cache/cache";
import { CACHE_KEYS, CACHE_TTL } from "../config/constants";
import logger from "../utils/logger";

class HomeService {
    async getHome() {
        const key = CACHE_KEYS.HOME;

        // Return highly performant aggregated home board caching, shielding from duplicate parallel API invocations
        const cached = getFreshCache(key);
        if (cached) {
            logger.cacheHit(key);
            return cached.data;
        }

        logger.cacheMiss(key);

        const config = { timeout: 6000 };

        // Fetch all categories with a 600ms stagger to fit Jikan API's 3 requests/sec rate limit exactly, preventing 429 storms.
        const results = await Promise.allSettled([
            AnimeService.getTrendingAnime(1, 20, config),
            new Promise((resolve) => setTimeout(resolve, 600)).then(() =>
                AnimeService.getTopAnime(1, undefined, 20, config)
            ),
            new Promise((resolve) => setTimeout(resolve, 1200)).then(() =>
                AnimeService.getCurrentSeason(1, 20, config)
            ),
            new Promise((resolve) => setTimeout(resolve, 1800)).then(() =>
                AnimeService.getUpcomingAnime(1, 20, config)
            ),
            new Promise((resolve) => setTimeout(resolve, 2400)).then(() =>
                AnimeService.getSchedule(undefined, 1, 20, config)
            )
        ]);

        const trending = results[0].status === "fulfilled" ? results[0].value : null;
        const top = results[1].status === "fulfilled" ? results[1].value : null;
        const season = results[2].status === "fulfilled" ? results[2].value : null;
        const upcoming = results[3].status === "fulfilled" ? results[3].value : null;
        const schedule = results[4].status === "fulfilled" ? results[4].value : null;

        // Log failures individually
        results.forEach((res, index) => {
            if (res.status === "rejected") {
                const error = res.reason as any;
                console.error(`[HomeService Error] Dashboard aggregation failed at index ${index}`);
                console.error(`- Error Message: ${error?.message || "N/A"}`);
                if (error?.config) {
                    console.error(`- Axios URL: ${error.config.url}`);
                    console.error(`- Axios Params: ${JSON.stringify(error.config.params || {})}`);
                }
                if (error?.response) {
                    console.error(`- Response Status: ${error.response.status}`);
                }
                console.error(`- Stack Trace:`, error?.stack || "N/A");
                logger.error(`Home dashboard aggregate fetch failed at index ${index} (timeout or rate limit):`, error);
            }
        });

        const dashboardData = {
            trending,
            top,
            season,
            upcoming,
            schedule,
            popular: top // Popular is represented by top rated anime
        };

        // Cache the combined home page data for 10 minutes (600 seconds)
        // If all results are null, do not cache so next hit tries fresh
        const hasData = trending || top || season || upcoming || schedule;
        if (hasData) {
            saveCache(key, dashboardData, CACHE_TTL.HOME_PAGE);
        }

        return dashboardData;
    }
}

export default new HomeService();