import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';
import { ActivityFeedItem } from '../../types';

interface ActivityFeedCardProps {
    activity: ActivityFeedItem;
    onPressProfile?: (userId: string) => void;
    onPressAnime?: (animeId: string) => void;
}

export function ActivityFeedCard({ activity, onPressProfile, onPressAnime }: ActivityFeedCardProps) {
    const themeColors = useThemeColors();

    const getActionText = () => {
        switch (activity.type) {
            case 'rated':
                return `rated it ${activity.score}/10`;
            case 'watched':
                return activity.episode ? `watched Episode ${activity.episode}` : 'watched an episode';
            case 'favorited':
                return 'favorited';
            case 'added':
                return 'added to watchlist';
            default:
                return 'interacted with';
        }
    };

    const getIcon = () => {
        switch (activity.type) {
            case 'rated': return <Feather name="star" color="#FFD700" size={12} />;
            case 'watched': return <Feather name="play-circle" color={colors.primary} size={12} />;
            case 'favorited': return <Feather name="heart" color="#FF3B30" size={12} />;
            case 'added': return <Feather name="bookmark" color={themeColors.textDim} size={12} />;
            default: return <Feather name="activity" color={themeColors.textDim} size={12} />;
        }
    };

    const timeAgo = (dateStr: string) => {
        const time = new Date(dateStr).getTime();
        const diff = Math.floor((Date.now() - time) / 60000); // minutes
        if (diff < 60) return `${diff}m`;
        const h = Math.floor(diff / 60);
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    };

    return (
        <View style={[styles.container, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => onPressProfile && activity.userId && onPressProfile(activity.userId)}
            >
                {activity.userAvatar ? (
                    <Image source={activity.userAvatar} style={styles.avatar} contentFit="cover" />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: themeColors.surfaceVariant }]}>
                        <Feather name="user" size={16} color={themeColors.textDim} />
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.contentWrap}>
                <View style={styles.textStack}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.username, { color: themeColors.text }]} numberOfLines={1}>
                            {activity.username || 'User'}
                        </Text>
                        <Text style={[styles.time, { color: themeColors.textMuted }]}>
                            {timeAgo(activity.timestamp)}
                        </Text>
                    </View>

                    <View style={styles.actionRow}>
                        {getIcon()}
                        <Text style={[styles.actionText, { color: themeColors.textDim }]} numberOfLines={1}>
                            {getActionText()}
                        </Text>
                    </View>

                    {activity.animeTitle && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => onPressAnime && activity.animeId && onPressAnime(activity.animeId)}
                        >
                            <Text style={[styles.animeTitle, { color: themeColors.primary }]} numberOfLines={1}>
                                {activity.animeTitle}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {activity.animePoster && (
                    <TouchableOpacity
                        style={styles.posterWrap}
                        activeOpacity={0.8}
                        onPress={() => onPressAnime && activity.animeId && onPressAnime(activity.animeId)}
                    >
                        <Image source={activity.animePoster} style={styles.poster} contentFit="cover" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarWrap: {
        marginRight: spacing.md,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textStack: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    username: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    time: {
        fontSize: 12,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    animeTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    posterWrap: {
        width: 48,
        height: 68,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    poster: {
        width: '100%',
        height: '100%',
    }
});
