import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    useWindowDimensions,
    Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, colors } from '../../theme';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

interface SwipeableTabsProps {
    tabs: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode[];
    lazy?: boolean;
}

export const SwipeableTabs: React.FC<SwipeableTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    children,
    lazy = true,
}) => {
    const theme = useThemeColors();
    const { width: screenWidth } = useWindowDimensions();
    const tabHeaderScrollRef = useRef<ScrollView>(null);

    const activeIndex = tabs.indexOf(activeTab);
    const currentActiveIndex = activeIndex >= 0 ? activeIndex : 0;
    const [visited, setVisited] = useState<Record<number, boolean>>({ [currentActiveIndex]: true });

    // Track tab dimensions to align indicator and auto-center header
    const [tabWidths, setTabWidths] = useState<Record<number, number>>({});
    const [tabPositions, setTabPositions] = useState<Record<number, number>>({});
    const [headerWidth, setHeaderWidth] = useState(screenWidth);

    // Shared values for page navigation
    const translateX = useSharedValue(-currentActiveIndex * screenWidth);
    const isSwiping = useSharedValue(false);
    const startTranslateX = useSharedValue(0);

    // Keep translateX in sync when activeIndex changes or screen size changes
    useEffect(() => {
        translateX.value = withSpring(-currentActiveIndex * screenWidth, {
            damping: 22,
            stiffness: 130,
            mass: 0.8
        });

        // Track visited tabs
        setVisited(prev => ({ ...prev, [currentActiveIndex]: true }));

        // Center targeted tab header in top bar view
        const pos = tabPositions[currentActiveIndex] || 0;
        const w = tabWidths[currentActiveIndex] || 80;
        const scrollX = pos - (headerWidth / 2) + (w / 2);
        tabHeaderScrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }, [activeTab, screenWidth, tabPositions, tabWidths, headerWidth]);

    const handleTabChangeAfterSwipe = (index: number) => {
        if (index >= 0 && index < tabs.length) {
            const nextTab = tabs[index];
            if (nextTab !== activeTab) {
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                }
                onTabChange(nextTab);
            }
        }
    };

    // Pan Gesture Configuration for premium horizontal navigation
    const panGesture = Gesture.Pan()
        .activeOffsetX([-30, 30]) // Require 30px swipe threshold to activate (prevents conflict with mini-drags)
        .failOffsetY([-15, 15])  // Fail and delegate to vertical scrolling if vertical drag is detected early
        .onBegin(() => {
            isSwiping.value = true;
            startTranslateX.value = translateX.value;
        })
        .onUpdate((event) => {
            let nextVal = startTranslateX.value + event.translationX;

            // Rubber band bounds
            const leftBound = 0;
            const rightBound = -(tabs.length - 1) * screenWidth;
            if (nextVal > leftBound) {
                nextVal = leftBound + (nextVal - leftBound) * 0.3;
            } else if (nextVal < rightBound) {
                nextVal = rightBound + (nextVal - rightBound) * 0.3;
            }

            translateX.value = nextVal;
        })
        .onEnd((event) => {
            isSwiping.value = false;

            const currentPos = translateX.value;
            const dragDistance = event.translationX;
            const dragVelocity = event.velocityX;

            const floatIndex = -currentPos / screenWidth;
            let targetIndex = Math.round(floatIndex);

            const swipeThreshold = screenWidth * 0.25;

            if (dragDistance > swipeThreshold || (dragDistance > 50 && dragVelocity > 500)) {
                // Dragged right -> navigate to previous tab
                const minPos = Math.floor(floatIndex);
                targetIndex = Math.max(0, minPos);
            } else if (dragDistance < -swipeThreshold || (dragDistance < -50 && dragVelocity < -500)) {
                // Dragged left -> navigate to next tab
                const maxPos = Math.ceil(floatIndex);
                targetIndex = Math.min(tabs.length - 1, maxPos);
            } else {
                targetIndex = Math.max(0, Math.min(tabs.length - 1, Math.round(floatIndex)));
            }

            // Animate and update state
            translateX.value = withSpring(-targetIndex * screenWidth, {
                damping: 24,
                stiffness: 140,
                mass: 0.8
            });

            if (targetIndex !== currentActiveIndex) {
                runOnJS(handleTabChangeAfterSwipe)(targetIndex);
            }
        });

    // Pager view style
    const pagerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            flexDirection: 'row',
            width: screenWidth * tabs.length,
            flex: 1,
        };
    });

    // Premium dynamic indicator offset & width tracking
    const indicatorStyle = useAnimatedStyle(() => {
        const measuredCount = Object.keys(tabWidths).length;
        if (measuredCount < tabs.length) {
            return {
                left: 0,
                width: 0,
                opacity: 0
            };
        }

        const progress = -translateX.value / screenWidth;
        const inputRange = tabs.map((_, i) => i);
        const leftPositions = tabs.map((_, i) => (tabPositions[i] || 0) + spacing.md);
        const widths = tabs.map((_, i) => (tabWidths[i] || 80) - (spacing.md * 2));

        const left = interpolate(
            progress,
            inputRange,
            leftPositions,
            Extrapolate.CLAMP
        );

        const widthVal = interpolate(
            progress,
            inputRange,
            widths,
            Extrapolate.CLAMP
        );

        return {
            left,
            width: widthVal,
            opacity: 1
        };
    });

    return (
        <View style={styles.container}>
            {/* Header tab switcher bar with blur overlay */}
            <View
                style={[styles.headerContainer, { backgroundColor: theme.background + 'F2', borderBottomColor: 'rgba(255,255,255,0.05)' }]}
                onLayout={(e) => setHeaderWidth(e.nativeEvent.layout.width)}
            >
                <BlurView intensity={80} tint={theme.background === '#0B0B0B' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <ScrollView
                    ref={tabHeaderScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {tabs.map((tab, idx) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={styles.tab}
                                activeOpacity={0.7}
                                onLayout={(e) => {
                                    const { width, x } = e.nativeEvent.layout;
                                    setTabWidths(prev => ({ ...prev, [idx]: width }));
                                    setTabPositions(prev => ({ ...prev, [idx]: x }));
                                }}
                                onPress={() => {
                                    if (Platform.OS !== 'web') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                                    }
                                    onTabChange(tab);
                                }}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: isActive ? theme.primary : theme.textDim },
                                    isActive && styles.activeTabText
                                ]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Animated Sliding Underline Indicator */}
                    <Animated.View
                        style={[
                            styles.indicator,
                            {
                                backgroundColor: theme.primary,
                                shadowColor: colors.primary || theme.primary
                            },
                            indicatorStyle
                        ]}
                    />
                </ScrollView>
            </View>

            {/* Horizontal paging viewport representing swipable sections */}
            <View style={{ flex: 1, overflow: 'hidden' }}>
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={pagerStyle}>
                        {tabs.map((_, idx) => {
                            const isVisible = visited[idx];
                            return (
                                <View key={idx} style={{ width: screenWidth, flex: 1 }}>
                                    {lazy && !isVisible ? (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ color: theme.textDim, fontFamily: 'Outfit-Regular' }}>Loading section...</Text>
                                        </View>
                                    ) : (
                                        children[idx]
                                    )}
                                </View>
                            );
                        })}
                    </Animated.View>
                </GestureDetector>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        height: 50,
        width: '100%',
        borderBottomWidth: 1,
        zIndex: 90,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        position: 'relative',
    },
    tab: {
        paddingHorizontal: spacing.md,
        height: '100%',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
        fontFamily: 'Outfit-Medium',
    },
    activeTabText: {
        fontWeight: '800',
        fontFamily: 'Outfit-Bold',
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        borderRadius: 1.5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    }
});
