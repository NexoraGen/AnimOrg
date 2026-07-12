import { Request, Response, NextFunction } from "express";
import AnimeService from "../services/AnimeService";

export const getAnime = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const anime = await AnimeService.getAnime(id);
        res.json(anime);
    } catch (error) {
        next(error);
    }
};

export const searchAnime = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const arrival = Date.now();
        console.log(`[Backend Debug] Search Anime request arrived: ${arrival}`);
        const query = req.query.q as string;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const genres = req.query.genres as string | undefined;
        const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
        const orderBy = req.query.orderBy as string | undefined;
        const sort = req.query.sort as string | undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const results = await AnimeService.searchAnime(
            query,
            page,
            genres,
            minScore,
            orderBy,
            sort,
            limit
        );
        const serializeStart = Date.now();
        res.json(results);
        const serializeDone = Date.now();
        console.log(`[Backend Debug] Search Anime serialization time: ${serializeDone - serializeStart}ms | Total time in controller: ${serializeDone - arrival}ms`);
    } catch (error) {
        next(error);
    }
};

export const getTopAnime = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = req.query.page ? Number(req.query.page) : undefined;
        const filter = req.query.filter as string | undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const data = await AnimeService.getTopAnime(page, filter, limit);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getCurrentSeason = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = req.query.page ? Number(req.query.page) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const data = await AnimeService.getCurrentSeason(page, limit);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getUpcomingAnime = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = req.query.page ? Number(req.query.page) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const data = await AnimeService.getUpcomingAnime(page, limit);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filter = req.query.filter as string | undefined;
        const page = req.query.page ? Number(req.query.page) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;

        const data = await AnimeService.getSchedule(filter, page, limit);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getEpisodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const page = req.query.page ? Number(req.query.page) : undefined;

        const data = await AnimeService.getEpisodes(id, page);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const data = await AnimeService.getRecommendations(id);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getCharacters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const data = await AnimeService.getCharacters(id);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getAnimeRelations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const data = await AnimeService.getAnimeRelations(id);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const getAnimeGenres = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await AnimeService.getAnimeGenres();
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const searchCharacters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const arrival = Date.now();
        console.log(`[Backend Debug] Search Characters request arrived: ${arrival}`);
        const query = req.query.q as string;
        const page = req.query.page ? Number(req.query.page) : undefined;

        const data = await AnimeService.searchCharacters(query, page);
        const serializeStart = Date.now();
        res.json(data);
        const serializeDone = Date.now();
        console.log(`[Backend Debug] Search Characters serialization time: ${serializeDone - serializeStart}ms | Total time in controller: ${serializeDone - arrival}ms`);
    } catch (error) {
        next(error);
    }
};