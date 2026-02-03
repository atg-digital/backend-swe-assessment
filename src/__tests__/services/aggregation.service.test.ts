import { AggregationService } from '../../services/aggregation.service';
import { MOCK_RECORDS, createTicketRecord } from '../fixtures/ticket-data';

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    service = new AggregationService();
  });

  describe('groupByEvent', () => {
    it('should group records by event ID', () => {
      const records = [
        ...MOCK_RECORDS.fullCoverage,
        ...MOCK_RECORDS.partialCoverage,
      ];

      const grouped = service.groupByEvent(records);

      expect(grouped.size).toBe(2);
      expect(grouped.get('evt-001')?.length).toBe(3);
      expect(grouped.get('evt-002')?.length).toBe(2);
    });

    it('should return empty map for empty input', () => {
      const grouped = service.groupByEvent([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe('groupByDate', () => {
    it('should group records by normalized date', () => {
      const records = [
        createTicketRecord('evt-001', 'ticketmaster', '2024-03-15T10:00:00Z', 100),
        createTicketRecord('evt-002', 'ticketmaster', '2024-03-15T14:00:00Z', 200),
        createTicketRecord('evt-003', 'ticketmaster', '2024-03-16T10:00:00Z', 150),
      ];

      const grouped = service.groupByDate(records);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2024-03-15')?.length).toBe(2);
      expect(grouped.get('2024-03-16')?.length).toBe(1);
    });

    it('should handle single date', () => {
      const records = [
        createTicketRecord('evt-001', 'ticketmaster', '2024-03-15T10:00:00Z', 100),
      ];

      const grouped = service.groupByDate(records);

      expect(grouped.size).toBe(1);
      expect(grouped.get('2024-03-15')?.length).toBe(1);
    });
  });

  describe('aggregateForEvent', () => {
    it('should aggregate availability from multiple sources', () => {
      const result = service.aggregateForEvent(MOCK_RECORDS.fullCoverage);

      expect(result).not.toBeNull();
      expect(result!.eventId).toBe('evt-001');
      expect(result!.totalAvailable).toBe(175); // 100 + 50 + 25
      expect(result!.sources.length).toBe(3);
    });

    it('should return null for empty records', () => {
      const result = service.aggregateForEvent([]);
      expect(result).toBeNull();
    });

    it('should handle sold out events', () => {
      const result = service.aggregateForEvent(MOCK_RECORDS.soldOut);

      expect(result).not.toBeNull();
      expect(result!.totalAvailable).toBe(0);
    });

    it('should include source breakdown', () => {
      const result = service.aggregateForEvent(MOCK_RECORDS.fullCoverage);

      expect(result!.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'ticketmaster', availableCount: 100 }),
          expect.objectContaining({ source: 'stubhub', availableCount: 50 }),
          expect.objectContaining({ source: 'internal', availableCount: 25 }),
        ])
      );
    });
  });

  describe('aggregateMultipleEvents', () => {
    it('should aggregate and sort multiple events by date', () => {
      const eventGroups = new Map([
        ['evt-001', MOCK_RECORDS.fullCoverage],
        ['evt-002', MOCK_RECORDS.partialCoverage],
      ]);

      const results = service.aggregateMultipleEvents(eventGroups);

      expect(results.length).toBe(2);
      // Should be sorted by date
      expect(results[0].eventId).toBe('evt-001');
      expect(results[1].eventId).toBe('evt-002');
    });
  });

  describe('getSummaryStats', () => {
    it('should calculate correct summary statistics', () => {
      const aggregated = [
        service.aggregateForEvent(MOCK_RECORDS.fullCoverage)!,
        service.aggregateForEvent(MOCK_RECORDS.partialCoverage)!,
      ];

      const stats = service.getSummaryStats(aggregated);

      expect(stats.totalEvents).toBe(2);
      expect(stats.totalTicketsAvailable).toBe(175 + 275); // 175 + 275
      expect(stats.avgTicketsPerEvent).toBe(225); // 450 / 2
    });

    it('should handle empty array', () => {
      const stats = service.getSummaryStats([]);

      expect(stats.totalEvents).toBe(0);
      expect(stats.totalTicketsAvailable).toBe(0);
      expect(stats.avgTicketsPerEvent).toBe(0);
    });
  });
});
