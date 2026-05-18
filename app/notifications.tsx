import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';

import { spacing, colors, borderRadius } from '../src/theme';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { GlassHeader } from '../src/components/ui';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { firestoreService } from '../src/services/firebase/firestore';
import { useAppStore } from '../src/store/useAppStore';
import { CommunityNotification } from '../src/types';

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const user = useAppStore(state => state.user);

    const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const data = await firestoreService.getNotifications(user.id);
        setNotifications(data);
        setIsLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleNotifPress = async (notif: CommunityNotification) => {
        await firestoreService.markNotificationRead(notif.id);
        // Navigate to related content
        if (notif.type === 'follow') {
            router.push({ pathname: '/user/[id]', params: { id: notif.senderId } });
        } else {
            // For like/comment/reply, go to post tab
            router.push('/(tabs)/social');
        }
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'like': return { name: 'heart', color: colors.accent };
            case 'comment':
            case 'reply': return { name: 'message-circle', color: '#3498db' };
            case 'follow': return { name: 'user-plus', color: colors.primary };
            default: return { name: 'bell', color: theme.textDim };
        }
    };

    const getNotifMessage = (notif: CommunityNotification) => {
        switch (notif.type) {
            case 'like': return `liked your post: "${notif.targetPreview}"`;
            case 'comment': return `commented on your post: "${notif.targetPreview}"`;
            case 'reply': return `replied to your comment: "${notif.targetPreview}"`;
            case 'follow': return `started following you`;
            default: return `interacted with you`;
        }
    };

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: theme.background }]}>
            <GlassHeader
                title="Notifications"
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={28} color={theme.text} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingTop: 100 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Feather name="bell-off" size={48} color={theme.textDim} />
                            <Text style={[styles.emptyText, { color: theme.textDim }]}>No notifications yet</Text>
                        </View>
                    ) : (
                        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
                    )
                }
                renderItem={({ item }) => {
                    const icon = getNotifIcon(item.type);
                    return (
                        <TouchableOpacity
                            style={[
                                styles.notifItem,
                                { backgroundColor: item.read ? 'transparent' : `${theme.primary}05` }
                            ]}
                            onPress={() => handleNotifPress(item)}
                        >
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={item.senderAvatar ? { uri: item.senderAvatar } : require('../assets/guest-avatar.png')}
                                    style={styles.avatar}
                                />
                                <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                                    <Feather name={icon.name as any} size={10} color="#fff" />
                                </View>
                            </View>
                            <View style={styles.notifContent}>
                                <Text style={[styles.message, { color: theme.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>{item.senderName}</Text> {getNotifMessage(item)}
                                </Text>
                                <Text style={[styles.time, { color: theme.textDim }]}>
                                    {formatDistanceToNow(item.createdAt?.toDate?.() || new Date())} ago
                                </Text>
                            </View>
                            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                        </TouchableOpacity>
                    );
                }}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    notifItem: {
        flexDirection: 'row',
        padding: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifContent: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: 16,
    }
});
