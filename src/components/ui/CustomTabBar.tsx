import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Platform, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../theme';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const tabCount = state.routes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;

  useEffect(() => {
    Animated.spring(underlineAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [state.index]);

  return (
    <View style={[
      styles.tabBar,
      {
        backgroundColor: themeColors.surface,
        height: 64 + insets.bottom,
        paddingBottom: insets.bottom,
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icon = options.tabBarIcon ? options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? themeColors.primary : themeColors.textDim,
          size: 24
        }) : null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconWrapper,
              isFocused && { backgroundColor: `${themeColors.primary}15` }
            ]}>
              {icon}
            </View>
          </TouchableOpacity>
        );
      })}

      <Animated.View
        style={[
          styles.underline,
          {
            width: tabWidth * 0.4,
            left: tabWidth * 0.3,
            backgroundColor: themeColors.primary,
            transform: [{ translateX: underlineAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underline: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 2,
    // Red glow
    shadowColor: '#B71C1C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
