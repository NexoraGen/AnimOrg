import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
import { User } from '../../types';
import { FollowButton } from './FollowButton';
import { getAvatarSource } from '../../constants/avatars';

interface SocialUserRowProps {
    user: User;
    currentUserId?: string;
    onPress?: (userId: string) => void;
}

export const SocialUserRow: React.FC<SocialUserRowProps> = ({ user, currentUserId, onPress }) => {
    const theme = useThemeColors();
    const router = useRouter();
    const isCurrentUser = currentUserId === user.id;

    const handlePress = () => {
        if (onPress) onPress(user.id);
        else router.push(`/user/${user.id}`);
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.avatarContainer}>
                <Image
                    source={getAvatarSource(user.avatarUrl)}
                    style={[styles.avatar, { borderColor: theme.border }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
            </View>

            <View style={styles.infoContainer}>
                <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
                    {user.username}
                </Text>
                <Text style={[styles.handle, { color: theme.textDim }]} numberOfLines={1}>
                    @{user.username.toLowerCase().replace(/\s+/g, '')}
                </Text>
                {user.bio ? (
                    <Text style={[styles.bio, { color: theme.text }]} numberOfLines={1}>
                        {user.bio}
                    </Text>
                ) : null}
            </View>

            <View style={styles.actionContainer}>
                {isCurrentUser ? (
                    <View style={[styles.youBadge, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}>
                        <Text style={[styles.youBadgeText, { color: theme.primary }]}>You</Text>
                    </View>
                ) : (
                    <FollowButton
                        userId={user.id}
                        useDefaultStyles={false}
                        style={[
                            styles.followButton,
                            { backgroundColor: theme.primary } // Can be overridden natively by FollowButton if following
                        ]}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
    },
    avatarContainer: {
        marginRight: spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    displayName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    handle: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    bio: {
        fontSize: 13,
        opacity: 0.8,
        marginTop: 2,
    },
    actionContainer: {
        marginLeft: spacing.md,
        minWidth: 90,
        alignItems: 'flex-end',
    },
    youBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    youBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.sm, // Instagram rounded rect style instead of full pill
        minWidth: 96,
        alignItems: 'center',
    }
});
