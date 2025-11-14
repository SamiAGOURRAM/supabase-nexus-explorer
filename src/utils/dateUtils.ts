/**
 * Date utility functions for formatting and manipulating dates
 */

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Formats a date to a short format (e.g., "Jan 15, 2024")
 * @param dateString - ISO date string
 * @returns Short formatted date string
 */
export function formatDateShort(dateString: string): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats a time from a date string
 * @param dateString - ISO date string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Gets the closest upcoming event from a list of events
 * @param events - Array of events with date property
 * @returns The closest upcoming event or the first event if none are upcoming
 */
export function getClosestUpcomingEvent<T extends { date: string }>(events: T[]): T | null {
  if (!events || events.length === 0) return null;
  
  const today = new Date().toISOString();
  return events.find(e => new Date(e.date) >= new Date(today)) || events[0];
}


