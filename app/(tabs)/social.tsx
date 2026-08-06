import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Platform,
    Dimensions,
    ActivityIndicator,
    Modal,
    ScrollView,
    Alert,
    TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, updateDoc, onSnapshot, orderBy, limit, collectionGroup, startAfter } from 'firebase/firestore';
import { db } from '../../src/services/firebase/config';

import { colors, spacing, borderRadius } from '../../src/theme';
import {
    GlassHeader,
    HEADER_HEIGHT,
    AuthPromptModal
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { CommunityPost, TrendingTag } from '../../src/types';
import { SwipeableTabs } from '../../src/components/layout/SwipeableTabs';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { UserSearchCard } from '../../src/components/features/community/UserSearchCard';
import { firestoreService } from '../../src/services/firebase/firestore';
import { PostComposer } from '../../src/components/features/community/PostComposer';
import { ActivityFeedCard } from '../../src/components/community/ActivityFeedCard';
import { useAppStore } from '../../src/store/useAppStore';
import { getHeaderContentTopOffset } from '../../src/utils/layout';

const { width } = Dimensions.get('window');

const TABS = ['For You', 'Friend Activity', 'Discussions', 'Questions', 'Fun', 'News', 'Reviews', 'Recommendations'];

interface SocialTabFeedProps {
    tabName: string;
    currentActiveTab: string;
    user: any;
    watchlist: any[];
    getFavoriteGenres: () => string[];
    handleAuthRequired: () => void;
    handleProfilePress: (id: string) => void;
    handleAnimePress: (id: string) => void;
    onDiscoverUsers: () => void;
}

const SocialTabFeed: React.FC<SocialTabFeedProps> = React.memo(({
    tabName,
    currentActiveTab,
    user,
    watchlist,
    getFavoriteGenres,
    handleAuthRequired,
    handleProfilePress,
    handleAnimePress,
    onDiscoverUsers
}) => {
    const theme = useThemeColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [limitCount] = useState(15);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!hasLoaded && tabName === currentActiveTab && !isLoading) {
            setHasLoaded(true);
            fetchFeed(false);
        }
    }, [currentActiveTab, hasLoaded, tabName]);

    const fetchFeed = async (isLoadMore = false) => {
        if (!isLoadMore) {
            setIsLoading(true);
        }

        try {
            const postsRef = collection(db, 'posts');
            let q;

            const TAB_TO_CATEGORY: Record<string, string> = {
                'Discussions': 'discussion',
                'Questions': 'question',
                'Fun': 'fun',
                'News': 'news',
                'Reviews': 'review',
                'Recommendations': 'recommendation',
            };

            const timeoutPromise = new Promise<any>((_, reject) => {
                setTimeout(() => reject(new Error("Social feed fetching timed out.")), 8000);
            });

            let finalPosts: any[] = [];
            let newCursors: any = { ...(lastVisible || {}) };
            let hasMoreLocal = false;

            if (tabName === 'For You') {
                const followingIds = user?.id ? await firestoreService.getUserFollowing(user.id) : [];

                const qTrending = newCursors.trending
                    ? query(postsRef, orderBy('engagementScore', 'desc'), startAfter(newCursors.trending), limit(8))
                    : query(postsRef, orderBy('engagementScore', 'desc'), limit(8));

                const qRecent = newCursors.recent
                    ? query(postsRef, orderBy('createdAt', 'desc'), startAfter(newCursors.recent), limit(8))
                    : query(postsRef, orderBy('createdAt', 'desc'), limit(8));

                let qFollowing = null;
                if (followingIds.length > 0) {
                    const chunkedFollows = followingIds.slice(0, 30);
                    qFollowing = newCursors.following
                        ? query(postsRef, where('userId', 'in', chunkedFollows), orderBy('createdAt', 'desc'), startAfter(newCursors.following), limit(5))
                        : query(postsRef, where('userId', 'in', chunkedFollows), orderBy('createdAt', 'desc'), limit(5));
                }

                const promises = [
                    Promise.race([getDocs(qTrending), timeoutPromise]).catch(() => ({ docs: [] })),
                    Promise.race([getDocs(qRecent), timeoutPromise]).catch(() => ({ docs: [] }))
                ];
                if (qFollowing) {
                    const chunkedFollows = followingIds.slice(0, 30);
                    const fallbackQ = query(postsRef, where('userId', 'in', chunkedFollows), limit(15));
                    const followingPromise = Promise.race([getDocs(qFollowing), timeoutPromise]).catch((e) => {
                        if (String(e).includes('index') || String(e).includes('failed-precondition')) {
                            return Promise.race([getDocs(fallbackQ), timeoutPromise]).then(snap => {
                                let docs = snap.docs;
                                docs.sort((a: any, b: any) => (b.data().createdAt?.toMillis?.() || Date.now()) - (a.data().createdAt?.toMillis?.() || Date.now()));
                                return { docs: docs.slice(0, 5) };
                            });
                        }
                        return { docs: [] };
                    }).catch(() => ({ docs: [] }));
                    promises.push(followingPromise);
                }

                const results = await Promise.all(promises);

                const trendingDocs = results[0].docs;
                const recentDocs = results[1].docs;
                const followingDocs = qFollowing ? results[2].docs : [];

                if (trendingDocs.length > 0) newCursors.trending = trendingDocs[trendingDocs.length - 1];
                if (recentDocs.length > 0) newCursors.recent = recentDocs[recentDocs.length - 1];
                if (followingDocs.length > 0) newCursors.following = followingDocs[followingDocs.length - 1];

                const allDocs = [...trendingDocs, ...recentDocs, ...followingDocs];

                const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.id, item])).values());
                hasMoreLocal = trendingDocs.length === 8 || recentDocs.length === 8 || followingDocs.length === 5;

                const fetched = uniqueDocs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

                const favGenres = getFavoriteGenres() || [];
                const userWatchlist = watchlist || [];

                finalPosts = fetched.map(post => {
                    let score = 0;
                    const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt || Date.now());
                    const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
                    score += Math.max(0, 10 - hoursOld * 0.2);

                    score += (post.likes || 0) * 2 + (post.comments || 0) * 3 + (post.shares || 0) * 5;

                    if (user) {
                        if (post.userId && followingIds.includes(post.userId)) score += 5;

                        if (post.animeId) {
                            const wEntry = userWatchlist.find(i => String(i.mediaId) === String(post.animeId));
                            if (wEntry) {
                                score += 15;
                                if (wEntry.status === 'watching') score += 10;
                                if (wEntry.isFavorite) score += 15;
                            }
                        }
                        if (post.hashtags && post.hashtags.length > 0) {
                            const matching = post.hashtags.filter((t: string) => favGenres.some((fg: string) => fg.toLowerCase() === t.toLowerCase()));
                            score += matching.length * 5;
                        }
                    }
                    score += Math.random() * 5;
                    return { ...post, category: post.category || 'discussion', recommendationScore: score };
                });

                let prevUserId: string | null = null;
                let consecutiveCount = 0;
                finalPosts = finalPosts.sort((a, b) => b.recommendationScore - a.recommendationScore).map(post => {
                    if (post.userId === prevUserId) {
                        consecutiveCount++;
                        post.recommendationScore -= (consecutiveCount * 15);
                    } else {
                        consecutiveCount = 0;
                        prevUserId = post.userId;
                    }
                    return post;
                }).sort((a, b) => b.recommendationScore - a.recommendationScore); // Resort after penalties

            } else if (tabName === 'Friend Activity') {
                const mutualIds = await firestoreService.getMutualFriends(user?.id || '');
                if (mutualIds.length === 0) {
                    setPosts([]);
                    setHasMore(false);
                    setIsLoading(false);
                    setRefreshing(false);
                    return;
                }
                const chunkedIds = mutualIds.slice(0, 30);

                let qFriend = newCursors.friend
                    ? query(postsRef, where('userId', 'in', chunkedIds), orderBy('createdAt', 'desc'), startAfter(newCursors.friend), limit(limitCount))
                    : query(postsRef, where('userId', 'in', chunkedIds), orderBy('createdAt', 'desc'), limit(limitCount));

                let snapshotDocs: any[] = [];
                try {
                    const snap = await Promise.race([getDocs(qFriend), timeoutPromise]);
                    snapshotDocs = snap.docs;
                } catch (e: any) {
                    if (String(e).includes('index') || String(e).includes('failed-precondition')) {
                        const fallbackQ = query(postsRef, where('userId', 'in', chunkedIds), limit(limitCount * 2));
                        const snap = await Promise.race([getDocs(fallbackQ), timeoutPromise]);
                        snapshotDocs = snap.docs;
                        snapshotDocs.sort((a: any, b: any) => (b.data().createdAt?.toMillis?.() || Date.now()) - (a.data().createdAt?.toMillis?.() || Date.now()));
                        snapshotDocs = snapshotDocs.slice(0, limitCount);
                    } else {
                        throw e;
                    }
                }

                if (snapshotDocs.length > 0) newCursors.friend = snapshotDocs[snapshotDocs.length - 1];

                const fetched = snapshotDocs.map((doc: any) => ({ id: doc.id, ...doc.data(), category: doc.data().category || 'discussion' }));
                finalPosts = fetched;
                hasMoreLocal = snapshotDocs.length >= limitCount;

            } else {
                const cat = TAB_TO_CATEGORY[tabName];
                if (cat) {
                    q = query(postsRef, where('category', '==', cat), orderBy('createdAt', 'desc'), limit(limitCount));
                    if (isLoadMore && newCursors?.default) {
                        q = query(postsRef, where('category', '==', cat), orderBy('createdAt', 'desc'), startAfter(newCursors.default), limit(limitCount));
                    }
                } else {
                    q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
                    if (isLoadMore && newCursors?.default) {
                        q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(newCursors.default), limit(limitCount));
                    }
                }
                let snapshot = await Promise.race([getDocs(q), timeoutPromise]);
                if (snapshot.docs.length > 0) newCursors.default = snapshot.docs[snapshot.docs.length - 1];
                finalPosts = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), category: doc.data().category || 'discussion' }));
                hasMoreLocal = snapshot.docs.length >= limitCount;
            }

            if (isLoadMore) {
                const existingIds = new Set(posts.map(p => p.id));
                finalPosts = finalPosts.filter(p => !existingIds.has(p.id));
            }

            let resolvedFinalPosts = finalPosts.map(p => ({ ...p, isLiked: false, isSaved: false }));

            if (isLoadMore) {
                setPosts(prev => [...prev, ...resolvedFinalPosts]);
            } else {
                setPosts(resolvedFinalPosts);
                setIsOffline(false);
                const CACHE_KEY = `feed_cache_${tabName}_${user?.id || 'guest'}`;
                AsyncStorage.setItem(CACHE_KEY, JSON.stringify(resolvedFinalPosts)).catch(() => { });
            }

            setLastVisible(newCursors);
            setHasMore(hasMoreLocal);
            setIsLoading(false);
            setRefreshing(false);

            if (user && finalPosts.length > 0) {
                try {
                    const [resolvedLikes, resolvedSaves] = await Promise.all([
                        firestoreService.resolveLikesForPosts(user.id, finalPosts),
                        firestoreService.resolveSavesForPosts(user.id, finalPosts)
                    ]);
                    const fullyResolved = finalPosts.map(post => {
                        const likeObj = resolvedLikes.find(p => p.id === post.id);
                        const saveObj = resolvedSaves.find(p => p.id === post.id);
                        return {
                            ...post,
                            isLiked: likeObj ? likeObj.isLiked : false,
                            isSaved: saveObj ? saveObj.isSaved : false
                        };
                    });
                    setPosts(prev => prev.map(p => {
                        const r = fullyResolved.find(f => f.id === p.id);
                        return r ? { ...p, isLiked: r.isLiked, isSaved: r.isSaved } : p;
                    }));
                } catch (backgroundErr) {
                    console.warn('[Feed Fetch Background Resolution] error:', backgroundErr);
                }
            }
        } catch (error) {
            console.error('[Feed Fetch] error:', error);
            if (!isLoadMore && posts.length > 0) {
                setIsOffline(true);
            } else if (!isLoadMore) {
                setPosts([]);
            }
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setLastVisible(null);
        fetchFeed(false);
    };

    const onLoadMore = () => {
        if (hasMore && !isLoading) {
            fetchFeed(true);
        }
    };

    return (
        <>
            {isOffline && (
                <View style={{ backgroundColor: theme.primary + '20', padding: 8, marginHorizontal: spacing.M, marginTop: spacing.S, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>Showing cached posts. Reconnecting...</Text>
                </View>
            )}
            <FlashList<CommunityPost>
                {...{ estimatedItemSize: 200 } as any}
                data={posts}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    if ('timestamp' in item && 'type' in item && ['rated', 'reviewed', 'favorited', 'added', 'follow', 'watched'].includes(item.type as string)) {
                        return <ActivityFeedCard activity={item as any} onPressProfile={handleProfilePress} onPressAnime={handleAnimePress} />;
                    }
                    return (
                        <CommunityPostCard
                            post={item as any}
                            onPress={() => router.push(`/post/${item.id}`)}
                            onAuthRequired={handleAuthRequired}
                            onPressProfile={handleProfilePress}
                            onPostUpdated={(updatedPost) => {
                                setPosts((prev) =>
                                    prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
                                );
                            }}
                            onPostDeleted={(postId) => {
                                setPosts((prev) => prev.filter((p) => p.id !== postId));
                            }}
                        />
                    );
                }}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingTop: spacing.M }
                ]}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                        progressViewOffset={10}
                    />
                }
                ListEmptyComponent={
                    isLoading && !refreshing ? (
                        <View style={styles.emptyContainer}>
                            <ActivityIndicator color={theme.primary} size="large" />
                        </View>
                    ) : tabName === 'Friend Activity' ? (
                        <View style={styles.emptyContainer}>
                            <Feather name="users" size={60} color={theme.primary} style={{ opacity: 0.8, marginBottom: 16 }} />
                            <Text style={[styles.emptyText, { color: theme.text, fontSize: 18, fontWeight: '700', opacity: 1, marginBottom: 8 }]}>
                                No activity from friends yet
                            </Text>
                            <Text style={[styles.emptyText, { color: theme.textDim, marginBottom: 24, marginTop: 0 }]}>
                                Mutual followers' posts will appear here. Find people to follow and build your community!
                            </Text>
                            <TouchableOpacity
                                style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
                                onPress={onDiscoverUsers}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Discover Users</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Feather name="coffee" size={48} color={theme.textDim} />
                            <Text style={[styles.emptyText, { color: theme.textDim }]}>
                                No discussions yet. Start one!
                            </Text>
                        </View>
                    )
                }
                ListFooterComponent={
                    isLoading && posts.length > 0 ? (
                        <ActivityIndicator style={{ paddingVertical: 20 }} color={theme.primary} />
                    ) : <View style={{ height: 100 + Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0) }} />
                }
            />
        </>
    );
});

