import axiosClient from "../utils/axiosClient";
import { JIKAN_API } from "../config/constants";

/**
 * Provider class. Responsible ONLY for communicating with the external Jikan API.
 * Uses axiosClient which wraps request interceptors, timing, and retries.
 */
class JikanProvider {
    private getUrl(path: string): string {
        return `${JIKAN_API.BASE_URL}${path}`;
    }

    private cleanParams(params: any): any {
        const cleaned = { ...params };
        // Omit default page parameter if it is 1 to prevent Jikan cache misses
        if (cleaned.page === 1) {
            delete cleaned.page;
        }
        // Omit limit parameter if it fits in default pagesize (25) to utilize cached responses
        if (cleaned.limit !== undefined && cleaned.limit <= 25) {
            delete cleaned.limit;
        }
        // Omit unindexed order_by options that cause Jikan gateway timeouts (504)
        if (cleaned.order_by === "score" || cleaned.order_by === "rank") {
            delete cleaned.order_by;
            delete cleaned.sort;
        }
        return cleaned;
    }

    private sliceResponse(responseData: any, requestedLimit?: number): any {
        if (requestedLimit !== undefined && requestedLimit <= 25 && responseData && Array.isArray(responseData.data)) {
            responseData.data = responseData.data.slice(0, requestedLimit);
            if (responseData.pagination && responseData.pagination.items) {
                responseData.pagination.items.count = responseData.data.length;
            }
        }
        return responseData;
    }

    async getAnime(id: string, config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_DETAILS(id)),
            { timeout: config?.timeout ?? 8000 }
        );
        return response.data;
    }

    async searchAnime(
        params: {
            q?: string;
            page?: number;
            genres?: string;
            min_score?: number;
            order_by?: string;
            sort?: string;
            limit?: number;
            sfw?: boolean;
        },
        config?: { timeout?: number }
    ) {
        const cleaned = this.cleanParams(params);
        if (cleaned.sfw === undefined) {
            delete cleaned.sfw;
        }

        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_SEARCH),
            {
                params: cleaned,
                timeout: config?.timeout ?? 12000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getTopAnime(
        params: { page?: number; filter?: string; limit?: number },
        config?: { timeout?: number }
    ) {
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.TOP_ANIME),
            {
                params: cleaned,
                timeout: config?.timeout ?? 10000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getCurrentSeason(
        params: { page?: number; limit?: number },
        config?: { timeout?: number }
    ) {
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.SEASON_NOW),
            {
                params: cleaned,
                timeout: config?.timeout ?? 10000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getUpcomingAnime(
        params: { page?: number; limit?: number },
        config?: { timeout?: number }
    ) {
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.SEASON_UPCOMING),
            {
                params: cleaned,
                timeout: config?.timeout ?? 10000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getSchedule(
        params: { filter?: string; page?: number; limit?: number },
        config?: { timeout?: number }
    ) {
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.AIRING_SCHEDULE),
            {
                params: cleaned,
                timeout: config?.timeout ?? 8000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getEpisodes(id: string, page?: number, config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_EPISODES(id)),
            {
                params: { page },
                timeout: config?.timeout ?? 10000,
            }
        );
        return response.data;
    }

    async getCharacters(id: string, config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_CHARACTERS(id)),
            { timeout: config?.timeout ?? 10000 }
        );
        return response.data;
    }

    async getRecommendations(id: string, config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_RECOMMENDATIONS(id)),
            { timeout: config?.timeout ?? 10000 }
        );
        return response.data;
    }

    async getAnimeRelations(id: string, config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_RELATIONS(id)),
            { timeout: config?.timeout ?? 10000 }
        );
        return response.data;
    }

    async getAnimeGenres(config?: { timeout?: number }) {
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.GENRES),
            { timeout: config?.timeout ?? 10000 }
        );
        return response.data;
    }

    async searchCharacters(query: string, page?: number, config?: { timeout?: number }) {
        const params = { q: query, page, limit: 10 };
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.CHARACTER_SEARCH),
            {
                params: cleaned,
                timeout: config?.timeout ?? 10000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }

    async getAnimeByGenre(genreId: number, page?: number, config?: { timeout?: number }) {
        const params = {
            genres: genreId,
            order_by: "popularity",
            sort: "asc",
            page,
            limit: 20,
        };
        const cleaned = this.cleanParams(params);
        const response = await axiosClient.get(
            this.getUrl(JIKAN_API.ENDPOINTS.ANIME_SEARCH),
            {
                params: cleaned,
                timeout: config?.timeout ?? 10000,
            }
        );
        return this.sliceResponse(response.data, params.limit);
    }
}

export default new JikanProvider();