export interface AvatarPreset {
  url: string;
  name: string;
  category: 'glow' | 'masked' | 'swordsman' | 'silhouette' | 'cyber';
}

export const ANIME_AVATARS: AvatarPreset[] = [
  // 🔥 Glow
  {
    url: 'https://cdn.myanimelist.net/images/characters/15/422168.jpg',
    name: 'Satoru Gojo',
    category: 'glow'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/7/284129.jpg',
    name: 'Kakashi Hatake',
    category: 'glow'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/10/386008.jpg',
    name: 'Shinra Kusakabe',
    category: 'glow'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/2/241413.jpg',
    name: 'Killua Zoldyck',
    category: 'glow'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/10/241411.jpg',
    name: 'Kurapika',
    category: 'glow'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/15/276483.jpg',
    name: 'Gilgamesh',
    category: 'glow'
  },

  // 🎭 Masked
  {
    url: 'https://cdn.myanimelist.net/images/characters/4/521360.jpg',
    name: 'Ken Kaneki',
    category: 'masked'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/2/227563.jpg',
    name: 'Obito Uchiha',
    category: 'masked'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/8/442548.jpg',
    name: 'Lelouch (Zero)',
    category: 'masked'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/12/367375.jpg',
    name: 'Rimuru Tempest',
    category: 'masked'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/3/382054.jpg',
    name: 'Inosuke Hashibira',
    category: 'masked'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/12/502120.jpg',
    name: 'Ulquiorra Cifer',
    category: 'masked'
  },

  // ⚔️ Swordsman
  {
    url: 'https://cdn.myanimelist.net/images/characters/13/283626.jpg',
    name: 'Roronoa Zoro',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/9/299444.jpg',
    name: 'Guts (Berserk)',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/4/504886.jpg',
    name: 'Tanjiro Kamado',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/13/490805.jpg',
    name: 'Levi Ackerman',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/16/432360.jpg',
    name: 'Mikasa Ackerman',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/4/496265.jpg',
    name: 'Yoriichi Tsugikuni',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/11/345595.jpg',
    name: 'Saber Alter',
    category: 'swordsman'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/16/242279.jpg',
    name: 'Madara Uchiha',
    category: 'swordsman'
  },

  // 👤 Silhouette
  {
    url: 'https://cdn.myanimelist.net/images/characters/6/405904.jpg',
    name: 'Eren Yeager',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/4/491950.jpg',
    name: 'Ryuk',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/14/237699.jpg',
    name: 'L Lawliet',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/11/294371.jpg',
    name: 'Saitama',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/6/363806.jpg',
    name: 'Dabi',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/3/478648.jpg',
    name: 'Megumi Fushiguro',
    category: 'silhouette'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/6/299650.jpg',
    name: 'Albedo',
    category: 'silhouette'
  },

  // 🌐 Cyber
  {
    url: 'https://cdn.myanimelist.net/images/characters/16/347584.jpg',
    name: 'Zero Two',
    category: 'cyber'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/12/439739.jpg',
    name: 'Rei Ayanami',
    category: 'cyber'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/14/225381.jpg',
    name: 'Asuka Langley',
    category: 'cyber'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/9/296716.jpg',
    name: 'Genos',
    category: 'cyber'
  },
  {
    url: 'https://cdn.myanimelist.net/images/characters/9/393527.jpg',
    name: 'Motoko Kusanagi',
    category: 'cyber'
  }
];

export const getRandomAnimeAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * ANIME_AVATARS.length);
  return ANIME_AVATARS[randomIndex].url;
};
