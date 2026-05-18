import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, WatchlistItem, Media, WatchHistoryEntry, UserRating, ActivityFeedItem, AnimeProgress, Episode } from '../types';
import { firebaseAuthService } from '../services/firebase/auth';
import { firestoreService } from '../services/firebase/firestore';
import { notificationService } from '../services/notifications';

interface AppState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isGuest: boolean;
  setIsGuest: (val: boolean) => void;
  setUser: (user: User | null) => void;
  initializeAuth: () => () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAppInitializing: boolean;
  setIsAppInitializing: (val: boolean) => void;

  // Watchlist State
  watchlist: WatchlistItem[];
  setWatchlist: (watchlist: WatchlistItem[]) => void;
  addToWatchlist: (media: Media, status?: WatchlistItem['status']) => Promise<void>;
  removeFromWatchlist: (mediaId: string) => Promise<void>;
  updateWatchlistStatus: (mediaId: string, status: WatchlistItem['status']) => Promise<void>;
  toggleFavorite: (mediaId: string) => Promise<void>;

  // User Data State
  userRatings: UserRating[];
  activityFeed: ActivityFeedItem[];
  continueWatching: WatchHistoryEntry[];

  // Tracking State (Phase 2)
  animeProgress: Record<string, AnimeProgress>;
  toggleEpisodeWatched: (animeId: string, episodeNum: number, watched: boolean, totalCount?: number, media?: Media) => Promise<void>;
  markSeasonWatched: (animeId: string, episodes: number[], totalCount?: number, media?: Media) => Promise<void>;
  getProgress: (animeId: string) => AnimeProgress | undefined;

  rateAnime: (animeId: string, score: number, media: Media) => Promise<void>;
  updateContinueWatching: (entry: WatchHistoryEntry) => void;
  addActivityFeedItem: (item: Omit<ActivityFeedItem, 'id' | 'timestamp'>) => void;
  getFavoriteGenres: () => string[];

  // Notification State (Phase 3)
  pushToken: string | null;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  registerNotifications: () => Promise<void>;

  // Social State (Phase 4)
  following: string[];
  followers: string[];
  globalActivity: any[];
  fetchSocialData: () => Promise<void>;
  followUserAction: (targetUserId: string) => Promise<void>;
  unfollowUserAction: (targetUserId: string) => Promise<void>;

  // UI State
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  modalCount: number;
  setModalActive: (active: boolean) => void;

  // Search History
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Recently Viewed
  recentlyViewed: Media[];
  addToRecentlyViewed: (media: Media) => void;
  clearRecentlyViewed: () => void;

  // Recommendation State
  notInterested: string[];
  addToNotInterested: (mediaId: string) => Promise<void>;
  recommendationHistory: string[];
  addToRecommendationHistory: (mediaId: string) => void;
  clearRecommendationHistory: () => void;

  // App Settings
  autoplayTrailer: boolean;
  setAutoplayTrailer: (val: boolean) => void;
  reduceHaptics: boolean;
  setReduceHaptics: (val: boolean) => void;
  videoQuality: string;
  setVideoQuality: (val: string) => void;
  dataSaver: boolean;
  setDataSaver: (val: boolean) => void;
  appLanguage: string;
  setAppLanguage: (val: string) => void;

  // Trailer Cache
  trailerCache: Record<string, { url: string; cachedAt: number }>;
  setTrailerCache: (animeId: string, url: string) => void;
  getTrailerCache: () => Record<string, { url: string; cachedAt: number }>;

  // Hydration State
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Hydration Initial State
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),

      isAppInitializing: true,
      setIsAppInitializing: (val) => set({ isAppInitializing: val }),

      // guest state
      isGuest: false,
      setIsGuest: (val) => set({ isGuest: val }),

      // Auth Initial State
      user: null,
      isAuthenticated: false,
      isLoadingAuth: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isGuest: user ? false : get().isGuest }),

      initializeAuth: () => {
        // High-fidelity background automatic retry helper for startup database queries
        const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
          try {
            return await fn();
          } catch (error) {
            if (retries <= 0) {
              throw error;
            }
            console.log(`[Auth Retry] Fetch query failed. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 1.5); // Exponential delay
          }
        };

        const unsubscribeAuth = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            try {
              // Ensure we are in loading mode while fetching live profile
              set({ isLoadingAuth: true, isAppInitializing: true });

              // 1. Fetch initial profile once - wait / poll if profile is currently being created on Login/Google Sign-In
              let userProfile = await fetchWithRetry(() => firestoreService.getUserProfile(firebaseUser.uid)).catch((err) => {
                console.warn("[Auth] Failed to fetch profile doc after retries. Restoring fallback from hydrated store cache if present.", err);
                return get().user; // Fallback directly to hydrated store cache profile
              });

              if (!userProfile) {
                console.log("[Auth] Profile not found immediately. Running polling loop...");
                // Wait up to 3.5 seconds (checking every 500ms) to allow the signup/google creation thread to complete
                for (let i = 0; i < 7; i++) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  userProfile = await firestoreService.getUserProfile(firebaseUser.uid);
                  if (userProfile) {
                    console.log("[Auth] User profile found after polling retry block successfully.");
                    break;
                  }
                }
              }

              // Self-heal: If profile document is still absent, auto-create it now so user is never marked raw Guest User
              if (!userProfile) {
                console.log("[Auth] Profile document still missing after polling. Creating backup user profile.");
                const backupProfile = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  avatarUrl: firebaseUser.photoURL || '',
                  favoriteGenres: [],
                  watchStats: {
                    animeCount: 0,
                    totalHours: 0,
                  },
                  hasCompletedOnboarding: false
                };
                await firestoreService.createUserProfile(firebaseUser.uid, backupProfile);
                userProfile = backupProfile;
              }

              // 2. Set up real-time listener for "trackedAnime" (Primary for Hub)
              const unsubscribeTracked = firestoreService.onTrackedAnimeSnapshot(firebaseUser.uid, (trackedItems) => {
                const currentWatchlist = get().watchlist;
                let merged = [...currentWatchlist];
                let hasChanges = false;

                console.log(`[Sync] Received ${trackedItems.length} items from trackedAnime snapshot`);

                trackedItems.forEach(ta => {
                  const taId = String(ta.mediaId);
                  const idx = merged.findIndex(w => String(w.mediaId) === taId);

                  if (idx === -1) {
                    console.log(`[Sync] Adding new tracked item: ${ta.title} (${taId})`);
                    merged.push(ta);
                    hasChanges = true;
                  } else {
                    const existing = merged[idx];
                    const statusChanged = ta.status && ta.status !== existing.status;
                    const broadcastAdded = ta.broadcast && !existing.broadcast;

                    if (statusChanged || broadcastAdded) {
                      console.log(`[Sync] Updating existing item: ${ta.title} (${taId}) | StatusChange: ${statusChanged}, BroadcastAdd: ${broadcastAdded}`);
                      merged[idx] = { ...existing, ...ta };
                      hasChanges = true;
                    }
                  }
                });

                if (hasChanges || currentWatchlist.length === 0) {
                  set({ watchlist: merged });
                }
              });

              // 3. Fetch data once with background retries and cached values as ultimate fallbacks
              const [history, activity, allProgress, ratings, notInterested] = await Promise.all([
                fetchWithRetry(() => firestoreService.getContinueWatching(firebaseUser.uid)).catch(err => {
                  console.warn("[Auth] Failed to fetch continueWatching, using cache fallback.", err);
                  return get().continueWatching || [];
                }),
                fetchWithRetry(() => firestoreService.getActivityFeed(firebaseUser.uid)).catch(err => {
                  console.warn("[Auth] Failed to fetch activityFeed, using cache fallback.", err);
                  return get().activityFeed || [];
                }),
                fetchWithRetry(() => firestoreService.getAllProgress(firebaseUser.uid)).catch(err => {
                  console.warn("[Auth] Failed to fetch allProgress, using cache fallback.", err);
                  return Object.values(get().animeProgress || {});
                }),
                fetchWithRetry(() => firestoreService.getUserRatings(firebaseUser.uid)).catch(err => {
                  console.warn("[Auth] Failed to fetch userRatings, using cache fallback.", err);
                  return get().userRatings || [];
                }),
                fetchWithRetry(() => firestoreService.getNotInterested(firebaseUser.uid)).catch(err => {
                  console.warn("[Auth] Failed to fetch notInterested, using cache fallback.", err);
                  return get().notInterested || [];
                }),
              ]);

              const progressMap: Record<string, AnimeProgress> = {};
              allProgress.forEach(p => {
                progressMap[String(p.animeId)] = p;
              });

              set({
                user: userProfile,
                isAuthenticated: true,
                isLoadingAuth: false,
                isAppInitializing: false, // Mark initialization finished!
                continueWatching: history || [],
                activityFeed: activity || [],
                animeProgress: progressMap,
                userRatings: ratings || [],
                notInterested: notInterested || [],
                isGuest: false // User is authenticated, so not guest!
              });

              if (get().notificationsEnabled) {
                get().registerNotifications();
              }

              return () => {
                unsubscribeTracked();
              };
            } catch (error) {
              console.error("Failed to initialize user data under catastrophic catch:", error);
              set({
                isLoadingAuth: false,
                isAppInitializing: false
              });
            }
          } else {
            // Unauthenticated state
            if (get().isGuest) {
              // Preserve guest mode status and their local assets/caches
              set({
                isLoadingAuth: false,
                isAppInitializing: false
              });
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoadingAuth: false,
                isAppInitializing: false,
                watchlist: [],
                activityFeed: [],
                continueWatching: [],
                searchHistory: [],
                recentlyViewed: [],
                userRatings: [],
                animeProgress: {},
                notInterested: [],
                recommendationHistory: [],
                isGuest: false
              });
            }
          }
        });
        return unsubscribeAuth;
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const updatedUser = { ...user, ...data };
        set({ user: updatedUser });

        try {
          await firestoreService.updateUserProfile(user.id, data);
        } catch (error) {
          console.error("Failed to update profile:", error);
        }
      },

      // Watchlist Actions
      watchlist: [],
      setWatchlist: (watchlist) => set({ watchlist }),

      addToWatchlist: async (media, status = 'plan-to-watch') => {
        const { user, watchlist, addActivityFeedItem } = get();
        if (watchlist.some(item => item.mediaId === media.id)) return;

        // FETCH FULL DETAILS if broadcast info is missing (critical for Release Hub)
        let enrichedMedia = media;
        if (!media.broadcast || !media.broadcast.day) {
          try {
            const { jikanApi } = await import('../services/api/jikan');
            const data = await jikanApi.getAnimeDetails(media.id);
            if (data) enrichedMedia = data;
          } catch (e) {
            console.warn("Failed to enrich media for tracking:", e);
          }
        }

        const newItem: WatchlistItem = {
          mediaId: enrichedMedia.id,
          addedAt: new Date().toISOString(),
          status,
          isFavorite: false,
          title: enrichedMedia.title,
          posterPath: enrichedMedia.posterPath,
          backdropPath: enrichedMedia.backdropPath,
          rating: enrichedMedia.rating || 0,
          genres: enrichedMedia.genres || [],
          episodes: enrichedMedia.episodes || 0,
          durationMinutes: enrichedMedia.durationMinutes || 24,
          broadcast: enrichedMedia.broadcast,
          airing_start: enrichedMedia.airing_start,
          mediaStatus: enrichedMedia.status
        };

        set({ watchlist: [...watchlist, newItem] });

        addActivityFeedItem({
          type: 'added',
          animeId: enrichedMedia.id,
          animeTitle: enrichedMedia.title,
          animePoster: enrichedMedia.posterPath,
          detail: status
        });

        if (user) {
          try {
            await Promise.all([
              firestoreService.addToWatchlist(user.id, newItem),
              firestoreService.syncTrackedAnime(user.id, newItem)
            ]);
          } catch (error) {
            console.error("Failed to add to watchlist:", error);
          }
        }
      },

      updateWatchlistStatus: async (mediaId, status) => {
        const { user, watchlist } = get();
        set({
          watchlist: watchlist.map(item =>
            item.mediaId === mediaId ? { ...item, status } : item
          )
        });

        if (user) {
          try {
            const updatedItem = get().watchlist.find(i => i.mediaId === mediaId);
            await Promise.all([
              firestoreService.updateWatchlistStatus(user.id, mediaId, status),
              updatedItem ? firestoreService.syncTrackedAnime(user.id, updatedItem) : Promise.resolve()
            ]);
          } catch (error) {
            console.error("Failed to update status:", error);
          }
        }
      },

      toggleFavorite: async (mediaId) => {
        const { user, watchlist, addActivityFeedItem } = get();
        const existingItem = watchlist.find(item => item.mediaId === mediaId);
        if (!existingItem) return;

        const newIsFavorite = !existingItem.isFavorite;
        set({
          watchlist: watchlist.map(item =>
            item.mediaId === mediaId ? { ...item, isFavorite: newIsFavorite } : item
          )
        });

        if (newIsFavorite) {
          addActivityFeedItem({
            type: 'favorited',
            animeId: mediaId,
            animeTitle: existingItem.title,
            animePoster: existingItem.posterPath,
          });
        }

        if (user) {
          try {
            await firestoreService.toggleFavorite(user.id, mediaId, newIsFavorite);
          } catch (error) {
            console.error("Failed to toggle favorite:", error);
          }
        }
      },

      removeFromWatchlist: async (mediaId) => {
        const { user, watchlist } = get();
        set({ watchlist: watchlist.filter(item => item.mediaId !== mediaId) });

        if (user) {
          try {
            await Promise.all([
              firestoreService.removeFromWatchlist(user.id, mediaId),
              firestoreService.removeFromTrackedAnime(user.id, mediaId)
            ]);
          } catch (error) {
            console.error("Failed to remove from watchlist:", error);
          }
        }
      },

      // User Data Actions
      userRatings: [],
      activityFeed: [],
      continueWatching: [],

      // Tracking Actions (Phase 2)
      animeProgress: {},
      getProgress: (animeId) => get().animeProgress[animeId],

      toggleEpisodeWatched: async (animeId, episodeNum, watched, totalCount, media) => {
        const { user, animeProgress, watchlist, updateContinueWatching, addActivityFeedItem, addToWatchlist } = get();

        // 0. AUTO-TRACK: If media is provided and not in watchlist, add it
        let currentAnime = watchlist.find(w => String(w.mediaId) === String(animeId));
        if (watched && !currentAnime && media) {
          console.log(`[AutoTrack] Automatically tracking ${media.title} due to watch progress`);
          await addToWatchlist(media, 'watching');
          // Re-fetch watchlist from store to get the newly added item
          currentAnime = get().watchlist.find(w => String(w.mediaId) === String(animeId));
        }

        const totalEpisodes = totalCount || currentAnime?.episodes || 0;

        const currentProgress = animeProgress[animeId] || {
          animeId,
          lastWatchedEpisode: 0,
          lastWatchedSeason: 1,
          watchedEpisodes: {},
          status: 'watching',
          updatedAt: new Date().toISOString()
        };

        const newWatchedMap = { ...currentProgress.watchedEpisodes };

        if (watched) {
          // 1. BACKFILL: Mark all previous episodes as watched
          for (let i = 1; i <= episodeNum; i++) {
            newWatchedMap[i] = true;
          }
        } else {
          // 2. UNWATCH CASCADE: Unmark this and all subsequent episodes
          // Iterate through keys and unmark if >= episodeNum
          Object.keys(newWatchedMap).forEach(key => {
            const num = parseInt(key);
            if (num >= episodeNum) {
              newWatchedMap[key] = false;
            }
          });
        }

        // Calculate highest watched episode
        const highestEp = Object.entries(newWatchedMap)
          .filter(([, v]) => v)
          .reduce((max, [k]) => Math.max(max, parseInt(k)), 0);

        const updatedProgress: AnimeProgress = {
          ...currentProgress,
          watchedEpisodes: newWatchedMap,
          lastWatchedEpisode: highestEp,
          updatedAt: new Date().toISOString()
        };

        // 2.5 UPDATE WATCHLIST METADATA (for accurate total count)
        if (totalCount && currentAnime && currentAnime.episodes !== totalCount) {
          set({
            watchlist: get().watchlist.map(item =>
              item.mediaId === animeId ? { ...item, episodes: totalCount } : item
            )
          });
        }

        // Determine next status
        let newStatus: WatchlistItem['status'] | undefined;
        if (totalEpisodes > 0 && highestEp >= totalEpisodes) {
          newStatus = 'completed';
        } else if (highestEp > 0) {
          newStatus = 'watching';
        } else if (highestEp === 0 && currentAnime?.status === 'watching') {
          // If they unwatch everything, maybe move back to plan-to-watch? 
          // Let's keep it simple: if 0 watched and was watching, stay watching or move to plan-to-watch
          newStatus = 'plan-to-watch';
        }

        set({
          animeProgress: {
            ...animeProgress,
            [animeId]: updatedProgress
          }
        });

        // 3. AUTO-SYNC Watchlist Status
        if (newStatus && currentAnime && currentAnime.status !== newStatus) {
          get().updateWatchlistStatus(animeId, newStatus);
        }

        // 4. UPDATE CONTINUE WATCHING
        if (highestEp > 0 && currentAnime) {
          updateContinueWatching({
            animeId,
            lastWatchedEpisode: highestEp,
            episodeProgress: highestEp,
            totalEpisodes: totalEpisodes,
            lastViewedAt: new Date().toISOString(),
            title: currentAnime.title,
            posterPath: currentAnime.posterPath
          });
        } else if (highestEp === 0) {
          // REMOVE from continue watching if no progress
          set({
            continueWatching: get().continueWatching.filter(cw => String(cw.animeId) !== String(animeId))
          });
        }

        // 5. ACTIVITY FEED
        if (watched) {
          const animeTitle = currentAnime?.title || 'Anime';
          addActivityFeedItem({
            type: 'added',
            animeId,
            animeTitle,
            animePoster: currentAnime?.posterPath,
            detail: `Reached Episode ${episodeNum}`
          });
        }

        // 6. FIRESTORE SYNC
        if (user) {
          try {
            await firestoreService.updateAnimeProgress(user.id, updatedProgress);
          } catch (error) {
            console.error("Failed to sync episode progress:", error);
          }
        }
      },

      markSeasonWatched: async (animeId, episodeNums, totalCount, media) => {
        if (episodeNums.length === 0) return;
        const maxEp = Math.max(...episodeNums);
        // Reuse the intelligent toggle logic by marking the highest episode as watched
        return get().toggleEpisodeWatched(animeId, maxEp, true, totalCount, media);
      },

      rateAnime: async (animeId, score, media) => {
        const { user, watchlist, addActivityFeedItem } = get();

        // Update local state for immediate feedback
        const newRating: UserRating = {
          animeId,
          score,
          title: media.title,
          posterPath: media.posterPath,
          ratedAt: new Date().toISOString()
        };

        // Update list of ratings (for profile display)
        const updatedRatings = get().userRatings.filter(r => r.animeId !== animeId);
        set({ userRatings: [newRating, ...updatedRatings] });

        addActivityFeedItem({
          type: 'rated',
          animeId,
          animeTitle: media.title,
          animePoster: media.posterPath,
          detail: `Rated ${score}/10`
        });

        if (user) {
          try {
            await firestoreService.setUserRating(user.id, animeId, score, {
              title: media.title,
              posterPath: media.posterPath
            });
          } catch (error) {
            console.error("Failed to set rating:", error);
          }
        }
      },

      updateContinueWatching: async (entry) => {
        const { user, continueWatching } = get();
        const updated = continueWatching.filter(e => e.animeId !== entry.animeId);
        const newList = [{ ...entry, lastViewedAt: new Date().toISOString() }, ...updated];

        set({ continueWatching: newList.slice(0, 20) });

        if (user) {
          try {
            await firestoreService.updateContinueWatching(user.id, entry);
          } catch (error) {
            console.error("Failed to update history:", error);
          }
        }
      },

      addActivityFeedItem: async (item) => {
        const { user, activityFeed } = get();
        const tempId = Math.random().toString(36).substring(7);
        const newItem: ActivityFeedItem = {
          ...item,
          id: tempId,
          timestamp: new Date().toISOString()
        };

        set({ activityFeed: [newItem, ...activityFeed].slice(0, 50) });

        if (user) {
          try {
            await firestoreService.addActivityFeedItem(user.id, item);
          } catch (error) {
            console.error("Failed to add activity item:", error);
          }
        }
      },

      getFavoriteGenres: () => {
        const { watchlist, userRatings } = get();
        const genreCounts: Record<string, number> = {};

        watchlist.forEach(item => {
          let weight = 1;
          if (item.status === 'completed') weight = 4;
          if (item.status === 'watching') weight = 3;
          if (item.isFavorite) weight += 5;

          item.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + weight;
          });
        });

        userRatings.forEach(rating => {
          if (rating.score >= 8) {
            const anime = watchlist.find(w => w.mediaId === rating.animeId);
            if (anime) {
              anime.genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + (rating.score - 5);
              });
            }
          }
        });

        return Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([genre]) => genre);
      },

      // Notification Actions (Phase 3)
      pushToken: null,
      notificationsEnabled: false,
      setNotificationsEnabled: async (enabled) => {
        set({ notificationsEnabled: enabled });
        if (enabled) {
          await get().registerNotifications();
        } else {
          const { user } = get();
          if (user) {
            await firestoreService.setUserPushToken(user.id, '');
          }
        }
      },
      registerNotifications: async () => {
        const { user, notificationsEnabled } = get();
        if (!user || !notificationsEnabled) return;

        try {
          const token = await notificationService.registerForPushNotificationsAsync();
          if (token) {
            set({ pushToken: token });
            await firestoreService.setUserPushToken(user.id, token);
            console.log('Successfully registered push token');
          }
        } catch (error) {
          console.error('Error registering notifications:', error);
        }
      },

      // Social Actions (Phase 4)
      following: [],
      followers: [],
      globalActivity: [],
      fetchSocialData: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          // Placeholder in this store version
          set({ globalActivity: [] });
        } catch (error) {
          console.error("Social data fetch failed", error);
        }
      },
      followUserAction: async (targetUserId) => {
        const { user } = get();
        if (!user) return;
        try {
          await firestoreService.toggleFollow(user.id, targetUserId);
          set((state) => ({
            following: [...state.following, targetUserId],
          }));
        } catch (error) {
          console.error("Follow failed", error);
        }
      },
      unfollowUserAction: async (targetUserId) => {
        const { user } = get();
        if (!user) return;
        try {
          await firestoreService.toggleFollow(user.id, targetUserId);
          set((state) => ({
            following: state.following.filter(id => id !== targetUserId)
          }));
        } catch (error) {
          console.error("Unfollow failed", error);
        }
      },

      // UI State
      theme: 'dark',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
      })),
      modalCount: 0,
      setModalActive: (active) => set((state) => ({
        modalCount: active ? state.modalCount + 1 : Math.max(0, state.modalCount - 1)
      })),

      // Search History
      searchHistory: [],
      addToSearchHistory: (query) => {
        if (!query.trim()) return;
        const { searchHistory } = get();
        const filtered = searchHistory.filter(q => q !== query);
        set({ searchHistory: [query, ...filtered].slice(0, 10) });
      },
      clearSearchHistory: () => set({ searchHistory: [] }),

      // Recently Viewed
      recentlyViewed: [],
      addToRecentlyViewed: (media) => {
        const { recentlyViewed } = get();
        const filtered = recentlyViewed.filter(m => m.id !== media.id);
        set({ recentlyViewed: [media, ...filtered].slice(0, 20) });
      },
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // Recommendation Actions
      notInterested: [],
      addToNotInterested: async (mediaId) => {
        const { user, notInterested } = get();
        if (notInterested.includes(mediaId)) return;

        const newList = [...notInterested, mediaId];
        set({ notInterested: newList });

        if (user) {
          try {
            await firestoreService.addToNotInterested(user.id, mediaId);
          } catch (error) {
            console.error("Failed to sync not interested:", error);
          }
        }
      },
      recommendationHistory: [],
      addToRecommendationHistory: (mediaId) => {
        const { recommendationHistory } = get();
        set({ recommendationHistory: [...recommendationHistory, mediaId].slice(-50) });
      },
      clearRecommendationHistory: () => set({ recommendationHistory: [] }),

      // App Settings
      autoplayTrailer: true,
      setAutoplayTrailer: (val) => set({ autoplayTrailer: val }),
      reduceHaptics: false,
      setReduceHaptics: (val) => set({ reduceHaptics: val }),
      videoQuality: 'Auto',
      setVideoQuality: (val) => set({ videoQuality: val }),
      dataSaver: false,
      setDataSaver: (val) => set({ dataSaver: val }),
      appLanguage: 'English',
      setAppLanguage: (val) => set({ appLanguage: val }),

      // Trailer Cache
      trailerCache: {},
      setTrailerCache: (animeId, url) => {
        set((state) => ({
          trailerCache: {
            ...state.trailerCache,
            [animeId]: { url, cachedAt: Date.now() }
          }
        }));
      },
      getTrailerCache: () => get().trailerCache,
    }),
    {
      name: 'animorg-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        console.log('[Store] AsyncStorage rehydration initiated');
        return (hydratedState, error) => {
          if (error) {
            console.error('[Store] AsyncStorage rehydration failed:', error);
          } else {
            console.log('[Store] AsyncStorage rehydration complete!');
            hydratedState?.setHasHydrated(true);
          }
        };
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        watchlist: state.watchlist,
        searchHistory: state.searchHistory,
        recentlyViewed: state.recentlyViewed,
        theme: state.theme,
        userRatings: state.userRatings,
        activityFeed: state.activityFeed,
        continueWatching: state.continueWatching,
        animeProgress: state.animeProgress,
        notificationsEnabled: state.notificationsEnabled,
        pushToken: state.pushToken,
        following: state.following,
        followers: state.followers,
        autoplayTrailer: state.autoplayTrailer,
        reduceHaptics: state.reduceHaptics,
        videoQuality: state.videoQuality,
        dataSaver: state.dataSaver,
        appLanguage: state.appLanguage,
        trailerCache: state.trailerCache,
        notInterested: state.notInterested,
      }),
    }
  )
);
