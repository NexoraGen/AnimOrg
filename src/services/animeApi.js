"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.animeApi = void 0;
const AniListAdapter_1 = require("./api/AniListAdapter");
const JikanAdapter_1 = require("./api/JikanAdapter");
const CacheManager_1 = require("./api/CacheManager");
const RetryManager_1 = require("./api/RetryManager");
const episodeCountSync_1 = require("../utils/episodeCountSync");
const JIKAN_GENRE_MAP = {
    1: 'Action', 2: 'Adventure', 4: 'Comedy', 22: 'Romance',
    40: 'Psychological', 10: 'Fantasy', 41: 'Thriller',
    27: 'Shonen', 42: 'Seinen', 30: 'Sports', 24: 'Sci-Fi',
    7: 'Mystery', 36: 'Slice of Life', 21: 'Samurai',
    16: 'Magic', 18: 'Mecha', 73: 'Survival', 14: 'Horror',
    23: 'School Life', 62: 'Isekai', 37: 'Supernatural',
    38: 'Military'
};
const executeWithPrimaryAndFallback = (primary, fallback, onRetryStatus) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield RetryManager_1.RetryManager.execute(primary, 3, 1000, onRetryStatus);
    }
    catch (primaryError) {
        onRetryStatus === null || onRetryStatus === void 0 ? void 0 : onRetryStatus("Searching another source...");
        try {
            return yield RetryManager_1.RetryManager.execute(fallback, 3, 1000, onRetryStatus);
        }
        catch (fallbackError) {
            throw new Error("Both providers failed to retrieve information.");
        }
    }
});
/**
 * The unified UnifiedAnimeService representing the new, fully abstracted data tier.
 * It manages primary/fallback orchestration, caching, and retry logic internally.
 */
