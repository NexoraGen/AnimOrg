import { Media, Character, Episode } from '../../types';
import { mapJikanToMedia, isJikanExplicitContent } from './normalization';

const BASE_URL = 'https://api.jikan.moe/v4';

/**
 * Pure API Adapter for Jikan REST API.
 * Contains only minimal execution logic to comply with raw fetching. No UI state.
 */
const executeRestQuery = async (url: string): Promise<any> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Jikan HTTP Error: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    if (json.error) {
        throw new Error(`Jikan API Error: ${json.error}`);
    }
    return json;
};

export const JikanAdapter = {
    getTrendingAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeRestQuery(`${BASE_URL}/top/anime?filter=airing&page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getTopAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeRestQuery(`${BASE_URL}/top/anime?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getSeasonalAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeRestQuery(`${BASE_URL}/seasons/now?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeRestQuery(`${BASE_URL}/seasons/now?page=${page}&limit=25`);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getFullAiringSchedulePaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
        const data = await executeRestQuery(`${BASE_URL}/schedules?page=${page}&limit=25`);
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
        let url = `${BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${page}&sfw=true`;
        if (genres.length > 0) url += `&genres=${genres.join(',')}`;
        if (minScore) url += `&min_score=${minScore}`;
        if (orderBy) url += `&order_by=${orderBy}`;
        if (sort) url += `&sort=${sort}`;

        const data = await executeRestQuery(url);
        return {
            data: (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia),
            hasNextPage: data.pagination?.has_next_page || false
        };
    },

    getAnimeDetails: async (id: string): Promise<Media | null> => {
        const data = await executeRestQuery(`${BASE_URL}/anime/${id}/full`);
        return mapJikanToMedia(data.data);
    },

    getAnimeCharacters: async (id: string): Promise<Character[]> => {
        const data = await executeRestQuery(`${BASE_URL}/anime/${id}/characters`);
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
        const data = await executeRestQuery(`${BASE_URL}/anime/${id}/recommendations`);
        return data.data.map((r: any) => ({
            id: r.entry.mal_id.toString(),
            title: r.entry.title,
            posterPath: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
            posterImageMedium: r.entry.images?.webp?.image_url || r.entry.images?.jpg?.image_url,
            type: 'anime',
        } as Media));
    },

    getUpcomingAnime: async (page = 1): Promise<Media[]> => {
        const data = await executeRestQuery(`${BASE_URL}/seasons/upcoming?page=${page}&limit=20`);
        return data.data.filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
        const data = await executeRestQuery(`${BASE_URL}/genres/anime`);
        return data.data.map((g: any) => ({ id: g.mal_id, name: g.name }));
    },

    getAnimeEpisodes: async (id: string, page?: number): Promise<{ data: Episode[], hasNextPage: boolean, totalCount?: number }> => {
        if (page !== undefined) {
            const data = await executeRestQuery(`${BASE_URL}/anime/${id}/episodes?page=${page}`);
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

        // Iteratively fetch all pages when page is undefined (all episodes requested)
        let allItems: Episode[] = [];
        let currentPage = 1;
        let hasNext = true;
        let totalCount = 0;

        while (hasNext) {
            const data = await executeRestQuery(`${BASE_URL}/anime/${id}/episodes?page=${currentPage}`);
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
                // Slight delay to avoid hitting Jikan API rate limit (3 requests per second)
                await new Promise(resolve => setTimeout(resolve, 350));
            }
        }

        return {
            data: allItems,
            hasNextPage: false,
            totalCount: totalCount || allItems.length
        };
    },

    searchCharacters: async (query: string, page = 1): Promise<{ data: any[], hasNextPage: boolean }> => {
        const data = await executeRestQuery(`${BASE_URL}/characters?q=${encodeURIComponent(query)}&page=${page}&limit=10`);
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
        const url = day
            ? `${BASE_URL}/schedules?filter=${day.toLowerCase()}&limit=25`
            : `${BASE_URL}/schedules?limit=100`;
        const data = await executeRestQuery(url);
        return (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeByGenre: async (genreId: number, page = 1): Promise<Media[]> => {
        const data = await executeRestQuery(`${BASE_URL}/anime?genres=${genreId}&order_by=popularity&sort=asc&page=${page}&limit=20`);
        return (data.data || []).filter((item: any) => !isJikanExplicitContent(item)).map(mapJikanToMedia);
    },

    getAnimeRelations: async (id: string): Promise<any[]> => {
        const data = await executeRestQuery(`${BASE_URL}/anime/${id}/relations`);
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
