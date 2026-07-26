import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';

import { spacing, colors, borderRadius } from '../src/theme';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { GlassHeader } from '../src/components/ui/GlassHeader';
import { AuthModal } from '../src/components/ui/AuthModal';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { useAppStore } from '../src/store/useAppStore';
import { firestoreService } from '../src/services/firebase/firestore';
import { CommunityPost } from '../src/types';
import { CommunityPostCard } from '../src/components/features/community/CommunityPostCard';

import { getSafeTopInset, HEADER_HEIGHT } from '../src/utils/layout';

export default function SavedPostsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [authModalVisible, setAuthModalVisible] = useState(false);

    const loadSavedPosts = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        try {
            const fetched = await firestoreService.getSavedPosts(user.id);
            setPosts(fetched);
        } catch (error) {
            console.error('[SavedPostsScreen] Failed to load saved posts:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadSavedPosts();
    }, [loadSavedPosts]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadSavedPosts();
        setRefreshing(false);
    };

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
            <GlassHeader
                title="Saved Posts"
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={28} color={theme.text} />
                    </TouchableOpacity>
                }
            />

            {!user ? (
                <View style={styles.centered}>
                    <Feather name="bookmark" size={48} color={theme.textDim} style={{ marginBottom: spacing.md }} />
                    <Text style={[styles.message, { color: theme.textDim }]}>
                        You must be signed in to see saved posts.
                    </Text>
                </View>
            ) : isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlashList<CommunityPost>
                    {...{ estimatedItemSize: 200 } as any}
                    data={posts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingTop: getSafeTopInset(insets) + HEADER_HEIGHT + spacing.xs }
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={theme.primary}
                            progressViewOffset={getSafeTopInset(insets) + HEADER_HEIGHT}
                        />
                    }
                    renderItem={({ item }) => (
                        <CommunityPostCard
                            post={item}
                            onAuthRequired={() => setAuthModalVisible(true)}
                            onPostUpdated={(updatedPost) => {
                                setPosts((prev) =>
                                    prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
                                );
                            }}
                            onPostDeleted={(postId) => {
                                setPosts((prev) => prev.filter((p) => p.id !== postId));
                            }}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="bookmark" size={48} color={theme.textDim} />
                            <Text style={[styles.emptyText, { color: theme.textDim }]}>
                                No saved posts yet.
                            </Text>
                        </View>
                    }
                />
            )}

            <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: 16,
        textAlign: 'center',
    }
});
