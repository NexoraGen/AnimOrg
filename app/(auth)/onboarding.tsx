import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { Button, AuthFeedback } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { firestoreService } from '../../src/services/firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();
    const { user, updateProfile, setUser } = useAppStore();

    const [username, setUsername] = useState('');
    const [status, setStatus] = useState<'idle' | 'validating' | 'available' | 'taken' | 'invalid'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    // Animated values for premium aesthetics
    const borderGlow = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Track Firestore availability lookup debounce timer
    const lookupTimeoutRef = useRef<any>(null);

    useEffect(() => {
        // If username changes, handle local validation first, then debounce remote Firestore checks
        if (!username) {
            setStatus('idle');
            setErrorMsg('');
            setSuggestions([]);
            return;
        }

        // Rules validation mapping:
        // - lowercase only
        // - letters, numbers, underscores allowed
        // - no spaces
        // - no special characters
        // - 3-20 characters

        const lowercaseClean = username.toLowerCase();

        // Warn if capital letters were provided
        if (username !== lowercaseClean) {
            setStatus('invalid');
            setErrorMsg('Lowercase alphanumeric characters only');
            setSuggestions([]);
            return;
        }

        if (username.length < 3) {
            setStatus('invalid');
            setErrorMsg('Must be at least 3 characters');
            setSuggestions([]);
            return;
        }

        if (username.length > 20) {
            setStatus('invalid');
            setErrorMsg('Must be 20 characters or less');
            setSuggestions([]);
            return;
        }

        const validCharRegex = /^[a-z0-9_]+$/;
        if (!validCharRegex.test(username)) {
            setStatus('invalid');
            setErrorMsg('Alphanumeric and underscores only (no spaces/symbols)');
            setSuggestions([]);
            return;
        }

        // Pass local validation! Now request Firestore debounced availability check
        setStatus('validating');
        setErrorMsg('');

        if (lookupTimeoutRef.current) {
            clearTimeout(lookupTimeoutRef.current);
        }

        lookupTimeoutRef.current = setTimeout(async () => {
            try {
                const isAvailable = await firestoreService.checkUsernameAvailability(username);
                if (isAvailable) {
                    setStatus('available');
                    // Smooth pulse notification
                    startGlowAnimation(1);
                } else {
                    setStatus('taken');
                    setErrorMsg('Username already taken');
                    // Generate 3 unique alternatives
                    const baseName = username.substring(0, 15);
                    const currentYear = new Date().getFullYear().toString().slice(-2);
                    const generated = [
                        `${baseName}_szn`,
                        `${baseName}${currentYear}`,
                        `${baseName}_kun`,
                        `${baseName}_99`,
                        `${baseName}_sama`
                    ];
                    // Filter to select exactly 3
                    setSuggestions(generated.slice(0, 3));
                    startGlowAnimation(-1);
                }
            } catch (err) {
                console.error("Firestore availability check failure:", err);
                setStatus('idle');
            }
        }, 500); // 500ms debounce

        return () => {
            if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
        };
    }, [username]);

    // Glow animations matching validity feedback rules
    const startGlowAnimation = (mode: number) => {
        // animate glowing state
        Animated.parallel([
            Animated.timing(borderGlow, {
                toValue: mode === 1 ? 1 : mode === -1 ? -1 : 0,
                duration: 400,
                useNativeDriver: false
            }),
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 150, useNativeDriver: true })
            ])
        ]).start();
    };

    const handleSuggestionPress = (suggested: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setUsername(suggested);
    };

    const handleClaimIdentity = async () => {
        if (status !== 'available' || !username) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (!user?.id) {
            setFeedback({ message: 'Authentication session expired. Please sign in again.', type: 'error' });
            return;
        }

        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Execute the robust Firestore atomic transaction profile update
            await firestoreService.updateUserProfile(user.id, {
                username: username,
                email: user.email || '',
                hasCompletedOnboarding: true,
                usernameClaimed: true
            });

            // Fetch refreshed user record
            const refreshedProfile = await firestoreService.getUserProfile(user.id);
            if (refreshedProfile) {
                // Sync to app cache
                setUser(refreshedProfile);
            } else {
                // Fallback update in case of profile fetch latency
                await updateProfile({
                    username: username,
                    hasCompletedOnboarding: true,
                    usernameClaimed: true
                });
            }

            setFeedback({ message: 'Welcome to the Grid! Identity claimed.', type: 'success' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setTimeout(() => {
                router.replace('/(tabs)/home');
            }, 1200);

        } catch (error: any) {
            console.error(error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            let msg = 'Identity activation failed. Please try again.';
            if (error && error.message && error.message.includes('taken')) {
                msg = 'Username has already been claimed by someone else!';
                setStatus('taken');
            }
            setFeedback({ message: msg, type: 'error' });
            setIsLoading(false);
        }
    };

    // Interpolate glows for styling overlays
    const glowColor = borderGlow.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['rgba(229, 9, 20, 0.4)', 'rgba(255, 255, 255, 0.1)', 'rgba(50, 205, 50, 0.5)']
    });

    const glowBorder = borderGlow.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['#E50914', colors.border, '#32CD32']
    });

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: '#0F0F0F' }]}>
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

                {/* Ambient Pulsing Background Background */}
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={require('../../assets/splash.png')}
                        style={styles.bgImage}
                        contentFit="cover"
                    />
                    {/* Depth Cinematic Black Fading Gradients */}
                    <LinearGradient
                        colors={['rgba(15,15,15,0.2)', 'rgba(30,0,0,0.5)', '#0F0F0F']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                <View style={[styles.glassCardWrapper, { top: insets.top + spacing.xl }]}>
                    <View style={styles.topIconContainer}>
                        <View style={styles.brandingCircle}>
                            <Feather name="shield" size={32} color="#E50914" />
                        </View>
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Create Your Anime Identity</Text>
                        <Text style={styles.subtitle}>Choose your permanent globally unique username handle</Text>
                    </View>

                    <Animated.View style={[styles.form, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.inputContainer}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Handle ID</Text>

                                {status === 'validating' && (
                                    <View style={styles.statusRow}>
                                        <ActivityIndicator size="small" color="#E50914" style={{ marginRight: 6 }} />
                                        <Text style={[styles.statusText, { color: '#FFD700' }]}>Checking...</Text>
                                    </View>
                                )}

                                {status === 'available' && (
                                    <View style={styles.statusRow}>
                                        <Feather name="check" size={14} color="#32CD32" style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: '#32CD32' }]}>Available</Text>
                                    </View>
                                )}

                                {status === 'taken' && (
                                    <View style={styles.statusRow}>
                                        <Feather name="info" size={14} color="#E50914" style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: '#E50914' }]}>Taken</Text>
                                    </View>
                                )}

                                {status === 'invalid' && (
                                    <View style={styles.statusRow}>
                                        <Feather name="alert-triangle" size={14} color="#FF8C00" style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: '#FF8C00' }]}>Invalid</Text>
                                    </View>
                                )}
                            </View>

                            <Animated.View style={[
                                styles.glowBorderWrapper,
                                {
                                    borderColor: glowBorder,
                                    backgroundColor: glowColor,
                                    shadowColor: glowBorder,
                                    shadowOpacity: borderGlow.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [0.3, 0, 0.4]
                                    }),
                                    shadowRadius: borderGlow.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [8, 0, 12]
                                    })
                                }
                            ]}>
                                <Text style={styles.prefix}>@</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="username_here"
                                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                    value={username}
                                    onChangeText={(val) => setUsername(val.toLowerCase().trim())}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    maxLength={20}
                                    editable={!isLoading}
                                />
                            </Animated.View>

                            {errorMsg ? (
                                <Text style={styles.errorInlineText}>{errorMsg}</Text>
                            ) : (
                                <Text style={styles.helpText}>
                                    Use 3–20 lowercase letters, numbers, or underscores.
                                </Text>
                            )}
                        </View>

                        {/* Suggestions Render Area */}
                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                                <View style={styles.suggestionsList}>
                                    {suggestions.map((sug, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.suggestionPill}
                                            onPress={() => handleSuggestionPress(sug.toLowerCase())}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.suggestionText}>@{sug}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Button
                            title="Claim Identity"
                            onPress={handleClaimIdentity}
                            isLoading={isLoading}
                            disabled={status !== 'available' || isLoading}
                            style={[
                                styles.claimButton,
                                status !== 'available' && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }
                            ]}
                            textStyle={status !== 'available' && { color: 'rgba(255, 255, 255, 0.2)' }}
                        />
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgImage: {
        width: width,
        height: height,
        opacity: 0.35,
    },
    glassCardWrapper: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        zIndex: 10,
    },
    topIconContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    brandingCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1.5,
        borderColor: 'rgba(229, 9, 20, 0.4)',
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    title: {
        color: '#FFFFFF',
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold as any,
        textAlign: 'center',
        marginBottom: spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: typography.sizes.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        lineHeight: 20,
    },
    form: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: spacing.xl,
        paddingVertical: spacing.xxl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 5,
    },
    inputContainer: {
        marginBottom: spacing.xl,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        color: '#FFFFFF',
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold as any,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold as any,
    },
    glowBorderWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        paddingHorizontal: spacing.md,
        height: 56,
    },
    prefix: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold as any,
        marginRight: 2,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.medium as any,
        height: '100%',
    },
    errorInlineText: {
        color: '#FF8C00',
        fontSize: 12,
        marginTop: spacing.xs,
        fontWeight: '600',
    },
    helpText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: spacing.xs,
        fontWeight: '500',
    },
    claimButton: {
        height: 52,
        borderRadius: borderRadius.lg,
        marginTop: spacing.xs,
    },
    suggestionsContainer: {
        marginBottom: spacing.xl,
        marginTop: -spacing.sm,
    },
    suggestionsTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    suggestionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    suggestionPill: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    suggestionText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '700',
    },
});
