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

const { width } = Dimensions.get('window');

const CATEGORIES = ['Discussion', 'Theory', 'Recommendation', 'News', 'Hot Take', 'Question'];

interface PostComposerProps {
    onClose: () => void;
    onPostCreated?: () => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onClose, onPostCreated }) => {
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const [content, setContent] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) {
            Alert.alert('Empty Post', 'Please express your thoughts.');
            return;
        }

        if (!user) {
            Alert.alert('Login Required', 'You must be logged in to post.');
            return;
        }

        setIsPosting(true);
        try {
            await firestoreService.createCommunityPost({
                userId: user.id,
                username: user.username || 'Anonymous',
                userAvatar: user.avatarUrl,
                type: 'discussion',
                category: category as any,
                content: content.trim(),
                isSpoiler: false, // In text-only mode, we can simplify this or keep it for text
            });

            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onPostCreated?.();
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

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
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Create Post</Text>
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={isPosting}
                        style={[
                            styles.postBtn,
                            { backgroundColor: isPosting ? theme.surfaceVariant : theme.primary }
                        ]}
                    >
                        {isPosting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.postBtnText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                    <View style={styles.userRow}>
                        <Image
                            source={user?.avatarUrl ? { uri: user.avatarUrl } : require('../../../../assets/guest-avatar.png')}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={[styles.username, { color: theme.text }]}>{user?.username ? `@${user.username}` : '@guest'}</Text>
                            <TouchableOpacity style={[styles.categorySelector, { backgroundColor: theme.surfaceVariant }]}>
                                <Text style={[styles.categoryText, { color: theme.textDim }]}>{category}</Text>
                                <Feather name="chevron-down" size={14} color={theme.textDim} />
                            </TouchableOpacity>
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
                        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
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
    categorySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    categoryText: {
        fontSize: 12,
        marginRight: 4,
    },
    input: {
        fontSize: 18,
        lineHeight: 24,
        textAlignVertical: 'top',
        minHeight: 120,
    },
    mediaPreview: {
        marginVertical: spacing.lg,
    },
    imageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: 10,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    options: {
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 16,
        marginLeft: 12,
    },
    toggle: {
        width: 40,
        height: 22,
        borderRadius: 11,
        padding: 2,
        justifyContent: 'center',
    },
    toggleDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fff',
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
