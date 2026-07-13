import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';
import { notificationPermission } from '../../services/notificationPermission';
import { useAppStore } from '../../store/useAppStore';

interface TrackingNotificationPromptProps {
    visible: boolean;
    onClose: () => void;
}

export const TrackingNotificationPrompt: React.FC<TrackingNotificationPromptProps> = ({
    visible,
    onClose,
}) => {
    const themeColors = useThemeColors();
    const setNotificationsEnabled = useAppStore(state => state.setNotificationsEnabled);

    const handleEnable = async () => {
        const status = await notificationPermission.getPermissionStatus();

        if (status === 'blocked') {
            // User must manually open OS settings
            await notificationPermission.openSettings();
        } else {
            const result = await notificationPermission.requestPermission();
            if (result === 'granted') {
                await setNotificationsEnabled(true);
            }
        }

        await notificationPermission.markTrackingPromptShown();
        onClose();
    };

    const handleNotNow = async () => {
        await notificationPermission.markTrackingPromptShown(); // Reset the 7-day cooldown
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />
                <View style={[styles.bottomSheet, { backgroundColor: '#131317', borderColor: themeColors.border }]}>
                    <View style={styles.dragHandle} />

                    <View style={[styles.iconBox, { backgroundColor: `${themeColors.primary}12` }]}>
                        <Feather name="bell" size={24} color={themeColors.primary} />
                    </View>

                    <Text style={[styles.title, { color: 'white' }]}>Never Miss an Episode</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textDim }]}>
                        Enable notifications so we'll remind you when new episodes of your tracked anime are available.
                    </Text>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
                            onPress={handleEnable}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryText}>Enable</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleNotNow}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.secondaryText, { color: themeColors.textDim }]}>Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    dismissOverlay: {
        flex: 1,
    },
    bottomSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: 10,
        paddingBottom: 40,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginBottom: spacing.md,
    },
    iconBox: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    primaryButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    secondaryButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    secondaryText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
export default TrackingNotificationPrompt;
