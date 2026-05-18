import { anilistApi } from './api/anilist';
import { jikanApi } from './api/jikan';
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

  getAnimeEpisodes: async (id: string, page = 1): Promise<{ data: Episode[], hasNextPage: boolean, totalCount?: number }> => {
    return apiManager.fetchWithSWR(
      'other',
      `episodes_${id}_p${page}`,
      () => jikanApi.getAnimeEpisodes(id, page)
    );
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
