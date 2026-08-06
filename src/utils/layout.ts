import { Platform, StatusBar } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

export const HEADER_HEIGHT = 65;

export function getSafeTopInset(insets: EdgeInsets): number {
    const baseOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
    const computedTop = Math.max(insets.top, baseOffset);
    // Add extra padding to safely clear dynamic islands/notches
    const extraPadding = Platform.OS === 'android' ? 16 : 0;
    return computedTop + extraPadding;
}

export function getHeaderContentTopOffset(insets: EdgeInsets, extraSpacing: number = 0): number {
    return getSafeTopInset(insets) + HEADER_HEIGHT + extraSpacing;
}
