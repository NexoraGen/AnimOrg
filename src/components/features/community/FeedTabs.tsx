import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { spacing, borderRadius, colors } from '../../../theme';
import { useThemeColors } from '../../../hooks/useThemeColors';

interface FeedTabsProps {
    tabs: string[];
    activeTab: string;
    onTabPress: (tab: string) => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ tabs, activeTab, onTabPress }) => {
    const theme = useThemeColors();

    return (
        <View style={[styles.container, { backgroundColor: theme.background + 'F2' }]}>
            <BlurView intensity={80} tint={theme.background === '#0B0B0B' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => onTabPress(tab)}
                            style={styles.tab}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: isActive ? theme.primary : theme.textDim },
                                isActive && styles.activeTabText
                            ]}>
                                {tab}
                            </Text>
                            {isActive && (
                                <View style={[styles.indicator, { backgroundColor: theme.primary }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        alignItems: 'center',
    },
    tab: {
        paddingHorizontal: spacing.md,
        height: '100%',
        justifyContent: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    activeTabText: {
        fontWeight: '800',
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        left: spacing.md,
        right: spacing.md,
        height: 3,
        borderRadius: 1.5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    }
});
