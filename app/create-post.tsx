import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PostComposer } from '../src/components/features/community/PostComposer';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';

export default function CreatePostScreen() {
    const router = useRouter();
    const theme = useThemeColors();

    const handleClose = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PostComposer
                onClose={handleClose}
                onPostCreated={handleClose}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
