import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { Button, AuthFeedback } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { firebaseAuthService } from '../../src/services/firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_AUTH_CONFIG } from '../../src/services/firebase/authConfig';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignInWithToken(id_token);
    }
  }, [response]);

  const handleGoogleSignInWithToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signInWithGoogle(idToken);
      if (user) {
        setFeedback({ message: 'Account created with Google!', type: 'success' });
        setTimeout(() => router.replace('/(tabs)/home'), 1500);
      }
    } catch (error: any) {
      console.error(error);
      setFeedback({ message: 'Google Sign-Up failed', type: 'error' });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) return;

    setIsLoading(true);
    try {
      const user = await firebaseAuthService.registerWithEmail(email, password, username);
      if (user) {
        setFeedback({ message: 'Account created! Welcome to AnimOrg.', type: 'success' });
        setTimeout(() => router.replace('/(tabs)/home'), 1500);
      }
    } catch (error: any) {
      console.error(error);
      setFeedback({
        message: error.code === 'auth/email-already-in-use' ? 'Email already in use' :
          error.code === 'auth/invalid-email' ? 'Invalid email format' :
            error.code === 'auth/weak-password' ? 'Password is too weak' :
              'Registration failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      setIsLoading(true);
      try {
        const user = await firebaseAuthService.signInWithGoogle();
        if (user) {
          router.replace('/(tabs)/home');
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || 'Google Sign-In failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <AuthFeedback
          visible={!!feedback}
          message={feedback?.message || ''}
          type={feedback?.type}
          onHide={() => setFeedback(null)}
        />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join AnimOrg and start discovering</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={colors.textDim}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor={colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Button
              title="Register"
              onPress={handleRegister}
              isLoading={isLoading}
              style={styles.registerButton}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Button
              title="Sign up with Google"
              onPress={handleGoogleSignIn}
              variant="secondary"
              isLoading={isLoading}
              style={styles.googleButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  registerButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDim,
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.xs,
  },
  googleButton: {
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  footerLink: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
});
