import AsyncStorage from '@react-native-async-storage/async-storage';
import { Media, Character, Episode, AnimeRelation } from '../../types';

const BASE_URL = 'https://api.jikan.moe/v4';

// Jikan API has a rate limit of ~3 requests/second.
// This helper enforces a minimum delay between requests.
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let lastRequestTime = 0;
const MIN_REQUEST_GAP = 400; // 400ms gap = 2.5 requests/sec

// Simple sequential execution lock to prevent parallel bursts
let requestQueue: Promise<any> = Promise.resolve();

// In-memory cache + AsyncStorage cache
const inMemoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;

// Minimal static fallback dataset for offline/API-down states when no cache exists
const generateMinimalFallback = (url: string) => {
  if (url.includes('/top/anime') || url.includes('/seasons/now')) {
    return {
      data: [
        { mal_id: 21, title: 'One Piece', title_english: 'One Piece', images: { webp: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1244/138851l.webp' } }, type: 'TV', score: 8.7, status: 'Currently Airing', synopsis: 'Gol D. Roger was known as the Pirate King...' },
        { mal_id: 11061, title: 'Hunter x Hunter (2011)', title_english: 'Hunter x Hunter', images: { webp: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1337/99013l.webp' } }, type: 'TV', score: 9.0, status: 'Finished Airing', synopsis: 'Hunters devote themselves to accomplishing hazardous tasks...' },
        { mal_id: 5114, title: 'Fullmetal Alchemist: Brotherhood', title_english: 'Fullmetal Alchemist: Brotherhood', images: { webp: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1208/94745l.webp' } }, type: 'TV', score: 9.1, status: 'Finished Airing', synopsis: 'After a horrific alchemy experiment goes wrong...' },
      ]
    };
  }
  return { data: [] };
};

const fetchWithCache = async (url: string, retries = 3, bypassCache = false): Promise<any> => {
  // 1. Check in-memory cache
  if (!bypassCache) {
    const memoryCached = inMemoryCache.get(url);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_DURATION) {
      return memoryCached.data;
    }
  }

  // Evict old memory cache to prevent memory leaks
  if (inMemoryCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = inMemoryCache.keys().next().value;
    if (oldestKey) inMemoryCache.delete(oldestKey);
  }

  const attemptFetch = async (attempt: number): Promise<any> => {
    const queuePromise = requestQueue.catch(() => { }).then(async () => {
      const now = Date.now();
      const timeSinceLast = now - lastRequestTime;

      // Ensure min gap between requests
      if (timeSinceLast < MIN_REQUEST_GAP) {
        await delay(MIN_REQUEST_GAP - timeSinceLast);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        lastRequestTime = Date.now();

        if (response.status === 429) {
          throw new Error('RateLimited');
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${url} (Status: ${response.status})`);
        }

        const data = await response.json();

        // Save to in-memory cache upon success (RAM-only caching prevents SQLITE_FULL errors)
        if (!bypassCache) {
          const cachePayload = { data, timestamp: Date.now() };
          inMemoryCache.set(url, cachePayload);
        }

        return data;
      } catch (error: any) {
        throw error; // Let the retry loop handle this
      }
    });

    requestQueue = queuePromise;
    return queuePromise;
  };

  // 2. Retry loop with Exponential Backoff
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await attemptFetch(attempt);
    } catch (error: any) {
      console.warn(`Jikan Fetch Error for ${url} (Attempt ${attempt}/${retries}):`, error.message);

      if (attempt < retries) {
        // Wait before retrying (exponential backoff: ~1s, then ~2s)
        await delay(1000 * Math.pow(2, attempt - 1));
      } else {
        console.warn(`Jikan API completely failed for ${url}. Using fallback.`);

        // 3. Ultimate Fallback handling (stale in-memory cache -> offline static dataset -> empty)
        const cachedPayload = inMemoryCache.get(url);
        if (cachedPayload?.data) return cachedPayload.data;

        if (url.includes('/anime?q=') || url.includes('/characters?q=')) return { data: [], pagination: { has_next_page: false } };
        if (url.includes('/random/anime')) throw new Error('Random fallback not supported');

        // CRITICAL BUG FIX: If episode fetch fails completely, DO NOT return silent empty array.
        // Throw the error so the caller knows it failed and doesn't cache empty data!
        if (url.includes('/episodes')) {
          throw new Error('Episode fetch failed completely');
        }

        return generateMinimalFallback(url);
      }
    }
  }
};

const parseDuration = (durationStr: string): number => {
  if (!durationStr || durationStr === 'Unknown') return 24;
  let totalMinutes = 0;
  const hrMatch = durationStr.match(/(\d+)\s*hr/i);
  const minMatch = durationStr.match(/(\d+)\s*min/i);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  return totalMinutes > 0 ? totalMinutes : 24;
};

// Helper to map Jikan anime data to our Media type
const mapJikanToMedia = (item: any): Media => {
  return {
    id: item.mal_id.toString(),
    title: item.title_english || item.title,
    description: item.synopsis || 'No description available.',
    posterPath: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
    posterImageMedium: item.images?.webp?.image_url || item.images?.jpg?.image_url || item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
    backdropPath: item.trailer?.images?.maximum_image_url ||
      item.trailer?.images?.large_image_url ||
      item.trailer?.images?.medium_image_url ||
      item.images?.webp?.large_image_url,
    rating: item.score || undefined,
    releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
    genres: item.genres?.map((g: any) => g.name) || [],
    type: 'anime',
    format: item.type,
    episodes: item.episodes,
    trailerUrl: item.trailer?.url,
    status: item.status,
    popularity: item.popularity,
    rank: item.rank,
    studio: item.studios?.[0]?.name,
    season: item.season ? `${item.season} ${item.year}` : undefined,
    score: item.score,
    source: item.source,
    rating_count: item.scored_by,
    airing_start: item.aired?.from,
    synopsis_full: item.synopsis,
    durationMinutes: parseDuration(item.duration),
    broadcast: item.broadcast ? {
      day: item.broadcast.day,
      time: item.broadcast.time,
      timezone: item.broadcast.timezone,
      string: item.broadcast.string,
    } : undefined,
    trailerData: item.trailer ? {
      url: item.trailer.url,
      youtubeId: item.trailer.youtube_id,
      embedUrl: item.trailer.embed_url,
    } : undefined
  };
};

export const jikanApi = {
  getTrendingAnime: async (page = 1): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/top/anime?filter=airing&page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  getTopAnime: async (page = 1): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/top/anime?page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  getSeasonalAnime: async (page = 1): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/seasons/now?page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  getSeasonalAnimeFullPaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/seasons/now?page=${page}&limit=25`);
      return {
        data: (data.data || []).map(mapJikanToMedia),
        hasNextPage: data.pagination?.has_next_page || false
      };
    } catch (error) {
      console.error('Error fetching seasonal anime full paginated:', error);
      return { data: [], hasNextPage: false };
    }
  },

  getFullAiringSchedulePaginated: async (page = 1): Promise<{ data: Media[], hasNextPage: boolean }> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/schedules?page=${page}&limit=25`);
      return {
        data: (data.data || []).map(mapJikanToMedia),
        hasNextPage: data.pagination?.has_next_page || false
      };
    } catch (error) {
      console.error('Error fetching full airing schedule paginated:', error);
      return { data: [], hasNextPage: false };
    }
  },

  getCuratedList: async (listType: string): Promise<Media[]> => {
    try {
      let url = `${BASE_URL}/anime?`;
      switch (listType) {
        case 'All-Time Legends':
          url += 'order_by=favorites&sort=desc&min_score=8.0&limit=20';
          break;
        case 'Modern Masterpieces':
          url += 'start_date=2018-01-01&order_by=score&sort=desc&min_score=8.5&limit=20';
          break;
        case 'Psychological Peaks':
          url += 'genres=40,41&order_by=score&sort=desc&min_score=8.0&limit=20';
          break;
        case 'Dark Masterpieces':
          url += 'genres=14,40,41&order_by=score&sort=desc&min_score=7.8&limit=20';
          break;
        case 'Beginner Essentials':
          url += 'order_by=popularity&sort=desc&min_score=8.0&limit=20';
          break;
        case 'Highest Rated Anime':
          url += 'order_by=score&sort=desc&limit=20';
          break;
        case 'Must Watch Shonen':
          url += 'genres=1,27&order_by=score&sort=desc&min_score=8.0&limit=20';
          break;
        case 'Fan Favorites':
          url += 'order_by=favorites&sort=desc&limit=20';
          break;
        case 'Best Storytelling':
          url += 'genres=7,8&order_by=score&sort=desc&min_score=8.3&limit=20';
          break;
        case 'Anime Hall of Fame':
          url += 'order_by=members&sort=desc&min_score=8.2&limit=20';
          break;
        default:
          url += 'order_by=score&sort=desc&min_score=8.0&limit=20';
      }

      const data = await fetchWithCache(url);
      if (!data || !data.data) return [];

      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error(`Error fetching curated list ${listType}:`, error);
      return [];
    }
  },

  searchAnime: async (
    query: string,
    page = 1,
    genres: number[] = [],
    minScore?: number,
    orderBy?: string,
    sort?: string
  ): Promise<{ data: Media[], hasNextPage: boolean }> => {
    try {
      let url = `${BASE_URL}/anime?page=${page}&limit=20`;
      if (query && query.trim() !== '') {
        url += `&q=${encodeURIComponent(query)}`;
      }
      if (genres && genres.length > 0) {
        url += `&genres=${genres.join(',')}`;
      }
      if (minScore !== undefined) {
        url += `&min_score=${minScore}`;
      }
      if (orderBy) {
        url += `&order_by=${orderBy}`;
      }
      if (sort) {
        url += `&sort=${sort}`;
      }

      const data = await fetchWithCache(url);
      return {
        data: data.data.map(mapJikanToMedia),
        hasNextPage: data.pagination?.has_next_page || false
      };
    } catch (error) {
      console.warn('Primary search failed, attempting /top/anime fallback...', error);

      // FALLBACK: When Jikan's /anime?genres= endpoint 504s (chronic issue),
      // fetch from /top/anime (which is always stable) and filter client-side.
      if (genres && genres.length > 0) {
        try {
          const FALLBACK_PAGES = 4; // Fetch 4 pages = 100 top anime to filter from
          const PER_PAGE = 25;
          const startPage = ((page - 1) * 20); // Calculate offset for pagination
          let allItems: any[] = [];

          for (let p = 1; p <= FALLBACK_PAGES; p++) {
            try {
              const topData = await fetchWithCache(`${BASE_URL}/top/anime?page=${p}&limit=${PER_PAGE}`);
              if (topData?.data) {
                allItems = [...allItems, ...topData.data];
              }
            } catch (e) {
              // If even /top/anime fails, break and return what we have
              break;
            }
          }

          // Client-side genre filtering: match if the anime has ANY of the requested genres
          const genreSet = new Set(genres);
          const filtered = allItems.filter(item => {
            const itemGenreIds = [
              ...(item.genres || []),
              ...(item.themes || []),
              ...(item.demographics || [])
            ].map((g: any) => g.mal_id);
            return itemGenreIds.some(id => genreSet.has(id));
          });

          // Sort by score descending (premium first)
          filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

          // Remove duplicates
          const seen = new Set<number>();
          const unique = filtered.filter(item => {
            if (seen.has(item.mal_id)) return false;
            seen.add(item.mal_id);
            return true;
          });

          // Paginate: 20 items per page
          const pageStart = (page - 1) * 20;
          const pageSlice = unique.slice(pageStart, pageStart + 20);

          return {
            data: pageSlice.map(mapJikanToMedia),
            hasNextPage: pageStart + 20 < unique.length
          };
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          return { data: [], hasNextPage: false };
        }
      }

      return { data: [], hasNextPage: false };
    }
  },

  searchCharacters: async (query: string, page = 1): Promise<{ data: any[], hasNextPage: boolean }> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/characters?q=${encodeURIComponent(query)}&page=${page}&limit=15&order_by=favorites&sort=desc`);
      return {
        data: (data.data || []).map((c: any) => ({
          id: c.mal_id.toString(),
          name: c.name,
          imageUrl: c.images?.webp?.image_url || c.images?.jpg?.image_url,
          about: c.about,
          favorites: c.favorites,
          // Note: Full character search in Jikan V4 doesn't include the anime entries in the main results.
          // We might need to fetch character details for that, or just search related anime.
        })),
        hasNextPage: data.pagination?.has_next_page || false
      };
    } catch (error) {
      console.error('Error searching characters:', error);
      return { data: [], hasNextPage: false };
    }
  },

  getAnimeDetails: async (id: string): Promise<Media | null> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/full`);
      return mapJikanToMedia(data.data);
    } catch (error) {
      // Log more context for debugging detail failures
      console.error(`Error fetching details for anime ${id}:`, error);
      return null;
    }
  },

  getAnimeCharacters: async (id: string): Promise<Character[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/characters`);
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
    } catch (error) {
      console.error(`Error fetching characters for anime ${id}:`, error);
      return [];
    }
  },

  getAnimeRecommendations: async (id: string): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/recommendations`);
      return data.data.slice(0, 10).map((r: any) => ({
        id: r.entry.mal_id.toString(),
        title: r.entry.title,
        description: 'No description available.',
        posterPath: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
        backdropPath: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
        rating: undefined,
        releaseYear: undefined,
        genres: [],
        type: 'anime' as const,
      }));
    } catch (error) {
      console.error(`Error fetching recommendations for anime ${id}:`, error);
      return [];
    }
  },

  getUpcomingAnime: async (page = 1): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/seasons/upcoming?page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching upcoming anime:', error);
      return [];
    }
  },

  getAnimeByGenre: async (genreId: number, page = 1): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime?genres=${genreId}&order_by=popularity&sort=desc&page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error(`Error fetching anime for genre ${genreId}:`, error);
      return [];
    }
  },

  getAnimeByGenres: async (genreIds: number[], page = 1): Promise<Media[]> => {
    try {
      const genresParam = genreIds.join(',');
      const data = await fetchWithCache(`${BASE_URL}/anime?genres=${genresParam}&order_by=popularity&sort=desc&page=${page}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error(`Error fetching anime for genres ${genreIds}:`, error);
      return [];
    }
  },

  getRandomAnime: async (): Promise<Media | null> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/random/anime`, 3, true);
      return mapJikanToMedia(data.data);
    } catch (error) {
      console.error('Error fetching random anime:', error);
      return null;
    }
  },

  getAnimeGenres: async (): Promise<{ id: number, name: string }[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/genres/anime`);
      return data.data.map((g: any) => ({
        id: g.mal_id,
        name: g.name
      }));
    } catch (error) {
      console.error('Error fetching anime genres:', error);
      return [];
    }
  },

  // --- Tracking Expansion ---
  getAnimeEpisodes: async (id: string, page = 1): Promise<{ data: Episode[], hasNextPage: boolean, totalCount?: number }> => {
    try {
      const url = `${BASE_URL}/anime/${id}/episodes?page=${page}`;

      const data = await fetchWithCache(url);

      return {
        data: (data.data || []).map((ep: any) => ({
          id: ep.mal_id.toString(),
          number: ep.mal_id,
          title: ep.title,
          aired: ep.aired,
          filler: ep.filler,
          recap: ep.recap,
        })),
        hasNextPage: data.pagination?.has_next_page || false,
        totalCount: data.pagination?.items?.total || (data.pagination?.last_visible_page ? (data.pagination.last_visible_page * 100) : undefined)
      };
    } catch (error) {
      console.error(`[Jikan] Error fetching episodes for anime ${id}:`, error);
      // Let the error throw up so we don't cache an empty array!
      throw error;
    }
  },

  getAnimeEpisodesAllPages: async (id: string): Promise<{ data: Episode[], totalCount: number }> => {
    let allEpisodes: Episode[] = [];
    let page = 1;
    let hasNext = true;
    let total = 0;
    const maxPages = 15; // 1500 episodes maximum safety guard

    while (hasNext && page <= maxPages) {
      try {
        const result = await jikanApi.getAnimeEpisodes(id, page);
        if (result.data.length === 0) {
          break;
        }
        allEpisodes.push(...result.data);
        total = result.totalCount || allEpisodes.length;
        hasNext = result.hasNextPage;

        if (hasNext) {
          page++;
        }
      } catch (error) {
        console.error(`[Jikan] Deep page ${page} fetch error for anime ${id}:`, error);
        // If we throw here and haven't fetched ANY episodes, we should let it fail completely
        if (allEpisodes.length === 0) {
          throw error;
        }
        // Otherwise, break and return what we have so far
        break;
      }
    }

    // Sort to guarantee ascending order
    allEpisodes.sort((a, b) => a.number - b.number);

    return {
      data: allEpisodes,
      totalCount: total || allEpisodes.length
    };
  },

  getAnimeRelations: async (id: string): Promise<AnimeRelation[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/relations`);
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching relations for anime ${id}:`, error);
      return [];
    }
  },

  getAiringSchedule: async (day?: string): Promise<Media[]> => {
    try {
      let url = day ? `${BASE_URL}/schedules?filter=${day.toLowerCase()}` : `${BASE_URL}/schedules`;
      let allItems: Media[] = [];
      const seen = new Set();

      // Fetch at least 3 pages to ensure completeness (Jikan schedules are paginated)
      for (let page = 1; page <= 3; page++) {
        const pageUrl = `${url}${url.includes('?') ? '&' : '?'}page=${page}`;
        const data = await fetchWithCache(pageUrl);
        const pageItems = (data.data || []).map(mapJikanToMedia);

        if (pageItems.length === 0) break;

        pageItems.forEach((item: Media) => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            allItems.push(item);
          }
        });

        if (!data.pagination?.has_next_page) break;
      }

      return allItems;
    } catch (error) {
      console.error(`Error fetching schedule:`, error);
      return [];
    }
  },

  /**
   * Health Check implementation to verify if Jikan API is responsive.
   * Probes the root URL with a strict timeout footprint to silently verify availability without rate-limit spam.
   */
  checkAPIHealth: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Strict 5s timeout

      const response = await fetch(`${BASE_URL}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      return response.ok || response.status === 429; // 429 means it's alive but rate limited
    } catch {
      return false; // Automatically caught offline or timeout scenarios
    }
  }
};
