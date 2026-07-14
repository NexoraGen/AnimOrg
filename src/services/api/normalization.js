"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapJikanToMedia = exports.mapJikanStatusToUnified = exports.parseJikanDuration = exports.isJikanExplicitContent = exports.mapAniListToMedia = exports.mapStatusToUnified = void 0;
const episodeCountSync_1 = require("../../utils/episodeCountSync");
// ==========================================
// ANILIST NORMALIZATION HELPERS
// ==========================================
const mapStatusToUnified = (status) => {
    switch (status) {
        case 'FINISHED': return 'Finished Airing';
        case 'RELEASING': return 'Currently Airing';
        case 'NOT_YET_RELEASED': return 'Not Yet Aired';
        case 'CANCELLED': return 'Cancelled';
        case 'HIATUS': return 'Hiatus';
        default: return status || 'Unknown';
    }
};
exports.mapStatusToUnified = mapStatusToUnified;
const mapAniListToMedia = (item) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if (!item)
        throw new Error('AniList mapping item is null');
    // Primary key preference: idMal (MAL ID) to maintain data compatibility if tracking against Jikan or MAL lists.
    // We MUST output a string as required by the App's Media interface.
    const idStr = item.idMal ? item.idMal.toString() : item.id.toString();
    // Ratings: AniList scores are 0-100, normalize to 10 scale (Jikan standard)
    const mappedRating = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : undefined;
    // Backdrop: Prefer bannerImage, fallback
    const backdrop = item.bannerImage || ((_a = item.coverImage) === null || _a === void 0 ? void 0 : _a.extraLarge) || ((_b = item.coverImage) === null || _b === void 0 ? void 0 : _b.large);
    // Title: Prefer English for global readability, fallback to Romaji
    const title = ((_c = item.title) === null || _c === void 0 ? void 0 : _c.english) || ((_d = item.title) === null || _d === void 0 ? void 0 : _d.romaji) || 'Untitled Anime';
    const media = {
        id: idStr,
        title: title,
        description: ((_e = item.description) === null || _e === void 0 ? void 0 : _e.replace(/<[^>]*>/g, '')) || 'No description available.',
        posterPath: ((_f = item.coverImage) === null || _f === void 0 ? void 0 : _f.extraLarge) || ((_g = item.coverImage) === null || _g === void 0 ? void 0 : _g.large) || ((_h = item.coverImage) === null || _h === void 0 ? void 0 : _h.medium),
        backdropPath: backdrop,
        rating: mappedRating,
        releaseYear: item.seasonYear || ((_j = item.startDate) === null || _j === void 0 ? void 0 : _j.year) || undefined,
        genres: item.genres || [],
        type: 'anime',
        format: item.format ? (item.format === 'TV' ? 'TV' :
            item.format === 'TV_SHORT' ? 'TV Short' :
                item.format === 'MOVIE' ? 'Movie' :
                    item.format === 'SPECIAL' ? 'Special' :
                        item.format === 'OVA' ? 'OVA' :
                            item.format === 'ONA' ? 'ONA' :
                                item.format === 'MUSIC' ? 'Music' :
                                    item.format.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) : undefined,
        episodes: item.episodes || (item.nextAiringEpisode ? item.nextAiringEpisode.episode - 1 : undefined),
        status: (0, exports.mapStatusToUnified)(item.status),
        popularity: item.popularity || undefined,
        rank: undefined, // AniList doesn't store direct Jikan global ranks easily
        studio: ((_m = (_l = (_k = item.studios) === null || _k === void 0 ? void 0 : _k.nodes) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.name) || undefined,
        season: item.season ? `${item.season.toLowerCase()} ${item.seasonYear}` : undefined,
        score: mappedRating,
        source: item.source || undefined,
        rating_count: undefined, // Not typically in basic AniList searches
        airing_start: item.startDate ? `${item.startDate.year}-${String(item.startDate.month || 1).padStart(2, '0')}-${String(item.startDate.day || 1).padStart(2, '0')}` : undefined,
        synopsis_full: ((_o = item.description) === null || _o === void 0 ? void 0 : _o.replace(/<[^>]*>/g, '')) || undefined,
        durationMinutes: item.duration || 24,
        trailerUrl: ((_p = item.trailer) === null || _p === void 0 ? void 0 : _p.site) === 'youtube' ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
        trailerData: ((_q = item.trailer) === null || _q === void 0 ? void 0 : _q.id) ? {
            url: item.trailer.site === 'youtube' ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
            youtubeId: item.trailer.id,
            embedUrl: item.trailer.site === 'youtube' ? `https://www.youtube.com/embed/${item.trailer.id}` : undefined,
        } : undefined,
        nextAiringEpisode: item.nextAiringEpisode ? {
            airingAt: item.nextAiringEpisode.airingAt,
            timeUntilAiring: item.nextAiringEpisode.timeUntilAiring,
            episode: item.nextAiringEpisode.episode
        } : undefined
    };
    return episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(media);
};
exports.mapAniListToMedia = mapAniListToMedia;
// ==========================================
// JIKAN NORMALIZATION HELPERS
// ==========================================
/**
 * Centralized content filter for Jikan raw API items.
 * Returns true if the item is explicit hentai/pornographic content.
 * Does NOT filter mature anime (e.g. Attack on Titan, Berserk, etc.)
 */
