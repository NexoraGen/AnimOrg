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

const TABS = ['For You', 'Friend Activity', 'Latest', 'Discussions', 'Questions', 'Fun', 'News', 'Reviews', 'Recommendations'];

export default function SocialScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const setModalActive = useAppStore(state => state.setModalActive);

    const [activeTab, setActiveTab] = useState('For You');
    const [showSearchView, setShowSearchView] = useState(false);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
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
        loadTrending();

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

    const loadTrending = async () => {
        const tags = await firestoreService.getTrendingHashtags();
        setTrendingTags(tags);
    };

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
                q = query(postsRef, orderBy('engagementScore', 'desc'), limit(limitCount));
                if (isLoadMore && lastVisible) {
                    q = query(postsRef, orderBy('engagementScore', 'desc'), startAfter(lastVisible), limit(limitCount));
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
            } else if (activeTab === 'Latest') {
                // All categories, newest first
                q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
                if (isLoadMore && lastVisible) {
                    q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(limitCount));
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

            if (isLoadMore) {
                setPosts(prev => [...prev, ...fetchedPosts]);
            } else {
                setPosts(fetchedPosts);
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
        loadTrending();
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

    const renderTrendingSection = () => (
        <View style={styles.trendingSection}>
            <View style={styles.sectionHeaderRow}>
                <Feather name="trending-up" size={12} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.textDim }]}>TRENDING DISCUSSIONS</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingScroll}
                style={styles.trendingScrollWrapper}
            >
                {trendingTags.map((tag) => (
                    <TouchableOpacity
                        key={tag.tag}
                        style={[styles.trendingTag, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}25` }]}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tagText, { color: theme.primary }]}>#{tag.tag}</Text>
                        <View style={[styles.tagCountBadge, { backgroundColor: `${theme.primary}20` }]}>
                            <Text style={[styles.tagCount, { color: theme.primary }]}>{tag.count}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
                {trendingTags.length === 0 && ['Naruto', 'OnePiece', 'JJK', 'Theory', 'AnimeSocial'].map(tag => (
                    <TouchableOpacity
                        key={tag}
                        style={[styles.trendingTag, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }]}
                    >
                        <Text style={[styles.tagText, { color: theme.textDim }]}>#{tag}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

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
                        ListHeaderComponent={activeTab === 'For You' ? renderTrendingSection() : null}
                        renderItem={({ item }) => {
                            if (activeTab === 'Friend Activity' || ('timestamp' in item && 'type' in item && ['rated', 'reviewed', 'favorited', 'added', 'follow', 'watched'].includes(item.type as string))) {
                                return <ActivityFeedCard activity={item as any} onPressProfile={handleProfilePress} onPressAnime={handleAnimePress} />;
                            }
                            return <CommunityPostCard post={item as any} onAuthRequired={handleAuthRequired} onPressProfile={handleProfilePress} />;
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
