import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { doc, getDoc } from 'firebase/firestore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { spacing, typography } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { firestoreService } from '../../src/services/firebase/firestore';
import { db } from '../../src/services/firebase/config';
import { User } from '../../src/types';
import { SocialUserRow, GlassHeader } from '../../src/components/ui';

export default function SocialHubScreen() {
    const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const currentUser = useAppStore(state => state.user);

    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab === 'following' ? 'following' : 'followers');
    const [searchQuery, setSearchQuery] = useState('');

    // Using independent caches so tabs can be toggled without reloading
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isMe = currentUser?.id === id || id === 'me';
    const targetUserId = isMe && currentUser ? currentUser.id : id;

    const fetchSocialData = useCallback(async () => {
        if (!targetUserId) return;
        setIsLoading(true);
        try {
            const followerIds = await firestoreService.getUserFollowers(targetUserId);
            const followingIds = await firestoreService.getUserFollowing(targetUserId);

            const fetchUsers = async (ids: string[]) => {
                const snaps = await Promise.all(ids.map(uid => getDoc(doc(db, 'users', uid))));
                return snaps.map(s => s.exists() ? ({ id: s.id, ...s.data() } as User) : null).filter(Boolean) as User[];
            };

            const [fetchedFollowers, fetchedFollowing] = await Promise.all([
                fetchUsers(followerIds),
                fetchUsers(followingIds)
            ]);

            setFollowers(fetchedFollowers);
            setFollowing(fetchedFollowing);
        } catch (error) {
            console.error('[SocialHub] Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => {
        fetchSocialData();
    }, [fetchSocialData]);

    const activeList = activeTab === 'followers' ? followers : following;

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return activeList;
        const q = searchQuery.toLowerCase();
        return activeList.filter(u =>
            (u.username && u.username.toLowerCase().includes(q)) ||
            (u.bio && u.bio.toLowerCase().includes(q))
        );
    }, [searchQuery, activeList]);

    const renderItem = useCallback(({ item }: { item: User }) => {
        return <SocialUserRow user={item} currentUserId={currentUser?.id} />;
    }, [currentUser?.id]);

    const renderHeader = () => (
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <Feather name="search" size={18} color={theme.textDim} style={styles.searchIcon} />
            <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={`Search ${activeTab}...`}
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
            />
            {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Feather name="x-circle" size={18} color={theme.textDim} />
                </TouchableOpacity>
            ) : null}
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return null; // Let the full screen loader handle it

        return (
            <View style={styles.emptyContainer}>
                <Feather name={activeTab === 'followers' ? 'users' : 'user-check'} size={48} color={theme.textDim} style={{ marginBottom: spacing.md }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textDim }]}>
                    {activeTab === 'followers'
                        ? "When someone follows you, they'll show up here."
                        : "Once you follow people, you'll see them here."}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <GlassHeader
                title={isMe ? currentUser?.username || 'Social' : 'Social Hub'}
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
                        <Feather name="arrow-left" size={24} color={theme.text} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && { borderBottomColor: theme.text, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('followers')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'followers' ? theme.text : theme.textDim, fontWeight: activeTab === 'followers' ? '700' : '500' }]}>
                        {followers.length} Followers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && { borderBottomColor: theme.text, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'following' ? theme.text : theme.textDim, fontWeight: activeTab === 'following' ? '700' : '500' }]}>
                        {following.length} Following
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={theme.primary} size="large" />
                    </View>
                ) : (
                    <FlashList
                        data={filteredList}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        // @ts-ignore - Type definitions in FlashListProps periodically drop estimatedItemSize in newer RN
                        estimatedItemSize={80}
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={renderEmpty}
                        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 14,
    },
    listContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0, // Override Android default padding
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        paddingHorizontal: spacing.xl,
        textAlign: 'center',
        lineHeight: 20,
    }
});
