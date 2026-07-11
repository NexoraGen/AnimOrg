export interface AvatarPreset {
  url: string;
  name: string;
}

// Exactly 48 completely unique, copyright-safe, modern anime character illustrations
export const ANIME_AVATARS: AvatarPreset[] = Array.from({ length: 48 }, (_, i) => ({
  url: `preset_${i + 1}`,
  name: `Original Avatar ${i + 1}`
}));

// Local asset resource map to map stable identifiers to build-safe require numbers
export const AVATAR_PRESETS_MAP: Record<string, any> = {
  'preset_1': require('../../assets/avatars/preset_1.webp'),
  'preset_2': require('../../assets/avatars/preset_2.webp'),
  'preset_3': require('../../assets/avatars/preset_3.webp'),
  'preset_4': require('../../assets/avatars/preset_4.webp'),
  'preset_5': require('../../assets/avatars/preset_5.webp'),
  'preset_6': require('../../assets/avatars/preset_6.webp'),
  'preset_7': require('../../assets/avatars/preset_7.webp'),
  'preset_8': require('../../assets/avatars/preset_8.webp'),
  'preset_9': require('../../assets/avatars/preset_9.webp'),
  'preset_10': require('../../assets/avatars/preset_10.webp'),
  'preset_11': require('../../assets/avatars/preset_11.webp'),
  'preset_12': require('../../assets/avatars/preset_12.webp'),
  'preset_13': require('../../assets/avatars/preset_13.webp'),
  'preset_14': require('../../assets/avatars/preset_14.webp'),
  'preset_15': require('../../assets/avatars/preset_15.webp'),
  'preset_16': require('../../assets/avatars/preset_16.webp'),
  'preset_17': require('../../assets/avatars/preset_17.webp'),
  'preset_18': require('../../assets/avatars/preset_18.webp'),
  'preset_19': require('../../assets/avatars/preset_19.webp'),
  'preset_20': require('../../assets/avatars/preset_20.webp'),
  'preset_21': require('../../assets/avatars/preset_21.webp'),
  'preset_22': require('../../assets/avatars/preset_22.webp'),
  'preset_23': require('../../assets/avatars/preset_23.webp'),
  'preset_24': require('../../assets/avatars/preset_24.webp'),
  'preset_25': require('../../assets/avatars/preset_25.webp'),
  'preset_26': require('../../assets/avatars/preset_26.webp'),
  'preset_27': require('../../assets/avatars/preset_27.webp'),
  'preset_28': require('../../assets/avatars/preset_28.webp'),
  'preset_29': require('../../assets/avatars/preset_29.webp'),
  'preset_30': require('../../assets/avatars/preset_30.webp'),
  'preset_31': require('../../assets/avatars/preset_31.webp'),
  'preset_32': require('../../assets/avatars/preset_32.webp'),
  'preset_33': require('../../assets/avatars/preset_33.webp'),
  'preset_34': require('../../assets/avatars/preset_34.webp'),
  'preset_35': require('../../assets/avatars/preset_35.webp'),
  'preset_36': require('../../assets/avatars/preset_36.webp'),
  'preset_37': require('../../assets/avatars/preset_37.webp'),
  'preset_38': require('../../assets/avatars/preset_38.webp'),
  'preset_39': require('../../assets/avatars/preset_39.webp'),
  'preset_40': require('../../assets/avatars/preset_40.webp'),
  'preset_41': require('../../assets/avatars/preset_41.webp'),
  'preset_42': require('../../assets/avatars/preset_42.webp'),
  'preset_43': require('../../assets/avatars/preset_43.webp'),
  'preset_44': require('../../assets/avatars/preset_44.webp'),
  'preset_45': require('../../assets/avatars/preset_45.webp'),
  'preset_46': require('../../assets/avatars/preset_46.webp'),
  'preset_47': require('../../assets/avatars/preset_47.webp'),
  'preset_48': require('../../assets/avatars/preset_48.webp'),
};

/**
 * Resolves avatar input (either a preset string like preset_1 or a Firestore web URI string)
 * to a local require reference or a uri object, matching React Native Image component signature.
 */
export const getAvatarSource = (urlOrPreset: string | undefined | null): any => {
  if (!urlOrPreset || !urlOrPreset.trim()) {
    return require('../../assets/guest-avatar.png');
  }
  if (urlOrPreset.startsWith('preset_')) {
    return AVATAR_PRESETS_MAP[urlOrPreset] || require('../../assets/guest-avatar.png');
  }
  return { uri: urlOrPreset };
};

export const getRandomAnimeAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * ANIME_AVATARS.length);
  return ANIME_AVATARS[randomIndex].url;
};
