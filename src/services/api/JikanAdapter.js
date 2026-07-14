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
exports.JikanAdapter = void 0;
const normalization_1 = require("./normalization");
const apiClient_1 = require("./apiClient");
const BASE_PATH = '/api/anime';
/**
 * Redefined Jikan API Client pointing to AnimOrg Backend Proxy.
 * Encapsulates communication logic so frontend remains Jikan-agnostic.
 */
exports.JikanAdapter = {
    getTrendingAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/top?filter=airing&page=${page}&limit=20`);
        return data.data.filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getTopAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/top?page=${page}&limit=20`);
        return data.data.filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getSeasonalAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/season?page=${page}&limit=20`);
        return data.data.filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getSeasonalAnimeFullPaginated: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        var _a;
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/season?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia),
            hasNextPage: ((_a = data.pagination) === null || _a === void 0 ? void 0 : _a.has_next_page) || false
        };
    }),
    getFullAiringSchedulePaginated: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        var _a;
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/schedule?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia),
            hasNextPage: ((_a = data.pagination) === null || _a === void 0 ? void 0 : _a.has_next_page) || false
        };
    }),
    searchAnime: (query_1, ...args_1) => __awaiter(void 0, [query_1, ...args_1], void 0, function* (query, page = 1, genres = [], minScore, orderBy, sort, signal) {
        var _a;
        let url = `${BASE_PATH}/search?q=${encodeURIComponent(query)}&page=${page}&limit=10`;
        if (genres.length > 0)
            url += `&genres=${genres.join(',')}`;
        if (minScore)
            url += `&minScore=${minScore}`;
        if (orderBy)
            url += `&orderBy=${orderBy}`;
        if (sort)
            url += `&sort=${sort}`;
        const data = yield (0, apiClient_1.executeBackendQuery)(url, signal);
        return {
            data: (data.data || []).filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia),
            hasNextPage: ((_a = data.pagination) === null || _a === void 0 ? void 0 : _a.has_next_page) || false
        };
    }),
    getAnimeDetails: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/full`);
        return (0, normalization_1.mapJikanToMedia)(data.data);
    }),
    getAnimeCharacters: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/characters`);
        return data.data.slice(0, 10).map((c) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const jaVA = (_a = c.voice_actors) === null || _a === void 0 ? void 0 : _a.find((va) => va.language === 'Japanese');
            return {
                id: c.character.mal_id.toString(),
                name: c.character.name,
                imageUrl: ((_c = (_b = c.character.images) === null || _b === void 0 ? void 0 : _b.webp) === null || _c === void 0 ? void 0 : _c.image_url) || ((_e = (_d = c.character.images) === null || _d === void 0 ? void 0 : _d.jpg) === null || _e === void 0 ? void 0 : _e.image_url),
                role: c.role,
                voiceActor: jaVA ? {
                    name: jaVA.person.name,
                    imageUrl: (_g = (_f = jaVA.person.images) === null || _f === void 0 ? void 0 : _f.jpg) === null || _g === void 0 ? void 0 : _g.image_url,
                } : undefined
            };
        });
    }),
    getAnimeRecommendations: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/recommendations`);
        return data.data.map((r) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return ({
                id: r.entry.mal_id.toString(),
                title: r.entry.title,
                posterPath: ((_b = (_a = r.entry.images) === null || _a === void 0 ? void 0 : _a.webp) === null || _b === void 0 ? void 0 : _b.large_image_url) || ((_d = (_c = r.entry.images) === null || _c === void 0 ? void 0 : _c.jpg) === null || _d === void 0 ? void 0 : _d.large_image_url),
                posterImageMedium: ((_f = (_e = r.entry.images) === null || _e === void 0 ? void 0 : _e.webp) === null || _f === void 0 ? void 0 : _f.image_url) || ((_h = (_g = r.entry.images) === null || _g === void 0 ? void 0 : _g.jpg) === null || _h === void 0 ? void 0 : _h.image_url),
                type: 'anime',
            });
        });
    }),
    getUpcomingAnime: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1) {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/upcoming?page=${page}&limit=20`);
        return data.data.filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getAnimeGenres: () => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/genres`);
        return data.data.map((g) => ({ id: g.mal_id, name: g.name }));
    }),
    getAnimeEpisodes: (id, page) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (page !== undefined) {
            const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/episodes?page=${page}`);
            const pagination = data.pagination;
            const items = data.data.map((ep) => {
                return {
                    id: ep.mal_id.toString(),
                    number: ep.mal_id,
                    title: ep.title,
                    titleJapanese: ep.title_japanese,
                    titleRomaji: ep.title_romanji,
                    aired: ep.aired,
                    score: ep.score,
                    filler: ep.filler,
                    recap: ep.recap,
                    forumUrl: ep.forum_url
                };
            });
            return {
                data: items,
                hasNextPage: (pagination === null || pagination === void 0 ? void 0 : pagination.has_next_page) || false,
                totalCount: (_a = pagination === null || pagination === void 0 ? void 0 : pagination.items) === null || _a === void 0 ? void 0 : _a.total
            };
        }
        let allItems = [];
        let currentPage = 1;
        let hasNext = true;
        let totalCount = 0;
        while (hasNext) {
            const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/episodes?page=${currentPage}`);
            const pagination = data.pagination;
            const items = data.data.map((ep) => {
                return {
                    id: ep.mal_id.toString(),
                    number: ep.mal_id,
                    title: ep.title,
                    titleJapanese: ep.title_japanese,
                    titleRomaji: ep.title_romanji,
                    aired: ep.aired,
                    score: ep.score,
                    filler: ep.filler,
                    recap: ep.recap,
                    forumUrl: ep.forum_url
                };
            });
            allItems = allItems.concat(items);
            totalCount = ((_b = pagination === null || pagination === void 0 ? void 0 : pagination.items) === null || _b === void 0 ? void 0 : _b.total) || totalCount;
            hasNext = (pagination === null || pagination === void 0 ? void 0 : pagination.has_next_page) || false;
            if (hasNext) {
                currentPage++;
                yield new Promise(resolve => setTimeout(resolve, 150));
            }
        }
        return {
            data: allItems,
            hasNextPage: false,
            totalCount: totalCount || allItems.length
        };
    }),
    getAiringSchedule: (day) => __awaiter(void 0, void 0, void 0, function* () {
        let url = `${BASE_PATH}/schedule`;
        if (day) {
            url += `?filter=${day.toLowerCase()}&limit=25`;
        }
        else {
            url += `?limit=100`;
        }
        const data = yield (0, apiClient_1.executeBackendQuery)(url);
        return (data.data || []).filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getAnimeByGenre: (genreId_1, ...args_1) => __awaiter(void 0, [genreId_1, ...args_1], void 0, function* (genreId, page = 1) {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/search?genres=${genreId}&orderBy=popularity&sort=asc&page=${page}&limit=20`);
        return (data.data || []).filter((item) => !(0, normalization_1.isJikanExplicitContent)(item)).map(normalization_1.mapJikanToMedia);
    }),
    getAnimeRelations: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield (0, apiClient_1.executeBackendQuery)(`${BASE_PATH}/${id}/relations`);
        return (data.data || []).map((rel) => ({
            relation: rel.relation,
            entry: (rel.entry || []).map((e) => ({
                malId: e.mal_id,
                type: e.type,
                name: e.name,
                url: e.url,
            }))
        }));
    })
};
