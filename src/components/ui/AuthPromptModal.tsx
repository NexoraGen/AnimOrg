import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Button } from './Button';
import { useAppStore } from '../../store/useAppStore';

interface AuthPromptModalProps {
    visible: boolean;
    onClose: () => void;
    message?: string;
}

const { width } = Dimensions.get('window');

export function AuthPromptModal({ visible, onClose, message = 'Sign in to join the anime community' }: AuthPromptModalProps) {
    const router = useRouter();
    const clearSession = useAppStore(state => state.clearSession);

    const handleSignIn = () => {
        onClose();
        clearSession();
        setTimeout(() => {
            router.replace('/(auth)/login');
        }, 100);
    };

    const handleRegister = () => {
        onClose();
        clearSession();
        setTimeout(() => {
            router.replace('/(auth)/register');
        }, 100);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <View style={styles.container}>
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <View style={styles.brandDot} />
                            <Text style={styles.title}>ACCESS REQUIRED</Text>
                        </View>

                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            <Button
                                title="Create Account"
                                onPress={handleRegister}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Log In"
                                onPress={handleSignIn}
                                variant="secondary"
                                style={styles.actionButton}
                            />
                        </View>

                        <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
                            <Text style={styles.dismissText}>Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    },
    container: {
        width: Math.min(width - spacing.xl * 2, 400),
        backgroundColor: 'transparent',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    brandDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    title: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
        textAlign: 'center',
    },
    message: {
        color: colors.text,
        fontSize: typography.sizes.lg,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 26,
    },
    buttonContainer: {
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    actionButton: {
        height: 52,
    },
    dismissButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    dismissText: {
        color: colors.textDim,
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
});
