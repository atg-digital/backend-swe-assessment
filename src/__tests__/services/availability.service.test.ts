import { AvailabilityService } from '../../services/availability.service';
import { TicketRepository } from '../../repositories/ticket.repository';
import { AggregationService } from '../../services/aggregation.service';
import { MOCK_RECORDS } from '../fixtures/ticket-data';

// Mock the repository
jest.mock('../../repositories/ticket.repository');

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let mockRepository: jest.Mocked<TicketRepository>;
  let aggregation: AggregationService;

  beforeEach(() => {
    mockRepository = new TicketRepository() as jest.Mocked<TicketRepository>;
    aggregation = new AggregationService();
    service = new AvailabilityService(mockRepository, aggregation);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getEventAvailability', () => {
    it('should return aggregated availability for an event', async () => {
      mockRepository.getSourcesForEvent = jest.fn().mockResolvedValue(MOCK_RECORDS.fullCoverage);

      const result = await service.getEventAvailability('evt-001');

      expect(result).not.toBeNull();
      expect(result!.eventId).toBe('evt-001');
      expect(result!.totalAvailable).toBe(175);
      expect(mockRepository.getSourcesForEvent).toHaveBeenCalledWith('evt-001');
    });

    it('should return null for non-existent event', async () => {
      mockRepository.getSourcesForEvent = jest.fn().mockResolvedValue([]);

      const result = await service.getEventAvailability('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAvailabilityByDateRange', () => {
    it('should return events within date range', async () => {
      mockRepository.getEventsByDateRange = jest.fn().mockResolvedValue([
        ...MOCK_RECORDS.fullCoverage,
        ...MOCK_RECORDS.partialCoverage,
      ]);

      const result = await service.getAvailabilityByDateRange('2024-03-15', '2024-03-16');

      expect(result.length).toBe(2);
      expect(mockRepository.getEventsByDateRange).toHaveBeenCalledWith('2024-03-15', '2024-03-16');
    });

    it('should return empty array for date range with no events', async () => {
      mockRepository.getEventsByDateRange = jest.fn().mockResolvedValue([]);

      const result = await service.getAvailabilityByDateRange('2024-01-01', '2024-01-02');

      expect(result).toEqual([]);
    });
  });

  describe('hasCompleteSourceData', () => {
    it('should return true when all expected sources are present', () => {
      const result = service.hasCompleteSourceData(
        MOCK_RECORDS.fullCoverage,
        ['ticketmaster', 'stubhub', 'internal']
      );

      expect(result).toBe(true);
    });

    it('should return false when sources are missing', () => {
      const result = service.hasCompleteSourceData(
        MOCK_RECORDS.partialCoverage,
        ['ticketmaster', 'stubhub', 'internal']
      );

      expect(result).toBe(false);
    });
  });

  describe('getLowAvailabilityEvents', () => {
    it('should return events below threshold', async () => {
      mockRepository.getEventsByDateRange = jest.fn().mockResolvedValue([
        ...MOCK_RECORDS.fullCoverage,  // 175 total
        ...MOCK_RECORDS.soldOut,       // 0 total
      ]);

      const result = await service.getLowAvailabilityEvents('2024-03-15', '2024-03-20', 100);

      expect(result.length).toBe(1);
      expect(result[0].eventId).toBe('evt-005');
    });
  });

  describe('getAvailabilitySummary', () => {
    it('should return events with statistics', async () => {
      mockRepository.getEventsByDateRange = jest.fn().mockResolvedValue(MOCK_RECORDS.fullCoverage);

      const result = await service.getAvailabilitySummary('2024-03-15', '2024-03-16');

      expect(result.events.length).toBe(1);
      expect(result.stats.totalEvents).toBe(1);
      expect(result.stats.totalTicketsAvailable).toBe(175);
    });
  });

});
