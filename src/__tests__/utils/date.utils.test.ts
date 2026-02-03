import {
  normalizeToDate,
  isDateInRange,
  getCurrentTimestamp,
  parseDate,
  calculateTTL,
  formatDisplayDate,
  getNextNDaysRange,
} from '../../utils/date.utils';

describe('date.utils', () => {
  describe('normalizeToDate', () => {
    it('should extract date from ISO timestamp', () => {
      expect(normalizeToDate('2024-03-15T10:30:00Z')).toBe('2024-03-15');
    });

    it('should handle midnight timestamps', () => {
      expect(normalizeToDate('2024-03-15T00:00:00Z')).toBe('2024-03-15');
    });

    it('should handle end of day timestamps', () => {
      expect(normalizeToDate('2024-03-15T23:59:59Z')).toBe('2024-03-15');
    });

  });

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      expect(isDateInRange('2024-03-15T12:00:00Z', '2024-03-14', '2024-03-16')).toBe(true);
    });

    it('should return true for date at start of range', () => {
      expect(isDateInRange('2024-03-14T00:00:00Z', '2024-03-14', '2024-03-16')).toBe(true);
    });

    it('should return true for date at end of range', () => {
      expect(isDateInRange('2024-03-16T23:59:59Z', '2024-03-14', '2024-03-16')).toBe(true);
    });

    it('should return false for date before range', () => {
      expect(isDateInRange('2024-03-13T12:00:00Z', '2024-03-14', '2024-03-16')).toBe(false);
    });

    it('should return false for date after range', () => {
      expect(isDateInRange('2024-03-17T12:00:00Z', '2024-03-14', '2024-03-16')).toBe(false);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return valid ISO timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();

      const parsed = new Date(timestamp).getTime();
      expect(parsed).toBeGreaterThanOrEqual(before);
      expect(parsed).toBeLessThanOrEqual(after);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = parseDate('2024-03-15T10:30:00Z');
      expect(result).not.toBeNull();
      expect(result!.toISOString()).toBe('2024-03-15T10:30:00.000Z');
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid-date')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });
  });

  describe('calculateTTL', () => {
    it('should calculate TTL for given hours', () => {
      const now = Date.now();
      const ttl = calculateTTL(24);

      // TTL should be roughly 24 hours from now (in seconds)
      const expectedTTL = Math.floor((now + 24 * 60 * 60 * 1000) / 1000);
      expect(Math.abs(ttl - expectedTTL)).toBeLessThan(2); // Allow 2 second variance
    });

    it('should handle zero hours', () => {
      const now = Math.floor(Date.now() / 1000);
      const ttl = calculateTTL(0);
      expect(Math.abs(ttl - now)).toBeLessThan(2);
    });
  });

  describe('formatDisplayDate', () => {
    it('should format date for display', () => {
      const formatted = formatDisplayDate('2024-03-15T10:30:00Z');
      // Format depends on locale, but should include key parts
      expect(formatted).toContain('2024');
      expect(formatted).toContain('15');
    });
  });

  describe('getNextNDaysRange', () => {
    it('should return date range for next N days', () => {
      const range = getNextNDaysRange(7);

      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.startDate < range.endDate).toBe(true);
    });

    it('should handle single day', () => {
      const range = getNextNDaysRange(1);
      expect(range.startDate).not.toBe(range.endDate);
    });
  });
});
