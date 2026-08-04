import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { db } from '../../src/services/firebase/config';
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc } from 'firebase/firestore';
import { FlashList } from '@shopify/flash-list';
import { UserSearchCard } from '../../src/components/features/community/UserSearchCard';
import { Feather } from '@expo/vector-icons';
import { User } from '../../src/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FollowersScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchFollowers = useCallback(async (isLoadMore = false) => {
        if (!id) return;
        if (isLoadMore && (!hasMore || loadingMore)) return;

        isLoadMore ? setLoadingMore(true) : setLoading(true);

        try {
            let q = query(
                collection(db, 'follows'),
                where('followingId', '==', id),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            if (isLoadMore && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snap = await getDocs(q);

            if (snap.docs.length < 20) {
                setHasMore(false);
            }
            if (snap.docs.length > 0) {
                setLastDoc(snap.docs[snap.docs.length - 1]);
            }

            const followerIds = snap.docs.map(d => d.data().followerId);

            // Fetch user profiles for these IDs
            const userPromises = followerIds.map(async (followerId) => {
                const uDoc = await getDoc(doc(db, 'users', followerId));
                if (uDoc.exists()) {
                    return { id: uDoc.id, ...uDoc.data() } as User;
                }
                return null;
            });

            const fetchedUsers = (await Promise.all(userPromises)).filter(Boolean) as User[];

            setUsers(prev => isLoadMore ? [...prev, ...fetchedUsers] : fetchedUsers);
        } catch (error) {
            console.error('Error fetching followers:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [id, lastDoc, hasMore, loadingMore]);

    useEffect(() => {
        fetchFollowers();
    }, [id]); // Initial fetch

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="chevron-left" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Followers</Text>
            <View style={{ width: 28 }} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {renderHeader()}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                // @ts-ignore
                <FlashList
                    data={users}
                    renderItem={({ item }) => <UserSearchCard user={item} />}
                    estimatedItemSize={70}
                    onEndReached={() => fetchFollowers(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={theme.primary} /> : null}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={[styles.emptyText, { color: theme.textDim }]}>No followers yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16 }
});
