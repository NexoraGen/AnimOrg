import { firestoreService } from './firebase/firestore';
import { useAppStore } from '../store/useAppStore';
import { AnimeProgress } from '../types';

/**
 * Clean helper to execute async functions with a strict timeout constraint
 */
const promiseWithTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(errorMessage));
        }, timeoutMs);

        promise
            .then((res) => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

/**
 * Background automatic retry helper
 */
const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(fn, retries - 1, delay * 1.5); // Exponential delay
    }
};

class ProfileLoadingManager {
    private static instance: ProfileLoadingManager;
    private isFetching: boolean = false;
    private currentUserId: string | null = null;
    private abortController: AbortController | null = null;
    private socialUnsubscribes: Array<() => void> = [];

    private constructor() { }

    public static getInstance(): ProfileLoadingManager {
        if (!ProfileLoadingManager.instance) {
            ProfileLoadingManager.instance = new ProfileLoadingManager();
        }
        return ProfileLoadingManager.instance;
    }

    /**
     * Initializes or refreshes all secondary profile data decoupled from the critical initialization loop.
     * If a fetch is already in progress for the same user, it deduplicates.
     * If it's a different user, it cancels the previous fetch.
     */
    public async loadSecondaryData(userId: string, forceRefresh: boolean = false): Promise<void> {
        if (!userId) return;

        if (this.isFetching) {
            if (this.currentUserId === userId && !forceRefresh) {
                console.log("[ProfileLoadingManager] Deduplicating active background fetch.");
                return;
            }
        }

        // Cancel previous listeners
        this.socialUnsubscribes.forEach(unsub => unsub());
        this.socialUnsubscribes = [];

        this.isFetching = true;
        this.currentUserId = userId;

        console.log(`[ProfileLoadingManager] Initiating background fetch for user: ${userId}`);

        // Create tasks but do NOT block them in a Promise.all block.
        // Instead, let them resolve and push directly to Zustand.
        const executeTask = async (taskName: string, taskFn: () => Promise<void>) => {
            try {
                console.log(`[ProfileLoadingManager] [ENTER] ${taskName}`);
                await taskFn();
                console.log(`[ProfileLoadingManager] [SUCCESS] ${taskName}`);
            } catch (error) {
                console.warn(`[ProfileLoadingManager] [ERROR] ${taskName}:`, error);
            } finally {
                console.log(`[ProfileLoadingManager] [END] ${taskName}`);
            }
        };

        // Construct promises
        const promises = [
            executeTask('ContinueWatching', async () => {
                const history = await promiseWithTimeout(
                    fetchWithRetry(() => firestoreService.getContinueWatching(userId)),
                    8000,
                    "Timeout fetch getContinueWatching"
                );
                useAppStore.setState({ continueWatching: history || [] });
            }),
            executeTask('ActivityFeed', async () => {
                const activity = await promiseWithTimeout(
                    fetchWithRetry(() => firestoreService.getActivityFeed(userId)),
                    8000,
                    "Timeout fetch getActivityFeed"
                );
                useAppStore.setState({ activityFeed: activity || [] });
            }),
            executeTask('AnimeProgress', async () => {
                const allProgress = await promiseWithTimeout(
                    fetchWithRetry(() => firestoreService.getAllProgress(userId)),
                    8000,
                    "Timeout fetch getAllAnimeProgress"
                );
                const progressMap: Record<string, AnimeProgress> = {};
                if (allProgress && Array.isArray(allProgress)) {
                    allProgress.forEach((p: AnimeProgress) => {
                        progressMap[String(p.animeId)] = p;
                    });
                }
                useAppStore.setState({ animeProgress: progressMap });
            }),
            executeTask('UserRatings', async () => {
                const ratings = await promiseWithTimeout(
                    fetchWithRetry(() => firestoreService.getUserRatings(userId)),
                    8000,
                    "Timeout fetch getUserRatings"
                );
                useAppStore.setState({ userRatings: ratings || [] });
            }),
            executeTask('NotInterestedList', async () => {
                const notInterested = await promiseWithTimeout(
                    fetchWithRetry(() => firestoreService.getNotInterested(userId)),
                    8000,
                    "Timeout fetch getNotInterested"
                );
                useAppStore.setState({ notInterested: notInterested || [] });
            }),
            executeTask('SocialFollowing', async () => {
                const unsubscribe = firestoreService.onSocialFollowingSnapshot(userId, (followingList) => {
                    useAppStore.setState({ following: followingList });
                });
                this.socialUnsubscribes.push(unsubscribe);
            }),
            executeTask('SocialFollowers', async () => {
                const unsubscribe = firestoreService.onSocialFollowersSnapshot(userId, (followersList) => {
                    useAppStore.setState({ followers: followersList });
                });
                this.socialUnsubscribes.push(unsubscribe);
            })

        ];

        // Wait for all to settle, completely isolated from main initialization flow.
        await Promise.allSettled(promises);

        console.log(`[ProfileLoadingManager] Background fetch completed for user: ${userId}`);
        this.isFetching = false;
    }
}

export const profileLoadingManager = ProfileLoadingManager.getInstance();
