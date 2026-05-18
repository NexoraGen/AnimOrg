import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DataGuardProps {
    isLoading: boolean;
    error: Error | string | null;
    data: any;
    onRetry?: () => void;
    children: React.ReactNode;
    emptyComponent?: React.ReactNode;
    loadingComponent?: React.ReactNode;
    errorComponent?: React.ReactNode;
    isEmpty?: (data: any) => boolean;
}

export const DataGuard: React.FC<DataGuardProps> = ({
    isLoading,
    error,
    data,
    onRetry,
    children,
    emptyComponent,
    loadingComponent,
    errorComponent,
    isEmpty = (d) => !d || (Array.isArray(d) && d.length === 0),
}) => {
    const themeColors = useThemeColors();

    if (isLoading) {
        return loadingComponent || (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    if (error) {
        return errorComponent || (
            <View style={styles.centerContainer}>
                <Feather name="alert-circle" size={48} color={themeColors.error} />
                <Text style={[styles.errorText, { color: themeColors.text }]}>
                    {typeof error === 'string' ? error : 'Something went wrong'}
                </Text>
                {onRetry && (
                    <Pressable
                        onPress={onRetry}
                        style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                )}
            </View>
        );
    }

    if (isEmpty(data)) {
        return emptyComponent || (
            <View style={styles.centerContainer}>
                <Feather name="inbox" size={48} color={themeColors.textDim} />
                <Text style={[styles.emptyText, { color: themeColors.textDim }]}>
                    No items found
                </Text>
            </View>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        minHeight: 200,
    },
    errorText: {
        marginTop: spacing.md,
        fontSize: typography.sizes.md,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    retryButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    retryText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: typography.sizes.md,
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: typography.sizes.md,
        textAlign: 'center',
    },
});
