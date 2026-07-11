import { WatchStatus } from '../types';

export interface WatchStatusDisplay {
    label: string;
    color: string;
}

/**
 * Maps a machine WatchStatus to a user-friendly display label and color.
 * Single source of truth for status badge rendering across the app.
 */
export const getWatchStatusDisplay = (status: WatchStatus | string): WatchStatusDisplay => {
    switch (status) {
        case 'plan-to-watch':
            return { label: 'Not Started', color: '#8E8E93' };
        case 'watching':
            return { label: 'Watching', color: '#FF9500' };
        case 'completed':
            return { label: 'Completed', color: '#4CD964' };
        case 'awaiting':
            return { label: 'Up to Date', color: '#5AC8FA' };
        case 'dropped':
            return { label: 'Dropped', color: '#FF3B30' };
        default:
            return { label: 'Not Started', color: '#8E8E93' };
    }
};
