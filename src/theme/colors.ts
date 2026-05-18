export const darkColors = {
  background: '#0B0B0B', // deeper black for true OLED feel
  surface: '#121212',
  surfaceVariant: '#1E1E1E',
  primary: '#E50914', // Netflix-inspired cinematic red
  primaryDark: '#B9090B', // deeper red for shadow depth
  primaryVariant: '#8C0808', // very dark red
  secondary: '#FF1F1F', // high-energy red for accents
  accent: '#E50914', // unified with primary for consistent branding
  text: '#FFFFFF',
  textMuted: '#B3B3B3',
  textDim: '#808080',
  border: '#2A2A2A',
  error: '#FF0000',
  success: '#00C853',
  warning: '#FFD600',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassDark: 'rgba(0, 0, 0, 0.7)',
};

export const lightColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  primary: '#D61F1F',
  primaryDark: '#B71C1C',
  primaryVariant: '#B91C1C',
  secondary: '#EF4444',
  accent: '#F43F5E',
  text: '#111827',
  textMuted: '#4B5563',
  textDim: '#9CA3AF',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  glass: 'rgba(0, 0, 0, 0.05)',
  glassDark: 'rgba(255, 255, 255, 0.5)',
};

// Keep existing export for backward compatibility during migration
export const colors = darkColors;
