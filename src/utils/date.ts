import { formatDistanceToNow } from 'date-fns';

/**
 * Safely parses a date from various formats including ISO strings and Firebase Timestamp objects.
 */
export const parseSafeDate = (date: any): Date | null => {
  if (!date) return null;

  // Handle Firebase Timestamp
  if (typeof date === 'object' && date.seconds !== undefined) {
    return new Date(date.seconds * 1000);
  }

  // Handle ISO string or Number
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Returns a relative time string (e.g. "2h ago") safely.
 */
export const getSafeRelativeTime = (date: any): string => {
  const parsed = parseSafeDate(date);
  if (!parsed) return 'just now';

  try {
    const now = new Date();
    const diffMs = now.getTime() - parsed.getTime();
    
    // If it's in the future or very recent, show "just now"
    if (diffMs < 60000) return 'just now';

    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, use date-fns for better formatting
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch (error) {
    return 'just now';
  }
};
