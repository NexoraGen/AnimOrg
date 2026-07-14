import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    useWindowDimensions,
    Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { GlassHeader, Button, CreateCollectionModal } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { CollectionService } from '../../src/services/CollectionService';
import { CinematicModal } from '../../src/components/layout/CinematicModal';

export default function CollectionDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();

    const collections = useAppStore(state => state.collections);
    const watchlist = useAppStore(state => state.watchlist);
    const deleteCollectionAction = useAppStore(state => state.deleteCollectionAction);
    const reorderCollectionAnimeAction = useAppStore(state => state.reorderCollectionAnimeAction);
    const removeAnimeFromCollectionAction = useAppStore(state => state.removeAnimeFromCollectionAction);

    // States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest_added' | 'oldest_added' | 'manual'>('manual');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    // Find exact collection
    const collection = useMemo(() => {
        return collections.find(c => c.id === id);
    }, [collections, id]);

    // If collection deleted, exit
    if (!collection) {
        return (
            <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
                <GlassHeader
                    title="Not Found"
                    leftComponent={
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                            <Feather name="chevron-left" size={24} color={themeColors.text} />
                        </TouchableOpacity>
                    }
                />
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: 'white' }]}>Collection not found or has been deleted.</Text>
                </View>
            </AnimatedScreen>
        );
    }

    // Mapped list of anime details inside collection
    const collectionAnime = useMemo(() => {
        return collection.animeIds
            .map(animeId => watchlist.find(w => w.mediaId === animeId))
            .filter(Boolean);
    }, [collection.animeIds, watchlist]);

    // Apply sorting and searching
    const processedAnimeIds = useMemo(() => {
        // 1. Sort
        const sorted = CollectionService.sortAnimeInCollection(
            collection.animeIds,
            watchlist,
            sortBy
        );
        // 2. Search
        return CollectionService.searchAnimeInCollection(sorted, watchlist, searchQuery);
    }, [collection.animeIds, watchlist, sortBy, searchQuery]);

    const handleDeleteCollection = () => {
        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        router.back();
                        await deleteCollectionAction(collection.id);
                    }
                }
            ]
        );
    };

    const handleRemoveAnime = async (animeId: string, title: string) => {
        Alert.alert(
            'Remove Anime',
            `Remove "${title}" from "${collection.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await removeAnimeFromCollectionAction(collection.id, animeId);
                    }
                }
            ]
        );
    };

    // Reordering helpers
    const handleMoveUp = async (index: number) => {
        if (index === 0) return;
        const newOrder = [...collection.animeIds];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index - 1];
        newOrder[index - 1] = temp;
        await reorderCollectionAnimeAction(collection.id, newOrder);
    };

    const handleMoveDown = async (index: number) => {
        if (index === collection.animeIds.length - 1) return;
        const newOrder = [...collection.animeIds];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + 1];
        newOrder[index + 1] = temp;
        await reorderCollectionAnimeAction(collection.id, newOrder);
    };

    const shareBlueprintText = useMemo(() => {
        return CollectionService.exportCollectionBlueprint(collection, watchlist);
    }, [collection, watchlist]);

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
            <GlassHeader
                title={collection.name}
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                        <Feather name="chevron-left" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                }
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => setShareModalVisible(true)} style={{ padding: 8 }}>
                            <Feather name="share-2" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditModalVisible(true)} style={{ padding: 8 }}>
                            <Feather name="edit-3" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteCollection} style={{ padding: 8 }}>
                            <Feather name="trash-2" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Collection banner */}
                <View style={styles.bannerContainer}>
                    {collection.coverImage ? (
                        <Image source={{ uri: collection.coverImage }} style={styles.bannerImage} contentFit="cover" />
                    ) : (
                        <LinearGradient
                            colors={['#1f1f1f', '#0f0f0f']}
                            style={styles.bannerGradient}
                        />
                    )}
                    <View style={styles.bannerOverlay}>
                        <Text style={styles.bannerEmoji}>{collection.emoji || '📂'}</Text>
                        <Text style={styles.bannerTitle} numberOfLines={2}>{collection.name}</Text>
                        {collection.description ? (
                            <Text style={[styles.bannerDesc, { color: themeColors.textDim }]}>{collection.description}</Text>
                        ) : null}
                        <Text style={[styles.bannerMeta, { color: themeColors.textMuted }]}>
                            {collection.animeIds.length} items • Created {new Date(collection.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* Search Input within this Collection */}
                <View style={[styles.searchBar, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255,255,255,0.06)' }]}>
                    <Feather name="search" size={18} color={themeColors.textDim} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search inside collection..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={[styles.searchInput, { color: 'white' }]}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={18} color={themeColors.textDim} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Sorting buttons */}
                <View style={styles.sortRow}>
                    <Text style={[styles.sortLabel, { color: themeColors.textMuted }]}>Sort:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptions}>
                        {(['manual', 'alphabetical', 'newest_added', 'oldest_added'] as const).map((method) => {
                            const label = method === 'manual' ? 'Manual' : method === 'alphabetical' ? 'A-Z' : method === 'newest_added' ? 'Newest' : 'Oldest';
                            return (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.sortBtn,
                                        {
                                            backgroundColor: sortBy === method ? `${themeColors.primary}18` : 'transparent',
                                            borderColor: sortBy === method ? themeColors.primary : 'rgba(255, 255, 255, 0.05)'
                                        }
                                    ]}
                                    onPress={() => setSortBy(method)}
                                >
                                    <Text style={[styles.sortBtnText, { color: sortBy === method ? themeColors.primary : themeColors.textDim }]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Show list of anime in collection */}
                {processedAnimeIds.length === 0 ? (
                    <View style={styles.emptyItemsContainer}>
                        <Feather name="video-off" size={40} color="rgba(255, 255, 255, 0.15)" style={{ marginBottom: spacing.md }} />
                        <Text style={[styles.emptyItemsText, { color: themeColors.textDim }]}>
                            {searchQuery ? 'No matching titles found in this list.' : 'This collection is empty. Go to details page of any anime to add it.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.itemsList}>
                        {processedAnimeIds.map((animeId, index) => {
                            const anime = watchlist.find(w => w.mediaId === animeId);
                            if (!anime) return null;

                            // Find manual index of this anime in the unsorted collection.animeIds array
                            const originalIndex = collection.animeIds.indexOf(animeId);

                            return (
                                <View
                                    key={anime.mediaId}
                                    style={[
                                        styles.animeItemRow,
                                        { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.04)' }
                                    ]}
                                >
                                    {/* Poster image */}
                                    <TouchableOpacity
                                        style={styles.animeItemDetails}
                                        onPress={() => router.push(`/details/${anime.mediaId}`)}
                                    >
                                        <Image
                                            source={{ uri: anime.posterImageMedium || anime.posterPath }}
                                            style={styles.animePoster}
                                            contentFit="cover"
                                        />
                                        <View style={styles.animeTextDetails}>
                                            <Text style={[styles.animeTitle, { color: 'white' }]} numberOfLines={1}>
                                                {anime.title}
                                            </Text>
                                            <Text style={[styles.animeMetaText, { color: themeColors.textDim }]} numberOfLines={1}>
                                                {(anime.genres || []).slice(0, 2).join(' • ')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Actions / Reordering row */}
                                    <View style={styles.animeRowActions}>
                                        {/* Manual controls (Move up and down) - Only active in manual sorting mode */}
                                        {sortBy === 'manual' && !searchQuery && (
                                            <View style={styles.reorderControls}>
                                                <TouchableOpacity
                                                    disabled={originalIndex === 0}
                                                    onPress={() => handleMoveUp(originalIndex)}
                                                    style={[styles.reorderBtn, originalIndex === 0 && styles.disabledBtn]}
                                                >
                                                    <Feather name="chevron-up" size={18} color={originalIndex === 0 ? 'rgba(255,255,255,0.1)' : 'white'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    disabled={originalIndex === collection.animeIds.length - 1}
                                                    onPress={() => handleMoveDown(originalIndex)}
                                                    style={[styles.reorderBtn, originalIndex === collection.animeIds.length - 1 && styles.disabledBtn]}
                                                >
                                                    <Feather name="chevron-down" size={18} color={originalIndex === collection.animeIds.length - 1 ? 'rgba(255,255,255,0.1)' : 'white'} />
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Remove button */}
                                        <TouchableOpacity
                                            onPress={() => handleRemoveAnime(anime.mediaId, anime.title)}
                                            style={styles.removeBtn}
                                        >
                                            <Feather name="x-circle" size={18} color="rgba(255,255,255,0.3)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Share / Blueprint Modal */}
            <CinematicModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                maxWidth={350}
            >
                <View style={styles.shareContent}>
                    <Text style={[styles.shareHeaderTitle, { color: 'white' }]}>Share Collection Blueprint</Text>
                    <Text style={[styles.shareDescription, { color: themeColors.textDim }]}>
                        Copy this portable JSON schema blueprint to import this playlist onto another device in the future.
                    </Text>
                    <ScrollView
                        style={[styles.shareTextScroll, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }]}
                        contentContainerStyle={styles.shareTextContent}
                    >
                        <Text style={styles.shareJsonText}>{shareBlueprintText}</Text>
                    </ScrollView>
                    <Button
                        title="Dismiss"
                        variant="outline"
                        onPress={() => setShareModalVisible(false)}
                        style={{ width: '100%', height: 46, marginTop: spacing.md }}
                    />
                </View>
            </CinematicModal>

            {/* Edit Collection Modal */}
            <CreateCollectionModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                collectionToEdit={collection}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingTop: 85, // Space for GlassHeader
        gap: spacing.md,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    bannerContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        height: 150,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: spacing.lg,
        justifyContent: 'flex-end',
    },
    bannerEmoji: {
        fontSize: 32,
        marginBottom: 4,
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.3,
    },
    bannerDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    bannerMeta: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        opacity: 0.8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        height: 44,
        paddingHorizontal: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        height: '100%',
        padding: 0,
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortLabel: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginRight: spacing.sm,
    },
    sortOptions: {
        gap: 8,
    },
    sortBtn: {
        paddingHorizontal: 12,
        height: 26,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sortBtnText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyItemsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        paddingHorizontal: spacing.xl,
    },
    emptyItemsText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 17,
    },
    itemsList: {
        gap: spacing.sm,
    },
    animeItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    animeItemDetails: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    animePoster: {
        width: 40,
        height: 56,
        borderRadius: 6,
        marginRight: spacing.md,
    },
    animeTextDetails: {
        flex: 1,
    },
    animeTitle: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    animeMetaText: {
        fontSize: 10,
        marginTop: 2,
    },
    animeRowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    reorderControls: {
        flexDirection: 'row',
        gap: 4,
    },
    reorderBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    removeBtn: {
        padding: 4,
    },
    shareContent: {
        alignItems: 'center',
        paddingTop: spacing.xs,
    },
    shareHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    shareDescription: {
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    shareTextScroll: {
        width: '100%',
        height: 180,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        padding: spacing.md,
    },
    shareTextContent: {
        paddingBottom: spacing.md,
    },
    shareJsonText: {
        color: '#00E676',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
});
