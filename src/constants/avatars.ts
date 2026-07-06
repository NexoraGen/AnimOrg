export interface AvatarPreset {
  url: string;
  name: string;
}

export const ANIME_AVATARS: AvatarPreset[] = [
  { url: 'https://cdn.myanimelist.net/images/characters/8/406163.jpg', name: 'Lelouch Lamperouge' },
  { url: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg', name: 'Monkey D. Luffy' },
  { url: 'https://cdn.myanimelist.net/images/characters/2/241413.jpg', name: 'Levi Ackerman' },
  { url: 'https://cdn.myanimelist.net/images/characters/10/249647.jpg', name: 'L Lawliet' },
  { url: 'https://cdn.myanimelist.net/images/characters/3/100534.jpg', name: 'Roronoa Zoro' },
  { url: 'https://cdn.myanimelist.net/images/characters/2/327920.jpg', name: 'Killua Zoldyck' },
  { url: 'https://cdn.myanimelist.net/images/characters/6/122643.jpg', name: 'Rintarou Okabe' },
  { url: 'https://cdn.myanimelist.net/images/characters/6/63870.jpg', name: 'Light Yagami' },
  { url: 'https://cdn.myanimelist.net/images/characters/9/72533.jpg', name: 'Edward Elric' },
  { url: 'https://cdn.myanimelist.net/images/characters/2/284121.jpg', name: 'Naruto Uzumaki' },
  { url: 'https://cdn.myanimelist.net/images/characters/13/284125.jpg', name: 'Guts' },
  { url: 'https://cdn.myanimelist.net/images/characters/15/241479.jpg', name: 'Gintoki Sakata' },
  { url: 'https://cdn.myanimelist.net/images/characters/10/216895.jpg', name: 'Eren Yeager' },
  { url: 'https://cdn.myanimelist.net/images/characters/12/492885.jpg', name: 'Kurisu Makise' },
  { url: 'https://cdn.myanimelist.net/images/characters/9/284122.jpg', name: 'Itachi Uchiha' },
  { url: 'https://cdn.myanimelist.net/images/characters/15/422168.jpg', name: 'Satoru Gojou' },
  { url: 'https://cdn.myanimelist.net/images/characters/9/215563.jpg', name: 'Mikasa Ackerman' },
  { url: 'https://cdn.myanimelist.net/images/characters/15/307255.jpg', name: 'Ken Kaneki' },
  { url: 'https://cdn.myanimelist.net/images/characters/4/203555.jpg', name: 'Hachiman Hikigaya' },
  { url: 'https://cdn.myanimelist.net/images/characters/7/284129.jpg', name: 'Kakashi Hatake' },
  { url: 'https://cdn.myanimelist.net/images/characters/11/516853.jpg', name: 'Spike Spiegel' },
  { url: 'https://cdn.myanimelist.net/images/characters/11/294388.jpg', name: 'Saitama' },
  { url: 'https://cdn.myanimelist.net/images/characters/9/311327.jpg', name: 'Rem' },
  { url: 'https://cdn.myanimelist.net/images/characters/7/316615.jpg', name: 'Joseph Joestar' },
  { url: 'https://cdn.myanimelist.net/images/characters/14/349249.jpg', name: 'Megumin' }
];

export const getRandomAnimeAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * ANIME_AVATARS.length);
  return ANIME_AVATARS[randomIndex].url;
};
