import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { animeApi } from '../../services/animeApi';
import { CollectionService } from '../../services/CollectionService';
import { useAppStore } from '../../store/useAppStore';
import { getSafeTopInset } from '../../utils/layout';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface AddAnimeToCollectionModalProps {
    visible: boolean;
    onClose: () => void;
    collectionId: string;
}

export const AddAnimeToCollectionModal: React.FC<AddAnimeToCollectionModalProps> = ({
    visible,
    onClose,
    collectionId
}) => {
    const theme = useThemeColors();
    const insets = useSafeAreaInsets();
    const currentUser = useAppStore(state => state.user);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    // Basic debounce implementation
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Assuming standard searchAnime returns a list of Anime/Media objects
                const response = await animeApi.searchAnime(query, 1);
                setResults(response?.data || []);
            } catch (error) {
                console.error('[AddAnimeModal] Error searching:', error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [query]);

    const handleAdd = async (anime: any) => {
        if (!currentUser) return;
        const animeIdStr = anime.id.toString();

        if (addingIds.has(animeIdStr) || addedIds.has(animeIdStr)) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAddingIds(prev => new Set(prev).add(animeIdStr));

        try {
            await CollectionService.addItemToCollection(collectionId, currentUser.id, {
                id: animeIdStr,
                title: anime.title || 'Unknown',
                posterPath: anime.posterPath || '',
                genres: anime.genres || []
            });

            // Eagerly update global Zustand state so Collection Cards update instantly
            const { collections } = useAppStore.getState();
            useAppStore.setState({
                collections: collections.map(col => {
                    if (col.id === collectionId) {
                        return {
                            ...col,
                            itemCount: (col.itemCount || col.animeIds?.length || 0) + 1,
                            animeIds: [animeIdStr, ...(col.animeIds || [])]
                        };
                    }
                    return col;
                })
            });

            setAddedIds(prev => new Set(prev).add(animeIdStr));
        } catch (error) {
            console.error('[AddAnimeModal] Failed to add item:', error);
            // Optionally could throw a toast here
        } finally {
            setAddingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(animeIdStr);
                return newSet;
            });
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const idStr = item.id.toString();
        const isAdding = addingIds.has(idStr);
        const isAdded = addedIds.has(idStr);
        const title = item.title;
        const imageUrl = item.posterPath;

        return (
            <View style={styles.resultItem}>
                <Image
                    source={imageUrl}
                    style={styles.poster}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                        {title}
                    </Text>
                    {item.format && (
                        <Text style={[styles.format, { color: theme.textDim }]}>{item.format}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={[
                        styles.addBtn,
                        { backgroundColor: isAdded ? 'rgba(255,255,255,0.05)' : (isAdding ? theme.surfaceVariant : theme.primary) }
                    ]}
                    onPress={() => handleAdd(item)}
                    disabled={isAdding || isAdded}
                >
                    {isAdding ? (
                        <ActivityIndicator color={theme.text} size="small" />
                    ) : isAdded ? (
                        <Feather name="check" size={18} color={theme.text} />
                    ) : (
                        <Text style={[styles.addBtnText, { color: 'white' }]}>Add</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.container, { backgroundColor: theme.background }]}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.05)', paddingTop: spacing.sm }]}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Add Anime</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Text style={[styles.doneBtn, { color: theme.primary }]}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={[styles.searchWrapper, { backgroundColor: theme.surface }]}>
                        <Feather name="search" size={20} color={theme.textDim} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder="Search for anime to add..."
                            placeholderTextColor={theme.textDim}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                            autoCorrect={false}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery('')}>
                                <Feather name="x-circle" size={18} color={theme.textDim} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Body */}
                    <View style={styles.listContainer}>
                        {isLoading && results.length === 0 ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator color={theme.primary} size="large" />
                            </View>
                        ) : (
                            <FlashList
                                data={results}
                                renderItem={renderItem}
                                keyExtractor={item => item.id.toString()}
                                // @ts-ignore - TS signature clash
                                estimatedItemSize={80}
                                extraData={{ addingIds, addedIds }}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                                ListEmptyComponent={() => (
                                    !isLoading && query.trim().length > 0 ? (
                                        <View style={styles.centerContainer}>
                                            <Text style={[styles.emptyText, { color: theme.textDim }]}>
                                                No results found.
                                            </Text>
                                        </View>
                                    ) : null
                                )}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    doneBtn: {
        fontSize: 16,
        fontWeight: '600',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        borderRadius: borderRadius.lg,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    listContainer: {
        flex: 1,
    },
    centerContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    resultItem: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    poster: {
        width: 50,
        height: 75,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    info: {
        flex: 1,
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    format: {
        fontSize: 12,
        fontWeight: '500',
    },
    addBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        minWidth: 70,
        alignItems: 'center',
    },
    addBtnText: {
        fontSize: 14,
        fontWeight: '700',
    }
});
