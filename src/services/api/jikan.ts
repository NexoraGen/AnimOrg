import { Media, Character } from '../../types';

const BASE_URL = 'https://api.jikan.moe/v4';

// Jikan API has a rate limit of ~3 requests/second.
// This helper enforces a minimum delay between requests.
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to map Jikan anime data to our Media type
const mapJikanToMedia = (item: any): Media => {
  return {
    id: item.mal_id.toString(),
    title: item.title_english || item.title,
    description: item.synopsis || 'No description available.',
    posterPath: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
    backdropPath: item.trailer?.images?.maximum_image_url || item.images?.webp?.large_image_url,
    rating: item.score || 0,
    releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : 0),
    genres: item.genres?.map((g: any) => g.name) || [],
    type: 'anime',
    episodes: item.episodes,
    trailerUrl: item.trailer?.url,
    status: item.status,
    popularity: item.popularity,
    rank: item.rank,
    studio: item.studios?.[0]?.name,
    season: item.season ? `${item.season} ${item.year}` : undefined,
    score: item.score,
  };
};

// Simple in-memory cache to avoid redundant fetches
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const fetchWithCache = async (url: string): Promise<any> => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(url);
  if (response.status === 429) {
    // Rate limited — wait and retry once
    await delay(1000);
    const retry = await fetch(url);
    if (!retry.ok) throw new Error(`Failed to fetch: ${url}`);
    const data = await retry.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data;
  }
  if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
};

export const jikanApi = {
  getTrendingAnime: async (): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/top/anime?filter=airing&limit=10`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  getTopAnime: async (): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/top/anime?limit=10`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  getSeasonalAnime: async (): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/seasons/now?limit=10`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching seasonal anime:', error);
      return [];
    }
  },

  searchAnime: async (query: string): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=20`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  getAnimeDetails: async (id: string): Promise<Media | null> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/full`);
      return mapJikanToMedia(data.data);
    } catch (error) {
      console.error(`Error fetching details for anime ${id}:`, error);
      return null;
    }
  },

  getAnimeCharacters: async (id: string): Promise<Character[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime/${id}/characters`);
      
      // Jikan returns a lot, we'll take top 10
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
        rating: 0,
        releaseYear: 0,
        genres: [],
        type: 'anime' as const,
      }));
    } catch (error) {
      console.error(`Error fetching recommendations for anime ${id}:`, error);
      return [];
    }
  },

  getUpcomingAnime: async (): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/seasons/upcoming?limit=10`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error('Error fetching upcoming anime:', error);
      return [];
    }
  },

  getAnimeByGenre: async (genreId: number): Promise<Media[]> => {
    try {
      const data = await fetchWithCache(`${BASE_URL}/anime?genres=${genreId}&order_by=popularity&sort=desc&limit=10`);
      return data.data.map(mapJikanToMedia);
    } catch (error) {
      console.error(`Error fetching anime for genre ${genreId}:`, error);
      return [];
    }
  }
};
