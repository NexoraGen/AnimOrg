import { Media, Character, Episode } from '../../types';

const ANILIST_URL = 'https://graphql.anilist.co';

const executeGraphQLQuery = async (query: string, variables: any = {}): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json = await response.json();
        if (json.errors) {
            throw new Error(`AniList GraphQL Error: ${JSON.stringify(json.errors)}`);
        }
        return json.data;
    } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
    }
};

const mapStatus = (status: string): string => {
    switch (status) {
        case 'FINISHED': return 'Finished Airing';
        case 'RELEASING': return 'Currently Airing';
        case 'NOT_YET_RELEASED': return 'Not Yet Aired';
        case 'CANCELLED': return 'Cancelled';
        case 'HIATUS': return 'Hiatus';
        default: return status || 'Unknown';
    }
};

const mapAniListToMedia = (item: any): Media => {
    if (!item) throw new Error('AniList mapping item is null');

    // Primary key preference: idMal (MAL ID) to maintain data compatibility
    const idStr = item.idMal ? item.idMal.toString() : item.id.toString();

    // Ratings: AniList scores are 0-100, so we convert to 10 decimal scale (MAL standard)
    const mappedRating = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : undefined;

    // Backdrop: Prefer bannerImage, fallback to coverImage
    const backdrop = item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large;

    // Title: Prefer English, fallback to Romaji
    const title = item.title?.english || item.title?.romaji || 'Untitled Anime';

    return {
        id: idStr,
        title: title,
        description: item.description?.replace(/<[^>]*>/g, '') || 'No description available.',
        posterPath: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium,
        backdropPath: backdrop,
        rating: mappedRating,
        releaseYear: item.seasonYear || item.startDate?.year || undefined,
        genres: item.genres || [],
        type: 'anime',
        episodes: item.episodes || undefined,
        status: mapStatus(item.status),
        popularity: item.popularity || undefined,
        rank: undefined, // AniList does not supply raw Jikan ranks
        studio: item.studios?.nodes?.[0]?.name || undefined,
        season: item.season ? `${item.season.toLowerCase()} ${item.seasonYear}` : undefined,
        score: mappedRating,
        source: item.source || undefined,
        airing_start: item.startDate ? `${item.startDate.year}-${String(item.startDate.month || 1).padStart(2, '0')}-${String(item.startDate.day || 1).padStart(2, '0')}` : undefined,
        synopsis_full: item.description?.replace(/<[^>]*>/g, '') || undefined,
        durationMinutes: item.duration || 24,
        trailerUrl: item.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
        trailerData: item.trailer?.id ? {
            url: item.trailer.site === 'youtube' ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
            youtubeId: item.trailer.id,
            embedUrl: item.trailer.site === 'youtube' ? `https://www.youtube.com/embed/${item.trailer.id}` : undefined,
        } : undefined
    };
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
`;

const getCurrentSeasonAndYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    let season = 'WINTER';

    if (month >= 2 && month <= 4) season = 'SPRING';
    else if (month >= 5 && month <= 7) season = 'SUMMER';
    else if (month >= 8 && month <= 10) season = 'FALL';

    return { season, year };
};

export const anilistApi = {
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
        return (data.Page?.media || []).map(mapAniListToMedia);
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
        return (data.Page?.media || []).map(mapAniListToMedia);
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
        const now = new Date();
        // Compute next season dynamics
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
            case 'All-Time Legends':
                filterString = 'sort: SCORE_DESC, averageScore_greater: 80, popularity_greater: 70000';
                break;
            case 'Modern Masterpieces':
                filterString = 'sort: SCORE_DESC, startDate_greater: 20180101, averageScore_greater: 82';
                break;
            case 'Psychological Peaks':
                filterString = 'genres_in: ["Psychological"], sort: SCORE_DESC, averageScore_greater: 78';
                break;
            case 'Dark Masterpieces':
                filterString = 'genres_in: ["Horror", "Psychological"], sort: SCORE_DESC';
                break;
            case 'Beginner Essentials':
                filterString = 'sort: POPULARITY_DESC, averageScore_greater: 78';
                break;
            case 'Highest Rated Anime':
                filterString = 'sort: SCORE_DESC';
                break;
            case 'Must Watch Shonen':
                filterString = 'genres_in: ["Action", "Adventure"], genres_not_in: ["Slice of Life"], sort: SCORE_DESC, averageScore_greater: 78';
                break;
            case 'Fan Favorites':
                filterString = 'sort: FAVOURITES_DESC';
                break;
            case 'Best Storytelling':
                filterString = 'genres_in: ["Drama", "Mystery"], sort: SCORE_DESC, averageScore_greater: 80';
                break;
            case 'Anime Hall of Fame':
                filterString = 'sort: POPULARITY_DESC, averageScore_greater: 80';
                break;
            default:
                filterString = 'sort: SCORE_DESC, averageScore_greater: 78';
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
        // Determine target selector type: MAL ID compatibility vs unique AniList ID
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
            // 1. Force attempt details query via MAL ID first
            const data = await executeGraphQLQuery(malQuery, { idMal: parsedId });
            if (data?.Media) return mapAniListToMedia(data.Media);
        } catch {
            // 2. Fall back to AniList direct unique ID details lookups
            try {
                const data = await executeGraphQLQuery(nativeQuery, { id: parsedId });
                if (data?.Media) return mapAniListToMedia(data.Media);
            } catch (err) {
                console.error(`[AniList Details] Completely failed for id ${id}:`, err);
            }
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

        try {
            // Try with unique idMal variable matches first
            let data = await executeGraphQLQuery(query, { idMal: parsedId }).catch(() => null);
            if (!data || !data.Media) {
                // Fallback directly to native id query matches
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
        } catch (err) {
            console.warn(`[AniList Characters] Failed for id ${id}:`, err);
            return [];
        }
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

        try {
            let data = await executeGraphQLQuery(query, { idMal: parsedId }).catch(() => null);
            if (!data || !data.Media) {
                data = await executeGraphQLQuery(query, { id: parsedId });
            }

            const nodes = data.Media?.recommendations?.nodes || [];
            return nodes
                .filter((n: any) => n.mediaRecommendation !== null)
                .map((n: any) => mapAniListToMedia(n.mediaRecommendation));
        } catch (err) {
            console.warn(`[AniList Recommendations] Failed for id ${id}:`, err);
            return [];
        }
    },

    searchAnime: async (
        queryStr: string,
        page = 1,
        genres: string[] = [], // AniList genres are array of strings
        minScore?: number,
        orderBy?: string,
        sort?: string
    ): Promise<{ data: Media[], hasNextPage: boolean }> => {
        let variables: any = { page, perPage: 20 };
        let matchStrings: string[] = ['type: ANIME'];

        if (queryStr && queryStr.trim() !== '') {
            variables.search = queryStr;
            matchStrings.push('search: $search');
        }

        if (genres && genres.length > 0) {
            variables.genres = genres;
            matchStrings.push('genre_in: $genres');
        }

        // Handle sort translations
        let aniListSort = 'POPULARITY_DESC';
        if (orderBy === 'score') aniListSort = 'SCORE_DESC';
        else if (orderBy === 'popularity') aniListSort = 'POPULARITY_DESC';
        else if (orderBy === 'favorites') aniListSort = 'FAVOURITES_DESC';
        else if (orderBy === 'title') aniListSort = 'TITLE_ENGLISH_DESC';

        if (sort === 'asc') {
            aniListSort = aniListSort.replace('_DESC', '_ASC');
        }
        variables.sort = aniListSort;
        matchStrings.push('sort: $sort');

        const query = `
      query ($page: Int, $perPage: Int, $search: String, $genres: [String], $sort: [MediaSort]) {
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
          media (genre: $genre, sort: POPULARITY_DESC, type: ANIME) {
            ${BASE_MEDIA_FIELDS}
          }
        }
      }
    `;
        const data = await executeGraphQLQuery(query, { genre: genreName, page, perPage: 20 });
        return (data.Page?.media || []).map(mapAniListToMedia);
    },

    getAiringSchedule: async (): Promise<Media[]> => {
        const now = Math.floor(Date.now() / 1000);
        // Fetch schedule for the upcoming 7 days in AniList
        const nextWeek = now + 7 * 24 * 60 * 60;

        const query = `
      query ($now: Int, $nextWeek: Int) {
        Page (page: 1, perPage: 40) {
          airingSchedules (airingAt_greater: $now, airingAt_less: $nextWeek, sort: TIME) {
            media {
              ${BASE_MEDIA_FIELDS}
            }
          }
        }
      }
    `;

        const data = await executeGraphQLQuery(query, { now, nextWeek });
        const schedules = data.Page?.airingSchedules || [];
        const seen = new Set();
        const items: Media[] = [];

        schedules.forEach((s: any) => {
            if (s.media && !seen.has(s.media.idMal || s.media.id)) {
                seen.add(s.media.idMal || s.media.id);
                items.push(mapAniListToMedia(s.media));
            }
        });

        return items;
    }
};
