import { Media, Character, Episode } from '../../types';
import { mapJikanToMedia, isJikanExplicitContent } from './normalization';
import { executeBackendQuery } from './apiClient';

const BASE_PATH = '/api/anime';

/**
 * Redefined Jikan API Client pointing to AnimOrg Backend Proxy.
 * Encapsulates communication logic so frontend remains Jikan-agnostic.
 */
export const JikanAdapter = {
    getTrendingAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/top?filter=airing&page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getTopAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/top?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getSeasonalAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/season?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/season?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getFullAiringSchedulePaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/schedule?page=${page}&limit=25`);
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
        sort?: string
    ): Promise<{ data: Media[], hasNextPage: boolean }> => {
        let url = `${BASE_PATH}/search?q=${encodeURIComponent(query)}&page=${page}`;
        if (genres.length > 0) url += `&genres=${genres.join(',')}`;
        if (minScore) url += `&minScore=${minScore}`;
        if (orderBy) url += `&orderBy=${orderBy}`;
        if (sort) url += `&sort=${sort}`;

        const data = await executeBackendQuery<any>(url);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getAnimeDetails: async (id: string): Promise<Media | null> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/full`);
        return mapJikanToMedia(data.data);
    },

    getAnimeCharacters: async (id: string): Promise<Character[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/characters`);
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
        const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/recommendations`);
        return data.data.map((r: any) => ({
            id: r.entry.mal_id.toString(),
            title: r.entry.title,
            posterPath: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
            posterImageMedium: r.entry.images?.webp?.image_url || r.entry.images?.jpg?.image_url,
            type: 'anime',
        } as Media));
    },

    getUpcomingAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/upcoming?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/genres`);
        return data.data.map((g: any) => ({ id: g.mal_id, name: g.name }));
    },

    getAnimeEpisodes: async (id: string, page?: number): Promise<{ data: Episode[], hasNextPage: boolean, totalCount?: number }> => {
        if (page !== undefined) {
            const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/episodes?page=${page}`);
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
            const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/episodes?page=${currentPage}`);
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
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        return {
            data: allItems,
            hasNextPage: false,
            totalCount: totalCount || allItems.length
        };
    },

    searchCharacters: async (query: string, page = 1): Promise<{ data: any[], hasNextPage: boolean }> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/characters?q=${encodeURIComponent(query)}&page=${page}`);
        return {
            data: data.data.map((c: any) => ({
                id: c.mal_id.toString(),
                name: c.name,
                imageUrl: c.images?.webp?.image_url || c.images?.jpg?.image_url,
                about: c.about,
                favorites: c.favorites,
            })),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getAiringSchedule: async (day?: string): Promise<Media[]> => {
        let url = `${BASE_PATH}/schedule`;
        if (day) {
            url += `?filter=${day.toLowerCase()}&limit=25`;
        } else {
            url += `?limit=100`;
        }
        const data = await executeBackendQuery<any>(url);
        return (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeByGenre: async (genreId: number, page = 1): Promise<Media[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/search?genres=${genreId}&orderBy=popularity&sort=asc&page=${page}&limit=20`);
        return (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeRelations: async (id: string): Promise<any[]> => {
        const data = await executeBackendQuery<any>(`${BASE_PATH}/${id}/relations`);
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
