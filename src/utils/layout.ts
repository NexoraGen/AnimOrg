import { Platform, StatusBar } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

export const HEADER_HEIGHT = 65;

export function getSafeTopInset(insets: EdgeInsets): number {
    if (insets.top > 0) return insets.top;
    if (Platform.OS === 'android') {
        return StatusBar.currentHeight || 24;
    }
    return 0;
}

export function getHeaderContentTopOffset(insets: EdgeInsets, extraSpacing: number = 0): number {
    return getSafeTopInset(insets) + HEADER_HEIGHT + extraSpacing;
}
