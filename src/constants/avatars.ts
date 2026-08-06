export interface AvatarPreset {
  url: string;
  name: string;
}

// Exactly 18 completely unique, beautifully generated anime character illustrations
export const ANIME_AVATARS: AvatarPreset[] = Array.from({ length: 18 }, (_, i) => ({
  url: `preset_${i + 1}`,
  name: `Premium Avatar ${i + 1}`
}));

// Local asset resource map to map stable identifiers to build-safe require numbers
export const AVATAR_PRESETS_MAP: Record<string, any> = {
  'preset_1': require('../../assets/avatars/preset_1.jpg'),
  'preset_2': require('../../assets/avatars/preset_2.jpg'),
  'preset_3': require('../../assets/avatars/preset_3.jpg'),
  'preset_4': require('../../assets/avatars/preset_4.jpg'),
  'preset_5': require('../../assets/avatars/preset_5.jpg'),
  'preset_6': require('../../assets/avatars/preset_6.jpg'),
  'preset_7': require('../../assets/avatars/preset_7.jpg'),
  'preset_8': require('../../assets/avatars/preset_8.jpg'),
  'preset_9': require('../../assets/avatars/preset_9.jpg'),
  'preset_10': require('../../assets/avatars/preset_10.jpg'),
  'preset_11': require('../../assets/avatars/preset_11.jpg'),
  'preset_12': require('../../assets/avatars/preset_12.jpg'),
  'preset_13': require('../../assets/avatars/preset_13.jpg'),
  'preset_14': require('../../assets/avatars/preset_14.jpg'),
  'preset_15': require('../../assets/avatars/preset_15.jpg'),
  'preset_16': require('../../assets/avatars/preset_16.jpg'),
  'preset_17': require('../../assets/avatars/preset_17.jpg'),
  'preset_18': require('../../assets/avatars/preset_18.jpg'),
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
