import { Media, Character, Episode } from '../../types';
import { mapAniListToMedia } from './normalization';

const ANILIST_URL = 'https://graphql.anilist.co';

/**
 * Pure API Adapter for AniList GraphQL.
 * Does not contain retry logic or caching. (Handled by UnifiedAnimeService)
 */
const executeGraphQLQuery = async (query: string, variables: any = {}): Promise<any> => {
  console.log('[AniListAdapter] Initiating GraphQL request. Variables:', JSON.stringify(variables));
  let response: Response;
  try {
    response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (networkError: any) {
    console.error('[AniListAdapter] Network fetch failed:', networkError?.message, networkError);
    throw new Error(`AniList Network Error: ${networkError?.message}`);
  }

  console.log('[AniListAdapter] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unable to read body');
    console.error('[AniListAdapter] HTTP Error body:', errorBody);
    throw new Error(`AniList HTTP Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.error('[AniListAdapter] GraphQL errors:', JSON.stringify(json.errors));
    throw new Error(`AniList GraphQL Error: ${JSON.stringify(json.errors)}`);
  }
  console.log('[AniListAdapter] Query succeeded. Data keys:', Object.keys(json.data || {}));
  return json.data;
};

const BASE_MEDIA_FIELDS = `
  id
  idMal
  title {
    english
    romaji
  }
  description
  coverImage {
    extraLarge
    large
    medium
  }
  bannerImage
  averageScore
  season
  seasonYear
  genres
  episodes
  format
  status
  popularity
  source
  duration
  startDate {
    year
    month
    day
  }
  studios(isMain: true) {
    nodes {
      name
    }
  }
  trailer {
    id
    site
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  isAdult
`;

const getCurrentSeasonAndYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let season = 'WINTER';

  if (month >= 2 && month <= 4) season = 'SPRING';
  else if (month >= 5 && month <= 7) season = 'SUMMER';
  else if (month >= 8 && month <= 10) season = 'FALL';

  return { season, year };
};

export const AniListAdapter = {
  getTrendingAnime: async (page = 1, perPage = 20): Promise<Media[]> => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (sort: TRENDING_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { page, perPage });
    return (data.Page?.media || []).filter((m: any) => !m.isAdult).map(mapAniListToMedia);
  },

  getTopAnime: async (page = 1, perPage = 20): Promise<Media[]> => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (sort: SCORE_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { page, perPage });
    return (data.Page?.media || []).filter((m: any) => !m.isAdult).map(mapAniListToMedia);
  },

  getSeasonalAnime: async (page = 1, perPage = 20): Promise<Media[]> => {
    const { season, year } = getCurrentSeasonAndYear();
    const query = `
      query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
        Page (page: $page, perPage: $perPage) {
          media (season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { page, perPage, season, year });
    return (data.Page?.media || []).map(mapAniListToMedia);
  },

  getSeasonalAnimeFullPaginated: async (page = 1, perPage = 25): Promise<{ data: Media[], hasNextPage: boolean }> => {
    const { season, year } = getCurrentSeasonAndYear();
    const query = `
      query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            hasNextPage
          }
          media (season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { page, perPage, season, year });
    return {
      data: (data.Page?.media || []).map(mapAniListToMedia),
      hasNextPage: data.Page?.pageInfo?.hasNextPage || false
    };
  },

  getUpcomingAnime: async (page = 1, perPage = 20): Promise<Media[]> => {
    const current = getCurrentSeasonAndYear();
    let nextSeason = 'SPRING';
    let nextYear = current.year;

    if (current.season === 'WINTER') nextSeason = 'SPRING';
    else if (current.season === 'SPRING') nextSeason = 'SUMMER';
    else if (current.season === 'SUMMER') nextSeason = 'FALL';
    else { nextSeason = 'WINTER'; nextYear += 1; }

    const query = `
      query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
        Page (page: $page, perPage: $perPage) {
          media (season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { page, perPage, season: nextSeason, year: nextYear });
    return (data.Page?.media || []).map(mapAniListToMedia);
  },

  getCuratedList: async (listType: string): Promise<Media[]> => {
    let variables: any = { page: 1, perPage: 20 };
    let filterString = '';

    switch (listType) {
      case 'All-Time Legends': filterString = 'sort: SCORE_DESC, averageScore_greater: 80, popularity_greater: 70000'; break;
      case 'Modern Masterpieces': filterString = 'sort: SCORE_DESC, startDate_greater: 20180101, averageScore_greater: 82'; break;
      case 'Psychological Peaks': filterString = 'genre_in: ["Psychological"], sort: SCORE_DESC, averageScore_greater: 78'; break;
      case 'Dark Masterpieces': filterString = 'genre_in: ["Horror", "Psychological"], sort: SCORE_DESC'; break;
      case 'Beginner Essentials': filterString = 'sort: POPULARITY_DESC, averageScore_greater: 78'; break;
      case 'Highest Rated Anime': filterString = 'sort: SCORE_DESC'; break;
      case 'Must Watch Shonen': filterString = 'genre_in: ["Action", "Adventure"], genre_not_in: ["Slice of Life"], sort: SCORE_DESC, averageScore_greater: 78'; break;
      case 'Fan Favorites': filterString = 'sort: FAVOURITES_DESC'; break;
      case 'Best Storytelling': filterString = 'genre_in: ["Drama", "Mystery"], sort: SCORE_DESC, averageScore_greater: 80'; break;
      case 'Anime Hall of Fame': filterString = 'sort: POPULARITY_DESC, averageScore_greater: 80'; break;
      default: filterString = 'sort: SCORE_DESC, averageScore_greater: 78';
    }

    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (${filterString}, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, variables);
    return (data.Page?.media || []).map(mapAniListToMedia);
  },

  getAnimeDetails: async (id: string): Promise<Media | null> => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) return null;

    const malQuery = `
      query ($idMal: Int) {
        Media (idMal: $idMal, type: ANIME) {
          ${BASE_MEDIA_FIELDS}
        }
      }
    `;

    const nativeQuery = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          ${BASE_MEDIA_FIELDS}
        }
      }
    `;

    try {
      const data = await executeGraphQLQuery(malQuery, { idMal: parsedId });
      if (data?.Media) return mapAniListToMedia(data.Media);
    } catch {
      const data = await executeGraphQLQuery(nativeQuery, { id: parsedId });
      if (data?.Media) return mapAniListToMedia(data.Media);
    }
    return null;
  },

  getAnimeCharacters: async (id: string): Promise<Character[]> => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) return [];

    const query = `
      query ($id: Int, $idMal: Int) {
        Media (id: $id, idMal: $idMal, type: ANIME) {
          characters (sort: [ROLE, RELEVANCE], perPage: 10) {
            edges {
              role
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
              voiceActors(language: JAPANESE) {
                name {
                  full
                }
                image {
                  medium
                }
              }
            }
          }
        }
      }
    `;

    let data;
    try {
      data = await executeGraphQLQuery(query, { idMal: parsedId });
    } catch (e) {
      data = await executeGraphQLQuery(query, { id: parsedId });
    }

    const edges = data.Media?.characters?.edges || [];
    return edges.map((edge: any) => {
      const jaVA = edge.voiceActors?.[0];
      return {
        id: edge.node.id.toString(),
        name: edge.node.name.full,
        imageUrl: edge.node.image?.large,
        role: edge.role === 'MAIN' ? 'Main' : 'Supporting',
        voiceActor: jaVA ? {
          name: jaVA.name.full,
          imageUrl: jaVA.image?.medium,
        } : undefined
      };
    });
  },

  getAnimeRecommendations: async (id: string): Promise<Media[]> => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) return [];

    const query = `
      query ($id: Int, $idMal: Int) {
        Media (id: $id, idMal: $idMal, type: ANIME) {
          recommendations (sort: RATING_DESC, page: 1, perPage: 12) {
            nodes {
              mediaRecommendation {
                ${BASE_MEDIA_FIELDS}
              }
            }
          }
        }
      }
    `;

    let data;
    try {
      data = await executeGraphQLQuery(query, { idMal: parsedId });
    } catch {
      data = await executeGraphQLQuery(query, { id: parsedId });
    }

    const nodes = data.Media?.recommendations?.nodes || [];
    return nodes
      .filter((n: any) => n.mediaRecommendation !== null)
      .map((n: any) => mapAniListToMedia(n.mediaRecommendation));
  },

  searchAnime: async (queryStr: string, page = 1, genres: string[] = [], minScore?: number, orderBy?: string, sort?: string): Promise<{ data: Media[], hasNextPage: boolean }> => {
    let variables: any = { page, perPage: 20 };
    let matchStrings: string[] = ['type: ANIME'];
    let valHeaders: string[] = ['$page: Int', '$perPage: Int'];

    if (queryStr && queryStr.trim() !== '') {
      variables.search = queryStr;
      matchStrings.push('search: $search');
      valHeaders.push('$search: String');
    }

    if (genres && genres.length > 0) {
      variables.genres = genres;
      matchStrings.push('genre_in: $genres');
      valHeaders.push('$genres: [String]');
    }

    let aniListSort = 'POPULARITY_DESC';
    if (orderBy === 'score') aniListSort = 'SCORE_DESC';
    else if (orderBy === 'popularity') aniListSort = 'POPULARITY_DESC';
    else if (orderBy === 'favorites') aniListSort = 'FAVOURITES_DESC';
    else if (orderBy === 'title') aniListSort = 'TITLE_ENGLISH_DESC';

    if (sort === 'asc') aniListSort = aniListSort.replace('_DESC', '_ASC');

    variables.sort = aniListSort;
    matchStrings.push('sort: $sort');
    valHeaders.push('$sort: [MediaSort]');

    const query = `
      query (${valHeaders.join(', ')}) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            hasNextPage
          }
          media (${matchStrings.join(', ')}) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;

    const data = await executeGraphQLQuery(query, variables);
    return {
      data: (data.Page?.media || []).map(mapAniListToMedia),
      hasNextPage: data.Page?.pageInfo?.hasNextPage || false
    };
  },

  getAnimeByGenre: async (genreName: string, page = 1): Promise<Media[]> => {
    const query = `
      query ($genre: String, $page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (genre: $genre, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { genre: genreName, page, perPage: 20 });
    return (data.Page?.media || []).filter((m: any) => !m.isAdult).map(mapAniListToMedia);
  },

  getAiringSchedule: async (): Promise<Media[]> => {
    const now = Math.floor(Date.now() / 1000);
    const nextWeek = now + 7 * 24 * 60 * 60;

    const query = `
      query ($now: Int, $nextWeek: Int, $page: Int) {
        Page (page: $page, perPage: 50) {
          pageInfo {
            hasNextPage
          }
          airingSchedules (airingAt_greater: $now, airingAt_lesser: $nextWeek, sort: TIME) {
            media {
              ${BASE_MEDIA_FIELDS}
            }
          }
        }
      }
    `;

    const items: Media[] = [];
    const seen = new Set();
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= 5) {
      try {
        console.log(`[AniListAdapter] Fetching airing schedule page ${page}...`);
        const data = await executeGraphQLQuery(query, { now, nextWeek, page });
        const schedules = data?.Page?.airingSchedules || [];
        schedules.forEach((s: any) => {
          if (s.media && !s.media.isAdult && !seen.has(s.media.idMal || s.media.id)) {
            seen.add(s.media.idMal || s.media.id);
            const mapped = mapAniListToMedia(s.media);
            if (s.airingAt) {
              mapped.nextAiringEpisode = {
                airingAt: s.airingAt,
                timeUntilAiring: s.airingAt - Math.floor(Date.now() / 1000),
                episode: s.episode
              };
            }
            items.push(mapped);
          }
        });
        hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
        page++;
      } catch (err) {
        console.error(`[AniListAdapter] Error fetching airing schedule page ${page}:`, err);
        if (items.length > 0) {
          break;
        }
        throw err;
      }
    }

    console.log(`[AniListAdapter] Retrieved total ${items.length} unique weekly airing anime`);
    return items;
  }
};
