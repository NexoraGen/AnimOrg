import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, typography } from '../src/theme';
import { Button } from '../src/components/ui';
import { useAppStore } from '../src/store/useAppStore';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { ANIME_AVATARS, getAvatarSource } from '../src/constants/avatars';
import { CinematicModal } from '../src/components/layout/CinematicModal';
import { firestoreService } from '../src/services/firebase/firestore';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();
  const { user, updateProfile } = useAppStore();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');

  // Custom or Preset Selected Avatar
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    user?.avatarUrl !== undefined && user?.avatarUrl !== null ? user.avatarUrl : ''
  );

  // Custom Flow States
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Modals Visibility
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Preset picker extra features state
  const [recentAvatars, setRecentAvatars] = useState<string[]>([]);
  const [recommendedAvatars] = useState<string[]>([
    'preset_1',
    'preset_2',
    'preset_3'
  ]);

  // Load recently used avatars on modal open
  React.useEffect(() => {
    if (showPresetModal) {
      const loadRecent = async () => {
        try {
          const stored = await AsyncStorage.getItem('animorg_recently_used_avatars');
          if (stored) {
            setRecentAvatars(JSON.parse(stored));
          }
        } catch (err) {
          console.warn('[EditProfile] Error loading recent presets:', err);
        }
      };
      loadRecent();
    }
  }, [showPresetModal]);

  // Real-time alphanumeric character check + Availability validation
  React.useEffect(() => {
    const checkAvailability = async () => {
      const cleaned = username.trim().toLowerCase();

      if (!cleaned) {
        setUsernameError('Username is required.');
        return;
      }
      if (cleaned.length < 3) {
        setUsernameError('Username must be at least 3 characters.');
        return;
      }
      if (cleaned.length > 20) {
        setUsernameError('Username cannot exceed 20 characters.');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(cleaned)) {
        setUsernameError('Only lowercase letters, numbers, and underscores allowed.');
        return;
      }

      // Skip lookups if it matches user's current username
      if (cleaned === user?.username?.toLowerCase()?.trim()) {
        setUsernameError('');
        return;
      }

      setIsCheckingUsername(true);
      setUsernameError('');
      try {
        const isAvailable = await firestoreService.checkUsernameAvailability(cleaned);
        if (!isAvailable) {
          setUsernameError('This username is already taken.');
        } else {
          setUsernameError('');
        }
      } catch (error) {
        console.error('Failed to verify username uniqueness:', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(() => {
      checkAvailability();
    }, 450);

    return () => clearTimeout(timer);
  }, [username, user]);

  const handleSave = async () => {
    const cleanedUsername = username.trim().toLowerCase();
    if (!cleanedUsername || !!usernameError || isCheckingUsername) return;

    setIsSaving(true);
    setSaveError('');

    try {
      let finalAvatarUrl = selectedAvatar;

      await updateProfile({
        username: cleanedUsername,
        bio: bio.trim(),
        avatarUrl: finalAvatarUrl,
      });
      router.back();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setSaveError(error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPreset = async (url: string) => {
    setSelectedAvatar(url);

    // Save to AsyncStorage recently used
    try {
      const updated = [url, ...recentAvatars.filter(x => x !== url)].slice(0, 4);
      setRecentAvatars(updated);
      await AsyncStorage.setItem('animorg_recently_used_avatars', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    setShowPresetModal(false);
  };

  const handleRemovePhoto = () => {
    setShowSourceSheet(false);
    setSelectedAvatar('');
  };

  // Load all presets natively
  const filteredPresets = ANIME_AVATARS;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: themeColors.background, paddingTop: Math.max(insets.top, spacing.md) }]}
    >
      <View style={[styles.pageWrapper, { maxWidth: Math.min(width, 540) }]}>
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Feather name="chevron-left" color={themeColors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !username.trim() || !!usernameError || isCheckingUsername}
            style={styles.doneBtn}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.saveTextButton,
                  {
                    color: isSaving || !username.trim() || !!usernameError || isCheckingUsername
                      ? themeColors.textDim
                      : colors.primary,
                  }
                ]}
              >
                Done
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Custom Interactive Card Layout */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowSourceSheet(true)}
              style={[styles.avatarInteractiveBox, { shadowColor: themeColors.primary }]}
            >
              <Image
                source={getAvatarSource(selectedAvatar)}
                style={[styles.mainAvatar, { borderColor: themeColors.primary }]}
                contentFit="cover"
                transition={300}
              />
              <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Feather name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSourceSheet(true)}>
              <Text style={[styles.avatarHint, { color: themeColors.primary, fontWeight: '700', marginTop: spacing.xs }]}>
                Change Profile Picture
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Feedback Alerts */}
          {saveError ? (
            <View style={[styles.permissionToast, { backgroundColor: 'rgba(229, 9, 20, 0.12)', borderColor: themeColors.error }]}>
              <Feather name="alert-triangle" size={16} color={themeColors.error} />
              <Text style={[styles.permissionToastText, { color: themeColors.error }]}>{saveError}</Text>
            </View>
          ) : null}

          {/* Username Input Settings */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Username</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: usernameError
                    ? themeColors.error
                    : username.trim().toLowerCase() !== user?.username?.toLowerCase()?.trim() && username.trim() !== '' && !isCheckingUsername
                      ? '#4CD964'
                      : themeColors.border,
                },
              ]}
            >
              <Feather
                name="user"
                size={20}
                color={
                  usernameError
                    ? themeColors.error
                    : username.trim().toLowerCase() !== user?.username?.toLowerCase()?.trim() && username.trim() !== '' && !isCheckingUsername
                      ? '#4CD964'
                      : themeColors.textDim
                }
              />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={themeColors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {isCheckingUsername && (
              <View style={styles.feedbackRow}>
                <Feather name="loader" size={14} color="#00A8FF" />
                <Text style={[styles.feedbackText, { color: '#00A8FF' }]}>Checking availability...</Text>
              </View>
            )}

            {usernameError && !isCheckingUsername ? (
              <View style={styles.feedbackRow}>
                <Feather name="alert-circle" size={14} color={themeColors.error} />
                <Text style={[styles.feedbackText, { color: themeColors.error }]}>{usernameError}</Text>
              </View>
            ) : null}

            {!usernameError && !isCheckingUsername && username.trim().toLowerCase() !== user?.username?.toLowerCase()?.trim() && username.trim() !== '' ? (
              <View style={styles.feedbackRow}>
                <Feather name="check-circle" size={14} color="#4CD964" />
                <Text style={[styles.feedbackText, { color: '#4CD964' }]}>Username is available!</Text>
              </View>
            ) : null}
          </View>

          {/* User Bio Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Bio</Text>
            <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border, height: 100, alignItems: 'flex-start', paddingTop: spacing.sm }]}>
              <Feather name="info" size={20} color={themeColors.textDim} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { color: themeColors.text, textAlignVertical: 'top', height: 80 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={themeColors.textDim}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </ScrollView>

        {/* ====================================================
            1. PREMIUM ACTION SHEET / SOURCE SELECT MODAL
           ==================================================== */}
        <CinematicModal
          visible={showSourceSheet}
          onClose={() => setShowSourceSheet(false)}
          maxWidth={400}
        >
          <View style={[styles.sourceSheetContainer, { backgroundColor: '#161618' }]}>
            <View style={styles.sourceSheetHeader}>
              <Text style={styles.sourceSheetTitle}>Adjust Profile Avatar</Text>
              <Text style={styles.sourceSheetSubtitle}>Express your anime identity</Text>
            </View>

            <View style={styles.sourceSheetOptions}>
              <TouchableOpacity
                style={styles.sourceOptionBtn}
                onPress={() => {
                  setShowSourceSheet(false);
                  setShowPresetModal(true);
                }}
              >
                <Feather name="grid" size={18} color={colors.primary} />
                <Text style={styles.sourceOptionText}>Choose Preset Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sourceOptionBtn} onPress={handleRemovePhoto}>
                <Feather name="trash-2" size={18} color="#FF3B30" />
                <Text style={[styles.sourceOptionText, { color: '#FF3B30' }]}>Remove Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceOptionBtn, { borderBottomWidth: 0, marginTop: spacing.xs }]}
                onPress={() => setShowSourceSheet(false)}
              >
                <Feather name="x" size={18} color="#8E8E93" />
                <Text style={[styles.sourceOptionText, { color: '#8E8E93' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CinematicModal>

        {/* ====================================================
            2. CATEGORIZED PRESET DRAWER MODAL
           ==================================================== */}
        <CinematicModal
          visible={showPresetModal}
          onClose={() => setShowPresetModal(false)}
          maxWidth={500}
        >
          <View style={[styles.presetModalContainer, { backgroundColor: '#161618' }]}>
            <View style={styles.presetHeader}>
              <Text style={styles.presetTitle}>Select Preset Avatar</Text>
              <Text style={styles.presetSubtitle}>A large collection of popular anime characters</Text>
            </View>

            {/* A. RECENTLY USED CAROUSEL */}
            {recentAvatars.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.presetCategoryHeader}>Recently Used</Text>
                <View style={styles.recentRow}>
                  {recentAvatars.map((url, i) => (
                    <TouchableOpacity
                      key={'recent-' + i}
                      style={[
                        styles.presetOption,
                        selectedAvatar === url && styles.selectedGlowingPreset
                      ]}
                      onPress={() => handleSelectPreset(url)}
                    >
                      <Image source={getAvatarSource(url)} style={styles.presetThumb} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* B. RECOMMENDED HOT TOP PICKS */}
            <View style={styles.recentSection}>
              <Text style={styles.presetCategoryHeader}>Recommended Picks</Text>
              <View style={styles.recentRow}>
                {recommendedAvatars.map((url, i) => (
                  <TouchableOpacity
                    key={'rec-' + i}
                    style={[
                      styles.presetOption,
                      selectedAvatar === url && styles.selectedGlowingPreset
                    ]}
                    onPress={() => handleSelectPreset(url)}
                  >
                    <Image source={getAvatarSource(url)} style={styles.presetThumb} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* D. PRESETS GRID */}
            <ScrollView
              style={styles.presetScrollView}
              contentContainerStyle={styles.presetGrid}
              showsVerticalScrollIndicator={false}
            >
              {filteredPresets.map((preset, idx) => (
                <TouchableOpacity
                  key={'preset-' + preset.name + idx}
                  onPress={() => handleSelectPreset(preset.url)}
                  style={[
                    styles.presetOption,
                    selectedAvatar === preset.url && styles.selectedGlowingPreset
                  ]}
                >
                  <Image
                    source={getAvatarSource(preset.url)}
                    style={styles.presetThumb}
                    contentFit="cover"
                  />
                  {selectedAvatar === preset.url && (
                    <View style={[styles.presetCheckBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Close Presets"
              variant="outline"
              onPress={() => setShowPresetModal(false)}
              style={styles.presetCloseBtn}
            />
          </View>
        </CinematicModal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  pageWrapper: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as any,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  doneBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  saveTextButton: {
    fontSize: 16,
    fontWeight: '800' as any,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarInteractiveBox: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  inputSection: {
    marginBottom: spacing.xxl,
  },
  inputLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 56,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  permissionToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  permissionToastText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  // Custom Action Sheet Styles
  sourceSheetContainer: {
    padding: spacing.xl,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sourceSheetHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sourceSheetTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  sourceSheetSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sourceSheetOptions: {
    gap: 4,
  },
  sourceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
    gap: 12,
  },
  sourceOptionText: {
    color: '#ECECEE',
    fontSize: 15,
    fontWeight: '700',
  },

  // Custom Preset Modal Styles
  presetModalContainer: {
    padding: spacing.xl,
    maxHeight: 640,
  },
  presetHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  presetTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  presetSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  recentSection: {
    marginBottom: spacing.md,
  },
  presetCategoryHeader: {
    color: '#E5E5EA',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    paddingLeft: 4,
  },
  recentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: 4,
  },
  presetTabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  tabsScrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },
  presetTabBtn: {
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  presetTabText: {
    fontSize: 13,
  },
  presetScrollView: {
    maxHeight: 320,
    marginBottom: spacing.md,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
  },
  presetOption: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 1,
  },
  selectedGlowingPreset: {
    borderColor: colors.primary,
    borderWidth: 2.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  presetCheckBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCloseBtn: {
    height: 50,
  }
});
