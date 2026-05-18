import { useAppStore } from '../store/useAppStore';
import { darkColors, lightColors } from '../theme/colors';

export const useThemeColors = () => {
  const theme = useAppStore((state) => state.theme);
  return theme === 'dark' ? darkColors : lightColors;
};
