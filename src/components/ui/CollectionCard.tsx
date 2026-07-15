import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { UserCollection } from '../../types';
import { AnimatedPressable } from './AnimatedPressable';

interface CollectionCardProps {
    collection: UserCollection;
    onPress: () => void;
    onPinPress?: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
    collection,
    onPress,
    onPinPress
}) => {
    const themeColors = useThemeColors();
    const watchlist = useAppStore(state => state.watchlist);
    const { width } = useWindowDimensions();

    // Find posters for the anime inside the collection (up to 4)
    const collectionAnime = collection.animeIds
        .map(id => watchlist.find(w => w.mediaId === id))
        .filter(Boolean);

    const cardWidth = (width - (spacing.XL * 2) - spacing.M) / 2;

    // Render collage of posters
    const renderCollage = () => {
        if (collection.coverImage) {
            return (
                <Image
                    source={{ uri: collection.coverImage }}
                    style={styles.collageImage}
                    contentFit="cover"
                />
            );
        }

        const posters = collectionAnime.slice(0, 4).map(item => item?.posterImageMedium || item?.posterPath);

        if (posters.length === 0) {
            return (
                <View style={[styles.emptyCollage, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <Text style={styles.emptyEmoji}>{collection.emoji || '📂'}</Text>
                </View>
            );
        }

        if (posters.length === 1) {
            return (
                <Image
                    source={{ uri: posters[0] }}
                    style={styles.collageImage}
                    contentFit="cover"
                />
            );
        }

        if (posters.length === 2) {
            return (
                <View style={styles.rowCollage}>
                    <Image source={{ uri: posters[0] }} style={styles.halfCollageImage} contentFit="cover" />
                    <Image source={{ uri: posters[1] }} style={styles.halfCollageImage} contentFit="cover" />
                </View>
            );
        }

        // 3 or 4 posters -> 2x2 grid
        return (
            <View style={styles.gridCollage}>
                <View style={styles.collageRow}>
                    <Image source={{ uri: posters[0] }} style={styles.quarterCollageImage} contentFit="cover" />
                    <Image source={{ uri: posters[1] }} style={[styles.quarterCollageImage, { marginLeft: 1 }]} contentFit="cover" />
                </View>
                <View style={[styles.collageRow, { marginTop: 1 }]}>
                    <Image source={{ uri: posters[2] }} style={styles.quarterCollageImage} contentFit="cover" />
                    <Image source={{ uri: posters[3] || posters[0] }} style={[styles.quarterCollageImage, { marginLeft: 1 }]} contentFit="cover" />
                </View>
            </View>
        );
    };

    return (
        <AnimatedPressable
            style={[
                styles.card,
                {
                    width: cardWidth,
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.05)'
                }
            ]}
            onPress={onPress}
        >
            <View style={styles.collageContainer}>
                {renderCollage()}

                {/* Pin status icon button */}
                {onPinPress && (
                    <TouchableOpacity
                        style={[
                            styles.pinButton,
                            { backgroundColor: collection.isPinned ? '#FFD700' : 'rgba(0,0,0,0.5)' }
                        ]}
                        onPress={onPinPress}
                        activeOpacity={0.8}
                    >
                        <FontAwesome
                            name="thumb-tack"
                            size={12}
                            color={collection.isPinned ? '#000000' : '#FFFFFF'}
                        />
                    </TouchableOpacity>
                )}

                {/* Floating count tag */}
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{collection.animeIds.length} titles</Text>
                </View>
            </View>

            <View style={styles.infoContainer}>
                <Text style={[styles.title, { color: 'white' }]} numberOfLines={1}>
                    {collection.emoji ? `${collection.emoji} ` : ''}{collection.name}
                </Text>
                <Text style={[styles.desc, { color: themeColors.textMuted }]} numberOfLines={2}>
                    {collection.description || 'No description provided'}
                </Text>
            </View>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.M,
    },
    collageContainer: {
        height: 120,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
    },
    collageImage: {
        width: '100%',
        height: '100%',
    },
    emptyCollage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyEmoji: {
        fontSize: 40,
    },
    rowCollage: {
        flex: 1,
        flexDirection: 'row',
    },
    halfCollageImage: {
        flex: 1,
        height: '100%',
    },
    gridCollage: {
        flex: 1,
    },
    collageRow: {
        flex: 1,
        flexDirection: 'row',
    },
    quarterCollageImage: {
        flex: 1,
        height: '100%',
    },
    pinButton: {
        position: 'absolute',
        top: spacing.S,
        right: spacing.S,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    countBadge: {
        position: 'absolute',
        bottom: spacing.S,
        left: spacing.S,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    countText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
    infoContainer: {
        padding: spacing.M,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    desc: {
        fontSize: 11,
        lineHeight: 14,
    },
});
