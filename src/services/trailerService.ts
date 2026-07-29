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
   * Helper to extract 11-character YouTube video ID from various formats.
   */
  extractYoutubeId: (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    return null;
  },

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

    if (trailerUrl) {
      const extractedId = trailerService.extractYoutubeId(trailerUrl);
      if (extractedId) {
        trailerUrl = `https://www.youtube.com/watch?v=${extractedId}`;
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
   * Safe fallback stripped of HTML scraping to enforce YouTube ToS compliance.
   * If a trailer doesn't exist legitimately via API, it degrades gracefully to null.
   */
  searchYoutubeTrailer: async (animeTitle: string): Promise<string | null> => {
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
