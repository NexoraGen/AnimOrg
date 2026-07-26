import JikanProvider from "../providers/JikanProvider";
import RequestManager from "../utils/RequestManager";
import logger from "../utils/logger";
import {
    getFreshCache,
    getStaleCache,
    saveCache,
} from "../cache/cache";
import { CACHE_KEYS, CACHE_TTL } from "../config/constants";

class AnimeService {
    private async executeWithCache<T>(
        cacheKey: string,
        ttl: number,
        fetcher: () => Promise<T>
    ): Promise<T> {
        const lookupStart = Date.now();
        const cached = getFreshCache<T>(cacheKey);
        const lookupDuration = Date.now() - lookupStart;
        console.log(`[Backend Cache] Lookup duration for key "${cacheKey}": ${lookupDuration}ms`);
        if (cached) {
            logger.cacheHit(cacheKey);
            return cached.data;
        }

        logger.cacheMiss(cacheKey);

        try {
            // Guarantee that overlapping duplicate requests reuse the same promise (shield cache stampedes)
            const result = await RequestManager.execute(cacheKey, fetcher);
            saveCache(cacheKey, result, ttl);
            return result;
        } catch (error: any) {
            console.error(`[AnimeService Error] Cache Key: ${cacheKey}`);
            console.error(`- Error Message: ${error.message || "N/A"}`);
            if (error.config) {
                console.error(`- Axios URL: ${error.config.url}`);
                console.error(`- Axios Params: ${JSON.stringify(error.config.params || {})}`);
            }
            if (error.response) {
                console.error(`- Response Status: ${error.response.status}`);
            }
            console.error(`- Stack Trace:`, error.stack);

            const stale = getStaleCache<T>(cacheKey);
            if (stale) {
                logger.info(`Serving stale cache fallback for key: "${cacheKey}"`, "AnimeService");
                return stale.data;
            }
            logger.error(`Failed executing cache-fallbacked provider for key: "${cacheKey}"`, error);
            throw error;
        }
    }

    private sortJikanResponse(res: any, sortBy?: string): any {
        if (!res || !Array.isArray(res.data) || !sortBy || sortBy === 'default' || sortBy === 'none') {
            return res;
        }

        const sortedData = [...res.data];
        if (sortBy === 'score') {
            sortedData.sort((a, b) => (b.score || 0) - (a.score || 0));
        } else if (sortBy === 'popularity') {
            sortedData.sort((a, b) => {
                const membersA = a.members ?? 0;
                const membersB = b.members ?? 0;
                if (membersA !== membersB) {
                    return membersB - membersA;
                }
                const popA = a.popularity ?? Infinity;
                const popB = b.popularity ?? Infinity;
                return popA - popB;
            });
        } else if (sortBy === 'newest') {
            sortedData.sort((a, b) => {
                const dateA = a.aired?.from ? new Date(a.aired.from).getTime() : 0;
                const dateB = b.aired?.from ? new Date(b.aired.from).getTime() : 0;
                return dateB - dateA;
            });
        }

        return {
            ...res,
            data: sortedData
        };
    }

