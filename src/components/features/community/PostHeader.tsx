import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { formatDistanceToNow } from 'date-fns';

import { firestoreService } from '../../../services/firebase/firestore';
import { useAppStore } from '../../../store/useAppStore';
import { getAvatarSource } from '../../../constants/avatars';
import { FollowButton } from '../../ui/FollowButton';

interface PostHeaderProps {
    username: string;
    avatarUrl?: string;
    timestamp: any;
    type?: string;
    userId: string;
    onPressProfile?: () => void;
    onPressMenu?: () => void;
}

export const PostHeader: React.FC<PostHeaderProps> = React.memo(({
    username,
    avatarUrl,
    timestamp,
    type,
    userId,
    onPressProfile,
    onPressMenu
}) => {
    const theme = useThemeColors();
    const currentUser = useAppStore(state => state.user);
    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8} delayPressIn={150}>
                    <Image
                        source={getAvatarSource(avatarUrl)}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                </TouchableOpacity>
                <View style={styles.info}>
                    <View style={styles.userRow}>
                        <TouchableOpacity onPress={onPressProfile} activeOpacity={0.8} delayPressIn={150}>
                            <Text style={[styles.username, { color: theme.text }]}>{username ? `@${username}` : '@anonymous'}</Text>
                            <Text style={[styles.timestamp, { color: theme.textDim }]}>
                                {timestamp?.toDate ? formatDistanceToNow(timestamp.toDate()) + ' ago' : (typeof timestamp === 'string' ? timestamp : '')}
                            </Text>
                        </TouchableOpacity>

                        <FollowButton
                            userId={userId}
                            style={styles.followBtn}
                            textStyle={styles.followBtnText}
                            useDefaultStyles={false}
                        />

                        {type === 'news' && (
                            <View style={[styles.badge, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                                <Text style={[styles.badgeText, { color: '#3498db' }]}>NEWS</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            {currentUser?.id === userId && (
                <TouchableOpacity onPress={onPressMenu}>
                    <Feather name="more-horizontal" size={20} color={theme.textDim} />
                </TouchableOpacity>
            )}
        </View>
    );
});


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    info: {
        marginLeft: spacing.md,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    username: {
        fontSize: 15,
        fontWeight: '800',
    },
    timestamp: {
        fontSize: 12,
        marginTop: 1,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    followBtn: {
        marginLeft: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    followBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    }
});
