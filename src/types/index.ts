export interface Media {
  id: string;
  title: string;
  description: string;
  posterPath: string;
  backdropPath: string;
  rating: number;
  releaseYear: number;
  genres: string[];
  type: 'anime';
  duration?: string;
  episodes?: number;
  trailerUrl?: string;
  status?: string;
  popularity?: number;
  rank?: number;
  studio?: string;
  season?: string;
  score?: number;
}

export interface Character {
  id: string;
  name: string;
  imageUrl: string;
  role: string;
  voiceActor?: {
    name: string;
    imageUrl: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  watchStats?: {
    animeCount: number;
    totalHours: number;
  };
  favoriteGenres: string[];
}

export type WatchStatus = 'watching' | 'completed' | 'plan-to-watch' | 'dropped';

export interface WatchlistItem {
  mediaId: string;
  addedAt: string;
  status: WatchStatus;
  isFavorite: boolean;
  // Cached media data for fast rendering
  title: string;
  posterPath: string;
  rating: number;
  genres: string[];
}
