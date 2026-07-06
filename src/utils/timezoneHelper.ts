import { Platform } from 'react-native';

export interface TimezoneEntry {
    id: string; // e.g. "Asia/Kolkata"
    city: string; // e.g. "Kolkata"
    country: string; // e.g. "India"
    countryCode: string; // e.g. "IN"
    label: string; // e.g. "IST (UTC+5:30)"
    offsetMinutes: number; // e.g. 330
    searchTerms: string[]; // for flexible fuzzy search matching
}

// Curated list of high-coverage global timezones spanning all regions
export const GLOBAL_TIMEZONES: TimezoneEntry[] = [
    // Asia
    { id: 'Asia/Kolkata', city: 'Kolkata', country: 'India', countryCode: 'IN', label: 'IST (UTC+5:30)', offsetMinutes: 330, searchTerms: ['india', 'kolkata', 'mumbai', 'delhi', 'ist', 'bangalore', 'chennai'] },
    { id: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', label: 'JST (UTC+9:00)', offsetMinutes: 540, searchTerms: ['japan', 'tokyo', 'jst', 'osaka', 'kyoto', 'yokohama'] },
    { id: 'Asia/Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', label: 'SGT (UTC+8:00)', offsetMinutes: 480, searchTerms: ['singapore', 'sgt', 'changi'] },
    { id: 'Asia/Seoul', city: 'Seoul', country: 'South Korea', countryCode: 'KR', label: 'KST (UTC+9:00)', offsetMinutes: 540, searchTerms: ['korea', 'seoul', 'kst', 'busan', 'incheon'] },
    { id: 'Asia/Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', label: 'CST (UTC+8:00)', offsetMinutes: 480, searchTerms: ['china', 'shanghai', 'beijing', 'cst', 'shenzhen', 'guangzhou'] },
    { id: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', label: 'HKT (UTC+8:00)', offsetMinutes: 480, searchTerms: ['hong kong', 'hkt', 'kowloon'] },
    { id: 'Asia/Taipei', city: 'Taipei', country: 'Taiwan', countryCode: 'TW', label: 'NST (UTC+8:00)', offsetMinutes: 480, searchTerms: ['taiwan', 'taipei', 'nst', 'kaohsiung'] },
    { id: 'Asia/Jakarta', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', label: 'WIB (UTC+7:00)', offsetMinutes: 420, searchTerms: ['indonesia', 'jakarta', 'wib', 'bali'] },
    { id: 'Asia/Manila', city: 'Manila', country: 'Philippines', countryCode: 'PH', label: 'PHT (UTC+8:00)', offsetMinutes: 480, searchTerms: ['philippines', 'manila', 'pht', 'quezon'] },
    { id: 'Asia/Bangkok', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', label: 'ICT (UTC+7:00)', offsetMinutes: 420, searchTerms: ['thailand', 'bangkok', 'ict', 'phuket'] },
    { id: 'Asia/Dubai', city: 'Dubai', country: 'UAE', countryCode: 'AE', label: 'GST (UTC+4:00)', offsetMinutes: 240, searchTerms: ['uae', 'dubai', 'abu dhabi', 'gst'] },
    { id: 'Asia/Riyadh', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', label: 'AST (UTC+3:00)', offsetMinutes: 180, searchTerms: ['saudi', 'riyadh', 'ast', 'jeddah', 'mecca'] },
    { id: 'Asia/Jerusalem', city: 'Jerusalem', country: 'Israel', countryCode: 'IL', label: 'IST (UTC+2:00)', offsetMinutes: 120, searchTerms: ['israel', 'jerusalem', 'tel aviv', 'ist'] },

    // Europe
    { id: 'Europe/London', city: 'London', country: 'United Kingdom', countryCode: 'GB', label: 'GMT/BST (UTC+0:00)', offsetMinutes: 0, searchTerms: ['uk', 'london', 'gmt', 'bst', 'gb', 'england', 'manchester'] },
    { id: 'Europe/Paris', city: 'Paris', country: 'France', countryCode: 'FR', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['france', 'paris', 'cet', 'cest', 'lyon', 'marseille'] },
    { id: 'Europe/Berlin', city: 'Berlin', country: 'Germany', countryCode: 'DE', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['germany', 'berlin', 'cet', 'cest', 'munich', 'frankfurt'] },
    { id: 'Europe/Rome', city: 'Rome', country: 'Italy', countryCode: 'IT', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['italy', 'rome', 'cet', 'cest', 'milan', 'venice'] },
    { id: 'Europe/Madrid', city: 'Madrid', country: 'Spain', countryCode: 'ES', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['spain', 'madrid', 'cet', 'cest', 'barcelona'] },
    { id: 'Europe/Moscow', city: 'Moscow', country: 'Russia', countryCode: 'RU', label: 'MSK (UTC+3:00)', offsetMinutes: 180, searchTerms: ['russia', 'moscow', 'msk', 'st petersburg'] },
    { id: 'Europe/Istanbul', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', label: 'TRT (UTC+3:00)', offsetMinutes: 180, searchTerms: ['turkey', 'istanbul', 'trt', 'ankara'] },
    { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['netherlands', 'holland', 'amsterdam', 'cet', 'cest'] },
    { id: 'Europe/Bruchsal', city: 'Brussels', country: 'Belgium', countryCode: 'BE', label: 'CET/CEST (UTC+1:00)', offsetMinutes: 60, searchTerms: ['belgium', 'brussels', 'cet', 'cest'] },

    // North America
    { id: 'America/New_York', city: 'New York', country: 'USA', countryCode: 'US', label: 'EST/EDT (UTC-5:00)', offsetMinutes: -300, searchTerms: ['usa', 'us', 'new york', 'est', 'edt', 'boston', 'miami', 'washington', 'atlanta'] },
    { id: 'America/Chicago', city: 'Chicago', country: 'USA', countryCode: 'US', label: 'CST/CDT (UTC-6:00)', offsetMinutes: -360, searchTerms: ['usa', 'us', 'chicago', 'cst', 'cdt', 'houston', 'dallas', 'minneapolis'] },
    { id: 'America/Denver', city: 'Denver', country: 'USA', countryCode: 'US', label: 'MST/MDT (UTC-7:00)', offsetMinutes: -420, searchTerms: ['usa', 'us', 'denver', 'phoenix', 'mst', 'mdt', 'salt lake'] },
    { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'USA', countryCode: 'US', label: 'PST/PDT (UTC-8:00)', offsetMinutes: -480, searchTerms: ['usa', 'us', 'los angeles', 'la', 'pst', 'pdt', 'san francisco', 'seattle', 'las vegas'] },
    { id: 'America/Anchorage', city: 'Anchorage', country: 'USA', countryCode: 'US', label: 'AKST/AKDT (UTC-9:00)', offsetMinutes: -540, searchTerms: ['usa', 'alaska', 'anchorage', 'akst'] },
    { id: 'America/Adak', city: 'Hawaii', country: 'USA', countryCode: 'US', label: 'HST (UTC-10:00)', offsetMinutes: -600, searchTerms: ['usa', 'hawaii', 'honolulu', 'hst'] },
    { id: 'America/Toronto', city: 'Toronto', country: 'Canada', countryCode: 'CA', label: 'EST/EDT (UTC-5:00)', offsetMinutes: -300, searchTerms: ['canada', 'toronto', 'est', 'edt', 'ottawa', 'montreal'] },
    { id: 'America/Vancouver', city: 'Vancouver', country: 'Canada', countryCode: 'CA', label: 'PST/PDT (UTC-8:00)', offsetMinutes: -480, searchTerms: ['canada', 'vancouver', 'pst', 'pdt'] },
    { id: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', label: 'CST (UTC-6:00)', offsetMinutes: -360, searchTerms: ['mexico', 'mexico city', 'cst'] },

    // South America
    { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', label: 'BRT (UTC-3:00)', offsetMinutes: -180, searchTerms: ['brazil', 'sao paulo', 'rio de janeiro', 'brt'] },
    { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', label: 'ART (UTC-3:00)', offsetMinutes: -180, searchTerms: ['argentina', 'buenos aires', 'art'] },
    { id: 'America/Bogota', city: 'Bogota', country: 'Colombia', countryCode: 'CO', label: 'COT (UTC-5:00)', offsetMinutes: -300, searchTerms: ['colombia', 'bogota', 'cot'] },
    { id: 'America/Santiago', city: 'Santiago', country: 'Chile', countryCode: 'CL', label: 'CLT (UTC-4:00)', offsetMinutes: -240, searchTerms: ['chile', 'santiago', 'clt'] },

    // Australia & Oceania
    { id: 'Australia/Sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', label: 'AEST/AEDT (UTC+10:00)', offsetMinutes: 600, searchTerms: ['australia', 'sydney', 'aest', 'aedt', 'canberra', 'melbourne'] },
    { id: 'Australia/Perth', city: 'Perth', country: 'Australia', countryCode: 'AU', label: 'AWST (UTC+8:00)', offsetMinutes: 480, searchTerms: ['australia', 'perth', 'awst'] },
    { id: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', label: 'NZST/NZDT (UTC+12:00)', offsetMinutes: 720, searchTerms: ['new zealand', 'auckland', 'wellington', 'nzst', 'nzdt'] },
    { id: 'Pacific/Fiji', city: 'Fiji', country: 'Fiji', countryCode: 'FJ', label: 'FJT (UTC+12:00)', offsetMinutes: 720, searchTerms: ['fiji', 'suva', 'fjt'] },
    { id: 'Pacific/Honolulu', city: 'Honolulu', city_alias: 'Hawaii', country: 'USA', countryCode: 'US', label: 'HST (UTC-10:00)', offsetMinutes: -600, searchTerms: ['usa', 'hawaii', 'honolulu', 'hst'] } as any,

    // Africa
    { id: 'Africa/Cairo', city: 'Cairo', country: 'Egypt', countryCode: 'EG', label: 'EET (UTC+2:00)', offsetMinutes: 120, searchTerms: ['egypt', 'cairo', 'eet'] },
    { id: 'Africa/Johannesburg', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', label: 'SAST (UTC+2:00)', offsetMinutes: 120, searchTerms: ['south africa', 'johannesburg', 'sast', 'cape town'] },
    { id: 'Africa/Nairobi', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', label: 'EAT (UTC+3:00)', offsetMinutes: 180, searchTerms: ['kenya', 'nairobi', 'eat'] },
    { id: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', label: 'WAT (UTC+1:00)', offsetMinutes: 60, searchTerms: ['nigeria', 'lagos', 'wat'] }
];

export const autoDetectTimezone = (): TimezoneEntry => {
    let systemTz = 'UTC';
    try {
        systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        // Fallback if not available
    }

    // Try finding exact match
    const exactMatch = GLOBAL_TIMEZONES.find(t => t.id.toLowerCase() === systemTz.toLowerCase());
    if (exactMatch) return exactMatch;

    // Try city fuzzy match
    const parts = systemTz.split('/');
    const cityPart = parts[parts.length - 1].replace(/_/g, ' ');
    const cityMatch = GLOBAL_TIMEZONES.find(t => t.city.toLowerCase() === cityPart.toLowerCase());
    if (cityMatch) return cityMatch;

    // Fallback: Build a custom dynamic entry for the system timezone
    const now = new Date();
    // Native offset is in minutes (sign inverted relative to standard UTC string representation!)
    const offsetMinutes = -now.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const mins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const formattedOffset = `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;

    return {
        id: systemTz,
        city: cityPart || 'Local',
        country: 'System Detected',
        countryCode: 'UN',
        label: `${systemTz.split('/')[0] || 'Local'} (${formattedOffset})`,
        offsetMinutes,
        searchTerms: [systemTz.toLowerCase(), (cityPart || '').toLowerCase()]
    };
};

export const searchTimezones = (query: string): TimezoneEntry[] => {
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return GLOBAL_TIMEZONES;

    return GLOBAL_TIMEZONES.filter(tz => {
        return (
            tz.city.toLowerCase().includes(cleaned) ||
            tz.country.toLowerCase().includes(cleaned) ||
            tz.id.toLowerCase().includes(cleaned) ||
            tz.label.toLowerCase().includes(cleaned) ||
            tz.searchTerms.some(term => term.includes(cleaned))
        );
    });
};