export default function SocialScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);
    const watchlist = useAppStore(state => state.watchlist);
    const getFavoriteGenres = useAppStore(state => state.getFavoriteGenres);
    const setModalActive = useAppStore(state => state.setModalActive);

    const [activeTab, setActiveTab] = useState<string>('For You');
    const [showSearchView, setShowSearchView] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [authModalVisible, setAuthModalVisible] = useState(false);

    // Search specific state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleAuthGuard = useCallback(() => {
        if (!user) {
            setAuthModalVisible(true);
            return false;
        }
        return true;
    }, [user]);

    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, 'notifications'),
                where('recipientId', '==', user.id),
                where('read', '==', false)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                setUnreadCount(snapshot.size);
            });

            return () => unsubscribe();
        }
    }, [user]);

    useEffect(() => {
        if (!showSearchView) return;

        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                const res = await firestoreService.searchUsers(searchQuery);
                setSearchResults(res);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, showSearchView]);

    const handleAuthRequired = useCallback(() => {
        setAuthModalVisible(true);
    }, []);

    const handleProfilePress = useCallback((id: string) => {
        router.push(`/user/${id}`);
    }, [router]);

    const handleAnimePress = useCallback((id: string) => {
        router.push(`/details/${id}`);
    }, [router]);

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
            <GlassHeader
                title="Community"
                showLogo={false}
                leftComponent={
                    <TouchableOpacity style={[styles.headerBtn, { marginLeft: 8 }]} onPress={() => setShowSearchView(!showSearchView)}>
                        <Feather name={showSearchView ? "arrow-left" : "search"} color={theme.text} size={22} />
                    </TouchableOpacity>
                }
                rightComponent={
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => {
                            if (!handleAuthGuard()) return;
                            router.push('/notifications');
                        }}>
                            <Feather name="bell" color={theme.text} size={22} />
                            {unreadCount > 0 && <View style={[styles.badge, { backgroundColor: theme.primary }]} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => {
                            if (!handleAuthGuard()) return;
                            router.push('/create-post');
                        }}>
                            <Feather name="plus-circle" color={theme.primary} size={24} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {!showSearchView && (
                <View style={{ flex: 1, paddingTop: getHeaderContentTopOffset(insets) }}>
                    <SwipeableTabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    >
                        {TABS.map((tab) => (
                            <SocialTabFeed
                                key={tab}
                                tabName={tab}
                                currentActiveTab={activeTab}
                                user={user}
                                watchlist={watchlist}
                                getFavoriteGenres={getFavoriteGenres}
                                handleAuthRequired={handleAuthRequired}
                                handleProfilePress={handleProfilePress}
                                handleAnimePress={handleAnimePress}
                                onDiscoverUsers={() => setShowSearchView(true)}
                            />
                        ))}
                    </SwipeableTabs>
                </View>
            )}

            {showSearchView && (
                <View style={[styles.listContent, { paddingTop: getHeaderContentTopOffset(insets, 20), flex: 1 }]}>
                    <View style={[styles.searchBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <Feather name="search" size={20} color={theme.textDim} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder="Search by username..."
                            placeholderTextColor={theme.textDim}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Feather name="x-circle" size={18} color={theme.textDim} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isSearching ? (
                        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
                    ) : (
                        <FlashList<any>
                            {...{ estimatedItemSize: 80 } as any}
                            data={searchResults}
                            decelerationRate="fast"
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <UserSearchCard user={item} onAuthRequired={() => setAuthModalVisible(true)} />
                            )}
                            keyExtractor={(item) => item.id || item.username}
                            ListEmptyComponent={
                                searchQuery.length >= 2 ? (
                                    <View style={styles.emptyContainer}>
                                        <Feather name="users" size={48} color={theme.textDim} />
                                        <Text style={[styles.emptyText, { color: theme.textDim }]}>No users found.</Text>
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary, bottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0) + 20 }]}
                onPress={() => {
                    if (!handleAuthGuard()) return;
                    router.push('/create-post');
                }}
            >
                <Feather name="plus" size={28} color="#fff" />
            </TouchableOpacity>

            <AuthPromptModal
                visible={authModalVisible}
                onClose={() => setAuthModalVisible(false)}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#000',
    },
    tabContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 90,
    },
    feedContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: spacing.M,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.M,
        height: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.M,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.S,
        fontSize: 16,
        fontWeight: '500',
    },
    trendingSection: {
        marginTop: spacing.S,
        marginBottom: spacing.L,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.XS,
        marginBottom: spacing.S,
        marginLeft: spacing.XXS,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    trendingScrollWrapper: {
        marginHorizontal: -spacing.M,
    },
    trendingScroll: {
        paddingHorizontal: spacing.M,
        gap: spacing.S,
    },
    trendingTag: {
        paddingHorizontal: spacing.S,
        paddingVertical: spacing.XS,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.XS,
    },
    tagCountBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '800',
    },
    tagCount: {
        fontSize: 10,
        fontWeight: '900',
    },
    emptyContainer: {
        padding: spacing.XXL,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.XXL,
    },
    emptyText: {
        marginTop: spacing.M,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.6,
    },
    fab: {
        position: 'absolute',
        right: spacing.L,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 100,
    }
});
