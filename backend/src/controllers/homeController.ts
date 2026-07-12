import { Request, Response, NextFunction } from "express";
import HomeService from "../services/HomeService";

export const getHome = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await HomeService.getHome();
        res.json(data);
    } catch (error) {
        next(error);
    }
};