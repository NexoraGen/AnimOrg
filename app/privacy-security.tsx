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
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);

  const [passwordStep, setPasswordStep] = useState(0); // 0: CTA, 1: Verify, 2: Set New
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isGoogleUser = firebaseAuthService.getCurrentUser()?.providerData?.some(
    p => p.providerId === 'google.com'
  ) || false;

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

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }

    setIsLoadingPassword(true);
    try {
      await firebaseAuthService.reauthenticate(currentPassword);
      triggerHaptic('success');
      setPasswordStep(2);
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Verification Failed', 'Incorrect current password. Please try again.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleForgotCurrentPassword = async () => {
    if (!user?.email) {
      triggerHaptic('error');
      Alert.alert('Error', 'Unable to retrieve your email address.');
      return;
    }

    setIsLoadingPassword(true);
    try {
      await firebaseAuthService.sendPasswordResetEmail(user.email);
      triggerHaptic('success');
      Alert.alert(
        'Email Sent',
        `A password reset link has been sent to ${user.email}.`
      );
      setPasswordStep(0);
      setCurrentPassword('');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Error', error.message || 'Failed to send password reset email.');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleSaveNewPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      triggerHaptic('error');
      Alert.alert('Error', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerHaptic('error');
      Alert.alert('Mismatch', 'Passwords do not match. Please verify your typing.');
      return;
    }

    setIsLoadingPassword(true);
    try {
      await firebaseAuthService.updatePassword(newPassword);
      triggerHaptic('success');
      Alert.alert('Success', 'Your password has been updated securely.');
      setPasswordStep(0);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setIsLoadingPassword(false);
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



        {/* Password Update */}
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Change Password</Text>

          {isGoogleUser ? (
            <Text style={[styles.cardDesc, { color: themeColors.textDim, marginTop: spacing.xs }]}>
              Your account is authenticated via Google. Password updates are managed by Google.
            </Text>
          ) : (
            <>
              {passwordStep === 0 && (
                <>
                  <Text style={[styles.cardDesc, { color: themeColors.textDim, marginBottom: spacing.md }]}>
                    Ensure your account is using a long, random password to stay secure. Current password verification is required.
                  </Text>
                  <Button
                    title="Change Password"
                    onPress={() => {
                      triggerHaptic();
                      setPasswordStep(1);
                    }}
                    style={styles.cardButton}
                  />
                </>
              )}

              {passwordStep === 1 && (
                <>
                  <Text style={[styles.cardDesc, { color: themeColors.textDim }]}>
                    Please enter your current password to verify identity.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="Current Password"
                    placeholderTextColor={themeColors.textDim}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    onPress={handleForgotCurrentPassword}
                    style={styles.forgotPasswordInline}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.forgotPasswordInlineText, { color: themeColors.primary }]}>Forgot password?</Text>
                  </TouchableOpacity>
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setPasswordStep(0);
                        setCurrentPassword('');
                      }}
                      style={[styles.cancelButton, { borderColor: themeColors.border }]}
                    >
                      <Text style={{ color: themeColors.textDim, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <Button
                      title="Next"
                      onPress={handleVerifyCurrentPassword}
                      isLoading={isLoadingPassword}
                      style={styles.flexButton}
                    />
                  </View>
                </>
              )}

              {passwordStep === 2 && (
                <>
                  <Text style={[styles.cardDesc, { color: themeColors.textDim }]}>
                    Enter and confirm your new password below.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="New Password (min. 6 chars)"
                    placeholderTextColor={themeColors.textDim}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="Confirm New Password"
                    placeholderTextColor={themeColors.textDim}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setPasswordStep(0);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      style={[styles.cancelButton, { borderColor: themeColors.border }]}
                    >
                      <Text style={{ color: themeColors.textDim, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <Button
                      title="Save New Password"
                      onPress={handleSaveNewPassword}
                      isLoading={isLoadingPassword}
                      style={styles.flexButton}
                    />
                  </View>
                </>
              )}
            </>
          )}
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
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelButton: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexButton: {
    flex: 1,
  },
  forgotPasswordInline: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  forgotPasswordInlineText: {
    fontSize: 13,
    fontWeight: '500',
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
