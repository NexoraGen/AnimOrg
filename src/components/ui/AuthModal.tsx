import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
    visible,
    onClose,
    title = "Join the Community",
    subtitle = "Sign in to interact with friends, follow users, and track your anime journey."
}) => {
    const theme = useThemeColors();
    const router = useRouter();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Feather name="x" size={24} color={theme.textDim} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <View style={[styles.iconGlow, { backgroundColor: theme.primary }]} />
                        <Feather name="users" size={32} color={theme.primary} />
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    <Text style={[styles.subtitle, { color: theme.textDim }]}>{subtitle}</Text>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                        onPress={() => {
                            onClose();
                            router.push('/(auth)/register');
                        }}
                    >
                        <Text style={styles.primaryBtnText}>Create Username</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border }]}
                        onPress={() => {
                            onClose();
                            router.push('/(auth)/login');
                        }}
                    >
                        <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: spacing.xl,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        padding: spacing.sm,
        zIndex: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
        marginTop: spacing.md,
    },
    iconGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 32,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    primaryBtn: {
        width: '100%',
        height: 48,
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        width: '100%',
        height: 48,
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
