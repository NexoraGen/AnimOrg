import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  addDoc,
  deleteField,
  onSnapshot,
  startAfter,
  limitToLast,
  runTransaction,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from './config';
import { User, WatchlistItem, Review, Comment, WatchHistoryEntry, ActivityFeedItem, AnimeProgress, CommunityPost, PostComment, CommunityNotification, Follow, TrendingTag } from '../../types';

// Utility to extract hashtags
const extractHashtags = (text: string): string[] => {
  const hashtags = text.match(/#[\w\u0590-\u05ff]+/g);
  return hashtags ? hashtags.map(h => h.slice(1).toLowerCase()) : [];
};

export const firestoreService = {
  // --- Community & Social (New) ---

  createCommunityPost: async (postData: Partial<CommunityPost>) => {
    try {
      const postsRef = collection(db, 'posts');
      const hashtags = extractHashtags(postData.content || '');

      const newPost = {
        ...postData,
        hashtags,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(postsRef, newPost);

      // Update hashtags collection for trending tracking
      const batch = writeBatch(db);
      hashtags.forEach(tag => {
        const tagRef = doc(db, 'hashtags', tag);
        batch.set(tagRef, {
          count: increment(1),
          lastUsed: serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();

      return docRef.id;
    } catch (error) {
      console.error('[FirestoreService] Error creating post:', error);
      throw error;
    }
  },

  getCommunityFeed: async (options: {
    category?: string,
    userId?: string,
    lastDoc?: any,
    pageSize?: number
  }) => {
    // Return early if not authenticated to prevent Firebase permission exceptions in console
    if (!auth.currentUser) {
      return { posts: [], lastDoc: null };
    }
    try {
      const postsRef = collection(db, 'posts');
      let q;

      if (options.category === 'Trending') {
        q = query(
          postsRef,
          orderBy('engagementScore', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(options.pageSize || 10)
        );
      } else {
        q = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(options.pageSize || 10)
        );
      }

      if (options.category && options.category !== 'Latest' && options.category !== 'Trending' && options.category !== 'Following') {
        q = query(q, where('category', '==', options.category));
      }

      if (options.userId) {
        q = query(q, where('userId', '==', options.userId));
      }

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const snap = await getDocs(q);
      return {
        posts: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)),
        lastDoc: snap.docs[snap.docs.length - 1]
      };
    } catch (error) {
      console.error('[FirestoreService] Error getting feed:', error);
      return { posts: [], lastDoc: null };
    }
  },

  togglePostLike: async (userId: string, postId: string) => {
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(likeRef);

    const batch = writeBatch(db);
    if (snap.exists()) {
      batch.delete(likeRef);
      batch.update(postRef, {
        likes: increment(-1),
        engagementScore: increment(-1)
      });
    } else {
      batch.set(likeRef, { userId, postId, createdAt: serverTimestamp() });
      batch.update(postRef, {
        likes: increment(1),
        engagementScore: increment(1)
      });
    }
    await batch.commit();
    return !snap.exists();
  },

  togglePostSave: async (userId: string, postId: string) => {
    const saveId = `${userId}_${postId}`;
    const saveRef = doc(db, 'users', userId, 'savedPosts', postId);
    const snap = await getDoc(saveRef);

    if (snap.exists()) {
      await deleteDoc(saveRef);
      return false;
    } else {
      await setDoc(saveRef, { postId, savedAt: serverTimestamp() });
      return true;
    }
  },

  getPostComments: async (postId: string, lastDoc?: any) => {
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      let q = query(commentsRef, orderBy('createdAt', 'desc'), limit(20));
      if (lastDoc) q = query(q, startAfter(lastDoc));

      const snap = await getDocs(q);
      return {
        comments: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostComment)),
        lastDoc: snap.docs[snap.docs.length - 1]
      };
    } catch (error) {
      console.error('[FirestoreService] Error getting comments:', error);
      return { comments: [], lastDoc: null };
    }
  },

  addPostComment: async (postId: string, commentData: Partial<PostComment>) => {
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const postRef = doc(db, 'posts', postId);
      const batch = writeBatch(db);

      const newCommentRef = doc(commentsRef);
      const commentId = newCommentRef.id;

      const newComment = {
        ...commentData,
        id: commentId,
        createdAt: serverTimestamp(),
        likes: 0,
        replyCount: 0,
      };

      batch.set(newCommentRef, newComment);
      batch.update(postRef, {
        comments: increment(1),
        engagementScore: increment(2) // Comments weigh more for trending
      });

      // Handle reply count if it's a nested comment
      if (commentData.parentId) {
        const parentRef = doc(db, 'posts', postId, 'comments', commentData.parentId);
        batch.update(parentRef, { replyCount: increment(1) });
      }

      await batch.commit();
      return commentId;
    } catch (error) {
      console.error('[FirestoreService] Error adding comment:', error);
      throw error;
    }
  },

  toggleCommentLike: async (userId: string, postId: string, commentId: string) => {
    const likeId = `${userId}_${commentId}`;
    const likeRef = doc(db, 'likes', likeId);
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    const snap = await getDoc(likeRef);

    const batch = writeBatch(db);
    if (snap.exists()) {
      batch.delete(likeRef);
      batch.update(commentRef, { likes: increment(-1) });
    } else {
      batch.set(likeRef, { userId, commentId, createdAt: serverTimestamp() });
      batch.update(commentRef, { likes: increment(1) });
    }
    await batch.commit();
    return !snap.exists();
  },

  // --- Follow System ---
  toggleFollow: async (followerId: string, followingId: string) => {
    const followId = `${followerId}_${followingId}`;
    const followRef = doc(db, 'follows', followId);
    const followerRef = doc(db, 'users', followerId);
    const followingRef = doc(db, 'users', followingId);
    const snap = await getDoc(followRef);

    const batch = writeBatch(db);
    if (snap.exists()) {
      batch.delete(followRef);
      batch.update(followerRef, { followingCount: increment(-1) });
      batch.update(followingRef, { followersCount: increment(-1) });
    } else {
      batch.set(followRef, { followerId, followingId, createdAt: serverTimestamp() });
      batch.update(followerRef, { followingCount: increment(1) });
      batch.update(followingRef, { followersCount: increment(1) });
    }
    await batch.commit();
    return !snap.exists();
  },

  isFollowing: async (followerId: string, followingId: string) => {
    const followId = `${followerId}_${followingId}`;
    const snap = await getDoc(doc(db, 'follows', followId));
    return snap.exists();
  },

  // --- Notifications ---
  createNotification: async (notification: Omit<CommunityNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const notifRef = collection(db, 'notifications');
      await addDoc(notifRef, {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[FirestoreService] Error creating notification:', error);
    }
  },

  getNotifications: async (userId: string) => {
    try {
      const notifRef = collection(db, 'notifications');
      const q = query(notifRef, where('recipientId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityNotification));
    } catch (error) {
      console.error('[FirestoreService] Error getting notifications:', error);
      return [];
    }
  },

  markNotificationRead: async (notifId: string) => {
    const notifRef = doc(db, 'notifications', notifId);
    await updateDoc(notifRef, { read: true });
  },

  // --- Trending ---
  getTrendingHashtags: async () => {
    // Return early if not authenticated to prevent Firebase permission exceptions in console
    if (!auth.currentUser) {
      return [];
    }
    try {
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(hashtagsRef, orderBy('count', 'desc'), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ tag: doc.id, ...doc.data() } as TrendingTag));
    } catch (error) {
      console.error('[FirestoreService] Error getting trending hashtags:', error);
      return [];
    }
  },
  getUserPublicData: async (userId: string) => {
    try {
      const profile = await firestoreService.getUserProfile(userId);
      const watchlist = await firestoreService.getWatchlist(userId);

      const stats = {
        totalWatched: watchlist.filter(item => item.status === 'completed').length,
        currentlyWatching: watchlist.filter(item => item.status === 'watching').length,
        totalEpisodes: watchlist.reduce((acc, item) => acc + (item.episodes || 0), 0)
      };

      return {
        profile: profile || { username: 'Anime Enthusiast', bio: '' },
        stats
      };
    } catch (error) {
      console.error('[FirestoreService] Error getting public user data:', error);
      throw error;
    }
  },
  searchUsers: async (searchTerm: string): Promise<User[]> => {
    try {
      if (!searchTerm) return [];

      let termLower = searchTerm.toLowerCase().trim();
      // Strip potential leading @ from handles searches
      if (termLower.startsWith('@')) {
        termLower = termLower.slice(1);
      }

      if (termLower.length < 1) return [];

      // Simple prefix matching using >= and <= bounds
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', termLower),
        where('username', '<=', termLower + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error('[FirestoreService] Error searching users:', error);
      return [];
    }
  },
  checkUsernameAvailability: async (username: string) => {
    try {
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      const snap = await getDoc(usernameRef);
      return !snap.exists();
    } catch (error) {
      console.error('[FirestoreService] Error checking username availability:', error);
      return false;
    }
  },

  createUserProfile: async (userId: string, data: Partial<User>) => {
    try {
      const userRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      let baseUsername = (data.username || `user${userId.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
      let targetUsername = baseUsername;

      // Auto-resolve username conflict for transparent signups (e.g. Google Sign-In with taken DisplayName)
      let isAvailable = await firestoreService.checkUsernameAvailability(targetUsername);
      if (!isAvailable) {
        targetUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
      }

      batch.set(userRef, {
        ...data,
        username: targetUsername, // Strictly enforce the validated one
        followersCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const usernameRef = doc(db, 'usernames', targetUsername);
      batch.set(usernameRef, { uid: userId });

      await batch.commit();
    } catch (error) {
      console.error(`[FirestoreService] Error creating user profile for ${userId}:`, error);
      throw error;
    }
  },

  updateUserProfile: async (userId: string, data: Partial<User>) => {
    try {
      const userRef = doc(db, 'users', userId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);

        let oldUsername = "";
        const isNew = !userSnap.exists();

        if (!isNew) {
          const oldData = userSnap.data() as User;
          oldUsername = oldData.username?.toLowerCase()?.trim() || "";
        }

        const newUsername = data.username?.toLowerCase()?.trim();

        if (newUsername && newUsername !== oldUsername) {
          // Rule validation (lowercasing, characters pattern, size limits)
          if (!/^[a-z0-9_]{3,20}$/.test(newUsername)) {
            throw new Error("Invalid username format.");
          }

          // Check if new username is already taken
          const newUsernameRef = doc(db, 'usernames', newUsername);
          const newUsernameSnap = await transaction.get(newUsernameRef);

          if (newUsernameSnap.exists()) {
            const resData = newUsernameSnap.data();
            if (resData && resData.uid !== userId) {
              throw new Error("Username already taken.");
            }
          }

          // Delete old username reservation if it exists
          if (oldUsername) {
            const oldUsernameRef = doc(db, 'usernames', oldUsername);
            transaction.delete(oldUsernameRef);
          }

          // Reserve the new username doc
          transaction.set(newUsernameRef, { uid: userId, createdAt: serverTimestamp() });
        }

        const profileUpdate = {
          ...data,
          username: newUsername || oldUsername, // Guarantee clean lowercased state representation
          updatedAt: serverTimestamp(),
        };

        if (isNew) {
          transaction.set(userRef, {
            id: userId,
            email: data.email || '',
            avatarUrl: data.avatarUrl || '',
            favoriteGenres: [],
            watchStats: {
              animeCount: 0,
              totalHours: 0,
            },
            ...profileUpdate,
            createdAt: serverTimestamp(),
          });
        } else {
          transaction.update(userRef, profileUpdate);
        }
      });

      // Trigger background denormalization helper if username or avatar stands to change
      if (data.username || data.avatarUrl) {
        firestoreService.updateUserDenormalizedReferences(
          userId,
          data.username || '',
          data.avatarUrl
        ).catch(err => console.error('[Denormalize Background] Async update failure:', err));
      }
    } catch (error) {
      console.error(`[FirestoreService] Error updating user profile for ${userId}:`, error);
      throw error;
    }
  },

  updateUserDenormalizedReferences: async (userId: string, newUsername: string, newAvatarUrl?: string) => {
    try {
      const batch = writeBatch(db);
      let opsCount = 0;

      // 1. Update posts
      const postsRef = collection(db, 'posts');
      const postsQuery = query(postsRef, where('userId', '==', userId));
      const postsSnap = await getDocs(postsQuery);
      postsSnap.forEach(docSnap => {
        const updateData: any = {};
        if (newUsername) updateData.username = newUsername;
        if (newAvatarUrl) updateData.userAvatar = newAvatarUrl;

        batch.update(docSnap.ref, updateData);
        opsCount++;
      });

      // 2. Update comments in comments collectionGroup
      const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', userId));
      const commentsSnap = await getDocs(commentsQuery);
      commentsSnap.forEach(docSnap => {
        const updateData: any = {};
        if (newUsername) updateData.username = newUsername;
        if (newAvatarUrl) updateData.userAvatar = newAvatarUrl;

        batch.update(docSnap.ref, updateData);
        opsCount++;
      });

      // 3. Update reviews in reviews collectionGroup
      const reviewsQuery = query(collectionGroup(db, 'reviews'), where('userId', '==', userId));
      const reviewsSnap = await getDocs(reviewsQuery);
      reviewsSnap.forEach(docSnap => {
        const updateData: any = {};
        if (newUsername) updateData.username = newUsername;
        if (newAvatarUrl) updateData.avatarUrl = newAvatarUrl;

        batch.update(docSnap.ref, updateData);
        opsCount++;
      });

      if (opsCount > 0) {
        await batch.commit();
        console.log(`[FirestoreService] Successfully updated ${opsCount} denormalized references for user ${userId}`);
      }
    } catch (error) {
      console.error('[FirestoreService] Error updating denormalized user references:', error);
    }
  },

  getUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { id: userId, ...userSnap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error(`[FirestoreService] Error getting user profile for ${userId}:`, error);
      return null; // Graceful failure for profile fetch
    }
  },

  // --- Tracked Anime (Recommended Structure for Release Hub) ---
  getTrackedAnime: async (userId: string): Promise<WatchlistItem[]> => {
    try {
      const trackedRef = collection(db, 'users', userId, 'trackedAnime');
      const q = query(trackedRef, orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as WatchlistItem);
    } catch (error) {
      console.error(`[FirestoreService] Error getting tracked anime for ${userId}:`, error);
      return [];
    }
  },

  syncTrackedAnime: async (userId: string, item: WatchlistItem) => {
    try {
      const itemRef = doc(db, 'users', userId, 'trackedAnime', item.mediaId);
      await setDoc(itemRef, {
        ...item,
        syncedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(`[FirestoreService] Error syncing tracked anime for ${userId}:`, error);
    }
  },

  removeFromTrackedAnime: async (userId: string, mediaId: string) => {
    try {
      const itemRef = doc(db, 'users', userId, 'trackedAnime', mediaId);
      await deleteDoc(itemRef);
    } catch (error) {
      console.error(`[FirestoreService] Error removing tracked anime for ${userId}:`, error);
    }
  },

  onTrackedAnimeSnapshot: (userId: string, callback: (items: WatchlistItem[]) => void) => {
    const trackedRef = collection(db, 'users', userId, 'trackedAnime');
    const q = query(trackedRef, orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as WatchlistItem);
      callback(items);
    });
  },

  // --- Watchlist ---
  getWatchlist: async (userId: string): Promise<WatchlistItem[]> => {
    try {
      const watchlistRef = collection(db, 'users', userId, 'watchlist');
      const q = query(watchlistRef, orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as WatchlistItem);
    } catch (error) {
      console.error(`[FirestoreService] Error getting watchlist for ${userId}:`, error);
      return [];
    }
  },

  addToWatchlist: async (userId: string, item: WatchlistItem) => {
    try {
      const itemRef = doc(db, 'users', userId, 'watchlist', item.mediaId);
      await setDoc(itemRef, {
        ...item,
        syncedAt: serverTimestamp(),
      });

      // Update stats
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'watchStats.animeCount': increment(1)
      });
    } catch (error) {
      console.error(`[FirestoreService] Error adding to watchlist for ${userId}:`, error);
    }
  },

  updateWatchlistStatus: async (userId: string, mediaId: string, status: string) => {
    try {
      const itemRef = doc(db, 'users', userId, 'watchlist', mediaId);
      await updateDoc(itemRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error updating watchlist status for ${userId}:`, error);
    }
  },

  toggleFavorite: async (userId: string, mediaId: string, isFavorite: boolean) => {
    try {
      const itemRef = doc(db, 'users', userId, 'watchlist', mediaId);
      await updateDoc(itemRef, {
        isFavorite,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error toggling favorite for ${userId}:`, error);
    }
  },

  removeFromWatchlist: async (userId: string, mediaId: string) => {
    try {
      const itemRef = doc(db, 'users', userId, 'watchlist', mediaId);
      await deleteDoc(itemRef);

      // Update stats
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'watchStats.animeCount': increment(-1)
      });
    } catch (error) {
      console.error(`[FirestoreService] Error removing from watchlist for ${userId}:`, error);
    }
  },

  // --- Continue Watching (History) ---
  getContinueWatching: async (userId: string): Promise<WatchHistoryEntry[]> => {
    try {
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('lastViewedAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as WatchHistoryEntry);
    } catch (error) {
      console.error(`[FirestoreService] Error getting continue watching for ${userId}:`, error);
      return [];
    }
  },

  updateContinueWatching: async (userId: string, entry: WatchHistoryEntry) => {
    try {
      const entryRef = doc(db, 'users', userId, 'history', entry.animeId);
      await setDoc(entryRef, {
        ...entry,
        lastViewedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error(`[FirestoreService] Error updating continue watching for ${userId}:`, error);
    }
  },

  // --- Activity Feed ---
  getActivityFeed: async (userId: string): Promise<ActivityFeedItem[]> => {
    try {
      const feedRef = collection(db, 'users', userId, 'activity');
      const q = query(feedRef, orderBy('timestamp', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityFeedItem));
    } catch (error) {
      console.error(`[FirestoreService] Error getting activity feed for ${userId}:`, error);
      return [];
    }
  },

  addActivityFeedItem: async (userId: string, item: Omit<ActivityFeedItem, 'id' | 'timestamp'>) => {
    try {
      const feedRef = collection(db, 'users', userId, 'activity');
      await setDoc(doc(feedRef), {
        ...item,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error adding activity item for ${userId}:`, error);
    }
  },

  // --- Reviews & Comments ---
  getReviewsForAnime: async (animeId: string): Promise<Review[]> => {
    try {
      const reviewsRef = collection(db, 'anime', animeId, 'reviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      console.error(`[FirestoreService] Error getting reviews for anime ${animeId}:`, error);
      return [];
    }
  },

  addReview: async (userId: string, animeId: string, review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const reviewsRef = collection(db, 'anime', animeId, 'reviews');
      await addDoc(reviewsRef, {
        ...review,
        userId,
        animeId,
        createdAt: serverTimestamp(),
        likes: 0,
      });

      // Increment user review count
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalReviews: increment(1)
      });
    } catch (error) {
      console.error(`[FirestoreService] Error adding review for ${userId}:`, error);
    }
  },

  likeReview: async (animeId: string, reviewId: string) => {
    const reviewRef = doc(db, 'anime', animeId, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      likes: increment(1)
    });
  },

  deleteReview: async (animeId: string, reviewId: string, userId: string) => {
    const reviewRef = doc(db, 'anime', animeId, 'reviews', reviewId);
    await deleteDoc(reviewRef);

    // Decrement user review count
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      totalReviews: increment(-1)
    });
  },

  // --- Ratings & Likes ---
  getUserRating: async (userId: string, animeId: string): Promise<number | null> => {
    try {
      const ratingRef = doc(db, 'users', userId, 'ratings', animeId);
      const snap = await getDoc(ratingRef);
      return snap.exists() ? snap.data().score : null;
    } catch (error) {
      console.error(`[FirestoreService] Error getting user rating for ${userId}:`, error);
      return null;
    }
  },

  setUserRating: async (userId: string, animeId: string, score: number, metadata?: { title: string, posterPath: string }) => {
    try {
      const ratingRef = doc(db, 'users', userId, 'ratings', animeId);
      await setDoc(ratingRef, {
        score,
        ...(metadata || {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`[FirestoreService] Error setting user rating for ${userId}:`, error);
    }
  },

  getUserRatings: async (userId: string): Promise<any[]> => {
    const ratingsRef = collection(db, 'users', userId, 'ratings');
    const q = query(ratingsRef, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ animeId: doc.id, ...doc.data() }));
  },

  getAnimeLikeCount: async (animeId: string): Promise<number> => {
    // In a real production app, we'd use an aggregation counter or a separate collection
    // For now, let's keep it simple and just query the count if small, 
    // or use a mock/seed base + real likes as before but stored in firestore
    const likesRef = collection(db, 'likes');
    const q = query(likesRef, where('animeId', '==', animeId));
    const snap = await getDocs(q);

    const seed = animeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockBase = (seed % 450) + 50;
    return mockBase + snap.size;
  },

  toggleAnimeLike: async (userId: string, animeId: string): Promise<boolean> => {
    const likeId = `${userId}_${animeId}`;
    const likeRef = doc(db, 'likes', likeId);
    const snap = await getDoc(likeRef);

    if (snap.exists()) {
      await deleteDoc(likeRef);
      return false;
    } else {
      await setDoc(likeRef, { userId, animeId, createdAt: serverTimestamp() });
      return true;
    }
  },

  // --- Episode Tracking (Phase 2) ---
  getAnimeProgress: async (userId: string, animeId: string): Promise<AnimeProgress | null> => {
    try {
      const progressRef = doc(db, 'users', userId, 'progress', animeId);
      const snap = await getDoc(progressRef);
      if (snap.exists()) {
        return snap.data() as AnimeProgress;
      }
      return null;
    } catch (error) {
      console.error(`[FirestoreService] Error getting anime progress for ${userId}:`, error);
      return null;
    }
  },

  updateAnimeProgress: async (userId: string, progress: Partial<AnimeProgress> & { animeId: string }) => {
    try {
      const progressRef = doc(db, 'users', userId, 'progress', progress.animeId);
      await setDoc(progressRef, {
        ...progress,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(`[FirestoreService] Error updating anime progress for ${userId}:`, error);
    }
  },

  updateEpisodeWatched: async (userId: string, animeId: string, episodeNum: number, watched: boolean) => {
    try {
      const progressRef = doc(db, 'users', userId, 'progress', animeId);
      const field = `watchedEpisodes.${episodeNum}`;
      await updateDoc(progressRef, {
        [field]: watched,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error updating episode watched for ${userId}:`, error);
    }
  },

  getAllProgress: async (userId: string): Promise<AnimeProgress[]> => {
    try {
      const progressRef = collection(db, 'users', userId, 'progress');
      const q = query(progressRef, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as AnimeProgress);
    } catch (error) {
      console.error(`[FirestoreService] Error getting all progress for ${userId}:`, error);
      return [];
    }
  },

  // --- Push Notifications (Phase 2 & 3) ---
  setUserPushToken: async (userId: string, token: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error setting push token for ${userId}:`, error);
    }
  },

  // --- Recommendations ---
  getNotInterested: async (userId: string): Promise<string[]> => {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data().notInterested || [];
      }
      return [];
    } catch (error) {
      console.error(`[FirestoreService] Error getting not interested for ${userId}:`, error);
      return [];
    }
  },

  addToNotInterested: async (userId: string, mediaId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notInterested: arrayUnion(mediaId),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`[FirestoreService] Error adding to not interested for ${userId}:`, error);
    }
  }
};
