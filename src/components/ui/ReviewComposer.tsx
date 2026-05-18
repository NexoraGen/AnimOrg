import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Switch,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { StarRating } from './StarRating';
import { Button } from './Button';
import * as Haptics from 'expo-haptics';

interface ReviewComposerProps {
    onPost: (text: string, rating: number, isSpoiler: boolean) => Promise<void>;
    isPosting?: boolean;
}

export const ReviewComposer: React.FC<ReviewComposerProps> = ({ onPost, isPosting = false }) => {
    const themeColors = useThemeColors();
    const [text, setText] = useState('');
    const [rating, setRating] = useState(0);
    const [isSpoiler, setIsSpoiler] = useState(false);

    const handlePost = async () => {
        if (!text.trim()) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await onPost(text, rating, isSpoiler);
        setText('');
        setRating(0);
        setIsSpoiler(false);
    };

    const charCount = text.length;
    const maxChars = 1000;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>Share your thoughts</Text>

            <View style={styles.ratingSection}>
                <Text style={[styles.label, { color: themeColors.textMuted }]}>Rating (Optional)</Text>
                <StarRating
                    rating={rating}
                    interactive
                    size={24}
                    onChange={setRating}
                />
            </View>

            <TextInput
                style={[
                    styles.input,
                    {
                        color: themeColors.text,
                        backgroundColor: themeColors.surfaceVariant,
                        borderColor: themeColors.border
                    }
                ]}
                placeholder="What did you think of this anime? No spoilers unless marked!"
                placeholderTextColor={themeColors.textMuted}
                multiline
                numberOfLines={4}
                value={text}
                onChangeText={setText}
                maxLength={maxChars}
            />

            <View style={styles.footer}>
                <View style={styles.spoilerRow}>
                    <Text style={[styles.spoilerLabel, { color: themeColors.text }]}>Contains Spoilers</Text>
                    <Switch
                        value={isSpoiler}
                        onValueChange={setIsSpoiler}
                        trackColor={{ false: '#333', true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#FFF' : isSpoiler ? '#FFF' : '#f4f3f4'}
                    />
                </View>

                <View style={styles.rightFooter}>
                    <Text style={[styles.charCount, { color: charCount > maxChars * 0.9 ? colors.primary : themeColors.textMuted }]}>
                        {charCount}/{maxChars}
                    </Text>
                    <Button
                        title="Post Review"
                        onPress={handlePost}
                        disabled={!text.trim() || isPosting}
                        isLoading={isPosting}
                        style={styles.postButton}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.md,
    },
    ratingSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 14,
    },
    input: {
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    spoilerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spoilerLabel: {
        fontSize: 14,
        marginRight: spacing.sm,
    },
    rightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    charCount: {
        fontSize: 12,
        marginRight: spacing.md,
    },
    postButton: {
        minWidth: 120,
    },
});
