/**
 * Utilities for date and time handling with Vietnam timezone support
 * Provides functions for formatting dates and calculating relative time
 */
import { format, formatInTimeZone, toZonedTime as tzToZonedTime } from 'date-fns-tz';
import { differenceInHours, differenceInDays, isValid } from 'date-fns';

// Define supported timezones
export const TIMEZONES = {
  VIETNAM: 'Asia/Ho_Chi_Minh',
  UTC: 'UTC'
};

// Default application timezone
export const DEFAULT_TIMEZONE = TIMEZONES.VIETNAM;

/**
 * Convert time to a specific timezone
 * @param date - Time to convert
 * @param timezone - Target timezone (default is Vietnam)
 * @returns Date object converted to the specified timezone
 */
export function toZonedTime(date: string | Date, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    const dateObject = new Date(date);
    if (!isValid(dateObject)) throw new Error('Invalid date');
    
    return tzToZonedTime(dateObject, timezone);
  } catch (error) {
    console.error('Error converting to zoned time:', error);
    return new Date(); // Fallback to current time
  }
}

/**
 * Format time according to a specific timezone
 * @param date - Time to format
 * @param formatStr - Desired format
 * @param timezone - Timezone (default is Vietnam)
 * @returns Formatted time string
 */
export function formatDateInTimezone(
  date: string | Date,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const dateObject = new Date(date);
    if (!isValid(dateObject)) return 'Invalid date';
    
    return formatInTimeZone(dateObject, timezone, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format full date and time in Vietnam timezone
 * @param date - Time to format
 * @returns Formatted time string, e.g.: "2023-06-15 14:30:45 (GMT+7)"
 */
export function formatMeasurementDate(date: string | Date): string {
  try {
    if (!date) return 'Invalid date';
    
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObject.getTime())) return 'Invalid date';
    
    return formatDateInTimezone(dateObject, 'yyyy-MM-dd HH:mm:ss') + ' (GMT+7)';
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date in Vietnam timezone
 * @param date - Time to format
 * @returns Date string, e.g.: "2023-06-15"
 */
export function formatShortDate(date: string | Date): string {
  try {
    if (!date) return 'Invalid date';
    
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObject.getTime())) return 'Invalid date';
    
    return formatDateInTimezone(dateObject, 'yyyy-MM-dd');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Display relative time (compared to now) in English
 * @param date - Time to compare
 * @returns Relative time string, e.g.: "5 hours ago", "2 days ago"
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    if (!date) return 'Invalid date';
    
    // Convert both times to the same timezone for accurate comparison
    const vietnamDate = toZonedTime(date);
    const vietnamNow = toZonedTime(new Date());
    
    // Calculate exact time difference using date-fns
    const diffHours = differenceInHours(vietnamNow, vietnamDate);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    
    const diffDays = differenceInDays(vietnamNow, vietnamDate);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Check if a value is a valid date
 * @param date - Value to check
 * @returns true if it's a valid date, false otherwise
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  
  try {
    const dateObject = new Date(date);
    return isValid(dateObject);
  } catch {
    return false;
  }
}

/**
 * Get current date in Vietnam timezone
 * @returns Date object representing the current time in Vietnam
 */
export function getCurrentVietnamDate(): Date {
  return toZonedTime(new Date(), DEFAULT_TIMEZONE);
}