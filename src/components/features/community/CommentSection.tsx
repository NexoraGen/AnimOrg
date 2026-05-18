import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { spacing, colors, borderRadius } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { PostComment, CommunityPost } from '../../../types';
import { firestoreService } from '../../../services/firebase/firestore';
import { useAppStore } from '../../../store/useAppStore';
import { CommentItem } from './CommentItem';
import { CommunityNotification } from '../../../types';

interface CommentSectionProps {
    post: CommunityPost;
    onClose: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ post, onClose }) => {
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);
    const router = useRouter();

    const [comments, setComments] = useState<PostComment[]>([]);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<PostComment | null>(null);

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async (refresh = false) => {
        setIsLoading(true);
        const result = await firestoreService.getPostComments(post.id, refresh ? null : lastDoc);
        if (refresh) {
            setComments(result.comments);
        } else {
            setComments(prev => [...prev, ...result.comments]);
        }
        setLastDoc(result.lastDoc);
        setIsLoading(false);
    };

    const handleSend = async () => {
        if (!text.trim() || !user) return;
        setIsPosting(true);

        try {
            const commentData: Partial<PostComment> = {
                postId: post.id,
                userId: user.id,
                username: user.username,
                userAvatar: user.avatarUrl,
                text: text.trim(),
                parentId: replyTo?.id || undefined,
                depth: replyTo ? (replyTo.depth || 0) + 1 : 0,
            };

            await firestoreService.addPostComment(post.id, commentData);

            // Create notification for post owner or parent comment owner
            const recipientId = replyTo ? replyTo.userId : post.userId;
            if (recipientId !== user.id) {
                await firestoreService.createNotification({
                    recipientId,
                    senderId: user.id,
                    senderName: user.username,
                    senderAvatar: user.avatarUrl,
                    type: replyTo ? 'reply' : 'comment',
                    targetId: post.id,
                    targetPreview: text.trim().substring(0, 50),
                });
            }

            setText('');
            setReplyTo(null);
            loadComments(true);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error(error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text }]}>Comments ({post.comments})</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Feather name="x" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isLoading && comments.length === 0 ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
                ) : (
                    comments.map((comment: PostComment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onReply={(c: PostComment) => {
                                setReplyTo(c);
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            postId={post.id}
                        />
                    ))
                )}
            </ScrollView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                {replyTo && (
                    <View style={[styles.replyBar, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.replyText, { color: theme.textDim }]} numberOfLines={1}>
                            Replying to <Text style={{ fontWeight: 'bold' }}>@{replyTo.username}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setReplyTo(null)}>
                            <Feather name="x" size={16} color={theme.textDim} />
                        </TouchableOpacity>
                    </View>
                )}
                {user ? (
                    <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Add a comment..."
                            placeholderTextColor={theme.textDim}
                            value={text}
                            onChangeText={setText}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!text.trim() || isPosting}
                            style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.primary : theme.surfaceVariant }]}
                        >
                            {isPosting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                        <Text style={{ color: theme.textDim, fontSize: 14 }}>Sign in to write comments</Text>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                router.push('/(auth)/login');
                            }}
                            style={{
                                backgroundColor: theme.primary,
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
    },
    replyText: {
        fontSize: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        fontSize: 15,
        paddingTop: 8,
        paddingRight: 12,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
