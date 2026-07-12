import { AniListAdapter } from './api/AniListAdapter';
import { JikanAdapter } from './api/JikanAdapter';
import { getCurrentlyReleasedEpisodesCount, getEpisodeAiringTime } from '../utils/releaseHelper';
import { CacheManager, TTL } from './api/CacheManager';
import { RetryManager } from './api/RetryManager';
import { Media, Character, Episode, AnimeRelation } from '../types';
import { EpisodeCountRegistry } from '../utils/episodeCountSync';

const JIKAN_GENRE_MAP: Record<number, string> = {
  1: 'Action', 2: 'Adventure', 4: 'Comedy', 22: 'Romance',
  40: 'Psychological', 10: 'Fantasy', 41: 'Thriller',
  27: 'Shonen', 42: 'Seinen', 30: 'Sports', 24: 'Sci-Fi',
  7: 'Mystery', 36: 'Slice of Life', 21: 'Samurai',
  16: 'Magic', 18: 'Mecha', 73: 'Survival', 14: 'Horror',
  23: 'School Life', 62: 'Isekai', 37: 'Supernatural',
  38: 'Military'
};

const executeWithPrimaryAndFallback = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  onRetryStatus?: (msg: string) => void
): Promise<T> => {
  try {
    return await RetryManager.execute(primary, 3, 1000, onRetryStatus);
  } catch (primaryError) {
    onRetryStatus?.("Searching another source...");
    try {
      return await RetryManager.execute(fallback, 3, 1000, onRetryStatus);
    } catch (fallbackError) {
      throw new Error("Both providers failed to retrieve information.");
    }
  }
};

/**
 * The unified UnifiedAnimeService representing the new, fully abstracted data tier.
 * It manages primary/fallback orchestration, caching, and retry logic internally.
 */
