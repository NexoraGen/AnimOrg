import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';
import { VersusEntity } from '../../types';
import { firestoreService } from '../../services/firebase/firestore';

interface VersusCardProps {
    postId: string;
    leftEntity: VersusEntity;
    rightEntity: VersusEntity;
    hasVoted?: 'left' | 'right';
    onVoteComplete?: (side: 'left' | 'right') => void;
}

export function VersusCard({ postId, leftEntity, rightEntity, hasVoted, onVoteComplete }: VersusCardProps) {
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();
    const [localVote, setLocalVote] = useState<'left' | 'right' | undefined>(hasVoted);
    const [leftData, setLeftData] = useState(leftEntity);
    const [rightData, setRightData] = useState(rightEntity);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalVotes = Math.max(leftData.votes + rightData.votes, 1);
    const leftPercent = Math.round((leftData.votes / totalVotes) * 100);
    const rightPercent = 100 - leftPercent;

    const handleVote = async (side: 'left' | 'right') => {
        if (localVote || isSubmitting) return;

        setIsSubmitting(true);
        setLocalVote(side);

        if (side === 'left') {
            setLeftData({ ...leftData, votes: leftData.votes + 1 });
        } else {
            setRightData({ ...rightData, votes: rightData.votes + 1 });
        }

        try {
            await firestoreService.voteVersus(postId, side);
            if (onVoteComplete) onVoteComplete(side);
        } catch {
            // Revert optimism
            setLocalVote(undefined);
            setLeftData(leftEntity);
            setRightData(rightEntity);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.splitWrapper, { backgroundColor: themeColors.surfaceVariant, borderColor: themeColors.border }]}>

                {/* LEFT ENTITY */}
                <TouchableOpacity
                    style={styles.half}
                    activeOpacity={localVote ? 1 : 0.8}
                    onPress={() => handleVote('left')}
                >
                    {leftData.imageUrl ? (
                        <Image source={leftData.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#B80000' }]} />
                    )}

                    <LinearGradient
                        colors={localVote === 'left' ? ['rgba(229,9,20,0.8)', 'transparent'] : ['rgba(0,0,0,0.8)', 'transparent']}
                        start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.contentOverlayLeft}>
                        {localVote && <Text style={styles.percentText}>{leftPercent}%</Text>}
                        <Text style={styles.entityTitle} numberOfLines={2}>{leftData.title}</Text>
                    </View>
                </TouchableOpacity>

                {/* VS DIVIDER */}
                <View style={[styles.vsBadge, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <Text style={[styles.vsText, { color: themeColors.text }]}>VS</Text>
                </View>

                {/* RIGHT ENTITY */}
                <TouchableOpacity
                    style={styles.half}
                    activeOpacity={localVote ? 1 : 0.8}
                    onPress={() => handleVote('right')}
                >
                    {rightData.imageUrl ? (
                        <Image source={rightData.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A5F7A' }]} />
                    )}

                    <LinearGradient
                        colors={localVote === 'right' ? ['rgba(0,102,204,0.8)', 'transparent'] : ['rgba(0,0,0,0.8)', 'transparent']}
                        start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.contentOverlayRight}>
                        {localVote && <Text style={styles.percentText}>{rightPercent}%</Text>}
                        <Text style={[styles.entityTitle, { textAlign: 'right' }]} numberOfLines={2}>
                            {rightData.title}
                        </Text>
                    </View>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: spacing.md,
    },
    splitWrapper: {
        flexDirection: 'row',
        height: 140,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    half: {
        flex: 1,
        position: 'relative',
    },
    contentOverlayLeft: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: spacing.sm,
        paddingBottom: spacing.md,
    },
    contentOverlayRight: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: spacing.sm,
        paddingBottom: spacing.md,
    },
    entityTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    percentText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: spacing.xs,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    vsBadge: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        width: 40,
        height: 40,
        borderRadius: 20,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    vsText: {
        fontSize: 14,
        fontWeight: '900',
        fontStyle: 'italic',
    }
});
