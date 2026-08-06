import React, { useMemo, useState, useEffect } from 'react';
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
import { FlashList } from '@shopify/flash-list';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { GlassHeader, Button, CreateCollectionModal, AddAnimeToCollectionModal, PosterCard } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { CollectionService } from '../../src/services/CollectionService';
import { CinematicModal } from '../../src/components/layout/CinematicModal';
import { collection as firestoreCollection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase/config';
import { CollectionItem } from '../../src/types';

export default function CollectionDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();

    const numColumns = 2;
    const itemGap = spacing.M;
    const cardWidth = (width - spacing.xl * 2 - itemGap * (numColumns - 1)) / numColumns;

    const collections = useAppStore(state => state.collections);
    const watchlist = useAppStore(state => state.watchlist);
    const deleteCollectionAction = useAppStore(state => state.deleteCollectionAction);
    const updateCollectionAction = useAppStore(state => state.updateCollectionAction);
    const reorderCollectionAnimeAction = useAppStore(state => state.reorderCollectionAnimeAction);
    const removeAnimeFromCollectionAction = useAppStore(state => state.removeAnimeFromCollectionAction);

    // States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'newest_added' | 'oldest_added' | 'manual'>('manual');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [addAnimeModalVisible, setAddAnimeModalVisible] = useState(false);

    // Find exact collection
    const collection = useMemo(() => {
        return collections.find(c => c.id === id);
    }, [collections, id]);


    const [collectionItems, setCollectionItems] = React.useState<CollectionItem[]>([]);
    const [isLoadingItems, setIsLoadingItems] = React.useState(true);

    React.useEffect(() => {
        if (!id) return;
        const q = query(firestoreCollection(db, 'collection_items'), where('collectionId', '==', id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => doc.data() as CollectionItem);
            setCollectionItems(items);
            setIsLoadingItems(false);
        }, (error) => {
            console.error("Error fetching collection items:", error);
            setIsLoadingItems(false);
        });
        return () => unsubscribe();
    }, [id]);

    const processedAnimeItems = useMemo(() => {
        let list = [...collectionItems];

        // 1. Search
        if (searchQuery.trim()) {
            const cleanQuery = searchQuery.toLowerCase().trim();
            list = list.filter(item =>
                item.title.toLowerCase().includes(cleanQuery) ||
                (item.genres && item.genres.some(g => g.toLowerCase().includes(cleanQuery)))
            );
        }

        // 2. Sort
        if (sortBy === 'alphabetical') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'newest_added') {
            list.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        } else if (sortBy === 'oldest_added') {
            list.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
        } else if (sortBy === 'manual' && collection?.animeIds) {
            // Restore manual sorting order according to animeIds array
            list.sort((a, b) => {
                const indexA = collection.animeIds!.findIndex(id => String(id) === String(a.animeId));
                const indexB = collection.animeIds!.findIndex(id => String(id) === String(b.animeId));
                // -1 pushes to end (new items with missing manual indices)
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }

        return list;
    }, [collectionItems, searchQuery, sortBy, collection]);
    useEffect(() => {
        if (!isLoadingItems && collection && collectionItems.length !== (collection.itemCount || 0)) {
            updateCollectionAction(collection.id, { itemCount: collectionItems.length });
        }
    }, [isLoadingItems, collectionItems.length, collection?.itemCount, updateCollectionAction, collection?.id]);

    const handleDeleteCollection = async () => {
        if (!collection) return;
        router.replace('/category/continue-watching');
        try {
            router.replace('/collections');
        } catch (e) { }
        await deleteCollectionAction(collection.id);
    };

    const handleRemoveAnime = async (animeId: string, title: string) => {
        // Optimistic mutation guarantees immediate visuals
        if (!collection) return;
        setCollectionItems(prev => prev.filter(a => String(a.animeId) !== String(animeId)));
        await removeAnimeFromCollectionAction(collection.id, animeId);
    };

    // Reordering helpers
    const handleMoveUp = async (index: number) => {
        if (!collection) return;
        if (index === 0) return;
        const newOrder = [...(collection.animeIds || [])];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index - 1];
        newOrder[index - 1] = temp;
        await reorderCollectionAnimeAction(collection.id, newOrder);
    };

    const handleMoveDown = async (index: number) => {
        if (!collection) return;
        const orderLen = (collection.animeIds || []).length;
        if (index === orderLen - 1) return;
        const newOrder = [...(collection.animeIds || [])];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + 1];
        newOrder[index + 1] = temp;
        await reorderCollectionAnimeAction(collection.id, newOrder);
    };

    const shareBlueprintText = useMemo(() => {
        const blueprint = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            metadata: {
                name: collection?.name || '',
                description: collection?.description || '',
                emoji: collection?.emoji || '📂',
                coverImage: collection?.coverImage || '',
            },
            animeList: collectionItems.map(item => ({
                id: item.animeId,
                title: item.title,
                posterPath: item.posterPath,
            }))
        };
        return JSON.stringify(blueprint, null, 2);
    }, [collection, collectionItems]);

    // If collection deleted, exit (must be checked after all hooks to prevent React hook mismatch crashes)
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setAddAnimeModalVisible(true)} style={{ padding: 8, marginRight: 8 }}>
                            <Feather name="plus-circle" size={20} color={themeColors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShareModalVisible(true)} style={{ padding: 8 }}>
                            <Feather name="share-2" size={20} color={themeColors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditModalVisible(true)} style={{ padding: 8 }}>
                            <Feather name="edit-2" size={20} color={themeColors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteCollection} style={{ padding: 8 }}>
                            <Feather name="trash-2" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={styles.scrollView}>
                <FlashList
                    data={isLoadingItems ? [] : processedAnimeItems}
                    numColumns={numColumns}
                    contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={{ gap: spacing.md, marginBottom: spacing.md, paddingTop: 85 - spacing.xl }}>
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
                                        {collectionItems.length} items • Created {new Date(collection.createdAt).toLocaleDateString()}
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

                        </View>
                    }
                    ListEmptyComponent={
                        isLoadingItems ? (
                            <View style={styles.emptyItemsContainer}>
                                <Text style={{ color: themeColors.textDim }}>Loading collection...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyItemsContainer}>
                                <Feather name="video-off" size={64} color={themeColors.textDim} style={{ opacity: 0.5, marginBottom: spacing.md }} />
                                <Text style={[styles.emptyItemsText, { color: themeColors.textDim }]}>
                                    This collection is empty.
                                </Text>
                                <Button
                                    title="Add Anime"
                                    onPress={() => setAddAnimeModalVisible(true)}
                                    style={{ marginTop: spacing.xl, paddingHorizontal: spacing.xxl }}
                                />
                            </View>
                        )
                    }
                    renderItem={({ item: anime, index }) => {
                        const isLastInRow = index % numColumns === numColumns - 1;

                        return (
                            <View
                                style={[
                                    { marginBottom: spacing.L, width: cardWidth, marginRight: isLastInRow ? 0 : itemGap }
                                ]}
                            >
                                <PosterCard
                                    media={anime as any}
                                    onPress={() => router.push(`/details/${anime.animeId}`)}
                                    width={cardWidth}
                                    height={cardWidth * 1.5}
                                    disableEntryAnimation
                                />

                                {/* Floating Delete Icon */}
                                <TouchableOpacity
                                    onPress={() => handleRemoveAnime(anime.animeId, anime.title)}
                                    style={styles.gridRemoveBtn}
                                >
                                    <View style={styles.gridRemoveBg}>
                                        <Feather name="trash-2" size={14} color="#FF3B30" />
                                    </View>
                                </TouchableOpacity>

                            </View>
                        );
                    }}
                    keyExtractor={(item) => item.id || item.animeId}
                />
            </View>

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

            <AddAnimeToCollectionModal
                visible={addAnimeModalVisible}
                onClose={() => setAddAnimeModalVisible(false)}
                collectionId={collection.id}
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
    gridRemoveBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        elevation: 10,
    },
    gridRemoveBg: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.3)',
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
