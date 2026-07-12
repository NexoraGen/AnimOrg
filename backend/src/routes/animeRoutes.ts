import { Router } from "express";
import {
    getAnime,
    searchAnime,
    getTopAnime,
    getCurrentSeason,
    getUpcomingAnime,
    getSchedule,
    getEpisodes,
    getRecommendations,
    getCharacters,
    getAnimeRelations,
    getAnimeGenres,
    searchCharacters
} from "../controllers/animeController";
import {
    validateAnimeId,
    validateSearchQuery,
    validatePaginationParams
} from "../middleware/validator";

const router = Router();

// Static routes (must come first to avoid overriding /:id)
router.get("/search", validateSearchQuery, validatePaginationParams, searchAnime);
router.get("/top", validatePaginationParams, getTopAnime);
router.get("/season", validatePaginationParams, getCurrentSeason);
router.get("/upcoming", validatePaginationParams, getUpcomingAnime);
router.get("/schedule", validatePaginationParams, getSchedule);
router.get("/genres", getAnimeGenres);
router.get("/characters", validateSearchQuery, validatePaginationParams, searchCharacters);

// Dynamic routes
router.get("/:id/episodes", validateAnimeId, validatePaginationParams, getEpisodes);
router.get("/:id/recommendations", validateAnimeId, getRecommendations);
router.get("/:id/characters", validateAnimeId, getCharacters);
router.get("/:id/relations", validateAnimeId, getAnimeRelations);
router.get("/:id/full", validateAnimeId, getAnime); // Supports direct full details retrieval
router.get("/:id", validateAnimeId, getAnime);

export default router;