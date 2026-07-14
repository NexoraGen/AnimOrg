import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, WatchlistItem, Media, WatchHistoryEntry, UserRating, ActivityFeedItem, AnimeProgress, Episode, NotificationCategorySettings, UserCollection } from '../types';
import { ACHIEVEMENTS, Badge } from '../config/achievements';
import { firebaseAuthService } from '../services/firebase/auth';
import { firestoreService } from '../services/firebase/firestore';
import { notificationService } from '../services/notifications';
import { resolveAnimeTrackingStatus, getCurrentlyReleasedEpisodesCount } from '../utils/releaseHelper';
import { XPService } from '../services/XPService';
import { AchievementService } from '../services/AchievementService';
import { RankService } from '../services/RankService';

interface AppState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isGuest: boolean;
  setIsGuest: (val: boolean) => void;
  loginAsGuest: () => void;
  clearSession: () => void;
  setUser: (user: User | null) => void;
  initializeAuth: () => () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
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
  notificationSettings: NotificationCategorySettings;
  updateNotificationSettings: (settings: Partial<NotificationCategorySettings>) => void;

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
  use24Hour: boolean;
  setUse24Hour: (val: boolean) => void;
  episodeAlertsEnabled: boolean;
  setEpisodeAlertsEnabled: (val: boolean) => void;

  // Trailer Cache
  trailerCache: Record<string, { url: string; cachedAt: number }>;
  setTrailerCache: (animeId: string, url: string) => void;
  getTrailerCache: () => Record<string, { url: string; cachedAt: number }>;

  // Hydration State
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;

  // Level Up Modal & Progression State
  levelUpModalVisible: boolean;
  setLevelUpModalVisible: (val: boolean) => void;
  levelUpModalData: { oldLevel: number; newLevel: number; isRankUp?: boolean } | null;
  setLevelUpModalData: (data: { oldLevel: number; newLevel: number; isRankUp?: boolean } | null) => void;
  levelUpAnimationsEnabled: boolean;
  setLevelUpAnimationsEnabled: (val: boolean) => void;

  // Achievement & Collections States
  collections: UserCollection[];
  achievementUnlockQueue: string[];
  achievementUnlockModalVisible: boolean;
  activeAchievementBadge: Badge | null;

  createCollectionAction: (name: string, description?: string, emoji?: string, coverImage?: string) => Promise<void>;
  updateCollectionAction: (collectionId: string, updates: Partial<UserCollection>) => Promise<void>;
  addAnimeToCollectionAction: (collectionId: string, animeId: string) => Promise<void>;
  removeAnimeFromCollectionAction: (collectionId: string, animeId: string) => Promise<void>;
  deleteCollectionAction: (collectionId: string) => Promise<void>;
  togglePinCollectionAction: (collectionId: string) => Promise<void>;
  reorderCollectionAnimeAction: (collectionId: string, animeIds: string[]) => Promise<void>;

  showNextAchievementUnlock: () => void;
  closeAchievementUnlockModal: () => void;
  setFavoriteAchievementAction: (badgeId: string | null) => Promise<void>;

  awardXpAction: (event: string, context?: any) => Promise<void>;
}

