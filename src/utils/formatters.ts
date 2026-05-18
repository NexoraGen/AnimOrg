/**
 * Safely formats a rating number to one decimal place or returns "N/A".
 */
export const formatRating = (rating: number | undefined | null): string => {
  if (rating === null || rating === undefined || rating === 0 || isNaN(rating)) {
    return 'N/A';
  }
  return rating.toFixed(1);
};

/**
 * Returns true if the rating is a valid score (greater than 0).
 */
export const hasValidRating = (rating: number | undefined | null): boolean => {
  return typeof rating === 'number' && !isNaN(rating) && rating > 0;
};
