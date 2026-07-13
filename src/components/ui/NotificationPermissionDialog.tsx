import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { notificationPermission } from '../../services/notificationPermission';

interface NotificationPermissionDialogProps {
    visible: boolean;
    onClose: () => void;
}

export const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
    visible,
    onClose,
}) => {
    const themeColors = useThemeColors();
    const setNotificationsEnabled = useAppStore(state => state.setNotificationsEnabled);

    const handleEnable = async () => {
        const result = await notificationPermission.requestPermission();
        if (result === 'granted') {
            await setNotificationsEnabled(true);
        } else {
            await setNotificationsEnabled(false);
        }
        await notificationPermission.markOnboardingShown();
        onClose();
    };

    const handleMaybeLater = async () => {
        await setNotificationsEnabled(false);
        await notificationPermission.markOnboardingShown();
        await notificationPermission.markTrackingPromptShown(); // sets the cooldown timer
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: '#131317', borderColor: themeColors.border }]}>
                    <View style={[styles.iconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
                        <Feather name="bell" size={32} color={themeColors.primary} />
                    </View>

                    <Text style={[styles.title, { color: 'white' }]}>Stay Updated!</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textDim }]}>
                        Never miss anything about your favorite anime. Get notified when:
                    </Text>

                    <View style={styles.list}>
                        {[
                            'New episodes are released',
                            'Upcoming anime starts airing',
                            'Your tracked anime has updates',
                            'Personalized recommendations'
                        ].map((text, i) => (
                            <View key={i} style={styles.listItem}>
                                <View style={[styles.checkDot, { backgroundColor: themeColors.primary }]} />
                                <Text style={[styles.listText, { color: themeColors.text }]}>{text}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
                        onPress={handleEnable}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryText}>Enable Notifications</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleMaybeLater}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.secondaryText, { color: themeColors.textDim }]}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        borderWidth: 1,
        padding: spacing.lg,
        alignItems: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    list: {
        width: '100%',
        marginBottom: spacing.xl,
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    listText: {
        fontSize: 13,
        fontWeight: '500',
    },
    primaryButton: {
        width: '100%',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    primaryText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    secondaryButton: {
        width: '100%',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
