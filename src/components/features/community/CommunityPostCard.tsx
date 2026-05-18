import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CinematicModal } from '../../layout/CinematicModal';
import { spacing, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { CommunityPost } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { PostHeader } from './PostHeader';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';

interface CommunityPostCardProps {
    post: CommunityPost;
    onPress?: () => void;
    onAuthRequired?: () => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = React.memo(({ post, onPress, onAuthRequired }) => {
    const theme = useThemeColors();
    const setModalActive = useAppStore(state => state.setModalActive);
    const currentUser = useAppStore(state => state.user);
    const [showComments, setShowComments] = React.useState(false);

    React.useEffect(() => {
        setModalActive(showComments);
    }, [showComments]);

    const renderContent = () => {
        return (
            <View style={[styles.discussionContent, { borderLeftColor: theme.primary }]}>
                <Text style={[styles.discussionText, { color: theme.text }]}>
                    {post.content}
                </Text>
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <PostHeader
                username={post.userId === currentUser?.id ? currentUser.username : post.username}
                avatarUrl={post.userId === currentUser?.id ? currentUser.avatarUrl : post.userAvatar}
                timestamp={post.createdAt}
                type={post.type}
                userId={post.userId}
            />

            <View style={styles.content}>
                {renderContent()}

                {post.hashtags && post.hashtags.length > 0 && (
                    <View style={styles.hashtagRow}>
                        {post.hashtags.map((tag) => (
                            <Text key={tag} style={[styles.hashtag, { color: theme.primary }]}>
                                #{tag}
                            </Text>
                        ))}
                    </View>
                )}
            </View>

            <PostActions
                likes={post.likes}
                comments={post.comments}
                shares={post.shares}
                isLiked={post.isLiked}
                isSaved={post.isSaved}
                postId={post.id}
                postOwnerId={post.userId}
                postContent={post.content}
                onAuthRequired={onAuthRequired}
                onComment={() => {
                    const user = useAppStore.getState().user;
                    if (!user && onAuthRequired) {
                        onAuthRequired();
                        return;
                    }
                    setShowComments(true);
                }}
            />

            <CinematicModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                maxWidth={600}
            >
                <CommentSection
                    post={post}
                    onClose={() => setShowComments(false)}
                />
            </CinematicModal>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        borderRadius: 20,
        marginBottom: spacing.md,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        marginTop: spacing.xs,
    },
    discussionContent: {
        borderLeftWidth: 4,
        paddingLeft: spacing.md,
        paddingVertical: 4,
    },
    discussionText: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 24,
    },
    hashtagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: spacing.md,
    },
    hashtag: {
        fontSize: 13,
        fontWeight: '700',
    }
});
