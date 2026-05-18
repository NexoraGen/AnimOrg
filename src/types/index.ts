export interface Media {
  id: string;
  title: string;
  description: string;
  posterPath: string;
  backdropPath: string;
  rating?: number;
  releaseYear?: number;
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
  source?: string;
  rating_count?: number;
  airing_start?: string;
  synopsis_full?: string;
  durationMinutes?: number;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
  trailerData?: {
    url?: string;
    youtubeId?: string;
    embedUrl?: string;
  };
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  aired?: string;
  synopsis?: string;
  filler?: boolean;
  recap?: boolean;
}

export interface AnimeRelation {
  relation: string;
  entry: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
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
  bannerUrl?: string;
  watchStats?: {
    animeCount: number;
    totalHours: number;
  };
  favoriteGenres: string[];
  joinedAt?: string;
  bio?: string;
  totalReviews?: number;
  followersCount?: number;
  followingCount?: number;
  hasCompletedOnboarding?: boolean;
  usernameClaimed?: boolean;
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
  backdropPath?: string;
  rating?: number;
  genres: string[];
  episodes?: number;
  durationMinutes?: number;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
  airing_start?: string;
  mediaStatus?: string;
}

export interface Review {
  id: string;
  animeId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  rating: number;
  text: string;
  createdAt: string;
  likes: number; // For helpfulCount
  isSpoiler?: boolean;
}

export interface Comment {
  id: string;
  animeId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
}

export interface WatchHistoryEntry {
  animeId: string;
  title: string;
  posterPath: string;
  lastViewedAt: string;
  episodeProgress?: number;
  totalEpisodes?: number;
  lastWatchedSeason?: number;
  lastWatchedEpisode?: number;
}

export interface AnimeProgress {
  animeId: string;
  lastWatchedEpisode: number;
  lastWatchedSeason: number;
  watchedEpisodes: Record<string, boolean>; // map of "episodeNum": true
  status: WatchStatus;
  updatedAt: string;
}

export interface UserRating {
  animeId: string;
  title: string;
  posterPath: string;
  score: number;
  ratedAt: string;
}

export interface ActivityFeedItem {
  id: string;
  type: 'rated' | 'reviewed' | 'favorited' | 'added' | 'follow';
  animeId?: string;
  animeTitle?: string;
  animePoster?: string;
  targetId?: string; // For follow events
  timestamp: string;
  detail?: string;
}

export type PostType = 'discussion' | 'news' | 'poll';

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  type: PostType;
  category: 'Discussion' | 'Meme' | 'News' | 'Theory' | 'Recommendation' | 'Hot Take' | 'Question';
  content: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  engagementScore?: number; // For trending algorithm
  isLiked?: boolean;
  isSaved?: boolean;
  isSpoiler?: boolean;
  createdAt: any; // Using Firestore Timestamp
  animeId?: string;
  animeTitle?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  likes: number;
  isLiked?: boolean;
  parentId?: string; // For threaded replies
  depth?: number; // For UI padding
  replyCount?: number;
  createdAt: any;
}

export interface CommunityNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention';
  targetId: string; // postId or commentId
  targetPreview?: string; // snippet of content
  read: boolean;
  createdAt: any;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: any;
}

export interface TrendingTag {
  tag: string;
  count: number;
  lastUsed: any;
}

export interface PostLike {
  userId: string;
  postId: string;
  createdAt: any;
}

export interface PostFollow {
  followerId: string;
  followingId: string;
  createdAt: any;
}
