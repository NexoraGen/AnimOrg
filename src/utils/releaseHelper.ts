import { Media } from '../types';

export interface LocalAiringInfo {
    localDay: string;
    localTime: string;
    countdown: string;
    airingDate: Date;
}

export const getLocalAiringInfo = (broadcast?: Media['broadcast']): LocalAiringInfo | null => {
    if (!broadcast || !broadcast.day || !broadcast.time) return null;

    const DAYS_MAP: Record<string, number> = {
        sunday: 0, sundays: 0,
        monday: 1, mondays: 1,
        tuesday: 2, tuesdays: 2,
        wednesday: 3, wednesdays: 3,
        thursday: 4, thursdays: 4,
        friday: 5, fridays: 5,
        saturday: 6, saturdays: 6
    };

    const dayStr = broadcast.day.toLowerCase().trim();
    const jstDayIndex = DAYS_MAP[dayStr];
    if (jstDayIndex === undefined) return null;

    const timeStr = broadcast.time.trim();
    const [jstHours, jstMinutes] = timeStr.split(':').map(Number);
    if (isNaN(jstHours) || isNaN(jstMinutes)) return null;

    // 1. Calculate JST base timestamp relative to JST +9
    const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const targetJst = new Date(nowJst.getTime());

    let daysDiff = jstDayIndex - nowJst.getUTCDay();
    targetJst.setUTCHours(jstHours, jstMinutes, 0, 0);

    if (daysDiff < 0 || (daysDiff === 0 && nowJst.getTime() > targetJst.getTime())) {
        daysDiff += 7;
    }
    targetJst.setUTCDate(targetJst.getUTCDate() + daysDiff);

    // 2. Adjust back to universal absolute UTC and user's local browser context
    const absoluteBroadcastTime = new Date(targetJst.getTime() - 9 * 60 * 60 * 1000);

    const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const localDay = DAYS_OF_WEEK[absoluteBroadcastTime.getDay()];
    const localHours = String(absoluteBroadcastTime.getHours()).padStart(2, '0');
    const localMinutes = String(absoluteBroadcastTime.getMinutes()).padStart(2, '0');
    const localTime = `${localHours}:${localMinutes}`;

    // 3. Compute relative countdown dynamic string
    const diffMs = absoluteBroadcastTime.getTime() - Date.now();
    let countdown = '';
    if (diffMs <= 0) {
        if (diffMs > -2 * 60 * 60 * 1000) { // Airing for 2 hours
            countdown = 'Airing Now';
        } else {
            countdown = 'Aired Today'; // Scheduled past today's slot
        }
    } else {
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            countdown = `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
            countdown = `${diffHours}h ${diffMinutes % 60}m`;
        } else {
            countdown = `${diffMinutes}m`;
        }
    }

    return {
        localDay,
        localTime,
        countdown,
        airingDate: absoluteBroadcastTime
    };
};

export const calculateCountdown = (broadcast?: Media['broadcast']): string => {
    const info = getLocalAiringInfo(broadcast);
    return info?.countdown || 'TBD';
};

export const getNextEpisode = (media: Media, progressCount: number = 0): number => {
    return progressCount + 1;
};

/**
 * Mathematically calculates how many episodes have officially released/aired as of now.
 */
export const getCurrentlyReleasedEpisodesCount = (media: Media, now: number = Date.now()): number => {
    const status = media.status?.toLowerCase() || '';
    if (status === 'completed' || status === 'finished airing' || status === 'finished') {
        return media.episodes || 12;
    }

    if (media.airing_start) {
        const elapsedMs = now - new Date(media.airing_start).getTime();
        if (elapsedMs < 0) {
            return 0; // Show hasn't premiered/started airing yet
        }

        // Mathematical weekly broadcast solver
        const airedCount = 1 + Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
        return Math.min(airedCount, media.episodes || 9999);
    }

    if (status === 'upcoming' || status === 'not yet aired') {
        return 0;
    }

    // Default fallback
    return media.episodes || 12;
};

/**
 * Calculates the exact Unix millisecond timestamp when the N-th episode airs.
 */
export const getEpisodeAiringTime = (media: Media, episodeNum: number): number | null => {
    if (!media.airing_start) return null;
    const jstStart = new Date(media.airing_start).getTime();
    return jstStart + (episodeNum - 1) * 7 * 24 * 60 * 60 * 1000;
};
