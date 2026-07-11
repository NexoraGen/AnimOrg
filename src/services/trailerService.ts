import { useAppStore } from '../store/useAppStore';
import { Platform } from 'react-native';

export interface JikanTrailer {
  url?: string;
  youtubeId?: string;
  embedUrl?: string;
}

const TRAILER_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const NEGATIVE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const trailerService = {
  /**
   * Resolves the best available trailer URL for an anime.
   * Checks persistent cache first, then Jikan data, then falls back to YouTube search.
   */
  resolveTrailerUrl: async (
    animeId: string,
    title: string,
    jikanTrailer?: JikanTrailer
  ): Promise<string | null> => {
    // 1. Try Jikan/AniList metadata first (API metadata is always more reliable than custom cache/scrape)
    let trailerUrl: string | null = null;

    if (jikanTrailer) {
      if (jikanTrailer.url) {
        trailerUrl = jikanTrailer.url;
      } else if (jikanTrailer.youtubeId) {
        trailerUrl = `https://www.youtube.com/watch?v=${jikanTrailer.youtubeId}`;
      } else if (jikanTrailer.embedUrl) {
        const match = jikanTrailer.embedUrl.match(/embed\/([^?]+)/);
        trailerUrl = match ? `https://www.youtube.com/watch?v=${match[1]}` : jikanTrailer.embedUrl;
      }
    }

    if (trailerUrl && trailerService.isValidUrl(trailerUrl)) {
      const { setTrailerCache } = useAppStore.getState();
      setTrailerCache(animeId, trailerUrl);
      return trailerUrl;
    }

    // 2. Check cache (useful for slow YouTube fallbacks)
    const { getTrailerCache, setTrailerCache } = useAppStore.getState();
    const cache = getTrailerCache();
    const cachedEntry = cache[animeId];

    if (cachedEntry) {
      const isNegativeCache = cachedEntry.url === '';
      const ttl = isNegativeCache ? NEGATIVE_CACHE_TTL : TRAILER_CACHE_TTL;

      if (Date.now() - cachedEntry.cachedAt < ttl) {
        return isNegativeCache ? null : cachedEntry.url;
      }
    }

    // 3. Fallback: YouTube Search
    trailerUrl = await trailerService.searchYoutubeTrailer(title);

    // Cache result (even if null, to prevent repeated failing searches)
    setTrailerCache(animeId, trailerUrl || '');
    return trailerUrl;
  },

  /**
   * Synchronous check if a trailer is likely available (cached or from basic data)
   * Useful for initial UI rendering before async resolution finishes.
   */
  hasTrailer: (animeId: string): boolean => {
    const { getTrailerCache } = useAppStore.getState();
    const cache = getTrailerCache();
    const cachedEntry = cache[animeId];

    if (cachedEntry && Date.now() - cachedEntry.cachedAt < (cachedEntry.url ? TRAILER_CACHE_TTL : NEGATIVE_CACHE_TTL)) {
      return cachedEntry.url !== '';
    }
    return false;
  },

  /**
   * Synchronous read from cache.
   */
  getTrailerUrl: (animeId: string): string | null => {
    const { getTrailerCache } = useAppStore.getState();
    const cache = getTrailerCache();
    const cachedEntry = cache[animeId];

    if (cachedEntry && cachedEntry.url !== '' && Date.now() - cachedEntry.cachedAt < TRAILER_CACHE_TTL) {
      return cachedEntry.url;
    }
    return null;
  },

  /**
   * Fallback to scrape a YouTube trailer if Jikan API is missing one.
   * Tries multiple query strategies.
   */
  searchYoutubeTrailer: async (animeTitle: string): Promise<string | null> => {
    // Web browsers will block this with CORS, so we skip the scrape fallback on Web
    if (Platform.OS === 'web') return null;

    const queries = [
      `${animeTitle} official trailer anime`,
      `${animeTitle} PV anime`,
      `${animeTitle} anime trailer`
    ];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const q of queries) {
      let attempts = 2;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const query = encodeURIComponent(q);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const response = await fetch(`https://www.youtube.com/results?search_query=${query}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const text = await response.text();

          // Look for the first valid video ID that isn't a playlist or channel
          const match = text.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
          if (match && match[1]) {
            return `https://www.youtube.com/watch?v=${match[1]}`;
          }
          break; // If fetch succeeded but no match, no need to retry this query
        } catch (error: any) {
          console.warn(`Trailer fallback search failed for query "${q}" (Attempt ${attempt}/${attempts}):`, error.message);
          if (attempt < attempts) {
            await delay(1000 * Math.pow(2, attempt - 1));
          }
        }
      }
    }

    return null;
  },

  isValidUrl: (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
};
