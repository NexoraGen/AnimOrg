"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAnimeTrackingStatus = exports.getEpisodeAiringTime = exports.getCurrentlyReleasedEpisodesCount = exports.getNextEpisode = exports.calculateCountdown = exports.getLocalAiringInfo = void 0;
const getLocalAiringInfo = (broadcast, userTimezone, userLocale = 'en-US', use24Hour = false, nextAiringEpisode) => {
    if (nextAiringEpisode && nextAiringEpisode.airingAt) {
        const absoluteBroadcastTime = new Date(nextAiringEpisode.airingAt * 1000);
        let localDay = '';
        let localTime = '';
        try {
            const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const targetTz = userTimezone && userTimezone.includes('/') ? userTimezone : defaultTz;
            localDay = new Intl.DateTimeFormat(userLocale, {
                weekday: 'long',
                timeZone: targetTz
            }).format(absoluteBroadcastTime);
            localTime = new Intl.DateTimeFormat(userLocale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: !use24Hour,
                timeZone: targetTz
            }).format(absoluteBroadcastTime);
        }
        catch (e) {
            const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            localDay = DAYS_OF_WEEK[absoluteBroadcastTime.getDay()];
            const localHours = String(absoluteBroadcastTime.getHours()).padStart(2, '0');
            const localMinutes = String(absoluteBroadcastTime.getMinutes()).padStart(2, '0');
            localTime = use24Hour ? `${localHours}:${localMinutes}` : `${Number(localHours) % 12 || 12}:${localMinutes} ${Number(localHours) >= 12 ? 'PM' : 'AM'}`;
        }
        const diffMs = absoluteBroadcastTime.getTime() - Date.now();
        let countdown = '';
        if (diffMs <= 0) {
            if (diffMs > -2 * 60 * 60 * 1000) {
                countdown = 'Airing Now';
            }
            else {
                countdown = 'Aired Today';
            }
        }
        else {
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays > 0) {
                countdown = `${diffDays}d ${diffHours % 24}h`;
            }
            else if (diffHours > 0) {
                countdown = `${diffHours}h ${diffMinutes % 60}m`;
            }
            else {
                countdown = `${diffMinutes}m`;
            }
        }
        return {
            localDay,
            localTime,
            countdown,
            airingDate: absoluteBroadcastTime
        };
    }
    if (!broadcast || !broadcast.day || !broadcast.time)
        return null;
    const DAYS_MAP = {
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
    if (jstDayIndex === undefined)
        return null;
    const timeStr = broadcast.time.trim();
    const [jstHours, jstMinutes] = timeStr.split(':').map(Number);
    if (isNaN(jstHours) || isNaN(jstMinutes))
        return null;
    // 1. Calculate JST base timestamp relative to JST +9
    const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const targetJst = new Date(nowJst.getTime());
    let daysDiff = jstDayIndex - nowJst.getUTCDay();
    targetJst.setUTCHours(jstHours, jstMinutes, 0, 0);
    if (daysDiff < 0 || (daysDiff === 0 && nowJst.getTime() > targetJst.getTime())) {
        daysDiff += 7;
    }
    targetJst.setUTCDate(targetJst.getUTCDate() + daysDiff);
    // 2. Adjust back to universal absolute UTC
    const absoluteBroadcastTime = new Date(targetJst.getTime() - 9 * 60 * 60 * 1000);
    // 3. Format strictly to the requested Timezone using Intl natively
    let localDay = '';
    let localTime = '';
    try {
        const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const targetTz = userTimezone && userTimezone.includes('/') ? userTimezone : defaultTz;
        localDay = new Intl.DateTimeFormat(userLocale, {
            weekday: 'long',
            timeZone: targetTz
        }).format(absoluteBroadcastTime);
        localTime = new Intl.DateTimeFormat(userLocale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !use24Hour,
            timeZone: targetTz
        }).format(absoluteBroadcastTime);
    }
    catch (e) {
        // Fallback for invalid timezone strings
        const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        localDay = DAYS_OF_WEEK[absoluteBroadcastTime.getDay()];
        const localHours = String(absoluteBroadcastTime.getHours()).padStart(2, '0');
        const localMinutes = String(absoluteBroadcastTime.getMinutes()).padStart(2, '0');
        localTime = use24Hour ? `${localHours}:${localMinutes}` : `${Number(localHours) % 12 || 12}:${localMinutes} ${Number(localHours) >= 12 ? 'PM' : 'AM'}`;
    }
    // 4. Compute relative countdown dynamic string
    const diffMs = absoluteBroadcastTime.getTime() - Date.now();
    let countdown = '';
    if (diffMs <= 0) {
        if (diffMs > -2 * 60 * 60 * 1000) { // Airing for 2 hours
            countdown = 'Airing Now';
        }
        else {
            countdown = 'Aired Today'; // Scheduled past today's slot
        }
    }
    else {
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
            countdown = `${diffDays}d ${diffHours % 24}h`;
        }
        else if (diffHours > 0) {
            countdown = `${diffHours}h ${diffMinutes % 60}m`;
        }
        else {
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
exports.getLocalAiringInfo = getLocalAiringInfo;
const calculateCountdown = (broadcast, userTimezone, use24Hour = false) => {
    const info = (0, exports.getLocalAiringInfo)(broadcast, userTimezone, 'en-US', use24Hour);
    return (info === null || info === void 0 ? void 0 : info.countdown) || 'TBD';
};
exports.calculateCountdown = calculateCountdown;
const getNextEpisode = (media, progressCount = 0) => {
    return progressCount + 1;
};
exports.getNextEpisode = getNextEpisode;
/**
 * Mathematically calculates how many episodes have officially released/aired as of now.
 */
const getCurrentlyReleasedEpisodesCount = (media, now = Date.now()) => {
    var _a;
    const status = ((_a = media.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    if (status === 'completed' || status === 'finished airing' || status === 'finished') {
        return media.episodes || 12;
    }
    if (media.nextAiringEpisode) {
        const nextEp = media.nextAiringEpisode.episode;
        const airTime = media.nextAiringEpisode.airingAt * 1000;
        if (now >= airTime) {
            return nextEp;
        }
        return nextEp - 1;
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
exports.getCurrentlyReleasedEpisodesCount = getCurrentlyReleasedEpisodesCount;
/**
 * Calculates the exact Unix millisecond timestamp when the N-th episode airs.
 */
const getEpisodeAiringTime = (media, episodeNum) => {
    if (!media.airing_start)
        return null;
    const jstStart = new Date(media.airing_start).getTime();
    return jstStart + (episodeNum - 1) * 7 * 24 * 60 * 60 * 1000;
};
exports.getEpisodeAiringTime = getEpisodeAiringTime;
/**
 * CENTRAL STATUS RESOLVER — Single source of truth for anime tracking status.
 * Use this everywhere instead of inline status logic.
 *
 * Rules:
 * - watchedCount === 0 → 'plan-to-watch'
 * - Airing anime → NEVER 'completed'. Return 'awaiting' if caught up, else 'watching'
 * - Finished airing + watchedCount >= totalEpisodes → 'completed'
 * - Otherwise → 'watching'
 */
const resolveAnimeTrackingStatus = (opts) => {
    const { mediaStatus, totalEpisodes, watchedCount, releasedCount } = opts;
    if (watchedCount <= 0)
        return 'plan-to-watch';
    const status = (mediaStatus || '').toLowerCase();
    const isFinished = ['finished airing', 'finished', 'completed'].includes(status);
    const isAiring = !isFinished && !['upcoming', 'not yet aired'].includes(status);
    if (isAiring) {
        // AIRING anime can NEVER be completed
        if (releasedCount > 0 && watchedCount >= releasedCount) {
            return 'awaiting'; // Caught up to latest release
        }
        return 'watching';
    }
    // Finished airing
    const effectiveTotal = totalEpisodes > 0 ? totalEpisodes : (releasedCount > 0 ? releasedCount : 0);
    if (isFinished && effectiveTotal > 0 && watchedCount >= effectiveTotal) {
        return 'completed';
    }
    return 'watching';
};
exports.resolveAnimeTrackingStatus = resolveAnimeTrackingStatus;
