import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { firestoreService } from '../../services/firebase/firestore';
import { notificationService } from '../../services/notifications';
import { borderRadius } from '../../theme';

interface FollowButtonProps {
    userId: string;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    onAuthRequired?: () => void;
    /** If provided, we assume default pill styles. Set false for completely custom styling. */
    useDefaultStyles?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = React.memo(({
    userId,
    style,
    textStyle,
    onAuthRequired,
    useDefaultStyles = true
}) => {
    const theme = useThemeColors();
    const currentUser = useAppStore(state => state.user);
    const following = useAppStore(state => state.following);
    const followUserAction = useAppStore(state => state.followUserAction);
    const unfollowUserAction = useAppStore(state => state.unfollowUserAction);

    const [isPending, setIsPending] = useState(false);

    if (currentUser?.id === userId) {
        return null; // Can't follow self
    }

    const isFollowing = following.includes(userId);

    const handleToggle = async () => {
        if (!currentUser) {
            onAuthRequired?.();
            return;
        }

        if (isPending) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPending(true);

        try {
            if (isFollowing) {
                await unfollowUserAction(userId);
            } else {
                await followUserAction(userId);
                // Dispatch notification for new follows
                await firestoreService.createNotification({
                    recipientId: userId,
                    senderId: currentUser.id,
                    senderName: currentUser.username,
                    senderAvatar: currentUser.avatarUrl,
                    type: 'follow',
                    targetId: currentUser.id,
                });
                notificationService.dispatchSocialPush(
                    userId,
                    `${currentUser.username} started following you`,
                    'You have a new follower!',
                    { type: 'follow', targetId: currentUser.id }
                ).catch(e => console.warn('[FollowButton] Push dispatch failed:', e));
            }
        } finally {
            setIsPending(false);
        }
    };

    const containerStyle = useDefaultStyles ? [
        styles.defaultBtn,
        {
            backgroundColor: isFollowing ? 'rgba(255,255,255,0.05)' : theme.primary,
            borderColor: isFollowing ? 'rgba(255,255,255,0.1)' : 'transparent'
        },
        style
    ] : style;

    const labelStyle = useDefaultStyles ? [
        styles.defaultText,
        { color: isFollowing ? theme.text : '#fff' },
        textStyle
    ] : textStyle;

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={handleToggle}
            activeOpacity={0.8}
            disabled={isPending}
        >
            <Text style={labelStyle}>
                {isFollowing ? 'Following' : 'Follow'}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    defaultBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultText: {
        fontSize: 13,
        fontWeight: '700',
    }
});