exports.animeApi = {
    getTrendingAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, onUpdate) {
        return CacheManager_1.CacheManager.fetchWithCache(`trending_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getTrendingAnime(page), () => JikanAdapter_1.JikanAdapter.getTrendingAnime(page)), CacheManager_1.TTL.TRENDING, onUpdate);
    }),
    getTopAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, onUpdate) {
        return CacheManager_1.CacheManager.fetchWithCache(`top_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getTopAnime(page), () => JikanAdapter_1.JikanAdapter.getTopAnime(page)), CacheManager_1.TTL.TOP_RATED, onUpdate);
    }),
    getSeasonalAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, onUpdate) {
        return CacheManager_1.CacheManager.fetchWithCache(`seasonal_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getSeasonalAnime(page), () => JikanAdapter_1.JikanAdapter.getSeasonalAnime(page)), CacheManager_1.TTL.SEASONAL, onUpdate);
    }),
    getSeasonalAnimeFullPaginated: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        return CacheManager_1.CacheManager.fetchWithCache(`seasonal_full_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getSeasonalAnimeFullPaginated(page), () => JikanAdapter_1.JikanAdapter.getSeasonalAnimeFullPaginated(page)), CacheManager_1.TTL.SEASONAL);
    }),
    getUpcomingAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, onUpdate) {
        return CacheManager_1.CacheManager.fetchWithCache(`upcoming_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getUpcomingAnime(page), () => JikanAdapter_1.JikanAdapter.getUpcomingAnime(page)), CacheManager_1.TTL.SEASONAL, onUpdate);
    }),
    // Details has a custom fallback/merge logic
    getAnimeDetails: (id, onUpdate) => __awaiter(void 0, void 0, void 0, function* () {
        const fetchMergedDetails = () => __awaiter(void 0, void 0, void 0, function* () {
            let mergedData = null;
            try {
                mergedData = yield RetryManager_1.RetryManager.execute(() => AniListAdapter_1.AniListAdapter.getAnimeDetails(id), 2);
            }
            catch (e) {
                // Drop quietly
            }
            if (!mergedData) {
                try {
                    mergedData = yield RetryManager_1.RetryManager.execute(() => JikanAdapter_1.JikanAdapter.getAnimeDetails(id), 3);
                }
                catch (e) {
                    return null; // Both failed completely
                }
            }
            else {
                const detailsData = mergedData;
                // AniList succeeded, but it lacks Jikan specific detail fields (Broadcast, Ranks, complete Episodes count if > than AniList holds, or Trailer).
                if (!detailsData.broadcast || !detailsData.rank || !detailsData.rating_count || !(detailsData.trailerUrl || detailsData.trailerData)) {
                    // Asynchronously fetch Jikan to fill in the blanks
                    JikanAdapter_1.JikanAdapter.getAnimeDetails(id).then(jikanData => {
                        if (jikanData) {
                            const fullyMergedObj = Object.assign(Object.assign({}, detailsData), { broadcast: detailsData.broadcast || jikanData.broadcast, rank: detailsData.rank || jikanData.rank, rating_count: detailsData.rating_count || jikanData.rating_count, popularity: detailsData.popularity || jikanData.popularity, episodes: detailsData.episodes || jikanData.episodes, trailerUrl: detailsData.trailerUrl || jikanData.trailerUrl, trailerData: detailsData.trailerData || jikanData.trailerData });
                            const healedMerged = episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(fullyMergedObj);
                            // Persist fully merged data to cache as details_${id}
                            CacheManager_1.CacheManager.setCacheEntry(`details_${id}`, healedMerged).catch(() => { });
                            if (onUpdate)
                                onUpdate(healedMerged);
                        }
                    }).catch(() => { });
                }
            }
            return episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(mergedData);
        });
        const wrapOnUpdate = onUpdate ? (data) => {
            onUpdate(episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(data));
        } : undefined;
        const details = yield CacheManager_1.CacheManager.fetchWithCache(`details_${id}`, fetchMergedDetails, CacheManager_1.TTL.ANIME_DETAILS, wrapOnUpdate);
        if (details) {
            const needsHealing = !details.broadcast || !details.rank || !details.rating_count || !(details.trailerUrl || details.trailerData);
            if (needsHealing) {
                fetchMergedDetails().then(healed => {
                    if (healed && wrapOnUpdate) {
                        wrapOnUpdate(healed);
                    }
                }).catch(() => { });
            }
        }
        return episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(details);
    }),
    getAnimeCharacters: (id, onUpdate) => __awaiter(void 0, void 0, void 0, function* () {
        return CacheManager_1.CacheManager.fetchWithCache(`characters_${id}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getAnimeCharacters(id), () => JikanAdapter_1.JikanAdapter.getAnimeCharacters(id)), CacheManager_1.TTL.CHARACTERS, onUpdate);
    }),
    getAnimeRecommendations: (id, onUpdate) => __awaiter(void 0, void 0, void 0, function* () {
        return CacheManager_1.CacheManager.fetchWithCache(`recommendations_${id}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getAnimeRecommendations(id), () => JikanAdapter_1.JikanAdapter.getAnimeRecommendations(id)), CacheManager_1.TTL.RECOMMENDATIONS, onUpdate);
    }),
    getCuratedList: (listType, onUpdate) => __awaiter(void 0, void 0, void 0, function* () {
        return CacheManager_1.CacheManager.fetchWithCache(`curated_${listType.replace(/\s+/g, '_')}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getCuratedList(listType), () => { throw new Error('Jikan Curated lists unsupported'); }), CacheManager_1.TTL.RECOMMENDATIONS, onUpdate);
    }),
    searchAnime: (query_1, ...args_1) => __awaiter(void 0, [query_1, ...args_1], void 0, function* (query, page = 1, genres = [], minScore, orderBy, sort, onRetryStatus, signal) {
        // Unify mapping of genres for Cache Key
        const genresMapped = genres
            .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
            .filter(Boolean);
        const genresKey = genresMapped.length > 0 ? genresMapped.join('_') : 'none';
        const cacheKey = `search_${query.toLowerCase()}_p${page}_g${genresKey}_s${minScore || 'any'}_o${orderBy || 'pop'}_s${sort || 'desc'}`;
        const executeAdaptedSearch = () => __awaiter(void 0, void 0, void 0, function* () {
            let isFallback = false;
            const proxyRetryStatus = (msg) => {
                if (msg === "Searching another source...")
                    isFallback = true;
                onRetryStatus === null || onRetryStatus === void 0 ? void 0 : onRetryStatus({
                    attempt: 0,
                    maxAttempts: 3,
                    fallback: isFallback,
                    rawStatusMsg: msg
                });
            };
            try {
                return yield RetryManager_1.RetryManager.execute(() => AniListAdapter_1.AniListAdapter.searchAnime(query, page, genresMapped, minScore, orderBy, sort, signal), 3, 1000, proxyRetryStatus);
            }
            catch (err) {
                proxyRetryStatus("Searching another source...");
                return yield RetryManager_1.RetryManager.execute(() => JikanAdapter_1.JikanAdapter.searchAnime(query, page, genres.filter(g => typeof g === 'number'), minScore, orderBy, sort, signal), 3, 1000, proxyRetryStatus);
            }
        });
        return CacheManager_1.CacheManager.fetchWithCache(cacheKey, executeAdaptedSearch, CacheManager_1.TTL.SEARCH);
    }),
    getAnimeByGenre: (genre_1, ...args_1) => __awaiter(void 0, [genre_1, ...args_1], void 0, function* (genre, page = 1) {
        const genreStr = typeof genre === 'number' ? JIKAN_GENRE_MAP[genre] : genre;
        return CacheManager_1.CacheManager.fetchWithCache(`genre_${genreStr}_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.getAnimeByGenre(genreStr, page), () => JikanAdapter_1.JikanAdapter.getAnimeByGenre(typeof genre === 'number' ? genre : 1, page)), CacheManager_1.TTL.SEARCH);
    }),
    getAnimeByGenres: (genres_1, ...args_1) => __awaiter(void 0, [genres_1, ...args_1], void 0, function* (genres, page = 1) {
        const genresMapped = genres
            .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
            .filter(Boolean);
        const genresKey = genresMapped.join('_');
        return CacheManager_1.CacheManager.fetchWithCache(`genres_${genresKey}_p${page}`, () => executeWithPrimaryAndFallback(() => AniListAdapter_1.AniListAdapter.searchAnime('', page, genresMapped).then(res => res.data), () => JikanAdapter_1.JikanAdapter.searchAnime('', page, genres.filter(g => typeof g === 'number')).then(res => res.data)), CacheManager_1.TTL.SEARCH);
    }),
    getAnimeEpisodes: (id_1, onUpdate_1, ...args_1) => __awaiter(void 0, [id_1, onUpdate_1, ...args_1], void 0, function* (id, onUpdate, bypassCache = false) {
        var _a, _b, _c;
        const wrapOnUpdate = onUpdate ? (freshData) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!freshData)
                return;
            const corrected = yield exports.animeApi.correctEpisodeList(id, {
                data: freshData.data || [],
                totalCount: (_c = (_a = freshData.totalCount) !== null && _a !== void 0 ? _a : (_b = freshData.data) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0
            });
            if (corrected && corrected.data && corrected.data.length > 0) {
                const maxEp = Math.max(corrected.totalCount || 0, corrected.data.length, ...corrected.data.map(e => e.number));
                yield episodeCountSync_1.EpisodeCountRegistry.registerCount(id, maxEp);
            }
            onUpdate(corrected);
        }) : undefined;
        // Use Jikan as primary for episodes (since AniList lacks episode list API via GraphQL directly unless heavily paginated)
        let rawResult;
        try {
            rawResult = yield CacheManager_1.CacheManager.fetchWithCache(`episodes_${id}_all`, () => RetryManager_1.RetryManager.execute(() => JikanAdapter_1.JikanAdapter.getAnimeEpisodes(id)), bypassCache ? 0 : CacheManager_1.TTL.EPISODES, wrapOnUpdate);
        }
        catch (jikanError) {
            console.warn(`[animeApi] Jikan episodes fetch failed, initiating self-heal fallback.`, jikanError);
            // Attempt self-healing via cached details or AniList GraphQL direct details fetch
            let episodesCount = 0;
            try {
                const cachedDetails = yield CacheManager_1.CacheManager.getCacheEntry(`details_${id}`);
                if (cachedDetails && cachedDetails.episodes) {
                    episodesCount = cachedDetails.episodes;
                }
                else {
                    const freshDetails = yield AniListAdapter_1.AniListAdapter.getAnimeDetails(id);
                    if (freshDetails && freshDetails.episodes) {
                        episodesCount = freshDetails.episodes;
                    }
                }
            }
            catch (err) {
                console.error("[animeApi] Fallback details retrieval failed:", err);
            }
            if (episodesCount > 0) {
                console.log(`[animeApi] Self-healing resolved: generating ${episodesCount} synthetic episodes.`);
                const syntheticEps = [];
                for (let i = 1; i <= episodesCount; i++) {
                    syntheticEps.push({
                        id: `synthetic-${id}-${i}`,
                        number: i,
                        title: `Episode ${i}`,
                        aired: undefined,
                    });
                }
                const fallbackResult = {
                    data: syntheticEps,
                    totalCount: episodesCount
                };
                if (onUpdate) {
                    onUpdate(fallbackResult);
                }
                return fallbackResult;
            }
            throw jikanError;
        }
        const corrected = yield exports.animeApi.correctEpisodeList(id, {
            data: (rawResult === null || rawResult === void 0 ? void 0 : rawResult.data) || [],
            totalCount: (_c = (_a = rawResult === null || rawResult === void 0 ? void 0 : rawResult.totalCount) !== null && _a !== void 0 ? _a : (_b = rawResult === null || rawResult === void 0 ? void 0 : rawResult.data) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0
        });
        if (corrected && corrected.data && corrected.data.length > 0) {
            const maxEp = Math.max(corrected.totalCount || 0, corrected.data.length, ...corrected.data.map(e => e.number));
            yield episodeCountSync_1.EpisodeCountRegistry.registerCount(id, maxEp);
        }
        return corrected;
    }),
    correctEpisodeList: (id, result) => __awaiter(void 0, void 0, void 0, function* () {
        // Return result directly as requested to avoid synthetic placeholder episodes or drifted linear estimations.
        return result;
    }),
    getAnimeRelations: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return CacheManager_1.CacheManager.fetchWithCache(`relations_${id}`, () => RetryManager_1.RetryManager.execute(() => JikanAdapter_1.JikanAdapter.getAnimeRelations(id)), CacheManager_1.TTL.ANIME_DETAILS);
    }),
    getAiringSchedule: (day, onUpdate) => __awaiter(void 0, void 0, void 0, function* () {
        const cacheKey = day ? `schedule_${day.toLowerCase()}` : `schedule_week`;
        return CacheManager_1.CacheManager.fetchWithCache(cacheKey, () => executeWithPrimaryAndFallback(() => day ? JikanAdapter_1.JikanAdapter.getAiringSchedule(day) : AniListAdapter_1.AniListAdapter.getAiringSchedule(), () => JikanAdapter_1.JikanAdapter.getAiringSchedule(day)), CacheManager_1.TTL.AIRING, onUpdate);
    }),
    getRandomAnime: () => __awaiter(void 0, void 0, void 0, function* () {
        // Random endpoint usually strictly Jikan specific.
        return null; // Deprecated due to unreliablity across caches. Replace UI calls gently to use top rated.
    }),
    getAnimeGenres: () => __awaiter(void 0, void 0, void 0, function* () {
        return CacheManager_1.CacheManager.fetchWithCache(`genres_list`, () => RetryManager_1.RetryManager.execute(() => JikanAdapter_1.JikanAdapter.getAnimeGenres()), CacheManager_1.TTL.GENRES);
    }),
};
