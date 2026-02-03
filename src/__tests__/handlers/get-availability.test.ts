import { handler } from '../../handlers/get-availability';
import { availabilityService } from '../../services/availability.service';
import { createAPIGatewayEvent, MOCK_RECORDS } from '../fixtures/ticket-data';
import { AggregationService } from '../../services/aggregation.service';

// Mock the availability service
jest.mock('../../services/availability.service', () => ({
  availabilityService: {
    getEventAvailability: jest.fn(),
    getAvailabilitySummary: jest.fn(),
  },
}));

const mockAvailabilityService = availabilityService as jest.Mocked<typeof availabilityService>;

describe('get-availability handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('single event request', () => {
    it('should return availability for a valid event', async () => {
      const aggregation = new AggregationService();
      const mockResult = aggregation.aggregateForEvent(MOCK_RECORDS.fullCoverage);
      mockAvailabilityService.getEventAvailability.mockResolvedValue(mockResult);

      const event = createAPIGatewayEvent({ eventId: 'evt-001' }, null);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.eventId).toBe('evt-001');
      expect(body.totalAvailable).toBe(175);
    });

    it('should return 404 for non-existent event', async () => {
      mockAvailabilityService.getEventAvailability.mockResolvedValue(null);

      const event = createAPIGatewayEvent({ eventId: 'non-existent' }, null);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Event not found');
    });
  });

  describe('date range request', () => {
    it('should return events within date range', async () => {
      const aggregation = new AggregationService();
      const mockEvents = [
        aggregation.aggregateForEvent(MOCK_RECORDS.fullCoverage)!,
        aggregation.aggregateForEvent(MOCK_RECORDS.partialCoverage)!,
      ];
      mockAvailabilityService.getAvailabilitySummary.mockResolvedValue({
        events: mockEvents,
        stats: {
          totalEvents: 2,
          totalTicketsAvailable: 450,
          avgTicketsPerEvent: 225,
        },
      });

      const event = createAPIGatewayEvent(null, {
        startDate: '2024-03-15',
        endDate: '2024-03-16',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.events.length).toBe(2);
      expect(body.stats.totalEvents).toBe(2);
    });

    it('should use default date range when not provided', async () => {
      mockAvailabilityService.getAvailabilitySummary.mockResolvedValue({
        events: [],
        stats: {
          totalEvents: 0,
          totalTicketsAvailable: 0,
          avgTicketsPerEvent: 0,
        },
      });

      const event = createAPIGatewayEvent(null, null);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.dateRange).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return 400 for invalid date format', async () => {
      const event = createAPIGatewayEvent(null, {
        startDate: 'invalid-date',
        endDate: '2024-03-16',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 500 for internal errors', async () => {
      mockAvailabilityService.getEventAvailability.mockRejectedValue(
        new Error('Database connection failed')
      );

      const event = createAPIGatewayEvent({ eventId: 'evt-001' }, null);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      mockAvailabilityService.getEventAvailability.mockResolvedValue(null);

      const event = createAPIGatewayEvent({ eventId: 'evt-001' }, null);
      const result = await handler(event);

      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      });
    });
  });
});
