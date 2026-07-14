import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, FlatList, Modal, TextInput, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppStore } from '../src/store/useAppStore';
import { typography, spacing, borderRadius } from '../src/theme';
import { AnimatedToggle } from '../src/components/ui/AnimatedToggle';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { GlassHeader } from '../src/components/ui';
import { firestoreService } from '../src/services/firebase/firestore';
import { searchTimezones, autoDetectTimezone } from '../src/utils/timezoneHelper';
import { getLocalAiringInfo } from '../src/utils/releaseHelper';
import { notificationPermission } from '../src/services/notificationPermission';

export default function AppSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();

  const {
    theme, toggleTheme,
    autoplayTrailer, setAutoplayTrailer,
    reduceHaptics, setReduceHaptics,
    dataSaver, setDataSaver,
    clearSearchHistory, clearRecentlyViewed,
    episodeAlertsEnabled, setEpisodeAlertsEnabled,
    use24Hour, setUse24Hour,
    notificationsEnabled, setNotificationsEnabled,
    user, updateProfile,
    isGuest,
    levelUpAnimationsEnabled, setLevelUpAnimationsEnabled,
    notificationSettings, updateNotificationSettings
  } = useAppStore();

  const [timezoneModalVisible, setTimezoneModalVisible] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const [permissionStatus, setPermissionStatus] = React.useState<'unknown' | 'granted' | 'denied' | 'blocked'>('unknown');

  const checkPermission = React.useCallback(async () => {
    const status = await notificationPermission.getPermissionStatus();
    setPermissionStatus(status);
  }, []);

  React.useEffect(() => {
    checkPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermission]);

  const activeTimezoneId = user?.timezone || autoDetectTimezone().id;
  const filteredTimezones = React.useMemo(() => {
    return searchTimezones(searchText);
  }, [searchText]);

  const previewBroadcast = { day: 'Sundays', time: '00:00' };
  const getLocalizedPreviewText = (tzId: string) => {
    const info = getLocalAiringInfo(previewBroadcast, tzId, 'en-US', use24Hour);
    if (!info) return 'Unknown Release Slot';
    return `${info.localDay} • ${info.localTime}`;
  };

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

  const renderClickableSelector = (label: string, icon: keyof typeof Feather.glyphMap, valueText: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: themeColors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceVariant }]}>
          <Feather name={icon} size={18} color={themeColors.text} />
        </View>
        <Text style={[styles.rowLabel, { color: themeColors.text }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        <Text style={[styles.rowValueText, { color: themeColors.primary }]}>{valueText}</Text>
        <Feather name="chevron-right" size={20} color={themeColors.textDim} />
      </View>
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

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>ACCOUNT & SECURITY</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginBottom: 20 }]}>
          {renderAction('Privacy & Security', 'shield', () => {
            triggerHaptic();
            if (isGuest) {
              if (Platform.OS === 'web') {
                alert("Account Required\nPlease sign in or register to access security and password settings.");
              } else {
                Alert.alert(
                  "Account Required",
                  "Please sign in or register to access security and password settings."
                );
              }
            } else {
              router.push('/privacy-security');
            }
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>NOTIFICATIONS</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginBottom: 12 }]}>
          {renderToggle('Push Notifications', 'bell', notificationsEnabled && permissionStatus === 'granted', async () => {
            if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
              Alert.alert(
                "Notifications Disabled",
                "Please enable notifications in your device settings to receive updates.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Open Settings", onPress: () => notificationPermission.openSettings() }
                ]
              );
              return;
            }
            if (permissionStatus === 'unknown') {
              const result = await notificationPermission.requestPermission();
              setPermissionStatus(result);
              if (result === 'granted') {
                setNotificationsEnabled(true);
              } else {
                setNotificationsEnabled(false);
              }
              triggerHaptic();
              return;
            }

            const nextVal = !notificationsEnabled;
            setNotificationsEnabled(nextVal);
            triggerHaptic();
          })}

          <View style={(!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 }} pointerEvents={(!notificationsEnabled || permissionStatus !== 'granted') ? 'none' : 'auto'}>
            {renderToggle('Episode Releases', 'tv', notificationSettings?.episodeReleases ?? true, () => {
              updateNotificationSettings({ episodeReleases: !(notificationSettings?.episodeReleases ?? true) });
              triggerHaptic();
            })}
            {renderToggle('Continue Watching', 'clock', notificationSettings?.continueWatching ?? true, () => {
              updateNotificationSettings({ continueWatching: !(notificationSettings?.continueWatching ?? true) });
              triggerHaptic();
            })}
            {renderToggle('Recommendations', 'aperture', notificationSettings?.recommendations ?? true, () => {
              updateNotificationSettings({ recommendations: !(notificationSettings?.recommendations ?? true) });
              triggerHaptic();
            })}
            {renderToggle('Achievements', 'award', notificationSettings?.achievements ?? true, () => {
              updateNotificationSettings({ achievements: !(notificationSettings?.achievements ?? true) });
              triggerHaptic();
            })}
            {renderToggle('Weekly Summary', 'list', notificationSettings?.weeklySummary ?? true, () => {
              updateNotificationSettings({ weeklySummary: !(notificationSettings?.weeklySummary ?? true) });
              triggerHaptic();
            })}
            {renderToggle('News & Announcements', 'file-text', notificationSettings?.news ?? true, () => {
              updateNotificationSettings({ news: !(notificationSettings?.news ?? true) });
              triggerHaptic();
            })}
          </View>
        </View>

        {(permissionStatus === 'blocked' || permissionStatus === 'denied') && (
          <View style={[styles.warningBanner, { backgroundColor: `${themeColors.error}10`, borderColor: `${themeColors.error}30`, borderWidth: 1 }]}>
            <Feather name="alert-triangle" size={16} color={themeColors.error} />
            <Text style={[styles.warningText, { color: themeColors.textDim }]}>
              Notifications are disabled for AnimOrg in your device settings.
            </Text>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: themeColors.primary }]}
              onPress={() => notificationPermission.openSettings()}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>REGION & TIME</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: themeColors.border }]}
            onPress={() => {
              setTimezoneModalVisible(true);
              triggerHaptic();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceVariant }]}>
                <Feather name="globe" size={18} color={themeColors.text} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.text }]}>Timezone</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', flex: 1, justifyContent: 'flex-end' }}>
              <Text style={[styles.rowValue, { color: themeColors.textDim, fontSize: 13 }]} numberOfLines={1}>
                {user?.country && user?.timezoneLabel
                  ? `${user.country} — ${user.timezoneLabel}`
                  : user?.timezone
                    ? `${user.timezone}`
                    : `Auto — ${autoDetectTimezone().city}`}
              </Text>
              <Feather name="chevron-right" size={20} color={themeColors.textDim} />
            </View>
          </TouchableOpacity>
          {renderToggle('Use 24-Hour Format', 'clock', use24Hour, () => {
            const nextVal = !use24Hour;
            setUse24Hour(nextVal);
            triggerHaptic();
            if (user?.id) {
              updateProfile({ timeFormat: nextVal ? '24h' : '12h' });
              firestoreService.updateUserProfile(user.id, { timeFormat: nextVal ? '24h' : '12h' });
            }
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>PREFERENCES</Text>
        <View style={[styles.sectionGroup, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          {renderToggle('Dark Mode', 'moon', theme === 'dark', toggleTheme)}
          {renderToggle('Reduce Haptic Feedback', 'smartphone', reduceHaptics, () => setReduceHaptics(!reduceHaptics))}
          {renderToggle('Level Up Celebrations', 'award', levelUpAnimationsEnabled, () => {
            setLevelUpAnimationsEnabled(!levelUpAnimationsEnabled);
            triggerHaptic();
          })}
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
            <Text style={[styles.rowValue, { color: themeColors.textDim }]}>{Constants.expoConfig?.version || '1.0.8'}</Text>
          </View>
          {renderAction('Send Feedback', 'message-square', () => { triggerHaptic(); })}
        </View>

      </ScrollView>

      {/* --- TIMEZONE SELECTOR MODAL --- */}
      <Modal
        visible={timezoneModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTimezoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissOverlay}
            activeOpacity={1}
            onPress={() => setTimezoneModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: '#131317' }]}>
            {/* Grab handle indicator */}
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Region & Timezone</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTimezoneModalVisible(false)}
              >
                <Feather name="x" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Live Airing Preview Card */}
            <View style={[styles.previewCard, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }]}>
              <View style={styles.previewCardHeader}>
                <Feather name="tv" size={16} color={themeColors.primary} />
                <Text style={[styles.previewCardTitle, { color: 'white' }]}>Dynamic Live Preview</Text>
              </View>
              <Text style={[styles.previewAnimeName, { color: 'white' }]}>Solo Leveling Episode 9 Airing Time:</Text>
              <Text style={[styles.previewTimeText, { color: themeColors.primary }]}>
                {getLocalizedPreviewText(searchText ? (filteredTimezones[0]?.id || activeTimezoneId) : activeTimezoneId)}
              </Text>
              <Text style={[styles.previewZoneInfo, { color: themeColors.textDim }]}>
                Automatically recalculates release timings relative to selected timezone preference.
              </Text>
            </View>

            {/* Search input bar */}
            <View style={[styles.searchContainer, { backgroundColor: '#1D1D22' }]}>
              <Feather name="search" size={18} color={themeColors.textDim} style={{ marginLeft: spacing.xs }} />
              <TextInput
                style={[styles.searchInput, { color: 'white' }]}
                placeholder="Search city, country, or code..."
                placeholderTextColor={themeColors.textDim}
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Feather name="x-circle" size={16} color={themeColors.textDim} style={{ marginRight: spacing.xs }} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Virtualized/Optimized Timezone FlatList */}
            <FlatList
              data={filteredTimezones}
              keyExtractor={(item) => item.id}
              removeClippedSubviews={Platform.OS !== 'web'}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={5}
              getItemLayout={(_data, index) => (
                { length: 58, offset: 58 * index, index }
              )}
              contentContainerStyle={styles.listScrollContainer}
              ListEmptyComponent={
                <View style={styles.emptySearchContainer}>
                  <Feather name="alert-circle" size={32} color={themeColors.textDim} />
                  <Text style={[styles.emptySearchText, { color: themeColors.textDim }]}>
                    No matching timezones found
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === activeTimezoneId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.tzItemRow,
                      { backgroundColor: isSelected ? 'rgba(255, 35, 83, 0.12)' : 'transparent' }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateProfile({
                        timezone: item.id,
                        timezoneLabel: item.label,
                        country: item.country
                      });
                      if (user?.id) {
                        firestoreService.updateUserProfile(user.id, {
                          timezone: item.id,
                          timezoneLabel: item.label,
                          country: item.country
                        });
                      }
                      setTimezoneModalVisible(false);
                      setSearchText('');
                    }}
                  >
                    <View style={styles.tzFlagCol}>
                      <View style={[styles.flagBadge, { backgroundColor: isSelected ? themeColors.primary : 'rgba(255,255,255,0.06)' }]}>
                        <Text style={styles.flagText}>{item.countryCode}</Text>
                      </View>
                    </View>
                    <View style={styles.tzMetaCol}>
                      <Text style={[styles.tzCountryCityText, { color: isSelected ? themeColors.primary : 'white', fontWeight: isSelected ? 'bold' : 'normal' }]}>
                        {item.country} — {item.city}
                      </Text>
                      <Text style={[styles.tzLabelText, { color: themeColors.textDim }]}>
                        {item.id} ({item.label})
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={{ marginLeft: 'auto' }}>
                        <Feather name="check" size={20} color={themeColors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  rowValueText: {
    fontSize: 13,
    fontWeight: 'bold',
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

  // Timezone selector module styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissOverlay: {
    flex: 1,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    paddingHorizontal: spacing.md,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginVertical: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 8,
  },
  previewCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewAnimeName: {
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: 4,
  },
  previewTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  previewZoneInfo: {
    fontSize: 11,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: spacing.sm,
    height: '100%',
  },
  listScrollContainer: {
    paddingBottom: 30,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptySearchText: {
    fontSize: 14,
  },
  tzItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    height: 52,
  },
  tzFlagCol: {
    marginRight: spacing.sm,
  },
  flagBadge: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.95,
  },
  tzMetaCol: {
    flex: 1,
  },
  tzCountryCityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  tzLabelText: {
    fontSize: 11,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

