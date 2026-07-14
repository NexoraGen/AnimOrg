import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Platform,
    useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { GlassHeader, Button, CollectionCard, CreateCollectionModal } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { CollectionService } from '../../src/services/CollectionService';

export default function CollectionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();

    const collections = useAppStore(state => state.collections);
    const togglePinCollectionAction = useAppStore(state => state.togglePinCollectionAction);

    // Sorting
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
    const [modalVisible, setModalVisible] = useState(false);

    // Separate pinned and non-pinned
    const sortedCollections = useMemo(() => {
        // Separate pinned and unpinned, sort both, then put pinned on top
        const pinned = collections.filter(c => c.isPinned);
        const unpinned = collections.filter(c => !c.isPinned);

        const sortedPinned = CollectionService.sortCollections(pinned, sortBy);
        const sortedUnpinned = CollectionService.sortCollections(unpinned, sortBy);

        return [...sortedPinned, ...sortedUnpinned];
    }, [collections, sortBy]);

    const handleCreatePress = () => {
        setModalVisible(true);
    };

    const handleCardPress = (id: string) => {
        router.push(`/collections/${id}`);
    };

    const handlePinPress = async (id: string) => {
        await togglePinCollectionAction(id);
    };

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
            <GlassHeader
                title="My Collections"
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                        <Feather name="chevron-left" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                }
                rightComponent={
                    <TouchableOpacity onPress={handleCreatePress} style={{ padding: 8 }}>
                        <Feather name="plus" size={24} color={themeColors.primary} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Summary Banner */}
                <View style={[styles.summaryCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                    <View style={styles.summaryHeader}>
                        <View>
                            <Text style={[styles.summaryTitle, { color: 'white' }]}>Personal Libraries</Text>
                            <Text style={[styles.summarySubtitle, { color: themeColors.textMuted }]}>
                                {collections.length} custom database lists
                            </Text>
                        </View>
                        <View style={[styles.summaryIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                            <Feather name="folder" size={24} color={themeColors.primary} />
                        </View>
                    </View>
                </View>

                {/* Sorting Chips Row */}
                <View style={styles.filterRow}>
                    <Text style={[styles.filterLabel, { color: themeColors.textMuted }]}>Sort by:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
                        {(['newest', 'oldest', 'alphabetical'] as const).map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.sortChip,
                                    {
                                        backgroundColor: sortBy === option ? themeColors.primary : 'rgba(255,255,255,0.03)',
                                        borderColor: sortBy === option ? themeColors.primary : 'rgba(255,255,255,0.06)'
                                    }
                                ]}
                                onPress={() => setSortBy(option)}
                            >
                                <Text style={[styles.sortChipText, { color: sortBy === option ? 'white' : themeColors.textDim }]}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Library Grid */}
                {sortedCollections.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                            <Feather name="folder-plus" size={48} color="rgba(255,255,255,0.15)" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: 'white' }]}>No Collections Yet</Text>
                        <Text style={[styles.emptyDesc, { color: themeColors.textMuted }]}>
                            Create custom groups to organize your shows by ratings, favorites, or binge playlists.
                        </Text>
                        <Button
                            title="Create First Collection"
                            onPress={handleCreatePress}
                            style={styles.emptyBtn}
                        />
                    </View>
                ) : (
                    <View style={styles.gridContainer}>
                        {sortedCollections.map((col) => (
                            <CollectionCard
                                key={col.id}
                                collection={col}
                                onPress={() => handleCardPress(col.id)}
                                onPinPress={() => handlePinPress(col.id)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Creation Popup */}
            <CreateCollectionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
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
        paddingTop: 85, // Account for GlassHeader height
        gap: spacing.md,
    },
    summaryCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: spacing.lg,
        marginBottom: spacing.xs,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    summarySubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    summaryIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginRight: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sortChips: {
        flexDirection: 'row',
        gap: 8,
    },
    sortChip: {
        paddingHorizontal: 12,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sortChipText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'flex-start',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: spacing.xl,
    },
    emptyIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    emptyBtn: {
        width: '100%',
        height: 48,
    },
});
