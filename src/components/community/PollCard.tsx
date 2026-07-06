import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';
import { PollOption } from '../../types';
import { firestoreService } from '../../services/firebase/firestore';

interface PollCardProps {
    postId: string;
    options: PollOption[];
    hasVotedId?: string;
    onVoteComplete?: (optionId: string) => void;
}

export function PollCard({ postId, options, hasVotedId, onVoteComplete }: PollCardProps) {
    const themeColors = useThemeColors();
    const [localVotedId, setLocalVotedId] = useState<string | undefined>(hasVotedId);
    const [internalOptions, setInternalOptions] = useState<PollOption[]>(options);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalVotes = internalOptions.reduce((acc, opt) => acc + opt.votes, 0) || 1; // avoid /0

    const handleVote = async (optionId: string) => {
        if (localVotedId || isSubmitting) return;

        setIsSubmitting(true);
        // Optimistic UI Update
        setLocalVotedId(optionId);
        setInternalOptions(prev => prev.map(opt =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        ));

        try {
            await firestoreService.votePoll(postId, optionId);
            if (onVoteComplete) onVoteComplete(optionId);
        } catch (e) {
            console.error('Failed to vote on poll', e);
            // Rollback
            setLocalVotedId(undefined);
            setInternalOptions(options);
        } finally {
            setIsSubmitting(false);
        }
    };

    const actualTotal = internalOptions.reduce((acc, opt) => acc + opt.votes, 0);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.surfaceVariant }]}>
            {internalOptions.map((opt) => {
                const isWinning = opt.votes === Math.max(...internalOptions.map(o => o.votes)) && opt.votes > 0;
                const percent = Math.round((opt.votes / totalVotes) * 100);
                const isSelected = localVotedId === opt.id;

                if (localVotedId) {
                    // Display Results Mode
                    return (
                        <View key={opt.id} style={styles.resultRowWrapper}>
                            <View style={[styles.progressBackground, { backgroundColor: themeColors.surface }]}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${percent}%`,
                                            backgroundColor: isWinning ? `${colors.primary}90` : themeColors.border
                                        }
                                    ]}
                                />
                                <View style={styles.resultContent}>
                                    <View style={styles.resultLeft}>
                                        {isSelected && <Feather name="check-circle" size={16} color={themeColors.text} style={{ marginRight: 8 }} />}
                                        <Text style={[styles.optionTextResult, { color: themeColors.text }, isWinning && { fontWeight: '700' }]}>
                                            {opt.text}
                                        </Text>
                                    </View>
                                    <Text style={[styles.percentText, { color: themeColors.text }]}>{percent}%</Text>
                                </View>
                            </View>
                        </View>
                    );
                }

                // Voting Mode
                return (
                    <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.7}
                        style={[styles.voteButton, { borderColor: themeColors.border }]}
                        onPress={() => handleVote(opt.id)}
                    >
                        <Text style={[styles.optionText, { color: themeColors.text }]}>{opt.text}</Text>
                    </TouchableOpacity>
                );
            })}

            {localVotedId && (
                <Text style={[styles.totalVotes, { color: themeColors.textDim }]}>
                    {actualTotal} votes • Final results
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    voteButton: {
        borderWidth: 1.5,
        borderRadius: borderRadius.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '700',
    },
    resultRowWrapper: {
        marginBottom: spacing.xs,
    },
    progressBackground: {
        height: 44,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
    },
    resultContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    resultLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionTextResult: {
        fontSize: 14,
        fontWeight: '500',
    },
    percentText: {
        fontSize: 14,
        fontWeight: '700',
    },
    totalVotes: {
        fontSize: 12,
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
    }
});