const isJikanExplicitContent = (item) => {
    if (!item)
        return false;
    // Check rating field (Rx = Hentai)
    if (item.rating && item.rating.toLowerCase().includes('rx'))
        return true;
    // Check explicit_genres (Jikan v4 field for adult genres)
    const explicitGenres = item.explicit_genres || [];
    if (explicitGenres.some((g) => { var _a; return ((_a = g.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'hentai'; }))
        return true;
    // Check genres
    const genres = item.genres || [];
    if (genres.some((g) => { var _a; return ((_a = g.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'hentai'; }))
        return true;
    // Check demographics
    const demographics = item.demographics || [];
    if (demographics.some((d) => { var _a; return ((_a = d.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'hentai'; }))
        return true;
    return false;
};
exports.isJikanExplicitContent = isJikanExplicitContent;
const parseJikanDuration = (durationStr) => {
    if (!durationStr || durationStr === 'Unknown')
        return 24; // Default standard length
    let mins = 0;
    const hrMatch = durationStr.match(/(\d+)\s*hr/);
    if (hrMatch)
        mins += parseInt(hrMatch[1], 10) * 60;
    const minMatch = durationStr.match(/(\d+)\s*min/);
    if (minMatch)
        mins += parseInt(minMatch[1], 10);
    return mins > 0 ? mins : 24;
};
exports.parseJikanDuration = parseJikanDuration;
const mapJikanStatusToUnified = (status) => {
    if (!status)
        return 'Unknown';
    const s = status.toLowerCase();
    if (s.includes('currently airing') || s === 'airing')
        return 'Currently Airing';
    if (s.includes('finished'))
        return 'Finished Airing';
    if (s.includes('not yet'))
        return 'Not Yet Aired';
    return status;
};
exports.mapJikanStatusToUnified = mapJikanStatusToUnified;
const mapJikanToMedia = (item) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    const media = {
        id: item.mal_id.toString(),
        title: item.title_english || item.title,
        description: item.synopsis || 'No description available.',
        posterPath: ((_b = (_a = item.images) === null || _a === void 0 ? void 0 : _a.webp) === null || _b === void 0 ? void 0 : _b.large_image_url) || ((_d = (_c = item.images) === null || _c === void 0 ? void 0 : _c.jpg) === null || _d === void 0 ? void 0 : _d.large_image_url),
        posterImageMedium: ((_f = (_e = item.images) === null || _e === void 0 ? void 0 : _e.webp) === null || _f === void 0 ? void 0 : _f.image_url) || ((_h = (_g = item.images) === null || _g === void 0 ? void 0 : _g.jpg) === null || _h === void 0 ? void 0 : _h.image_url) || ((_k = (_j = item.images) === null || _j === void 0 ? void 0 : _j.webp) === null || _k === void 0 ? void 0 : _k.large_image_url) || ((_m = (_l = item.images) === null || _l === void 0 ? void 0 : _l.jpg) === null || _m === void 0 ? void 0 : _m.large_image_url),
        backdropPath: ((_p = (_o = item.trailer) === null || _o === void 0 ? void 0 : _o.images) === null || _p === void 0 ? void 0 : _p.maximum_image_url) ||
            ((_r = (_q = item.trailer) === null || _q === void 0 ? void 0 : _q.images) === null || _r === void 0 ? void 0 : _r.large_image_url) ||
            ((_t = (_s = item.trailer) === null || _s === void 0 ? void 0 : _s.images) === null || _t === void 0 ? void 0 : _t.medium_image_url) ||
            ((_v = (_u = item.images) === null || _u === void 0 ? void 0 : _u.webp) === null || _v === void 0 ? void 0 : _v.large_image_url),
        rating: item.score || undefined,
        releaseYear: item.year || (((_w = item.aired) === null || _w === void 0 ? void 0 : _w.from) ? new Date(item.aired.from).getFullYear() : undefined),
        genres: ((_x = item.genres) === null || _x === void 0 ? void 0 : _x.map((g) => g.name)) || [],
        type: 'anime',
        format: item.type, // e.g: "TV", "Movie"
        episodes: item.episodes,
        trailerUrl: (_y = item.trailer) === null || _y === void 0 ? void 0 : _y.url,
        status: (0, exports.mapJikanStatusToUnified)(item.status),
        popularity: item.popularity,
        rank: item.rank,
        studio: (_0 = (_z = item.studios) === null || _z === void 0 ? void 0 : _z[0]) === null || _0 === void 0 ? void 0 : _0.name,
        season: item.season ? `${item.season} ${item.year}` : undefined,
        score: item.score,
        source: item.source,
        rating_count: item.scored_by,
        airing_start: (_1 = item.aired) === null || _1 === void 0 ? void 0 : _1.from,
        synopsis_full: item.synopsis,
        durationMinutes: (0, exports.parseJikanDuration)(item.duration),
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
    return episodeCountSync_1.EpisodeCountRegistry.checkAndFixMedia(media);
};
exports.mapJikanToMedia = mapJikanToMedia;
