import { Media } from '../../types';
import { EpisodeCountRegistry } from '../../utils/episodeCountSync';

// ==========================================
// ANILIST NORMALIZATION HELPERS
// ==========================================

export const mapStatusToUnified = (status: string): string => {
    switch (status) {
        case 'FINISHED': return 'Finished Airing';
        case 'RELEASING': return 'Currently Airing';
        case 'NOT_YET_RELEASED': return 'Not Yet Aired';
        case 'CANCELLED': return 'Cancelled';
        case 'HIATUS': return 'Hiatus';
        default: return status || 'Unknown';
    }
};

export const mapAniListToMedia = (item: any): Media => {
    if (!item) throw new Error('AniList mapping item is null');

    // Primary key preference: idMal (MAL ID) to maintain data compatibility if tracking against Jikan or MAL lists.
    // We MUST output a string as required by the App's Media interface.
    const idStr = item.idMal ? item.idMal.toString() : item.id.toString();

    // Ratings: AniList scores are 0-100, normalize to 10 scale (Jikan standard)
    const mappedRating = item.averageScore ? parseFloat((item.averageScore / 10).toFixed(2)) : undefined;

    // Backdrop: Prefer bannerImage, fallback
    const backdrop = item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large;

    // Title: Prefer English for global readability, fallback to Romaji
    const title = item.title?.english || item.title?.romaji || 'Untitled Anime';

    const media: Media = {
        id: idStr,
        title: title,
        description: item.description?.replace(/<[^>]*>/g, '') || 'No description available.',
        posterPath: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium,
        backdropPath: backdrop,
        rating: mappedRating,
        releaseYear: item.seasonYear || item.startDate?.year || undefined,
        genres: item.genres || [],
        type: 'anime',
        format: item.format ? (
            item.format === 'TV' ? 'TV' :
                item.format === 'TV_SHORT' ? 'TV Short' :
                    item.format === 'MOVIE' ? 'Movie' :
                        item.format === 'SPECIAL' ? 'Special' :
                            item.format === 'OVA' ? 'OVA' :
                                item.format === 'ONA' ? 'ONA' :
                                    item.format === 'MUSIC' ? 'Music' :
                                        item.format.toLowerCase().split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        ) : undefined,
        episodes: item.episodes || (item.nextAiringEpisode ? item.nextAiringEpisode.episode - 1 : undefined),
        status: mapStatusToUnified(item.status),
        popularity: item.popularity || undefined,
        rank: undefined, // AniList doesn't store direct Jikan global ranks easily
        studio: item.studios?.nodes?.[0]?.name || undefined,
        season: item.season ? `${item.season.toLowerCase()} ${item.seasonYear}` : undefined,
        score: mappedRating,
        source: item.source || undefined,
        rating_count: undefined, // Not typically in basic AniList searches
        airing_start: item.startDate ? `${item.startDate.year}-${String(item.startDate.month || 1).padStart(2, '0')}-${String(item.startDate.day || 1).padStart(2, '0')}` : undefined,
        synopsis_full: item.description?.replace(/<[^>]*>/g, '') || undefined,
        durationMinutes: item.duration || 24,
        trailerUrl: item.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
        trailerData: item.trailer?.id ? {
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

    return EpisodeCountRegistry.checkAndFixMedia(media) as Media;
};

// ==========================================
// JIKAN NORMALIZATION HELPERS
// ==========================================

/**
 * Centralized content filter for Jikan raw API items.
 * Returns true if the item is explicit hentai/pornographic content.
 * Does NOT filter mature anime (e.g. Attack on Titan, Berserk, etc.)
 */
export const isJikanExplicitContent = (item: any): boolean => {
    if (!item) return false;

    // Check rating field (Rx = Hentai)
    if (item.rating && item.rating.toLowerCase().includes('rx')) return true;

    // Check explicit_genres (Jikan v4 field for adult genres)
    const explicitGenres: any[] = item.explicit_genres || [];
    if (explicitGenres.some((g: any) => g.name?.toLowerCase() === 'hentai')) return true;

    // Check genres
    const genres: any[] = item.genres || [];
    if (genres.some((g: any) => g.name?.toLowerCase() === 'hentai')) return true;

    // Check demographics
    const demographics: any[] = item.demographics || [];
    if (demographics.some((d: any) => d.name?.toLowerCase() === 'hentai')) return true;

    return false;
};

export const parseJikanDuration = (durationStr: string): number => {
    if (!durationStr || durationStr === 'Unknown') return 24; // Default standard length
    let mins = 0;

    const hrMatch = durationStr.match(/(\d+)\s*hr/);
    if (hrMatch) mins += parseInt(hrMatch[1], 10) * 60;

    const minMatch = durationStr.match(/(\d+)\s*min/);
    if (minMatch) mins += parseInt(minMatch[1], 10);

    return mins > 0 ? mins : 24;
};

export const mapJikanStatusToUnified = (status: string): string => {
    if (!status) return 'Unknown';
    const s = status.toLowerCase();
    if (s.includes('currently airing') || s === 'airing') return 'Currently Airing';
    if (s.includes('finished')) return 'Finished Airing';
    if (s.includes('not yet')) return 'Not Yet Aired';
    return status;
};

export const mapJikanToMedia = (item: any): Media => {
    const media: Media = {
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
        format: item.type, // e.g: "TV", "Movie"
        episodes: item.episodes,
        trailerUrl: item.trailer?.url,
        status: mapJikanStatusToUnified(item.status),
        popularity: item.popularity,
        rank: item.rank,
        studio: item.studios?.[0]?.name,
        season: item.season ? `${item.season} ${item.year}` : undefined,
        score: item.score,
        source: item.source,
        rating_count: item.scored_by,
        airing_start: item.aired?.from,
        synopsis_full: item.synopsis,
        durationMinutes: parseJikanDuration(item.duration),
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

    return EpisodeCountRegistry.checkAndFixMedia(media) as Media;
};
