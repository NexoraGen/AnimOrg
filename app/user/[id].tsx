import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, spacing, borderRadius } from '../../src/theme';
import { GlassHeader, Button, HEADER_HEIGHT, AuthModal, ProfileStatsStrip } from '../../src/components/ui';
import { getSafeTopInset } from '../../src/utils/layout';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { firestoreService } from '../../src/services/firebase/firestore';
import { CommunityPost } from '../../src/types';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { FeedTabs } from '../../src/components/features/community/FeedTabs';
import { getAvatarSource } from '../../src/constants/avatars';
import { FollowButton } from '../../src/components/ui/FollowButton';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase/config'; // assuming standard firestore reference import

import { SwipeableTabs } from '../../src/components/layout/SwipeableTabs';

const { width } = Dimensions.get('window');

const TABS = ['Posts', 'Anime Stats'];

interface UserPostsTabProps {
    userId: string;
    userPosts: CommunityPost[];
    theme: any;
    setAuthModalVisible: (v: boolean) => void;
    setUserPosts: React.Dispatch<React.SetStateAction<CommunityPost[]>>;
    postsLoading?: boolean;
}

const UserPostsTab: React.FC<UserPostsTabProps> = ({
    userId,
    userPosts,
    theme,
    setAuthModalVisible,
    setUserPosts,
    postsLoading
}) => {
    if (postsLoading && userPosts.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }

    if (userPosts.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Feather name="message-square" size={48} color={theme.textDim} />
                <Text style={[styles.emptyText, { color: theme.textDim }]}>No posts yet.</Text>
            </View>
        );
    }

    return (
        <FlashList<CommunityPost>
            {...{ estimatedItemSize: 200 } as any}
            data={userPosts}
            renderItem={({ item }) => (
                <CommunityPostCard
                    post={item}
                    onAuthRequired={() => setAuthModalVisible(true)}
                    onPostUpdated={(updatedPost) => {
                        setUserPosts((prev) =>
                            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
                        );
                    }}
                    onPostDeleted={(postId) => {
                        setUserPosts((prev) => prev.filter((p) => p.id !== postId));
                    }}
                />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
    );
};

interface UserStatsTabProps {
    stats: any;
    profile: any;
    theme: any;
}

const UserStatsTab: React.FC<UserStatsTabProps> = ({
    stats,
    profile,
    theme
}) => {
    return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.md }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Anime Journey</Text>
            <View style={styles.statsGrid}>
                {[
                    { label: 'Completed', val: stats.totalWatched },
                    { label: 'Watching', val: stats.currentlyWatching },
                    { label: 'Episodes', val: stats.totalEpisodes },
                ].map((stat, i) => (
                    <View key={i} style={[styles.statBox, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.statVal, { color: theme.text }]}>{stat.val}</Text>
                        <Text style={[styles.statLab, { color: theme.textDim }]}>{stat.label}</Text>
                    </View>
                ))}
            </View>
            {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Genres</Text>
                    <View style={styles.genreList}>
                        {profile.favoriteGenres.map((genre: string) => (
                            <View key={genre} style={[styles.genreItem, { backgroundColor: theme.surfaceVariant }]}>
                                <Text style={[styles.genreText, { color: theme.text }]}>{genre}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const { user: currentUser } = useAppStore();

    const [userData, setUserData] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('Posts');
    const [authModalVisible, setAuthModalVisible] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const dataPromise = firestoreService.getUserPublicData(id);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Profile fetching timed out.")), 8000);
            });
            const data = await Promise.race([dataPromise, timeoutPromise]) as any;
            setUserData(data);
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    const loadPosts = useCallback(async () => {
        try {
            setPostsLoading(true);
            const postsObj = await firestoreService.getCommunityFeed({ userId: id });
            if (postsObj) setUserPosts(postsObj.posts);
        } catch (error) {
            console.error("Failed to fetch user posts:", error);
        } finally {
            setPostsLoading(false);
        }
    }, [id]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadProfile();
        loadPosts();
    }, [loadProfile, loadPosts]);

    useEffect(() => {
        loadProfile();
        loadPosts();
    }, [loadProfile, loadPosts]);

    // Realtime Listener for Profile Counts
    useEffect(() => {
        if (!id) return;
        const userRef = doc(db, 'users', id);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const liveData = docSnap.data();
                setUserData((prev: any) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        profile: {
                            ...prev.profile,
                            ...liveData
                        }
                    };
                });
            }
        });
        return () => unsubscribe();
    }, [id]);


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.primary} size="large" />
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text }}>User not found</Text>
                <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
            </View>
        );
    }

    const { profile, stats } = userData;

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
            <GlassHeader
                title={profile.username || 'Profile'}
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color={theme.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingTop: getSafeTopInset(insets) + HEADER_HEIGHT }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} progressViewOffset={getSafeTopInset(insets) + HEADER_HEIGHT} />}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerWrapper}>
                    <View style={styles.bannerContainer}>
                        <Image
                            source={require('../../assets/anime-banner.png')}
                            style={styles.bannerImage}
                            contentFit="cover"
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.96)', theme.background]}
                            locations={[0, 0.35, 0.7, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>

                    <View style={styles.profileInfoContainer}>
                        <View style={styles.topProfileBar}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={getAvatarSource(profile.avatarUrl)}
                                    style={[styles.avatar, { borderColor: theme.surface }]}
                                    contentFit="cover"
                                />
                            </View>

                            {currentUser?.id !== id && (
                                <FollowButton
                                    userId={id}
                                    onAuthRequired={() => setAuthModalVisible(true)}
                                    style={styles.followPill}
                                    textStyle={styles.followText}
                                />
                            )}
                        </View>

                        <View style={styles.identityContainer}>
                            <Text style={[styles.displayName, { color: theme.text }]}>{profile.username || 'Anime Enthusiast'}</Text>
                            <Text style={[styles.usernameHandle, { color: theme.primary }]}>@{profile.username?.toLowerCase() || 'enthusiast'}</Text>
                        </View>

                        {profile.bio && (
                            <Text style={[styles.bio, { color: theme.textDim }]}>{profile.bio}</Text>
                        )}

                        <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.sm }}>
                            <ProfileStatsStrip
                                followingCount={profile.followingCount || 0}
                                followersCount={profile.followersCount || 0}
                                postsCount={userPosts.length || 0}
                                onFollowingPress={() => router.push(`/social/${id}?tab=following`)}
                                onFollowersPress={() => router.push(`/social/${id}?tab=followers`)}
                            />
                        </View>
                    </View>
                </View>

                <View style={{ flex: 1, minHeight: 450 }}>
                    <SwipeableTabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    >
                        <UserPostsTab
                            userId={id}
                            userPosts={userPosts}
                            theme={theme}
                            setAuthModalVisible={setAuthModalVisible}
                            setUserPosts={setUserPosts}
                            postsLoading={postsLoading}
                        />
                        <UserStatsTab
                            stats={stats}
                            profile={profile}
                            theme={theme}
                        />
                    </SwipeableTabs>
                </View>
            </ScrollView>

            <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtn: { padding: 8, marginLeft: spacing.xs },
    listContent: { paddingHorizontal: 0 },
    headerWrapper: { marginBottom: spacing.md },
    bannerContainer: {
        width: '100%',
        height: 180,
        position: 'absolute',
        top: 0,
        zIndex: 0,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        opacity: 0.5,
    },
    profileInfoContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: 120, // push down over banner
        zIndex: 1,
    },
    topProfileBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.md,
    },
    avatarContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#000',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
        borderWidth: 3,
    },
    followPill: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    followText: {
        fontSize: 15,
        fontWeight: '800',
    },
    identityContainer: {
        marginBottom: spacing.sm,
    },
    displayName: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 2,
    },
    usernameHandle: {
        fontSize: 15,
        fontWeight: '600',
    },
    bio: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginBottom: spacing.xl,
    },
    statMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 14,
    },
    tabWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: spacing.md,
    },
    animeStatsContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    statBox: {
        flex: 1,
        marginHorizontal: 4,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statVal: {
        fontSize: 20,
        fontWeight: '900',
    },
    statLab: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.8,
    },
    section: { marginBottom: spacing.xl },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: spacing.md,
        letterSpacing: 0.5,
    },
    genreList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    genreItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    genreText: { fontSize: 13, fontWeight: '700' },
    emptyContainer: {
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: { marginTop: spacing.md, fontSize: 15, opacity: 0.6 }
});
