import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { firestoreService } from '../../../services/firebase/firestore';
import { useAppStore } from '../../../store/useAppStore';
import { getAvatarSource } from '../../../constants/avatars';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Discussion', 'Question', 'Fun', 'Recommendation', 'News', 'Review'] as const;
type PostCategory = typeof CATEGORIES[number];

const CATEGORY_DESCRIPTIONS: Record<PostCategory, string> = {
    Discussion: 'General anime discussions & opinions',
    Question: 'Ask for help, suggestions, or info',
    Fun: 'Jokes, hot takes & relatable anime humor',
    Recommendation: 'Anime suggestions & requests',
    News: 'Announcements, releases & industry news',
    Review: 'Reviews, impressions & ratings',
};

import { CommunityPost } from '../../../types';

const extractHashtags = (text: string): string[] => {
    const hashtags = text.match(/#[\w\u0590-\u05ff]+/g);
    return hashtags ? hashtags.map(h => h.slice(1).toLowerCase()) : [];
};

interface PostComposerProps {
    onClose: () => void;
    onPostCreated?: () => void;
    postToEdit?: CommunityPost;
    onPostUpdated?: (updatedPost: CommunityPost) => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onClose, onPostCreated, postToEdit, onPostUpdated }) => {
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const [content, setContent] = useState(postToEdit?.content || '');
    const [category, setCategory] = useState<PostCategory | null>(
        postToEdit?.category
            ? (postToEdit.category.charAt(0).toUpperCase() + postToEdit.category.slice(1)) as PostCategory
            : null
    );
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) {
            Alert.alert('Empty Post', 'Please express your thoughts.');
            return;
        }

        if (!category) {
            Alert.alert('No Category Selected', 'Please select a category for your post.');
            return;
        }

        if (!user) {
            Alert.alert('Login Required', 'You must be logged in to post.');
            return;
        }

        setIsPosting(true);
        try {
            if (postToEdit) {
                await firestoreService.updateCommunityPost(postToEdit.id, {
                    content: content.trim(),
                    category: category.toLowerCase(),
                });

                const updatedPost: CommunityPost = {
                    ...postToEdit,
                    content: content.trim(),
                    category: category.toLowerCase(),
                    hashtags: extractHashtags(content.trim()),
                    updatedAt: new Date() as any, // local representation
                };

                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onPostUpdated?.(updatedPost);
                onClose();
            } else {
                await firestoreService.createCommunityPost({
                    userId: user.id,
                    username: user.username || 'Anonymous',
                    userAvatar: user.avatarUrl,
                    type: 'discussion',
                    category: category.toLowerCase(),
                    content: content.trim(),
                    hasSpoilers: false,
                });

                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onPostCreated?.();
                onClose();
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', postToEdit ? 'Failed to update post. Please try again.' : 'Failed to create post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

    const canPost = content.trim().length > 0 && category !== null;

    return (
        <BlurView intensity={80} tint="dark" style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Feather name="x" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{postToEdit ? 'Edit Post' : 'Create Post'}</Text>
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={isPosting || !canPost}
                        style={[
                            styles.postBtn,
                            { backgroundColor: (isPosting || !canPost) ? theme.surfaceVariant : theme.primary }
                        ]}
                    >
                        {isPosting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={[styles.postBtnText, { opacity: canPost ? 1 : 0.5 }]}>{postToEdit ? 'Save' : 'Post'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    <View style={styles.userRow}>
                        <Image
                            source={getAvatarSource(user?.avatarUrl)}
                            style={styles.avatar as any}
                        />
                        <View>
                            <Text style={[styles.username, { color: theme.text }]}>{user?.username ? `@${user.username}` : '@guest'}</Text>
                            {category ? (
                                <View style={[styles.categoryIndicator, { backgroundColor: `${theme.primary}22` }]}>
                                    <Text style={[styles.categoryIndicatorText, { color: theme.primary }]}>{category}</Text>
                                </View>
                            ) : (
                                <View style={[styles.categoryIndicator, { backgroundColor: theme.surfaceVariant }]}>
                                    <Text style={[styles.categoryIndicatorText, { color: theme.textDim }]}>Select a category ↓</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TextInput
                        placeholder="What's on your mind?"
                        placeholderTextColor={theme.textDim}
                        style={[styles.input, { color: theme.text }]}
                        multiline
                        value={content}
                        onChangeText={setContent}
                        autoFocus
                    />

                    <View style={styles.categories}>
                        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
                            Category <Text style={{ color: theme.primary }}>*</Text>
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setCategory(cat);
                                    }}
                                    style={[
                                        styles.categoryChip,
                                        {
                                            backgroundColor: category === cat ? theme.primary : theme.surfaceVariant,
                                            borderColor: category === cat ? theme.primary : 'transparent'
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: category === cat ? '#fff' : theme.textDim }
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {category && (
                            <Text style={[styles.categoryHint, { color: theme.textDim }]}>
                                {CATEGORY_DESCRIPTIONS[category]}
                            </Text>
                        )}
                    </View>
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: theme.border }]}>
                    <TouchableOpacity style={styles.footerAction}>
                        <Feather name="at-sign" size={22} color={theme.textDim} />
                        <Text style={[styles.footerLabel, { color: theme.textDim }]}>Mention</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction}>
                        <Feather name="hash" size={22} color={theme.textDim} />
                        <Text style={[styles.footerLabel, { color: theme.textDim }]}>Hashtag</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...Platform.select({
            web: {
                height: '100vh' as any,
                width: '100vw' as any,
            }
        })
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    postBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    postBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    form: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: spacing.md,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    categoryIndicator: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
    },
    categoryIndicatorText: {
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        fontSize: 18,
        lineHeight: 24,
        textAlignVertical: 'top',
        minHeight: 120,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: spacing.sm,
    },
    categories: {
        marginTop: spacing.xl,
    },
    categoryList: {
        paddingVertical: spacing.xs,
        gap: 10,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    categoryHint: {
        marginTop: spacing.sm,
        fontSize: 12,
        fontStyle: 'italic',
        opacity: 0.7,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    footerLabel: {
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 14,
    }
});
