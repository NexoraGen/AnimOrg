import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform, Linking, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius } from '../../theme';
import { VersionInfo } from '../../services/VersionCheckService';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface UpdateAvailableModalProps {
    visible: boolean;
    versionInfo: VersionInfo | null;
    isForceUpdate: boolean;
    onLater: () => void;
    playStoreUrl: string;
}

export function UpdateAvailableModal({ visible, versionInfo, isForceUpdate, onLater, playStoreUrl }: UpdateAvailableModalProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Animate entrance
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
            scaleAnim.setValue(0.95);
        }
    }, [visible]);

    if (!visible) return null;

    const handleUpdateNow = async () => {
        try {
            await Linking.openURL(playStoreUrl);
        } catch (e) {
            console.error('[UpdateAvailableModal] Failed to open store URL', e);
        }
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                    <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>

                <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    {/* Header Image Area */}
                    <View style={styles.heroContainer}>
                        <LinearGradient
                            colors={['rgba(229,9,20,0.3)', 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        />
                        <View style={styles.iconWrapper}>
                            <Feather name="gift" size={42} color={colors.primary} />
                        </View>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title}>✨ A Better AnimOrg Awaits!</Text>

                        <Text style={styles.message}>
                            Thank you for being part of the AnimOrg community! ❤️
                        </Text>

                        <Text style={styles.details}>
                            {versionInfo?.updateMessage || "We've released a newer version with bug fixes, performance improvements, and new features to make your anime experience even better."}
                        </Text>

                        <Text style={styles.callToAction}>
                            Update now to enjoy the best version of AnimOrg.
                        </Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.updateButton} onPress={handleUpdateNow} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#E50914', '#D00000']}
                                style={styles.updateButtonGradient}
                            >
                                <Text style={styles.updateButtonText}>Update Now</Text>
                                <Feather name="external-link" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {!isForceUpdate && (
                            <TouchableOpacity style={styles.laterButton} onPress={onLater} activeOpacity={0.6}>
                                <Text style={styles.laterButtonText}>Later</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: spacing.xl,
    },
    modalContainer: {
        backgroundColor: '#121212',
        borderRadius: borderRadius.xxl,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 15,
    },
    heroContainer: {
        height: 120,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(229,9,20,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(229,9,20,0.3)',
    },
    content: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: spacing.md,
        fontWeight: '500',
    },
    details: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    callToAction: {
        fontSize: 15,
        color: colors.primary,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    buttonContainer: {
        padding: spacing.xl,
        paddingTop: 0,
        gap: spacing.md,
    },
    updateButton: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    updateButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    laterButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    laterButtonText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
        fontWeight: '600',
    }
});
