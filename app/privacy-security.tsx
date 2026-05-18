import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppStore } from '../src/store/useAppStore';
import { firebaseAuthService } from '../src/services/firebase/auth';
import { typography, spacing, borderRadius } from '../src/theme';
import { GlassHeader } from '../src/components/ui/GlassHeader';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { Button } from '../src/components/ui/Button';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { user } = useAppStore();

  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const triggerHaptic = (type: 'light' | 'success' | 'error' = 'light') => {
    if (Platform.OS !== 'web') {
      try {
        if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Haptics might fail on some devices or if not initialized correctly
      }
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      triggerHaptic('error');
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoadingPassword(true);
    try {
      await firebaseAuthService.updatePassword(newPassword);
      triggerHaptic('success');
      Alert.alert('Success', 'Your password has been updated securely.');
      setNewPassword('');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoadingEmail(true);
    try {
      await firebaseAuthService.updateEmail(newEmail);
      triggerHaptic('success');
      Alert.alert('Success', 'Your email address has been updated.');
      setNewEmail('');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleLogoutAll = async () => {
    triggerHaptic();
    Alert.alert(
      "Log Out All Devices",
      "Are you sure you want to sign out of all active sessions?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await firebaseAuthService.logoutAllDevices();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    triggerHaptic();
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure? This action cannot be undone. All your watch history, favorites, and profile data will be permanently erased.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsLoadingDelete(true);
            try {
              await firebaseAuthService.deleteAccount();
              router.replace('/(auth)/login');
            } catch (error) {
              setIsLoadingDelete(false);
              triggerHaptic('error');
              Alert.alert('Error', 'Failed to delete account.');
            }
          }
        }
      ]
    );
  };

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader
        title="Privacy & Security"
        leftComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>

        <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>ACCOUNT CREDENTIALS</Text>

        {/* Email Update */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Change Email Address</Text>
          <Text style={[styles.cardDesc, { color: themeColors.textDim }]}>
            Current Email: {user?.email || 'Not set'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
            placeholder="New Email Address"
            placeholderTextColor={themeColors.textDim}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title="Update Email"
            onPress={handleUpdateEmail}
            isLoading={isLoadingEmail}
            style={styles.cardButton}
          />
        </View>

        {/* Password Update */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Change Password</Text>
          <Text style={[styles.cardDesc, { color: themeColors.textDim }]}>
            Ensure your account is using a long, random password to stay secure.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
            placeholder="New Password (min. 6 chars)"
            placeholderTextColor={themeColors.textDim}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Button
            title="Update Password"
            onPress={handleUpdatePassword}
            isLoading={isLoadingPassword}
            style={styles.cardButton}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.primary, marginTop: spacing.xl }]}>SESSION MANAGEMENT</Text>

        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Active Sessions</Text>
          <Text style={[styles.cardDesc, { color: themeColors.textDim, marginBottom: spacing.md }]}>
            You are currently signed in on this device. If you noticed suspicious activity, log out everywhere.
          </Text>
          <TouchableOpacity
            style={[styles.actionRow, { borderTopColor: themeColors.border }]}
            onPress={handleLogoutAll}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: `${themeColors.error}20` }]}>
                <Feather name="log-out" size={18} color={themeColors.error} />
              </View>
              <Text style={[styles.rowLabel, { color: themeColors.error }]}>Log Out All Devices</Text>
            </View>
            <Feather name="chevron-right" size={20} color={themeColors.textDim} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.error, marginTop: spacing.xl }]}>DANGER ZONE</Text>

        <View style={[styles.dangerCard, { backgroundColor: `${themeColors.error}10`, borderColor: themeColors.error }]}>
          <Text style={[styles.cardTitle, { color: themeColors.error }]}>Delete Account</Text>
          <Text style={[styles.cardDesc, { color: themeColors.error, opacity: 0.8 }]}>
            Permanently delete your account and all associated data. This action cannot be reversed.
          </Text>
          <Button
            title="Permanently Delete Account"
            onPress={handleDeleteAccount}
            isLoading={isLoadingDelete}
            style={{ ...styles.cardButton, backgroundColor: themeColors.error } as any}
          />
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
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  dangerCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.sizes.md,
  },
  cardButton: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
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
});
