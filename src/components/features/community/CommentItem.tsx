import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { spacing, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { PostComment } from '../../../types';
import { firestoreService } from '../../../services/firebase/firestore';
import { useAppStore } from '../../../store/useAppStore';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
    comment: PostComment;
    onReply: (comment: PostComment) => void;
    postId: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, postId }) => {
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [likes, setLikes] = useState(comment.likes || 0);

    const handleLike = async () => {
        if (!user) return;
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikes(prev => prev + (newIsLiked ? 1 : -1));

        try {
            await firestoreService.toggleCommentLike(user.id, postId, comment.id);
            if (newIsLiked && comment.userId !== user.id) {
                await firestoreService.createNotification({
                    recipientId: comment.userId,
                    senderId: user.id,
                    senderName: user.username,
                    senderAvatar: user.avatarUrl,
                    type: 'like',
                    targetId: postId,
                    targetPreview: comment.text.substring(0, 50),
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const indent = (comment.depth || 0) * 20;

    const commentAvatar = comment.userId === user?.id && user?.avatarUrl ? { uri: user.avatarUrl } : (comment.userAvatar ? { uri: comment.userAvatar } : require('../../../../assets/guest-avatar.png'));
    const commentUsername = comment.userId === user?.id && user?.username ? user.username : comment.username;

    return (
        <View style={[styles.container, { marginLeft: indent }]}>
            <Image
                source={commentAvatar}
                style={styles.avatar}
            />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.username, { color: theme.text }]}>{commentUsername ? `@${commentUsername}` : '@anonymous'}</Text>
                    <Text style={[styles.time, { color: theme.textDim }]}>
                        {formatDistanceToNow(comment.createdAt?.toDate?.() || new Date())} ago
                    </Text>
                </View>
                <Text style={[styles.text, { color: theme.text }]}>{comment.text}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
                        <Feather
                            name={isLiked ? "heart" : "heart"}
                            size={14}
                            color={isLiked ? colors.accent : theme.textDim}
                        />
                        <Text style={[styles.actionText, { color: isLiked ? colors.accent : theme.textDim }]}>
                            {likes > 0 ? likes : 'Like'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onReply(comment)} style={styles.actionBtn}>
                        <Feather name="message-square" size={14} color={theme.textDim} />
                        <Text style={[styles.actionText, { color: theme.textDim }]}>Reply</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    username: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    time: {
        fontSize: 11,
    },
    text: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 16,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 11,
        fontWeight: '600',
    }
});
