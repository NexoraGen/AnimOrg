import { jikanApi } from './api/jikan';

export const animeApi = {
  getTrendingAnime: jikanApi.getTrendingAnime,
  getTopAnime: jikanApi.getTopAnime,
  getAnimeDetails: jikanApi.getAnimeDetails,
  getSeasonalAnime: jikanApi.getSeasonalAnime,
  searchAnime: jikanApi.searchAnime,
  getAnimeCharacters: jikanApi.getAnimeCharacters,
  getAnimeRecommendations: jikanApi.getAnimeRecommendations,
  getUpcomingAnime: jikanApi.getUpcomingAnime,
  getAnimeByGenre: jikanApi.getAnimeByGenre,
};
