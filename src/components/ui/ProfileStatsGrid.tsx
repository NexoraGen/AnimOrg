import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { spacing } from '../../theme';
import { ProfileStatCard } from './ProfileStatCard';

interface ProfileStatsGridProps {
    episodes: number;
    hours: number;
    currentStreak: number;
    longestStreak: number;
    onEpisodesPress?: () => void;
    onHoursPress?: () => void;
    onCurrentStreakPress?: () => void;
    onLongestStreakPress?: () => void;
}

export const ProfileStatsGrid: React.FC<ProfileStatsGridProps> = ({
    episodes,
    hours,
    currentStreak,
    longestStreak,
    onEpisodesPress,
    onHoursPress,
    onCurrentStreakPress,
    onLongestStreakPress
}) => {
    const { width } = useWindowDimensions();
    // Matching the exact My Lists card width to enforce identical alignment
    const cardWidth = (width - (spacing.xl * 2) - 16) / 2;

    const statsData = [
        {
            label: 'Episodes Watched',
            value: episodes.toLocaleString(),
            icon: 'play' as const,
            onPress: onEpisodesPress,
        },
        {
            label: 'Watch Hours',
            value: `${hours.toLocaleString()}h`,
            icon: 'clock' as const,
            onPress: onHoursPress,
        },
        {
            label: 'Current Streak',
            value: `${currentStreak}d`,
            icon: 'zap' as const,
            onPress: onCurrentStreakPress,
            helperText: currentStreak > 0 ? 'Keep it up! 🔥' : 'Start tracking today!',
        },
        {
            label: 'Longest Streak',
            value: `${longestStreak}d`,
            icon: 'award' as const,
            onPress: onLongestStreakPress,
            helperText: 'Personal record 🏅',
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {statsData.map((item, idx) => (
                    <View key={idx} style={{ width: cardWidth }}>
                        <ProfileStatCard
                            label={item.label}
                            value={item.value}
                            icon={item.icon}
                            index={idx}
                            onPress={item.onPress}
                            helperText={'helperText' in item ? item.helperText : undefined}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        zIndex: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
    },
});
