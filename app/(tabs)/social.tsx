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
import { FeedTabs } from '../../src/components/features/community/FeedTabs';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { UserSearchCard } from '../../src/components/features/community/UserSearchCard';
import { firestoreService } from '../../src/services/firebase/firestore';
import { PostComposer } from '../../src/components/features/community/PostComposer';
import { ActivityFeedCard } from '../../src/components/community/ActivityFeedCard';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

const TABS = ['For You', 'Friend Activity', 'Discussions', 'Questions', 'Fun', 'News', 'Reviews', 'Recommendations'];

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
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [limitCount] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
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

    const fetchFeed = async (isLoadMore = false) => {
        if (showSearchView) return;

        if (!isLoadMore) {
            setIsLoading(true);
            setPosts([]); // Clear immediately when switching tabs to prevent state bleeding
        }

        try {
            const postsRef = collection(db, 'posts');
            let q;

            // Map display tab names to Firestore category field values with strict lowercase
            const TAB_TO_CATEGORY: Record<string, string> = {
                'Discussions': 'discussion',
                'Questions': 'question',
                'Fun': 'fun',
                'News': 'news',
                'Reviews': 'review',
                'Recommendations': 'recommendation',
            };

            if (activeTab === 'For You') {
                // Fetch latest posts to score in-memory so the feed is never empty and personalizes dynamically
                q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount * 3));
                if (isLoadMore && lastVisible) {
                    q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(limitCount * 3));
                }
            } else if (activeTab === 'Friend Activity') {
                const followedIds = await firestoreService.getUserFollowing(user?.id || '');
                if (followedIds.length === 0) {
                    setPosts([]);
                    setHasMore(false);
                    return;
                }
                const chunkedIds = followedIds.slice(0, 10);
                const activitiesRef = collectionGroup(db, 'activities');
                q = query(activitiesRef, where('userId', 'in', chunkedIds), orderBy('timestamp', 'desc'), limit(limitCount));
                if (isLoadMore && lastVisible) {
                    q = query(activitiesRef, where('userId', 'in', chunkedIds), orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(limitCount));
                }
            } else if (TAB_TO_CATEGORY[activeTab]) {
                // Category-specific tabs — query only matching posts
                const cat = TAB_TO_CATEGORY[activeTab];
                q = query(postsRef, where('category', '==', cat), limit(limitCount));
                if (isLoadMore && lastVisible) {
                    q = query(postsRef, where('category', '==', cat), startAfter(lastVisible), limit(limitCount));
                }
            } else {
                // Fallback (Search Users is handled separately, should never reach here)
                q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
            }

            const snapshot = await getDocs(q);

            // Temporary debug logs
            const queryCategory = TAB_TO_CATEGORY[activeTab] || activeTab;
            console.log(`[DEBUG] Query Category: ${queryCategory} | Returned Posts Count: ${snapshot.docs.length}`);

            const fetchedPosts = snapshot.docs.map(doc => {
                const data = doc.data() as any;

                // Background migration for old posts without a category
                if (!data.category) {
                    updateDoc(doc.ref, { category: 'discussion' }).catch(e => console.warn('Migration update failed', e));
                    data.category = 'discussion';
                }

                console.log(`[DEBUG] Post ID: ${doc.id} | Category: ${data.category}`);

                return { id: doc.id, ...data };
            });

            if (activeTab === 'Friend Activity') {
                fetchedPosts.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            }

            let finalPosts = fetchedPosts;
            if (activeTab === 'For You') {
                const favGenres = getFavoriteGenres() || [];
                const userWatchlist = watchlist || [];

                const scored = fetchedPosts.map(post => {
                    let score = 0;

                    // 1. Recency Decay (Max 10 pts, decays over 48 hours)
                    const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt || Date.now());
                    const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
                    const recencyBoost = Math.max(0, 10 - hoursOld * 0.2);
                    score += recencyBoost;

                    // 2. Engagement Metrics
                    const engagement = (post.likes || 0) * 2 + (post.comments || 0) * 3 + (post.shares || 0) * 5;
                    score += engagement;

                    // 3. User Interest Personalization
                    if (user) {
                        // Tagged anime boost
                        if (post.animeId) {
                            const watchlistEntry = userWatchlist.find(item => String(item.mediaId) === String(post.animeId));
                            if (watchlistEntry) {
                                score += 15;
                                if (watchlistEntry.status === 'watching') score += 10;
                                if (watchlistEntry.isFavorite) score += 15;
                            }
                        }

                        // Genre affinity match on hashtags
                        if (post.hashtags && post.hashtags.length > 0) {
                            const matchingGenres = post.hashtags.filter((tag: string) =>
                                favGenres.some(fg => fg.toLowerCase() === tag.toLowerCase())
                            );
                            score += matchingGenres.length * 5;
                        }

                        // Tracked anime title mentioned in text
                        const contentLower = (post.content || '').toLowerCase();
                        userWatchlist.forEach(item => {
                            if (item.title && contentLower.includes(item.title.toLowerCase())) {
                                score += 8;
                            }
                        });
                    }

                    // 4. Randomization / freshness factor (0-5 pts) to prevent empty feel and add variety
                    score += Math.random() * 5;

                    return { ...post, recommendationScore: score };
                });

                // Sort by recommendationScore descending
                scored.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
                // Slice back to limitCount for standard page sizing
                finalPosts = scored.slice(0, limitCount);
            }

            if (isLoadMore) {
                setPosts(prev => [...prev, ...finalPosts]);
            } else {
                setPosts(finalPosts);
            }

            if (snapshot.docs.length > 0) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            }
            setHasMore(snapshot.docs.length >= limitCount);
        } catch (error) {
            console.error('[Feed Fetch] error:', error);
            if (!isLoadMore) setPosts([]); // Prevents state bleeding from previous tabs if query fails
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFeed(false);
    }, [activeTab, user]);

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

    const handleTabChange = useCallback((tab: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
        setHasMore(true);
        setLastVisible(null);
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setLastVisible(null);
        fetchFeed(false);
    }, [activeTab, user]);

    const onLoadMore = useCallback(() => {
        if (hasMore && !isLoading && !showSearchView) {
            fetchFeed(true);
        }
    }, [hasMore, isLoading, activeTab, user, lastVisible, showSearchView]);

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
                <View style={[styles.tabContainer, { top: insets.top + HEADER_HEIGHT }]}>
                    <FeedTabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onTabPress={handleTabChange}
                    />
                </View>
            )}

            <View style={styles.feedContainer}>
                {showSearchView ? (
                    <View style={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT + 20, flex: 1 }]}>
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
                ) : (
                    <FlashList<CommunityPost>
                        {...{ estimatedItemSize: 200 } as any}
                        data={posts}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={null}
                        renderItem={({ item }) => {
                            if (activeTab === 'Friend Activity' || ('timestamp' in item && 'type' in item && ['rated', 'reviewed', 'favorited', 'added', 'follow', 'watched'].includes(item.type as string))) {
                                return <ActivityFeedCard activity={item as any} onPressProfile={handleProfilePress} onPressAnime={handleAnimePress} />;
                            }
                            return (
                                <CommunityPostCard
                                    post={item as any}
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
                            { paddingTop: insets.top + HEADER_HEIGHT + 60 }
                        ]}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={theme.primary}
                                progressViewOffset={insets.top + HEADER_HEIGHT + 50}
                            />
                        }
                        ListEmptyComponent={
                            isLoading ? (
                                <View style={styles.emptyContainer}>
                                    <ActivityIndicator color={theme.primary} size="large" />
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
                            ) : <View style={{ height: 100 }} />
                        }
                    />
                )}
            </View>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 20 }]}
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
        paddingHorizontal: spacing.md,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        height: 48,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: 16,
        fontWeight: '500',
    },
    trendingSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        marginLeft: spacing.xs,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    trendingScrollWrapper: {
        marginHorizontal: -spacing.md,
    },
    trendingScroll: {
        paddingHorizontal: spacing.md,
        gap: 12,
    },
    trendingTag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.6,
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
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
