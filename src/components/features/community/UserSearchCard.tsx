import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../../theme';
import { User } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

interface UserSearchCardProps {
    user: User;
    onAuthRequired?: () => void;
}

export const UserSearchCard: React.FC<UserSearchCardProps> = React.memo(({ user, onAuthRequired }) => {
    const theme = useThemeColors();
    const router = useRouter();
    const currentUser = useAppStore(state => state.user);
    const following = useAppStore(state => state.following);
    const followUserAction = useAppStore(state => state.followUserAction);
    const unfollowUserAction = useAppStore(state => state.unfollowUserAction);

    const isFollowing = following.includes(user.id);
    const isMe = currentUser?.id === user.id;

    const handleFollowToggle = async () => {
        if (!currentUser) {
            onAuthRequired?.();
            return;
        }
        if (isFollowing) {
            await unfollowUserAction(user.id);
        } else {
            await followUserAction(user.id);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}
            onPress={() => router.push(`/user/${user.id}`)}
        >
            <Image
                source={isMe && currentUser?.avatarUrl ? { uri: currentUser.avatarUrl } : (user.avatarUrl?.trim() ? { uri: user.avatarUrl } : require('../../../../assets/guest-avatar.png'))}
                style={styles.avatar}
                contentFit="cover"
            />

            <View style={styles.infoContainer}>
                <View style={styles.topRow}>
                    <Text style={[styles.username, { color: theme.text }]} numberOfLines={1}>
                        {isMe && currentUser?.username ? `@${currentUser.username}` : (user.username ? `@${user.username}` : '@anime_fan')}
                    </Text>
                    {user.followersCount !== undefined && (
                        <Text style={[styles.followersText, { color: theme.textDim }]}>
                            {user.followersCount} followers
                        </Text>
                    )}
                </View>

                {(isMe && currentUser?.bio) || (!isMe && user.bio) ? (
                    <Text style={[styles.bio, { color: theme.textDim }]} numberOfLines={2}>
                        {isMe ? currentUser?.bio : user.bio}
                    </Text>
                ) : (
                    <Text style={[styles.bio, { color: theme.textDim }]} numberOfLines={1}>
                        New to AnimOrg
                    </Text>
                )}
            </View>

            {!isMe && (
                <TouchableOpacity
                    style={[
                        styles.followBtn,
                        {
                            backgroundColor: isFollowing ? 'rgba(255,255,255,0.05)' : theme.primary,
                            borderColor: isFollowing ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }
                    ]}
                    onPress={handleFollowToggle}
                >
                    <Text style={[styles.followBtnText, { color: isFollowing ? theme.text : '#fff' }]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    username: {
        fontSize: 16,
        fontWeight: '700',
    },
    followersText: {
        fontSize: 12,
    },
    bio: {
        fontSize: 13,
        lineHeight: 18,
    },
    followBtn: {
        marginLeft: spacing.md,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '700',
    }
});
