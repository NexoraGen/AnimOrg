import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { firestoreService } from '../../src/services/firebase/firestore';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { CommunityPost } from '../../src/types';
import { useAppStore } from '../../src/store/useAppStore';
import { getSafeTopInset } from '../../src/utils/layout';

export default function SinglePostScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAppStore(s => s.user);

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                const data = await firestoreService.getCommunityPost(id);
                if (data && user) {
                    const resolved = await firestoreService.resolveSavesForPosts(user.id, [data]);
                    setPost(resolved[0]);
                } else {
                    setPost(data);
                }
            } catch (error) {
                console.error("Error fetching single post", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, user?.id]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: getSafeTopInset(insets) + 12 }]}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')}
                    style={styles.backBtn}
                >
                    <Feather name="chevron-left" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Post</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : post ? (
                    <View style={{ marginTop: 8 }}>
                        <CommunityPostCard post={post} />
                    </View>
                ) : (
                    <View style={styles.center}>
                        <Feather name="alert-circle" size={48} color={theme.textDim} style={{ marginBottom: 12 }} />
                        <Text style={[styles.errorText, { color: theme.textDim }]}>This post could not be found or has been deleted.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        marginTop: 100,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    }
});
