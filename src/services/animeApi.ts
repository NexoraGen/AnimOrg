import { anilistApi } from './api/anilist';
import { jikanApi } from './api/jikan';
import { getCurrentlyReleasedEpisodesCount, getEpisodeAiringTime } from '../utils/releaseHelper';
import { apiManager } from './api/apiManager';
import { Media, Character, Episode, AnimeRelation } from '../types';

const JIKAN_GENRE_MAP: Record<number, string> = {
  1: 'Action', 2: 'Adventure', 4: 'Comedy', 22: 'Romance',
  40: 'Psychological', 10: 'Fantasy', 41: 'Thriller',
  27: 'Shonen', 42: 'Seinen', 30: 'Sports', 24: 'Sci-Fi',
  7: 'Mystery', 36: 'Slice of Life', 21: 'Samurai',
  16: 'Magic', 18: 'Mecha', 73: 'Survival', 14: 'Horror',
  23: 'School Life', 62: 'Isekai', 37: 'Supernatural',
  38: 'Military'
};

export const animeApi = {
  getTrendingAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'trending',
      `trending_p${page}`,
      () => anilistApi.getTrendingAnime(page),
      () => jikanApi.getTrendingAnime(page),
      onUpdate
    );
  },

  getTopAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'top_rated',
      `top_p${page}`,
      () => anilistApi.getTopAnime(page),
      () => jikanApi.getTopAnime(page),
      onUpdate
    );
  },

  getSeasonalAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'seasonal',
      `seasonal_p${page}`,
      () => anilistApi.getSeasonalAnime(page),
      () => jikanApi.getSeasonalAnime(page),
      onUpdate
    );
  },

  getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
    return apiManager.fetchWithSWR(
      'seasonal',
      `seasonal_full_p${page}`,
      () => anilistApi.getSeasonalAnimeFullPaginated(page),
      () => jikanApi.getSeasonalAnimeFullPaginated(page)
    );
  },

  getUpcomingAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'seasonal',
      `upcoming_p${page}`,
      () => anilistApi.getUpcomingAnime(page),
      () => jikanApi.getUpcomingAnime(page),
      onUpdate
    );
  },

  getAnimeDetails: async (id: string, onUpdate?: (data: Media | null) => void): Promise<Media | null> => {
    return apiManager.fetchWithSWR(
      'details',
      `details_${id}`,
      () => anilistApi.getAnimeDetails(id),
      () => jikanApi.getAnimeDetails(id),
      onUpdate
    );
  },

  getAnimeCharacters: async (id: string, onUpdate?: (data: Character[]) => void): Promise<Character[]> => {
    return apiManager.fetchWithSWR(
      'characters',
      `characters_${id}`,
      () => anilistApi.getAnimeCharacters(id),
      () => jikanApi.getAnimeCharacters(id),
      onUpdate
    );
  },

  getAnimeRecommendations: async (id: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'curated',
      `recommendations_${id}`,
      () => anilistApi.getAnimeRecommendations(id),
      () => jikanApi.getAnimeRecommendations(id),
      onUpdate
    );
  },

  getCuratedList: async (listType: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return apiManager.fetchWithSWR(
      'curated',
      `curated_${listType.replace(/\s+/g, '_')}`,
      () => anilistApi.getCuratedList(listType),
      () => jikanApi.getCuratedList(listType),
      onUpdate
    );
  },

  searchAnime: async (
    query: string,
    page = 1,
    genres: (number | string)[] = [],
    minScore?: number,
    orderBy?: string,
    sort?: string
  ): Promise<{ data: Media[], hasNextPage: boolean }> => {
    // Map numerical genres to string genres for AniList
    const genresMapped: string[] = genres
      .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
      .filter(Boolean);

    const genresKey = genresMapped.length > 0 ? genresMapped.join('_') : 'none';
    const cacheKey = `search_${query.toLowerCase()}_p${page}_g${genresKey}_s${minScore || 'any'}_o${orderBy || 'pop'}_s${sort || 'desc'}`;

    return apiManager.fetchWithSWR(
      'other',
      cacheKey,
      () => anilistApi.searchAnime(query, page, genresMapped, minScore, orderBy, sort),
      () => jikanApi.searchAnime(query, page, genres.filter(g => typeof g === 'number') as number[], minScore, orderBy, sort)
    );
  },

  // Direct pass-throughs with SWR caching wrap
  searchCharacters: async (query: string, page = 1): Promise<{ data: any[], hasNextPage: boolean }> => {
    return apiManager.fetchWithSWR(
      'other',
      `char_search_${query.toLowerCase()}_p${page}`,
      () => jikanApi.searchCharacters(query, page)
    );
  },

  getAnimeByGenre: async (genre: number | string, page = 1): Promise<Media[]> => {
    const genreStr = typeof genre === 'number' ? JIKAN_GENRE_MAP[genre] : genre;
    return apiManager.fetchWithSWR(
      'other',
      `genre_${genreStr}_p${page}`,
      () => anilistApi.getAnimeByGenre(genreStr, page),
      () => jikanApi.getAnimeByGenre(typeof genre === 'number' ? genre : 1, page)
    );
  },

  getAnimeByGenres: async (genres: (number | string)[], page = 1): Promise<Media[]> => {
    const genresMapped: string[] = genres
      .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
      .filter(Boolean);
    const genresKey = genresMapped.join('_');

    return apiManager.fetchWithSWR(
      'other',
      `genres_${genresKey}_p${page}`,
      () => anilistApi.searchAnime('', page, genresMapped).then(res => res.data),
      () => jikanApi.getAnimeByGenres(genres.filter(g => typeof g === 'number') as number[], page)
    );
  },

  getAnimeEpisodes: async (id: string, onUpdate?: (data: { data: Episode[], totalCount: number }) => void, bypassCache = false): Promise<{ data: Episode[], totalCount: number }> => {
    const wrapOnUpdate = onUpdate ? async (freshData: { data: Episode[], totalCount: number }) => {
      const corrected = await animeApi.correctEpisodeList(id, freshData);
      onUpdate(corrected);
    } : undefined;

    const rawResult = await apiManager.fetchWithSWR(
      'details',
      `episodes_${id}_all`,
      () => jikanApi.getAnimeEpisodesAllPages(id),
      undefined,
      wrapOnUpdate,
      bypassCache
    );

    return animeApi.correctEpisodeList(id, rawResult);
  },

  correctEpisodeList: async (id: string, result: { data: Episode[], totalCount: number }): Promise<{ data: Episode[], totalCount: number }> => {
    if (!result || !result.data) return result;

    try {
      const detailsKey = `details_${id}`;
      // Retrieve the cached media details
      const cached = await apiManager.getCache(detailsKey, 24 * 60 * 60 * 1000);
      if (cached) {
        const releasedCount = getCurrentlyReleasedEpisodesCount(cached);
        const episodes = [...result.data];
        const lastEpNum = episodes.length > 0 ? episodes[episodes.length - 1].number : 0;

        if (releasedCount > lastEpNum) {
          const now = Date.now();
          for (let num = lastEpNum + 1; num <= releasedCount; num++) {
            const airingTime = getEpisodeAiringTime(cached, num);
            const dateStr = airingTime ? new Date(airingTime).toISOString() : new Date(now).toISOString();

            episodes.push({
              id: `placeholder-${id}-${num}`,
              number: num,
              title: `Episode ${num}`,
              aired: dateStr,
            });
          }

          return {
            data: episodes,
            totalCount: Math.max(result.totalCount, episodes.length)
          };
        }
      }
    } catch (e) {
      console.warn('[animeApi] Episode correction failed:', e);
    }

    return result;
  },

  getAnimeRelations: async (id: string): Promise<AnimeRelation[]> => {
    return apiManager.fetchWithSWR(
      'other',
      `relations_${id}`,
      () => jikanApi.getAnimeRelations(id)
    );
  },

  getAiringSchedule: async (day?: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    const cacheKey = day ? `schedule_${day.toLowerCase()}` : `schedule_week`;
    return apiManager.fetchWithSWR(
      'schedule',
      cacheKey,
      day ? () => jikanApi.getAiringSchedule(day) : () => anilistApi.getAiringSchedule(),
      () => jikanApi.getAiringSchedule(day),
      onUpdate
    );
  },

  getRandomAnime: async (): Promise<Media | null> => {
    return jikanApi.getRandomAnime();
  },

  getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
    return apiManager.fetchWithSWR(
      'other',
      `genres_list`,
      () => jikanApi.getAnimeGenres()
    );
  },
};
