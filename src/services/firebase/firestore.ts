import firestore from '@react-native-firebase/firestore';
import { User, WatchlistItem } from '../../types';

const usersCollection = firestore().collection('users');

export const firestoreService = {
  createUserProfile: async (userId: string, data: Partial<User>) => {
    await usersCollection.doc(userId).set(data, { merge: true });
  },

  getUserProfile: async (userId: string): Promise<User | null> => {
    const doc = await usersCollection.doc(userId).get();
    const docExists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;
    if (docExists) {
      return { id: doc.id, ...doc.data() } as User;
    }
    return null;
  },

  getWatchlist: async (userId: string): Promise<WatchlistItem[]> => {
    const snapshot = await usersCollection.doc(userId).collection('watchlist').get();
    return snapshot.docs.map(doc => doc.data() as WatchlistItem);
  },

  addToWatchlist: async (userId: string, item: WatchlistItem) => {
    await usersCollection.doc(userId).collection('watchlist').doc(item.mediaId).set(item);
  },

  updateWatchlistStatus: async (userId: string, mediaId: string, status: string) => {
    await usersCollection.doc(userId).collection('watchlist').doc(mediaId).update({ status });
  },

  toggleFavorite: async (userId: string, mediaId: string, isFavorite: boolean) => {
    await usersCollection.doc(userId).collection('watchlist').doc(mediaId).update({ isFavorite });
  },

  removeFromWatchlist: async (userId: string, mediaId: string) => {
    await usersCollection.doc(userId).collection('watchlist').doc(mediaId).delete();
  },
};
