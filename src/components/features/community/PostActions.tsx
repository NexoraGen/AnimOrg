import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import * as Haptics from 'expo-haptics';

import { firestoreService } from '../../../services/firebase/firestore';
import { useAppStore } from '../../../store/useAppStore';

interface PostActionsProps {
    likes: number;
    comments: number;
    shares: number;
    isLiked?: boolean;
    isSaved?: boolean;
    postId: string;
    postOwnerId?: string;
    postContent?: string;
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onAuthRequired?: () => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
    likes: initialLikes,
    comments,
    shares,
    isLiked: initialIsLiked,
    isSaved: initialIsSaved,
    postId,
    postOwnerId,
    postContent,
    onLike,
    onComment,
    onShare,
    onSave,
    onAuthRequired
}) => {
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const [likes, setLikes] = React.useState(initialLikes);
    const [isLiked, setIsLiked] = React.useState(initialIsLiked);
    const [isSaved, setIsSaved] = React.useState(initialIsSaved);

    const handleLike = async () => {
        if (!user) {
            onAuthRequired?.();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Optimistic UI
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikes(prev => newIsLiked ? prev + 1 : prev - 1);

        try {
            const result = await firestoreService.togglePostLike(user.id, postId);
            if (result && postOwnerId && postOwnerId !== user.id) {
                await firestoreService.createNotification({
                    recipientId: postOwnerId,
                    senderId: user.id,
                    senderName: user.username,
                    senderAvatar: user.avatarUrl,
                    type: 'like',
                    targetId: postId,
                    targetPreview: postContent?.substring(0, 50),
                });
            }
            onLike?.();
        } catch (error) {
            // Rollback on error
            setIsLiked(!newIsLiked);
            setLikes(prev => !newIsLiked ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        if (!user) {
            onAuthRequired?.();
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newIsSaved = !isSaved;
        setIsSaved(newIsSaved);

        try {
            await firestoreService.togglePostSave(user.id, postId);
            onSave?.();
        } catch (error) {
            setIsSaved(!newIsSaved);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.leftActions}>
                <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
                    <Feather
                        name="heart"
                        size={20}
                        color={isLiked ? theme.primary : theme.textDim}
                        fill={isLiked ? theme.primary : 'transparent'}
                    />
                    <Text style={[styles.actionText, { color: isLiked ? theme.primary : theme.textDim }]}>
                        {likes}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={onComment}>
                    <Feather name="message-circle" size={20} color={theme.textDim} />
                    <Text style={[styles.actionText, { color: theme.textDim }]}>{comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={onShare}>
                    <Feather name="share-2" size={19} color={theme.textDim} />
                    <Text style={[styles.actionText, { color: theme.textDim }]}>{shares}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSave}>
                <Feather
                    name="bookmark"
                    size={20}
                    color={isSaved ? theme.primary : theme.textDim}
                    fill={isSaved ? theme.primary : 'transparent'}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.xs,
    },
    leftActions: {
        flexDirection: 'row',
        gap: spacing.xl,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    }
});
