import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PostComposer } from './PostComposer';
import { CinematicModal } from '../../layout/CinematicModal';
import { spacing, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { CommunityPost } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { firestoreService } from '../../../services/firebase/firestore';
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
    onPostUpdated?: (updatedPost: CommunityPost) => void;
    onPostDeleted?: (postId: string) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = React.memo(({ post, onPress, onAuthRequired, onPressProfile, onPostUpdated, onPostDeleted }) => {
    const theme = useThemeColors();
    const setModalActive = useAppStore(state => state.setModalActive);
    const currentUser = useAppStore(state => state.user);
    const [showComments, setShowComments] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [showActionMenu, setShowActionMenu] = React.useState(false);

    React.useEffect(() => {
        setModalActive(showComments || isEditing || showActionMenu);
    }, [showComments, isEditing, showActionMenu]);

    const handlePressMenu = () => {
        if (!currentUser || currentUser.id !== post.userId) return;
        setShowActionMenu(true);
    };

    const confirmDelete = () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to permanently delete this post? This action cannot be undone.');
            if (confirmed) {
                handleDelete();
            }
        } else {
            Alert.alert(
                'Delete Post',
                'Are you sure you want to permanently delete this post? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', onPress: () => handleDelete(), style: 'destructive' }
                ]
            );
        }
    };

    const handleDelete = async () => {
        try {
            await firestoreService.deleteCommunityPost(post.id);
            onPostDeleted?.(post.id);
        } catch (error) {
            console.error('[CommunityPostCard] Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
        }
    };

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
                onPressMenu={handlePressMenu}
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

            {isEditing && (
                <Modal visible={isEditing} animationType="slide" transparent>
                    <PostComposer
                        onClose={() => setIsEditing(false)}
                        postToEdit={post}
                        onPostUpdated={(updatedPost) => {
                            onPostUpdated?.(updatedPost);
                            setIsEditing(false);
                        }}
                    />
                </Modal>
            )}

            {showActionMenu && (
                <Modal
                    visible={showActionMenu}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowActionMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowActionMenu(false)}
                    >
                        <View style={[styles.menuList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Text style={[styles.menuTitle, { color: theme.textDim }]}>Post Options</Text>
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
                                onPress={() => {
                                    setShowActionMenu(false);
                                    setIsEditing(true);
                                }}
                            >
                                <Feather name="edit-2" size={16} color={theme.text} style={{ marginRight: 8 }} />
                                <Text style={[styles.menuText, { color: theme.text }]}>Edit Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setShowActionMenu(false);
                                    confirmDelete();
                                }}
                            >
                                <Feather name="trash-2" size={16} color={theme.error || '#ff3b30'} style={{ marginRight: 8 }} />
                                <Text style={[styles.menuText, { color: theme.error || '#ff3b30' }]}>Delete Post</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
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
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuList: {
        width: 260,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuTitle: {
        fontSize: 11,
        fontWeight: '700',
        paddingVertical: 10,
        paddingHorizontal: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