let globalTrackedListener: (() => void) | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Hydration Initial State
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),

      isAppInitializing: true,
      setIsAppInitializing: (val) => set({ isAppInitializing: val }),

      // Level Up Modal & Progression State
      levelUpModalVisible: false,
      levelUpModalData: null,
      levelUpAnimationsEnabled: true,
      setLevelUpModalVisible: (val) => set({ levelUpModalVisible: val }),
      setLevelUpModalData: (data) => set({ levelUpModalData: data }),
      setLevelUpAnimationsEnabled: (val) => set({ levelUpAnimationsEnabled: val }),

      // Achievement & Collection State
      collections: [],
      achievementUnlockQueue: [],
      achievementUnlockModalVisible: false,
      activeAchievementBadge: null,

      showNextAchievementUnlock: () => {
        const { achievementUnlockQueue } = get();
        if (achievementUnlockQueue.length === 0) return;

        const nextId = achievementUnlockQueue[0];
        const badge = ACHIEVEMENTS.find(a => a.id === nextId);

        set({
          achievementUnlockQueue: achievementUnlockQueue.slice(1),
          activeAchievementBadge: badge || null,
          achievementUnlockModalVisible: true,
        });
      },

      closeAchievementUnlockModal: () => {
        set({ achievementUnlockModalVisible: false, activeAchievementBadge: null });
        setTimeout(() => {
          if (get().achievementUnlockQueue.length > 0) {
            get().showNextAchievementUnlock();
          }
        }, 300);
      },

      setFavoriteAchievementAction: async (badgeId) => {
        const { user } = get();
        if (!user) return;
        await get().updateProfile({ favoriteBadgeId: badgeId });
      },

      createCollectionAction: async (name, description, emoji, coverImage) => {
        const { user, collections } = get();
        const newCol: UserCollection = {
          id: `col_${Date.now()}`,
          name,
          description,
          emoji: emoji || '📂',
          coverImage: coverImage || '',
          isPinned: false,
          animeIds: [],
          createdAt: new Date().toISOString()
        };
        const updated = [...collections, newCol];
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }

        await get().awardXpAction('CREATE_COLLECTION');
      },

      updateCollectionAction: async (collectionId, updates) => {
        const { user, collections } = get();
        const updated = collections.map(col => {
          if (col.id === collectionId) {
            return {
              ...col,
              ...updates
            };
          }
          return col;
        });
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }
      },

      addAnimeToCollectionAction: async (collectionId, animeId) => {
        const { user, collections } = get();
        const updated = collections.map(col => {
          if (col.id === collectionId) {
            if (col.animeIds.includes(animeId)) return col;
            return {
              ...col,
              animeIds: [...col.animeIds, animeId]
            };
          }
          return col;
        });
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }

        await get().awardXpAction('ADD_TO_COLLECTION');
      },

      removeAnimeFromCollectionAction: async (collectionId, animeId) => {
        const { user, collections } = get();
        const updated = collections.map(col => {
          if (col.id === collectionId) {
            return {
              ...col,
              animeIds: col.animeIds.filter(id => id !== animeId)
            };
          }
          return col;
        });
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }

        await get().awardXpAction('REMOVE_FROM_COLLECTION');
      },

      deleteCollectionAction: async (collectionId) => {
        const { user, collections } = get();
        const updated = collections.filter(col => col.id !== collectionId);
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }

        await get().awardXpAction('DELETE_COLLECTION');
      },

      togglePinCollectionAction: async (collectionId) => {
        const { user, collections } = get();
        const updated = collections.map(col => {
          if (col.id === collectionId) {
            return {
              ...col,
              isPinned: !col.isPinned
            };
          }
          return col;
        });
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }
      },

      reorderCollectionAnimeAction: async (collectionId, animeIds) => {
        const { user, collections } = get();
        const updated = collections.map(col => {
          if (col.id === collectionId) {
            return {
              ...col,
              animeIds
            };
          }
          return col;
        });
        set({ collections: updated });

        if (user) {
          try {
            await firestoreService.updateUserProfile(user.id, { collections: updated });
          } catch (e) {
            console.warn('Firestore collections sync failed:', e);
          }
        }
      },

      awardXpAction: async (event, context) => {
        const { user, watchlist, animeProgress, updateProfile, levelUpAnimationsEnabled } = get();
        if (!user) return;

        const xpResult = XPService.processXPEvent(user, event as any, context);

        // Evaluate achievements
        const currentBadges = user.badges || [];
        const newBadges = AchievementService.evaluateBadges(
          currentBadges,
          watchlist,
          animeProgress,
          {
            longestStreak: xpResult.updatedProfile.longestStreak || user.longestStreak || 0,
            userRatings: get().userRatings,
            collections: get().collections,
            totalReviews: user.totalReviews || 0,
            reviewLikes: 0 // Future extension
          }
        );

        const newlyUnlocked = newBadges.filter(bId => !currentBadges.includes(bId));

        let extraXp = 0;
        const newlyUnlockedBadgeObjects: Badge[] = [];
        newlyUnlocked.forEach(bId => {
          const badge = ACHIEVEMENTS.find(a => a.id === bId);
          if (badge) {
            extraXp += badge.xpReward;
            newlyUnlockedBadgeObjects.push(badge);
          }
        });

        // Trigger notifications and modal queue for unlocked badges
        if (newlyUnlockedBadgeObjects.length > 0) {
          const NotificationManager = require('../services/notifications/NotificationManager').NotificationManager;
          newlyUnlockedBadgeObjects.forEach(badge => {
            NotificationManager.triggerAchievement(badge.title).catch((e: any) => {
              console.warn('Failed to trigger achievement notification:', e);
            });
          });

          const currentQueue = get().achievementUnlockQueue;
          set({
            achievementUnlockQueue: [...currentQueue, ...newlyUnlockedBadgeObjects.map(b => b.id)]
          });

          if (!get().achievementUnlockModalVisible) {
            get().showNextAchievementUnlock();
          }
        }

        const baseXpAdded = xpResult.xpAdded;
        const totalXpAdded = baseXpAdded + extraXp;

        if (totalXpAdded === 0 && newBadges.length === currentBadges.length) {
          if (Object.keys(xpResult.updatedProfile).length > 0) {
            await updateProfile(xpResult.updatedProfile);
          }
          return;
        }

        const currentXp = user.xp || 0;
        const finalXp = currentXp + totalXpAdded;
        const LevelService = require('../services/LevelService').LevelService;
        const finalLevelInfo = LevelService.getLevelInfo(finalXp);
        const finalLevel = finalLevelInfo.level;
        const oldLevel = user.level || 1;
        const levelUp = finalLevel > oldLevel;

        const profileUpdate = {
          ...xpResult.updatedProfile,
          xp: finalXp,
          level: finalLevel,
          badges: newBadges
        };

        await updateProfile(profileUpdate);

        if (levelUp && levelUpAnimationsEnabled) {
          const oldRank = RankService.getRankByLevel(oldLevel);
          const newRank = RankService.getRankByLevel(finalLevel);
          const rankUp = oldRank.title !== newRank.title;

          set({
            levelUpModalVisible: true,
            levelUpModalData: {
              oldLevel: oldLevel,
              newLevel: finalLevel,
              isRankUp: rankUp
            }
          });
        }
      },

      // guest state
      isGuest: false,
      setIsGuest: (val) => set({ isGuest: val }),

      // Auth Initial State
      user: null,
      isAuthenticated: false,
      isLoadingAuth: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isGuest: user ? false : get().isGuest }),

      loginAsGuest: () => set({
        isGuest: true,
        isAuthenticated: false,
        isLoadingAuth: false,
        isAppInitializing: false,
        user: null,
      }),

      clearSession: () => set({
        user: null,
        isAuthenticated: false,
        isGuest: false,
        watchlist: [],
        activityFeed: [],
        continueWatching: [],
        searchHistory: [],
        recentlyViewed: [],
        userRatings: [],
        animeProgress: {},
        notInterested: [],
        recommendationHistory: [],
      }),

      initializeAuth: () => {
        // High-fidelity background automatic retry helper for startup database queries
        const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
          try {
            return await fn();
          } catch (error) {
            if (retries <= 0) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 1.5); // Exponential delay
          }
        };

        const unsubscribeAuth = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            const userId = firebaseUser.uid;
            const hasCachedProfile = get().user && get().user?.id === userId;

            // Guard: If we are already authenticated as the same user and app is fully initialized, do not re-trigger loading sequence
            if (get().isAuthenticated && get().user?.id === userId && !get().isAppInitializing) {
              return;
            }

            // Instantly resolve auth flags if we have cached profile/data to fade out splash screen immediately
            set({
              isAuthenticated: true,
              isLoadingAuth: false,
              isAppInitializing: !hasCachedProfile,
              isGuest: false
            });

            // 2. Set up real-time listener for "trackedAnime" (Primary for Hub)
            if (globalTrackedListener) {
              globalTrackedListener();
            }

            globalTrackedListener = firestoreService.onTrackedAnimeSnapshot(userId, (trackedItems) => {
              const currentWatchlist = get().watchlist;
              let hasChanges = false;

              if (currentWatchlist.length !== trackedItems.length) {
                hasChanges = true;
              }

              const currentMap = new Map(currentWatchlist.map(w => [String(w.mediaId), w]));
              const mergedMap = new Map();

              trackedItems.forEach(ta => {
                const taId = String(ta.mediaId);
                const existing = currentMap.get(taId);

                if (!existing) {
                  hasChanges = true;
                  mergedMap.set(taId, ta);
                } else {
                  const statusChanged = ta.status !== existing.status;
                  const favoriteChanged = ta.isFavorite !== existing.isFavorite;
                  const ratingChanged = ta.rating !== existing.rating;
                  const broadcastChanged = JSON.stringify(ta.broadcast) !== JSON.stringify(existing.broadcast);
                  const mediaStatusMismatched = ta.mediaStatus !== existing.mediaStatus;
                  const thumbUpdated = !existing.posterImageMedium && ta.posterImageMedium;

                  if (statusChanged || favoriteChanged || ratingChanged || broadcastChanged || mediaStatusMismatched || thumbUpdated) {
                    hasChanges = true;
                    mergedMap.set(taId, { ...existing, ...ta });
                  } else {
                    mergedMap.set(taId, existing);
                  }
                }
              });

              if (hasChanges) {
                set({ watchlist: Array.from(mergedMap.values()) });
              }
            });

            // Asynchronously fetch other data in the background so it never blocks the startup splash screen transition
            (async () => {
              try {
                // 1. Fetch initial profile once - wait / poll if profile is currently being created on Login/Google Sign-In
                let userProfile = await fetchWithRetry(() => firestoreService.getUserProfile(userId)).catch(() => {
                  return get().user;
                });

                if (!userProfile && !hasCachedProfile) {
                  for (let i = 0; i < 7; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    userProfile = await firestoreService.getUserProfile(userId);
                    if (userProfile) {
                      break;
                    }
                  }
                }

                // Self-heal: If profile document is still absent, auto-create it now so user is never marked raw Guest User
                if (!userProfile && !hasCachedProfile) {
                  const backupProfile = {
                    id: userId,
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
                  await firestoreService.createUserProfile(userId, backupProfile);
                  userProfile = backupProfile;
                }

                // 3. Fetch data once with background retries and cached values as ultimate fallbacks
                const [history, activity, allProgress, ratings, notInterested, followingList, followersList] = await Promise.all([
                  fetchWithRetry(() => {
                    return firestoreService.getContinueWatching(userId);
                  }).catch(() => {
                    return get().continueWatching || [];
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getActivityFeed(userId);
                  }).catch(() => {
                    return get().activityFeed || [];
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getAllProgress(userId);
                  }).catch(() => {
                    return Object.values(get().animeProgress || {});
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getUserRatings(userId);
                  }).catch(() => {
                    return get().userRatings || [];
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getNotInterested(userId);
                  }).catch(() => {
                    return get().notInterested || [];
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getUserFollowing(userId);
                  }).catch(() => {
                    return get().following || [];
                  }),
                  fetchWithRetry(() => {
                    return firestoreService.getUserFollowers(userId);
                  }).catch(() => {
                    return get().followers || [];
                  }),
                ]);

                const progressMap: Record<string, AnimeProgress> = {};
                if (allProgress) {
                  allProgress.forEach((p: AnimeProgress) => {
                    progressMap[String(p.animeId)] = p;
                  });
                }

                if (userProfile && !userProfile.timezone) {
                  try {
                    const { autoDetectTimezone } = require('../utils/timezoneHelper');
                    const detected = autoDetectTimezone();
                    userProfile.timezone = detected.id;
                    userProfile.timezoneLabel = detected.label;
                    userProfile.country = detected.country;
                    firestoreService.updateUserProfile(userId, {
                      timezone: detected.id,
                      timezoneLabel: detected.label,
                      country: detected.country
                    }).catch((e: any) => console.warn('Failed to auto-save detected timezone on signup:', e));
                  } catch (e) {
                    console.warn('Failed to auto-detect timezone during initialization:', e);
                  }
                }

                set({
                  user: userProfile || get().user,
                  continueWatching: history || [],
                  activityFeed: activity || [],
                  animeProgress: progressMap,
                  userRatings: ratings || [],
                  notInterested: notInterested || [],
                  following: followingList || [],
                  followers: followersList || [],
                  collections: userProfile?.collections || get().collections || [],
                  isAppInitializing: false, // Background tasks finished, mark init complete if not done
                  isLoadingAuth: false
                });

                // Check daily login XP
                const currentUser = get().user;
                if (currentUser) {
                  const loginResult = XPService.processXPEvent(currentUser, 'DAILY_LOGIN');
                  if (loginResult.xpAdded > 0) {
                    set({ user: { ...currentUser, ...loginResult.updatedProfile } });
                    firestoreService.updateUserProfile(currentUser.id, loginResult.updatedProfile).catch(e => {
                      console.warn('Failed to save daily login XP:', e);
                    });
                  }
                }

                if (get().notificationsEnabled) {
                  get().registerNotifications();
                }
              } catch (bgError) {
                console.warn("[useAppStore] Background initial fetch warning:", bgError);
                set({
                  isAppInitializing: false,
                  isLoadingAuth: false
                });
              }
            })();
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
                collections: [],
                isGuest: false
              });
            }
          }
        });

        return () => {
          if (globalTrackedListener) {
            globalTrackedListener();
            globalTrackedListener = null;
          }
          unsubscribeAuth();
        };
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
            const { animeApi } = await import('../services/animeApi');
            const data = await animeApi.getAnimeDetails(media.id);
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

        // Award XP actions
        get().awardXpAction('ADD_TO_WATCHLIST');
        if (status === 'watching') {
          get().awardXpAction('START_TRACKING');
        }
        const existingGenres = new Set((watchlist || []).flatMap(w => w.genres || []));
        const hasNewGenre = enrichedMedia.genres?.some(g => !existingGenres.has(g));
        if (hasNewGenre) {
          get().awardXpAction('DISCOVER_GENRE', { newGenre: true });
        }

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

        // Award XP actions
        if (status === 'watching') {
          get().awardXpAction('START_TRACKING');
        } else if (status === 'completed') {
          const completedCount = watchlist.filter(w => w.status === 'completed').length;
          get().awardXpAction('COMPLETE_ANIME', { firstCompleted: completedCount === 0 });
        }

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
          // Only overwrite if current episodes is not set/0 or totalCount is valid
          // Avoid overwriting a valid positive episode count with a default or pagination mismatch
          if (!currentAnime.episodes || currentAnime.episodes === 0 || (media?.status && ['currently airing', 'releasing'].includes(media.status.toLowerCase()))) {
            set({
              watchlist: get().watchlist.map(item =>
                item.mediaId === animeId ? { ...item, episodes: totalCount } : item
              )
            });
          }
        }

        // Determine next status using CENTRAL resolver
        const infoStatus = media?.status || currentAnime?.mediaStatus || '';
        const releasedCount = media ? getCurrentlyReleasedEpisodesCount(media) : totalEpisodes;
        const newStatus = resolveAnimeTrackingStatus({
          mediaStatus: infoStatus,
          totalEpisodes,
          watchedCount: highestEp,
          releasedCount,
        });

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

        // 7. PROGRESSION XP UPDATES
        if (watched) {
          await get().awardXpAction('EPISODE_WATCHED');
          if (highestEp > 0 && highestEp === totalEpisodes) {
            await get().awardXpAction('FINISH_SEASON');
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

        // Award XP for rating
        await get().awardXpAction('RATE_ANIME');

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
      notificationSettings: {
        episodeReleases: true,
        continueWatching: true,
        recommendations: true,
        achievements: true,
        weeklySummary: true,
        news: true,
      },
      updateNotificationSettings: (settings) => set((state) => ({
        notificationSettings: {
          ...(state.notificationSettings || {
            episodeReleases: true,
            continueWatching: true,
            recommendations: true,
            achievements: true,
            weeklySummary: true,
            news: true,
          }),
          ...settings,
        }
      })),
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
        get().awardXpAction('USE_SEARCH');
      },
      clearSearchHistory: () => set({ searchHistory: [] }),

      // Recently Viewed
      recentlyViewed: [],
      addToRecentlyViewed: (media) => {
        const { recentlyViewed } = get();
        const filtered = recentlyViewed.filter(m => m.id !== media.id);
        set({ recentlyViewed: [media, ...filtered].slice(0, 20) });
        get().awardXpAction('OPEN_DETAILS');
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
      use24Hour: false,
      setUse24Hour: (val) => set({ use24Hour: val }),
      episodeAlertsEnabled: true,
      setEpisodeAlertsEnabled: (val) => set({ episodeAlertsEnabled: val }),

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

      refreshUserData: async () => {
        const user = get().user;
        if (!user) return;

        const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
          try {
            return await fn();
          } catch (error) {
            if (retries <= 0) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 1.5);
          }
        };

        try {
          const [userProfile, history, activity, allProgress, ratings, notInterested, followingList, followersList] = await Promise.all([
            fetchWithRetry(() => firestoreService.getUserProfile(user.id)).catch(() => get().user),
            fetchWithRetry(() => firestoreService.getContinueWatching(user.id)).catch(() => get().continueWatching || []),
            fetchWithRetry(() => firestoreService.getActivityFeed(user.id)).catch(() => get().activityFeed || []),
            fetchWithRetry(() => firestoreService.getAllProgress(user.id)).catch(() => Object.values(get().animeProgress || {})),
            fetchWithRetry(() => firestoreService.getUserRatings(user.id)).catch(() => get().userRatings || []),
            fetchWithRetry(() => firestoreService.getNotInterested(user.id)).catch(() => get().notInterested || []),
            fetchWithRetry(() => firestoreService.getUserFollowing(user.id)).catch(() => get().following || []),
            fetchWithRetry(() => firestoreService.getUserFollowers(user.id)).catch(() => get().followers || []),
          ]);

          const progressMap: Record<string, AnimeProgress> = {};
          if (allProgress) {
            allProgress.forEach(p => {
              progressMap[String(p.animeId)] = p;
            });
          }

          set((state) => ({
            user: userProfile || state.user,
            continueWatching: history || [],
            activityFeed: activity || [],
            animeProgress: progressMap,
            userRatings: ratings || [],
            notInterested: notInterested || [],
            following: followingList || [],
            followers: followersList || [],
            collections: userProfile?.collections || state.collections || [],
          }));
        } catch (error) {
          console.error("Failed to refresh user data:", error);
        }
      },
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
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
        notificationSettings: state.notificationSettings,
        pushToken: state.pushToken,
        autoplayTrailer: state.autoplayTrailer,
        reduceHaptics: state.reduceHaptics,
        videoQuality: state.videoQuality,
        dataSaver: state.dataSaver,
        appLanguage: state.appLanguage,
        use24Hour: state.use24Hour,
        episodeAlertsEnabled: state.episodeAlertsEnabled,
        levelUpAnimationsEnabled: state.levelUpAnimationsEnabled,
        // Severely prune massive datasets strictly prior to JSON serialization saving to SQLite
        watchlist: state.watchlist,
        animeProgress: Object.fromEntries(Object.entries(state.animeProgress || {}).slice(0, 150)),
        searchHistory: (state.searchHistory || []).slice(0, 10),
        recentlyViewed: (state.recentlyViewed || []).slice(0, 10),
        continueWatching: (state.continueWatching || []).slice(0, 15),
        notInterested: (state.notInterested || []).slice(0, 50),
        userRatings: state.userRatings,
        collections: state.collections || [],
      }),
    }
  )
);
