/**
 * Date utility functions for ticket inventory service
 */

/**
 * Normalize an ISO date string to a date-only string (YYYY-MM-DD)
 * Used for grouping events by date
 */
export function normalizeToDate(isoDateString: string): string {
  // Normalize to date for grouping
  const date = new Date(isoDateString);
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isDateInRange(
  dateStr: string,
  startDate: string,
  endDate: string
): boolean {
  const date = normalizeToDate(dateStr);
  return date >= startDate && date <= endDate;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse a date string and validate it
 */
export function parseDate(dateStr: string): Date | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Calculate TTL timestamp (Unix seconds) for DynamoDB
 * @param hoursFromNow - Number of hours until expiry
 */
export function calculateTTL(hoursFromNow: number): number {
  const now = Date.now();
  const ttlMs = now + hoursFromNow * 60 * 60 * 1000;
  return Math.floor(ttlMs / 1000);
}

/**
 * Format a date for display
 */
export function formatDisplayDate(isoDateString: string): string {
  const date = new Date(isoDateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get date range for the next N days
 */
export function getNextNDaysRange(days: number): { startDate: string; endDate: string } {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}
