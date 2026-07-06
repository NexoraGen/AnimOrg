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
import { PollCard } from '../../community/PollCard';
import { VersusCard } from '../../community/VersusCard';
import { SpoilerWrapper } from '../../community/SpoilerWrapper';
import { Image } from 'expo-image';

interface CommunityPostCardProps {
    post: CommunityPost;
    onPress?: () => void;
    onAuthRequired?: () => void;
    onPressProfile?: (userId: string) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = React.memo(({ post, onPress, onAuthRequired, onPressProfile }) => {
    const theme = useThemeColors();
    const setModalActive = useAppStore(state => state.setModalActive);
    const currentUser = useAppStore(state => state.user);
    const [showComments, setShowComments] = React.useState(false);

    React.useEffect(() => {
        setModalActive(showComments);
    }, [showComments]);

    const renderContent = () => {
        let injectedData = null;

        if (post.type === 'poll' && post.pollOptions) {
            injectedData = <PollCard postId={post.id} options={post.pollOptions} hasVotedId={post.hasVotedPoll} />;
        } else if (post.type === 'versus' && post.versusLeft && post.versusRight) {
            injectedData = <VersusCard postId={post.id} leftEntity={post.versusLeft} rightEntity={post.versusRight} hasVoted={post.hasVotedVersus} />;
        } else if (post.type === 'episode_discussion') {
            injectedData = (
                <View style={[styles.episodeBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.episodeText, { color: theme.primary }]}>
                        {post.animeTitle} • Episode {post.episodeNumber}
                    </Text>
                </View>
            );
        }

        const innerContent = (
            <View style={[styles.discussionContent, { borderLeftColor: theme.primary }]}>
                {post.mediaUrl && (
                    <View style={styles.mediaWrap}>
                        <Image source={post.mediaUrl} style={styles.mediaImage} contentFit="cover" />
                    </View>
                )}
                <Text style={[styles.discussionText, { color: theme.text }]}>
                    {post.content}
                </Text>
                {injectedData}
            </View>
        );

        if (post.hasSpoilers) {
            return (
                <SpoilerWrapper severity={post.spoilerSeverity}>
                    {innerContent}
                </SpoilerWrapper>
            );
        }

        return innerContent;
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: theme.border }]}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <PostHeader
                username={post.userId === currentUser?.id ? currentUser.username : post.username}
                avatarUrl={post.userId === currentUser?.id ? currentUser.avatarUrl : post.userAvatar}
                timestamp={post.createdAt}
                type={post.type}
                userId={post.userId}
                onPressProfile={() => onPressProfile?.(post.userId)}
            />

            {post.category && (
                <View style={[styles.categoryBadge, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}30` }]}>
                    <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>{post.category}</Text>
                </View>
            )}

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
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
    },
    content: {
        marginTop: spacing.xs,
    },
    discussionContent: {
        paddingVertical: 2,
        marginTop: 4,
    },
    discussionText: {
        fontSize: 15,
        fontWeight: '400',
        lineHeight: 22,
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
    },
    episodeBadge: {
        marginTop: spacing.sm,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    episodeText: {
        fontSize: 13,
        fontWeight: '800',
    },
    mediaWrap: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: spacing.xs,
        marginTop: 2,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
