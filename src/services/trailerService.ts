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
    const { getTrailerCache, setTrailerCache } = useAppStore.getState();
    const cache = getTrailerCache();
    const cachedEntry = cache[animeId];

    // Check cache
    if (cachedEntry) {
      const isNegativeCache = cachedEntry.url === '';
      const ttl = isNegativeCache ? NEGATIVE_CACHE_TTL : TRAILER_CACHE_TTL;
      
      if (Date.now() - cachedEntry.cachedAt < ttl) {
        return isNegativeCache ? null : cachedEntry.url;
      }
    }

    // Try Jikan data
    let trailerUrl: string | null = null;
    
    if (jikanTrailer) {
      if (jikanTrailer.url) {
        trailerUrl = jikanTrailer.url;
      } else if (jikanTrailer.youtubeId) {
        trailerUrl = `https://www.youtube.com/watch?v=${jikanTrailer.youtubeId}`;
      } else if (jikanTrailer.embedUrl) {
        // Extract from embed URL if possible, otherwise use as is
        const match = jikanTrailer.embedUrl.match(/embed\/([^?]+)/);
        trailerUrl = match ? `https://www.youtube.com/watch?v=${match[1]}` : jikanTrailer.embedUrl;
      }
    }

    // Validate and clean Jikan URL
    if (trailerUrl && trailerService.isValidUrl(trailerUrl)) {
      setTrailerCache(animeId, trailerUrl);
      return trailerUrl;
    }

    // Fallback: YouTube Search
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

    for (const q of queries) {
      try {
        const query = encodeURIComponent(q);
        const response = await fetch(`https://www.youtube.com/results?search_query=${query}`);
        const text = await response.text();
        
        // Look for the first valid video ID that isn't a playlist or channel
        const match = text.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      } catch (error) {
        console.warn(`Trailer fallback search failed for query "${q}":`, error);
        // Continue to next query if network error on first
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
