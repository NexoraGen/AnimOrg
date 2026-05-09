import { create } from 'zustand';
import { User, WatchlistItem, Media } from '../types';
import { firebaseAuthService } from '../services/firebase/auth';
import { firestoreService } from '../services/firebase/firestore';

interface AppState {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  setUser: (user: User | null) => void;
  initializeAuth: () => () => void;
  
  // Watchlist State
  watchlist: WatchlistItem[];
  setWatchlist: (watchlist: WatchlistItem[]) => void;
  addToWatchlist: (media: Media, status?: WatchlistItem['status']) => Promise<void>;
  removeFromWatchlist: (mediaId: string) => Promise<void>;
  updateWatchlistStatus: (mediaId: string, status: WatchlistItem['status']) => Promise<void>;
  toggleFavorite: (mediaId: string) => Promise<void>;
  
  // UI State
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth Initial State
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  initializeAuth: () => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProfile = await firestoreService.getUserProfile(firebaseUser.uid);
          if (userProfile) {
            set({ user: userProfile, isAuthenticated: true, isLoadingAuth: false });
            
            // Fetch Watchlist
            const watchlist = await firestoreService.getWatchlist(firebaseUser.uid);
            set({ watchlist });
          } else {
            set({ user: null, isAuthenticated: false, isLoadingAuth: false });
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          set({ isLoadingAuth: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoadingAuth: false, watchlist: [] });
      }
    });
    return unsubscribe;
  },
  
  // Watchlist Initial State
  watchlist: [],
  setWatchlist: (watchlist) => set({ watchlist }),
  
  addToWatchlist: async (media, status = 'plan-to-watch') => {
    const { user, watchlist } = get();
    // Check if it already exists to prevent duplicates
    if (watchlist.some(item => item.mediaId === media.id)) return;

    const newItem: WatchlistItem = { 
      mediaId: media.id, 
      addedAt: new Date().toISOString(), 
      status,
      isFavorite: false,
      title: media.title,
      posterPath: media.posterPath,
      rating: media.rating || 0,
      genres: media.genres || []
    };
    
    // Optimistic UI update
    set({ watchlist: [...watchlist, newItem] });
    
    if (user) {
      try {
        await firestoreService.addToWatchlist(user.id, newItem);
      } catch (error) {
        console.error("Failed to add to watchlist:", error);
      }
    }
  },

  updateWatchlistStatus: async (mediaId, status) => {
    const { user, watchlist } = get();
    
    // Optimistic UI update
    set({ 
      watchlist: watchlist.map(item => 
        item.mediaId === mediaId ? { ...item, status } : item
      ) 
    });
    
    if (user) {
      try {
        await firestoreService.updateWatchlistStatus(user.id, mediaId, status);
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    }
  },

  toggleFavorite: async (mediaId) => {
    const { user, watchlist } = get();
    
    const existingItem = watchlist.find(item => item.mediaId === mediaId);
    if (!existingItem) return; // Must be in watchlist to favorite for now

    const newIsFavorite = !existingItem.isFavorite;

    // Optimistic UI update
    set({ 
      watchlist: watchlist.map(item => 
        item.mediaId === mediaId ? { ...item, isFavorite: newIsFavorite } : item
      ) 
    });
    
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
    
    // Optimistic UI update
    set({ watchlist: watchlist.filter(item => item.mediaId !== mediaId) });
    
    if (user) {
      try {
        await firestoreService.removeFromWatchlist(user.id, mediaId);
      } catch (error) {
        console.error("Failed to remove from watchlist:", error);
      }
    }
  },
  
  // UI Initial State
  theme: 'dark',
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'dark' ? 'light' : 'dark' 
  })),
}));