export const animeApi = {
  getTrendingAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `trending_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getTrendingAnime(page),
        () => JikanAdapter.getTrendingAnime(page)
      ),
      TTL.TRENDING,
      onUpdate
    );
  },

  getTopAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `top_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getTopAnime(page),
        () => JikanAdapter.getTopAnime(page)
      ),
      TTL.TOP_RATED,
      onUpdate
    );
  },

  getSeasonalAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `seasonal_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getSeasonalAnime(page),
        () => JikanAdapter.getSeasonalAnime(page)
      ),
      TTL.SEASONAL,
      onUpdate
    );
  },

  getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
    return CacheManager.fetchWithCache(
      `seasonal_full_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getSeasonalAnimeFullPaginated(page),
        () => JikanAdapter.getSeasonalAnimeFullPaginated(page)
      ),
      TTL.SEASONAL
    );
  },

  getUpcomingAnime: async (page = 1, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `upcoming_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getUpcomingAnime(page),
        () => JikanAdapter.getUpcomingAnime(page)
      ),
      TTL.SEASONAL,
      onUpdate
    );
  },

  // Details has a custom fallback/merge logic
  getAnimeDetails: async (id: string, onUpdate?: (data: Media | null) => void): Promise<Media | null> => {
    const fetchMergedDetails = async (): Promise<Media | null> => {
      let mergedData: Media | null = null;
      try {
        mergedData = await RetryManager.execute(() => AniListAdapter.getAnimeDetails(id), 2);
      } catch (e) {
        // Drop quietly
      }

      if (!mergedData) {
        try {
          mergedData = await RetryManager.execute(() => JikanAdapter.getAnimeDetails(id), 3);
        } catch (e) {
          return null; // Both failed completely
        }
      } else {
        const detailsData = mergedData as Media;
        // AniList succeeded, but it lacks Jikan specific detail fields (Broadcast, Ranks, complete Episodes count if > than AniList holds, or Trailer).
        if (!detailsData.broadcast || !detailsData.rank || !detailsData.rating_count || !(detailsData.trailerUrl || detailsData.trailerData)) {
          // Asynchronously fetch Jikan to fill in the blanks
          JikanAdapter.getAnimeDetails(id).then(jikanData => {
            if (jikanData) {
              const fullyMergedObj: Media = {
                ...detailsData,
                broadcast: detailsData.broadcast || jikanData.broadcast,
                rank: detailsData.rank || jikanData.rank,
                rating_count: detailsData.rating_count || jikanData.rating_count,
                popularity: detailsData.popularity || jikanData.popularity,
                episodes: detailsData.episodes || jikanData.episodes,
                trailerUrl: detailsData.trailerUrl || jikanData.trailerUrl,
                trailerData: detailsData.trailerData || jikanData.trailerData,
              };
              const healedMerged = EpisodeCountRegistry.checkAndFixMedia(fullyMergedObj) as Media;
              // Persist fully merged data to cache as details_${id}
              CacheManager.setCacheEntry(`details_${id}`, healedMerged).catch(() => { });
              if (onUpdate) onUpdate(healedMerged);
            }
          }).catch(() => { });
        }
      }
      return EpisodeCountRegistry.checkAndFixMedia(mergedData) as Media | null;
    };

    const wrapOnUpdate = onUpdate ? (data: Media | null) => {
      onUpdate(EpisodeCountRegistry.checkAndFixMedia(data) as Media | null);
    } : undefined;

    const details = await CacheManager.fetchWithCache(
      `details_${id}`,
      fetchMergedDetails,
      TTL.ANIME_DETAILS,
      wrapOnUpdate
    );

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

    return EpisodeCountRegistry.checkAndFixMedia(details) as Media | null;
  },

  getAnimeCharacters: async (id: string, onUpdate?: (data: Character[]) => void): Promise<Character[]> => {
    return CacheManager.fetchWithCache(
      `characters_${id}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getAnimeCharacters(id),
        () => JikanAdapter.getAnimeCharacters(id)
      ),
      TTL.CHARACTERS,
      onUpdate
    );
  },

  getAnimeRecommendations: async (id: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `recommendations_${id}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getAnimeRecommendations(id),
        () => JikanAdapter.getAnimeRecommendations(id)
      ),
      TTL.RECOMMENDATIONS,
      onUpdate
    );
  },

  getCuratedList: async (listType: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    return CacheManager.fetchWithCache(
      `curated_${listType.replace(/\s+/g, '_')}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getCuratedList(listType),
        () => { throw new Error('Jikan Curated lists unsupported') }
      ),
      TTL.RECOMMENDATIONS,
      onUpdate
    );
  },

  searchAnime: async (
    query: string,
    page = 1,
    genres: (number | string)[] = [],
    minScore?: number,
    orderBy?: string,
    sort?: string,
    onRetryStatus?: (info: { attempt: number; maxAttempts: number; fallback: boolean; rawStatusMsg?: string }) => void,
    signal?: AbortSignal
  ): Promise<{ data: Media[], hasNextPage: boolean }> => {
    // Unify mapping of genres for Cache Key
    const genresMapped: string[] = genres
      .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
      .filter(Boolean);

    const genresKey = genresMapped.length > 0 ? genresMapped.join('_') : 'none';
    const cacheKey = `search_${query.toLowerCase()}_p${page}_g${genresKey}_s${minScore || 'any'}_o${orderBy || 'pop'}_s${sort || 'desc'}`;

    const executeAdaptedSearch = async () => {
      let isFallback = false;
      const proxyRetryStatus = (msg: string) => {
        if (msg === "Searching another source...") isFallback = true;
        onRetryStatus?.({
          attempt: 0,
          maxAttempts: 3,
          fallback: isFallback,
          rawStatusMsg: msg
        });
      };

      try {
        return await RetryManager.execute(
          () => AniListAdapter.searchAnime(query, page, genresMapped, minScore, orderBy, sort, signal),
          3, 1000, proxyRetryStatus
        );
      } catch (err) {
        proxyRetryStatus("Searching another source...");
        return await RetryManager.execute(
          () => JikanAdapter.searchAnime(
            query, page,
            genres.filter(g => typeof g === 'number') as number[],
            minScore, orderBy, sort,
            signal
          ),
          3, 1000, proxyRetryStatus
        );
      }
    };

    return CacheManager.fetchWithCache(
      cacheKey,
      executeAdaptedSearch,
      TTL.SEARCH
    );
  },



  getAnimeByGenre: async (genre: number | string, page = 1): Promise<Media[]> => {
    const genreStr = typeof genre === 'number' ? JIKAN_GENRE_MAP[genre] : genre;
    return CacheManager.fetchWithCache(
      `genre_${genreStr}_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.getAnimeByGenre(genreStr, page),
        () => JikanAdapter.getAnimeByGenre(typeof genre === 'number' ? genre : 1, page)
      ),
      TTL.SEARCH
    );
  },

  getAnimeByGenres: async (genres: (number | string)[], page = 1): Promise<Media[]> => {
    const genresMapped: string[] = genres
      .map(g => typeof g === 'number' ? JIKAN_GENRE_MAP[g] : g)
      .filter(Boolean);
    const genresKey = genresMapped.join('_');

    return CacheManager.fetchWithCache(
      `genres_${genresKey}_p${page}`,
      () => executeWithPrimaryAndFallback(
        () => AniListAdapter.searchAnime('', page, genresMapped).then(res => res.data),
        () => JikanAdapter.searchAnime('', page, genres.filter(g => typeof g === 'number') as number[]).then(res => res.data)
      ),
      TTL.SEARCH
    );
  },

  getAnimeEpisodes: async (id: string, onUpdate?: (data: { data: Episode[], totalCount: number }) => void, bypassCache = false): Promise<{ data: Episode[], totalCount: number }> => {
    const wrapOnUpdate = onUpdate ? async (freshData: any) => {
      if (!freshData) return;
      const corrected = await animeApi.correctEpisodeList(id, {
        data: freshData.data || [],
        totalCount: freshData.totalCount ?? freshData.data?.length ?? 0
      });
      if (corrected && corrected.data && corrected.data.length > 0) {
        const maxEp = Math.max(corrected.totalCount || 0, corrected.data.length, ...corrected.data.map(e => e.number));
        await EpisodeCountRegistry.registerCount(id, maxEp);
      }
      onUpdate(corrected);
    } : undefined;

    // Use Jikan as primary for episodes (since AniList lacks episode list API via GraphQL directly unless heavily paginated)
    const rawResult = await CacheManager.fetchWithCache(
      `episodes_${id}_all`,
      () => RetryManager.execute(() => JikanAdapter.getAnimeEpisodes(id)),
      bypassCache ? 0 : TTL.EPISODES,
      wrapOnUpdate as any
    );

    const corrected = await animeApi.correctEpisodeList(id, {
      data: (rawResult as any)?.data || [],
      totalCount: (rawResult as any)?.totalCount ?? (rawResult as any)?.data?.length ?? 0
    });
    if (corrected && corrected.data && corrected.data.length > 0) {
      const maxEp = Math.max(corrected.totalCount || 0, corrected.data.length, ...corrected.data.map(e => e.number));
      await EpisodeCountRegistry.registerCount(id, maxEp);
    }
    return corrected;
  },

  correctEpisodeList: async (id: string, result: { data: Episode[], totalCount: number }): Promise<{ data: Episode[], totalCount: number }> => {
    // Return result directly as requested to avoid synthetic placeholder episodes or drifted linear estimations.
    return result;
  },

  getAnimeRelations: async (id: string): Promise<AnimeRelation[]> => {
    return CacheManager.fetchWithCache(
      `relations_${id}`,
      () => RetryManager.execute(() => JikanAdapter.getAnimeRelations(id)),
      TTL.ANIME_DETAILS
    );
  },

  getAiringSchedule: async (day?: string, onUpdate?: (data: Media[]) => void): Promise<Media[]> => {
    const cacheKey = day ? `schedule_${day.toLowerCase()}` : `schedule_week`;
    return CacheManager.fetchWithCache(
      cacheKey,
      () => executeWithPrimaryAndFallback(
        () => day ? JikanAdapter.getAiringSchedule(day) : AniListAdapter.getAiringSchedule(),
        () => JikanAdapter.getAiringSchedule(day)
      ),
      TTL.AIRING,
      onUpdate
    );
  },

  getRandomAnime: async (): Promise<Media | null> => {
    // Random endpoint usually strictly Jikan specific.
    return null; // Deprecated due to unreliablity across caches. Replace UI calls gently to use top rated.
  },

  getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
    return CacheManager.fetchWithCache(
      `genres_list`,
      () => RetryManager.execute(() => JikanAdapter.getAnimeGenres()),
      TTL.GENRES
    );
  },
};
