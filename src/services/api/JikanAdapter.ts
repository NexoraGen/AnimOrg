import { Media, Character, Episode } from '../../types';
import { mapJikanToMedia, isJikanExplicitContent } from './normalization';

const BASE_PATH = 'https://api.jikan.moe/v4';

const executeJikanQuery = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
    let response: Response;
    try {
        response = await fetch(url, { signal });
    } catch (networkError: any) {
        console.error(`[JikanAdapter] Network connection failed for ${url}:`, networkError);
        throw new Error(`Jikan Network Error: ${networkError.message}`);
    }

    if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
            const errJson = await response.json();
            if (errJson && errJson.message) {
                errorMsg = errJson.message;
            }
        } catch { }
        throw new Error(errorMsg);
    }

    // Automatic 340ms stagger to respect Jikan's 3 requests / second rate limit naturally
    await new Promise(resolve => setTimeout(resolve, 340));

    return await response.json();
};

/**
 * Direct Jikan API Client pointing to api.jikan.moe v4.
 * Rate limiting logic (333ms delay) is encapsulated here alongside HTTP fetching.
 */
export const JikanAdapter = {
    getTrendingAnime: async (page = 1, sortBy?: string): Promise<Media[]> => {
        // Fallback for Trend is equivalent to currently airing popular anime.
        // /top/anime?filter=airing causes 504 timeouts on Jikan V4 under load, so we use /seasons/now
        const data = await executeJikanQuery<any>(`${BASE_PATH}/seasons/now?page=${page}&limit=20`);
        const results = data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        if (sortBy === 'score') results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return results;
    },

    getTopAnime: async (page = 1, sortBy?: string): Promise<Media[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/top/anime?page=${page}&limit=20`);
        const results = data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        if (sortBy === 'score') results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return results;
    },

    getSeasonalAnime: async (page = 1, sortBy?: string): Promise<Media[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/seasons/now?page=${page}&limit=20`);
        const results = data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        if (sortBy === 'score') results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return results;
    },

    getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/seasons/now?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getFullAiringSchedulePaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/schedules?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    searchAnime: async (
        query: string,
        page = 1,
        genres: number[] = [],
        minScore?: number,
        orderBy?: string,
        sort?: string,
        signal?: AbortSignal
    ): Promise<{ data: Media[], hasNextPage: boolean }> => {
        let url = `${BASE_PATH}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=10`;
        if (genres.length > 0) url += `&genres=${genres.join(',')}`;
        if (minScore) url += `&min_score=${minScore}`;
        // Prevent Jikan unindexed order_by timeouts by dropping 'popularity' sort which is default anyway
        if (orderBy && orderBy !== 'popularity') url += `&order_by=${orderBy}`;
        if (sort) url += `&sort=${sort}`;

        const data = await executeJikanQuery<any>(url, signal);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getAnimeDetails: async (id: string): Promise<Media | null> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/full`);
        return mapJikanToMedia(data.data);
    },

    getAnimeVideos: async (id: string): Promise<any> => {
        try {
            const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/videos`);
            return data.data;
        } catch (e) {
            return null;
        }
    },

    getAnimeCharacters: async (id: string): Promise<Character[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/characters`);
        return data.data.slice(0, 10).map((c: any) => {
            const jaVA = c.voice_actors?.find((va: any) => va.language === 'Japanese');
            return {
                id: c.character.mal_id.toString(),
                name: c.character.name,
                imageUrl: c.character.images?.webp?.image_url || c.character.images?.jpg?.image_url,
                role: c.role,
                voiceActor: jaVA ? {
                    name: jaVA.person.name,
                    imageUrl: jaVA.person.images?.jpg?.image_url,
                } : undefined
            };
        });
    },

    getAnimeRecommendations: async (id: string): Promise<Media[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/recommendations`);
        return data.data.map((r: any) => ({
            id: r.entry.mal_id.toString(),
            title: r.entry.title,
            posterPath: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
            posterImageMedium: r.entry.images?.webp?.image_url || r.entry.images?.jpg?.image_url,
            type: 'anime', // explicitly cast properly in mapping
        } as Media));
    },

    getUpcomingAnime: async (page = 1, sortBy?: string): Promise<Media[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/seasons/upcoming?page=${page}&limit=20`);
        const results = data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        if (sortBy === 'score') results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return results;
    },

    getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/genres/anime`);
        return data.data.map((g: any) => ({ id: g.mal_id, name: g.name }));
    },

    getAnimeEpisodes: async (id: string, page?: number): Promise<{ data: Episode[], hasNextPage: boolean, totalCount?: number }> => {
        if (page !== undefined) {
            const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/episodes?page=${page}`);
            const pagination = data.pagination;
            const items = data.data.map((ep: any) => {
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
                } as Episode;
            });

            return {
                data: items,
                hasNextPage: pagination?.has_next_page || false,
                totalCount: pagination?.items?.total
            };
        }

        let allItems: Episode[] = [];
        let currentPage = 1;
        let hasNext = true;
        let totalCount = 0;

        while (hasNext) {
            const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/episodes?page=${currentPage}`);
            const pagination = data.pagination;
            const items = data.data.map((ep: any) => {
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
                } as Episode;
            });

            allItems = allItems.concat(items);
            totalCount = pagination?.items?.total || totalCount;
            hasNext = pagination?.has_next_page || false;

            if (hasNext) {
                currentPage++;
            }
        }

        return {
            data: allItems,
            hasNextPage: false,
            totalCount: totalCount || allItems.length
        };
    },



    getAiringSchedule: async (day?: string): Promise<Media[]> => {
        if (day) {
            const data = await executeJikanQuery<any>(`${BASE_PATH}/schedules?filter=${day.toLowerCase()}&limit=25`);
            return (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        }

        let allItems: Media[] = [];
        let currentPage = 1;
        let hasNext = true;

        // Capped to 5 pages (approx 125 schedule items) to prevent Jikan 504 timeouts on cold start.
        while (hasNext && currentPage <= 5) {
            const data = await executeJikanQuery<any>(`${BASE_PATH}/schedules?page=${currentPage}&limit=25`);
            const items = (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
            allItems = allItems.concat(items);
            hasNext = data.pagination?.has_next_page || false;
            if (hasNext) currentPage++;
        }

        return allItems;
    },

    getAnimeByGenre: async (genreId: number, page = 1, sortBy?: string): Promise<Media[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/anime?genres=${genreId}&page=${page}&limit=20`);
        const results = (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
        if (sortBy === 'score') results.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return results;
    },

    getAnimeRelations: async (id: string): Promise<any[]> => {
        const data = await executeJikanQuery<any>(`${BASE_PATH}/anime/${id}/relations`);
        return (data.data || []).map((rel: any) => ({
            relation: rel.relation,
            entry: (rel.entry || []).map((e: any) => ({
                malId: e.mal_id,
                type: e.type,
                name: e.name,
                url: e.url,
            }))
        }));
    }
};
