import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppStore } from '../src/store/useAppStore';
import { typography, spacing, borderRadius } from '../src/theme';
import { AnimatedToggle } from '../src/components/ui/AnimatedToggle';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { GlassHeader } from '../src/components/ui';

export default function AppSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();

  const {
    theme, toggleTheme,
    autoplayTrailer, setAutoplayTrailer,
    reduceHaptics, setReduceHaptics,
    dataSaver, setDataSaver,
    clearSearchHistory, clearRecentlyViewed
  } = useAppStore();

  const triggerHaptic = () => {
    if (Platform.OS !== 'web' && !reduceHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleClearHistory = () => {
    triggerHaptic();
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to clear your search history?")) {
        clearSearchHistory();
      }
    } else {
      Alert.alert(
        "Clear Search History",
        "Are you sure you want to clear your search history?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: clearSearchHistory }
        ]
      );
    }
  };

  const handleClearViewed = () => {
    triggerHaptic();
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to clear your recently viewed items?")) {
        clearRecentlyViewed();
      }
    } else {
      Alert.alert(
        "Clear Recently Viewed",
        "Are you sure you want to clear your recently viewed items?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: clearRecentlyViewed }
        ]
      );
    }
  };

  const renderToggle = (label: string, icon: keyof typeof Feather.glyphMap, value: boolean, onToggle: () => void) => (
    <AnimatedToggle
      value={value}
      onToggle={onToggle}
      style={[styles.row, { borderBottomColor: themeColors.border }]}
      label={label}
      icon={icon}
    />
  );

  const renderAction = (label: string, icon: keyof typeof Feather.glyphMap, onPress: () => void, isDestructive?: boolean) => (
    <TouchableOpacity 
      style={[styles.row, { borderBottomColor: themeColors.border }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: isDestructive ? `${themeColors.error}20` : themeColors.surfaceVariant }]}>
          <Feather name={icon} size={18} color={isDestructive ? themeColors.error : themeColors.text} />
        </View>
        <Text style={[styles.rowLabel, { color: isDestructive ? themeColors.error : themeColors.text }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={themeColors.textDim} />
    </TouchableOpacity>
  );

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader 
        title="App Settings" 
        leftComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>
        
        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>PREFERENCES</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {renderToggle('Dark Mode', 'moon', theme === 'dark', toggleTheme)}
          {renderToggle('Reduce Haptic Feedback', 'smartphone', reduceHaptics, () => setReduceHaptics(!reduceHaptics))}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>PLAYBACK & DATA</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {renderToggle('Autoplay Trailers', 'play-circle', autoplayTrailer, () => setAutoplayTrailer(!autoplayTrailer))}
          {renderToggle('Data Saver Mode', 'wifi', dataSaver, () => setDataSaver(!dataSaver))}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>STORAGE</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {renderAction('Clear Search History', 'search', handleClearHistory, true)}
          {renderAction('Clear Recently Viewed', 'clock', handleClearViewed, true)}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>ABOUT</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={[styles.row, { borderBottomColor: themeColors.border }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceVariant }]}>
                <Feather name="info" size={18} color={themeColors.text} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Version</Text>
            </View>
            <Text style={[styles.rowValue, { color: themeColors.textDim }]}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          {renderAction('Send Feedback', 'message-square', () => { triggerHaptic(); })}
        </View>

      </ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: typography.sizes.sm,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
