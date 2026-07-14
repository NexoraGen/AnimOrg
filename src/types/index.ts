export interface Media {
  id: string;
  title: string;
  description: string;
  posterPath: string;
  posterImageMedium?: string;
  backdropPath: string;
  rating?: number;
  releaseYear?: number;
  genres: string[];
  type: 'anime';
  format?: string;
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
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
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
  timezone?: string;
  timezoneLabel?: string;
  country?: string;
  timeFormat?: '12h' | '24h';

  // User progression
  xp?: number;
  level?: number;
  badges?: string[];
  lastLoginDate?: string;
  searchCountToday?: number;
  lastSearchDate?: string;
  detailsViewCountToday?: number;
  lastDetailsViewDate?: string;
  currentStreak?: number;
  longestStreak?: number;
  lastWatchDate?: string;
}

export type WatchStatus = 'watching' | 'completed' | 'plan-to-watch' | 'dropped' | 'awaiting';

export interface WatchlistItem {
  mediaId: string;
  addedAt: string;
  status: WatchStatus;
  isFavorite: boolean;
  // Cached media data for fast rendering
  title: string;
  posterPath: string;
  posterImageMedium?: string;
  backdropPath?: string;
  rating?: number;
  genres: string[];
  format?: string;
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
  type: 'rated' | 'reviewed' | 'favorited' | 'added' | 'follow' | 'watched';
  userId?: string;
  username?: string;
  userAvatar?: string;
  animeId?: string;
  animeTitle?: string;
  animePoster?: string;
  targetId?: string; // For follow events
  timestamp: string;
  detail?: string;
  score?: number;
  episode?: number;
}

export type PostType = 'discussion' | 'news' | 'poll' | 'versus' | 'episode_discussion';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface VersusEntity {
  id: string;
  title: string;
  imageUrl?: string;
  votes: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  type: PostType;
  category: 'Discussion' | 'Question' | 'Fun' | 'Recommendation' | 'News' | 'Review' | string;
  content: string;
  mediaUrl?: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  engagementScore?: number; // For trending algorithm
  isLiked?: boolean;
  isSaved?: boolean;

  hasSpoilers?: boolean;
  spoilerSeverity?: 'anime' | 'manga';

  // For polls
  pollOptions?: PollOption[];
  hasVotedPoll?: string;

  // For versus / anime wars
  versusLeft?: VersusEntity;
  versusRight?: VersusEntity;
  hasVotedVersus?: 'left' | 'right';

  // Episode Discussion Tracking
  episodeNumber?: number;

  createdAt: any; // Using Firestore Timestamp
  updatedAt?: any; // Using Firestore Timestamp
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

export interface NotificationCategorySettings {
  episodeReleases: boolean;
  continueWatching: boolean;
  recommendations: boolean;
  achievements: boolean;
  weeklySummary: boolean;
  news: boolean;
}
