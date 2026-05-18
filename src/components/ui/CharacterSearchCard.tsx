import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface CharacterSearchCardProps {
    character: {
        id: string;
        name: string;
        imageUrl: string;
        favorites?: number;
        animeName?: string;
        animePoster?: string;
    };
    onPress: (id: string, animeId?: string) => void;
}

export const CharacterSearchCard: React.FC<CharacterSearchCardProps> = ({ character, onPress }) => {
    const themeColors = useThemeColors();

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            onPress={() => onPress(character.id)}
            activeOpacity={0.7}
        >
            <Image
                source={character.imageUrl ? { uri: character.imageUrl } : require('../../../assets/guest-avatar.png')}
                style={styles.image}
                contentFit="cover"
            />

            <View style={styles.content}>
                <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {character.name}
                </Text>

                {character.animeName && (
                    <View style={styles.animeInfo}>
                        <Image
                            source={character.animePoster ? { uri: character.animePoster } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                            style={styles.animePoster}
                        />
                        <Text style={[styles.animeName, { color: themeColors.textDim }]} numberOfLines={1}>
                            {character.animeName}
                        </Text>
                    </View>
                )}

                <View style={styles.stats}>
                    <Feather name="heart" size={12} color={colors.primary} />
                    <Text style={[styles.statText, { color: themeColors.textDim }]}>
                        {character.favorites?.toLocaleString() || '0'} Favorites
                    </Text>
                </View>
            </View>

            <View style={[styles.arrow, { backgroundColor: themeColors.primary + '10' }]}>
                <Feather name="chevron-right" size={20} color={themeColors.primary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        height: 100,
        marginBottom: spacing.md,
    },
    image: {
        width: 80,
        height: '100%',
    },
    content: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    animeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    animePoster: {
        width: 16,
        height: 24,
        borderRadius: 4,
        marginRight: 8,
    },
    animeName: {
        fontSize: 12,
        flex: 1,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 11,
    },
    arrow: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