    async getAnime(id: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.ANIME}_${id}`;
        return this.executeWithCache(key, CACHE_TTL.ANIME_DETAILS, () =>
            JikanProvider.getAnime(id, config)
        );
    }

    async searchAnime(
        query: string,
        page?: number,
        genres?: string,
        minScore?: number,
        orderBy?: string,
        sort?: string,
        limit?: number,
        config?: { timeout?: number }
    ) {
        const queryLower = query.toLowerCase();
        const key = `${CACHE_KEYS.SEARCH}_q:${queryLower}_p:${page || 1}_g:${genres || "all"}_s:${minScore || "any"}_ob:${orderBy || "default"}_so:${sort || "default"}_l:${limit || "default"}`;
        return this.executeWithCache(key, CACHE_TTL.SEARCH_QUERY, async () => {
            const raw = await JikanProvider.searchAnime({
                q: query,
                page,
                genres,
                min_score: minScore,
                order_by: orderBy,
                sort,
                limit
            }, config);
            return this.sortJikanResponse(raw, orderBy);
        });
    }

    async getTopAnime(page?: number, filter?: string, limit?: number, sortBy?: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.TOP}_p:${page || 1}_f:${filter || "all"}_l:${limit || "default"}_s:${sortBy || "none"}`;
        return this.executeWithCache(key, CACHE_TTL.TOP_ANIME, async () => {
            const raw = await JikanProvider.getTopAnime({ page, filter, limit }, config);
            return this.sortJikanResponse(raw, sortBy);
        });
    }

    async getTrendingAnime(page?: number, limit?: number, sortBy?: string, config?: { timeout?: number }) {
        // Airing top anime represents trending
        const key = `${CACHE_KEYS.HOME}_trending_p:${page || 1}_l:${limit || "default"}_s:${sortBy || "none"}`;
        return this.executeWithCache(key, CACHE_TTL.TOP_ANIME, async () => {
            const raw = await JikanProvider.getTopAnime({ page, filter: "airing", limit }, config);
            return this.sortJikanResponse(raw, sortBy);
        });
    }

    async getCurrentSeason(page?: number, limit?: number, sortBy?: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.SEASON}_p:${page || 1}_l:${limit || "default"}_s:${sortBy || "none"}`;
        return this.executeWithCache(key, CACHE_TTL.SEASONAL, async () => {
            const raw = await JikanProvider.getCurrentSeason({ page, limit }, config);
            return this.sortJikanResponse(raw, sortBy);
        });
    }

    async getUpcomingAnime(page?: number, limit?: number, sortBy?: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.UPCOMING}_p:${page || 1}_l:${limit || "default"}_s:${sortBy || "none"}`;
        return this.executeWithCache(key, CACHE_TTL.SEASONAL, async () => {
            const raw = await JikanProvider.getUpcomingAnime({ page, limit }, config);
            return this.sortJikanResponse(raw, sortBy);
        });
    }

    async getSchedule(filter?: string, page?: number, limit?: number, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.SCHEDULE}_f:${filter || "all"}_p:${page || 1}_l:${limit || "default"}`;
        return this.executeWithCache(key, CACHE_TTL.AIRING_SCHEDULE, () =>
            JikanProvider.getSchedule({ filter, page, limit }, config)
        );
    }

    async getEpisodes(id: string, page?: number, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.EPISODES}_id:${id}_p:${page || "all"}`;
        return this.executeWithCache(key, CACHE_TTL.EPISODES, () =>
            JikanProvider.getEpisodes(id, page, config)
        );
    }

    async getCharacters(id: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.CHARACTERS}_id:${id}`;
        return this.executeWithCache(key, CACHE_TTL.CHARACTERS, () =>
            JikanProvider.getCharacters(id, config)
        );
    }

    async getRecommendations(id: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.RECOMMENDATIONS}_id:${id}`;
        return this.executeWithCache(key, CACHE_TTL.RECOMMENDATIONS, () =>
            JikanProvider.getRecommendations(id, config)
        );
    }

    async getAnimeRelations(id: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.RELATIONS}_id:${id}`;
        return this.executeWithCache(key, CACHE_TTL.ANIME_DETAILS, () =>
            JikanProvider.getAnimeRelations(id, config)
        );
    }

    async getAnimeGenres(config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.GENRES}`;
        return this.executeWithCache(key, CACHE_TTL.GENRES_LIST, () =>
            JikanProvider.getAnimeGenres(config)
        );
    }

    async searchCharacters(query: string, page?: number, config?: { timeout?: number }) {
        const queryLower = query.toLowerCase();
        const key = `${CACHE_KEYS.CHAR_SEARCH}_q:${queryLower}_p:${page || 1}`;
        return this.executeWithCache(key, CACHE_TTL.SEARCH_QUERY, () =>
            JikanProvider.searchCharacters(query, page, config)
        );
    }

    async getAnimeByGenre(genreId: number, page?: number, sortBy?: string, config?: { timeout?: number }) {
        const key = `${CACHE_KEYS.SEARCH}_genre:${genreId}_p:${page || 1}_s:${sortBy || "none"}`;
        return this.executeWithCache(key, CACHE_TTL.ANIME_DETAILS, async () => {
            const raw = await JikanProvider.getAnimeByGenre(genreId, page, config);
            return this.sortJikanResponse(raw, sortBy);
        });
    }
}

export default new AnimeService();