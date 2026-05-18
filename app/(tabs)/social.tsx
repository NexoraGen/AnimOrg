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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase/config';

import { colors, spacing, borderRadius } from '../../src/theme';
import {
    GlassHeader,
    HEADER_HEIGHT,
    AuthModal
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { CommunityPost, TrendingTag } from '../../src/types';
import { FeedTabs } from '../../src/components/features/community/FeedTabs';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { UserSearchCard } from '../../src/components/features/community/UserSearchCard';
import { firestoreService } from '../../src/services/firebase/firestore';
import { PostComposer } from '../../src/components/features/community/PostComposer';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

const TABS = ['Trending', 'Following', 'Search Users', 'Latest', 'Memes', 'Discussions', 'News'];

export default function SocialScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const setModalActive = useAppStore(state => state.setModalActive);

    const [activeTab, setActiveTab] = useState('Trending');
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
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

    const fetchPosts = useCallback(async (refresh = false) => {
        if (isLoading || (posts.length > 0 && !refresh && !lastDoc)) return;

        setIsLoading(refresh ? false : true);
        if (refresh) setRefreshing(true);

        try {
            const result = await firestoreService.getCommunityFeed({
                category: activeTab,
                lastDoc: refresh ? null : lastDoc,
                pageSize: 10
            });

            if (refresh) {
                setPosts(result.posts);
            } else {
                setPosts(prev => [...prev, ...result.posts]);
            }
            setLastDoc(result.lastDoc);
        } catch (error) {
            console.error('[SocialScreen] Error fetching feed:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, lastDoc, isLoading, posts.length]);

    useEffect(() => {
        if (activeTab === 'Search Users') return;
        fetchPosts(true);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'Search Users') return;

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
    }, [searchQuery, activeTab]);

    const handleTabChange = (tab: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
    };

    const onRefresh = () => {
        loadTrending();
        fetchPosts(true);
    };

    const onLoadMore = () => {
        fetchPosts();
    };

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

            <View style={[styles.tabContainer, { top: insets.top + HEADER_HEIGHT }]}>
                <FeedTabs
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabPress={handleTabChange}
                />
            </View>

            <View style={styles.feedContainer}>
                {activeTab === 'Search Users' ? (
                    <View style={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT + 60, flex: 1 }]}>
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
                        ListHeaderComponent={activeTab === 'Trending' ? renderTrendingSection() : null}
                        renderItem={({ item }) => (
                            <CommunityPostCard post={item} onAuthRequired={() => setAuthModalVisible(true)} />
                        )}
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

            <AuthModal
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
