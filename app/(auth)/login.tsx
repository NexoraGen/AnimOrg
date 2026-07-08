import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { Button, AuthFeedback } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { firebaseAuthService } from '../../src/services/firebase/auth';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_AUTH_CONFIG } from '../../src/services/firebase/authConfig';
import { useAppStore } from '../../src/store/useAppStore';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const loginAsGuest = useAppStore(state => state.loginAsGuest);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  React.useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_AUTH_CONFIG.webClientId,
        iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
      });
      console.log('[GoogleSignin] configure SUCCESS with webClientId:', GOOGLE_AUTH_CONFIG.webClientId);
    } catch (e) {
      console.error('[GoogleSignin] configure ERROR', e);
    }
  }, []);

  const handleGoogleSignInWithToken = async (idToken: string) => {
    setIsLoading(true);
    console.log('[GoogleAuth] Creating firebase credential...');
    try {
      const user = await firebaseAuthService.signInWithGoogle(idToken);
      if (user) {
        console.log('[GoogleAuth] Firebase signIn result SUCCESS. User:', user.uid);
        setFeedback({ message: 'Signed in successfully!', type: 'success' });
      }
    } catch (error: any) {
      console.error('[GoogleAuth] Firebase Auth Error:', error, '\nStack:', error.stack);
      const errCode = error.code || 'UNKNOWN';
      const errMsg = error.message || 'No msg';
      setFeedback({ message: `Firebase Error [${errCode}]: ${errMsg}`, type: 'error' });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const user = await firebaseAuthService.loginWithEmail(email, password);
      if (user) {
        setFeedback({ message: 'Welcome back!', type: 'success' });
      }
    } catch (error: any) {
      console.error(error);
      setFeedback({
        message: error.code === 'auth/user-not-found' ? 'User not found' :
          error.code === 'auth/wrong-password' ? 'Incorrect password' :
            'Login failed. Please check your credentials.',
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
          setFeedback({ message: 'Welcome!', type: 'success' });
        }
      } catch (error: any) {
        console.error(error);
        setFeedback({ message: error.message || 'Google Sign-In failed', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        console.log('[GoogleSignin] Checking hasPlayServices...');
        const playServicesStatus = await GoogleSignin.hasPlayServices();
        console.log('[GoogleSignin] hasPlayServices result:', playServicesStatus);

        console.log('[GoogleSignin] Starting signIn()...');
        const response = await GoogleSignin.signIn();
        console.log('[GoogleSignin] signIn() response:', JSON.stringify({
          type: response.type,
          data: response.data ? {
            serverAuthCode: response.data.serverAuthCode,
            // omit full token in logs if huge, but we need to log if it exists as user requested
            idTokenLength: response.data.idToken ? response.data.idToken.length : 0,
          } : null
        }));

        let idToken = null;
        if (isSuccessResponse(response)) {
          idToken = response.data?.idToken;
        } else {
          // Fallback for older versions if isSuccessResponse isn't exactly matching the shape
          idToken = (response as any).data?.idToken || (response as any).idToken;
        }

        if (idToken) {
          console.log('[GoogleSignin] Got idToken successfully');
          await handleGoogleSignInWithToken(idToken);
        } else {
          console.error('[GoogleSignin] No ID token present in response:', response);
          setFeedback({ message: `No ID token present. Response: ${JSON.stringify(response)}`, type: 'error' });
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('[GoogleSignin] Catch block error:', error, '\nStack:', error?.stack);
        const errCode = error?.code || 'UNKNOWN';
        const errMsg = error?.message || 'No msg';
        const strError = `[${errCode}] ${errMsg}`;

        if (isErrorWithCode(error)) {
          const codeString = Object.keys(statusCodes).find(k => (statusCodes as any)[k] === error.code) || error.code;
          setFeedback({ message: `Google Error: ${codeString} - ${strError}`, type: 'error' });
        } else {
          setFeedback({ message: `System Error: ${strError}`, type: 'error' });
        }
        setIsLoading(false);
      }
    }
  };

  const handleGuestMode = () => {
    loginAsGuest();
    router.replace('/(tabs)/home');
  };

  return (
    <AnimatedScreen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={{ uri: 'https://i.pinimg.com/736x/8e/31/53/8e31538fc1e7fca385a4dd0fbb7dbdf8.jpg' }}
          style={styles.backgroundImage}
        >
          <LinearGradient
            colors={['rgba(9, 9, 11, 0.4)', 'rgba(9, 9, 11, 0.95)', colors.background]}
            style={StyleSheet.absoluteFill}
          />

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
              <View style={styles.brandContainer}>
                <View style={styles.brandDot} />
                <Text style={styles.brandText}>ANIMORG</Text>
              </View>
              <Text style={styles.title}>Enter The Grid</Text>
              <Text style={styles.subtitle}>Your premium anime streaming identity starts here.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Button
                title="Log In"
                onPress={handleLogin}
                isLoading={isLoading}
                style={styles.loginButton}
              />

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.buttonStack}>
                <Link href="/(auth)/register" asChild>
                  <Button
                    title="Create Account"
                    variant="secondary"
                    onPress={() => { }}
                    style={styles.stackButton}
                  />
                </Link>

                <Button
                  title="Continue with Google"
                  onPress={handleGoogleSignIn}
                  variant="outline"
                  isLoading={isLoading}
                  style={styles.stackButton}
                />

                <Button
                  title="Continue as Guest"
                  onPress={handleGuestMode}
                  variant="outline"
                  style={styles.guestButton}
                />
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'flex-end',
  },
  header: {
    marginBottom: spacing.xxl,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  brandText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    maxWidth: '80%',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    color: colors.text,
    fontSize: typography.sizes.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loginButton: {
    marginTop: spacing.sm,
    height: 56,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    opacity: 0.5,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  buttonStack: {
    gap: spacing.md,
  },
  stackButton: {
    height: 56,
  },
  guestButton: {
    height: 56,
    marginTop: spacing.md,
    opacity: 0.7,
    borderColor: 'transparent',
  },
});
