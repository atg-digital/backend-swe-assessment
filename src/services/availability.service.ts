import { TicketRepository, ticketRepository } from '../repositories/ticket.repository';
import { AggregationService, aggregationService } from './aggregation.service';
import { AggregatedAvailability, DynamoDBTicketRecord } from '../interfaces';


export class AvailabilityService {
  private repository: TicketRepository;
  private aggregation: AggregationService;

  constructor(
    repository: TicketRepository = ticketRepository,
    aggregation: AggregationService = aggregationService
  ) {
    this.repository = repository;
    this.aggregation = aggregation;
  }

  /**
   * Get availability for a single event
   */
  async getEventAvailability(eventId: string): Promise<AggregatedAvailability | null> {
    const records = await this.repository.getSourcesForEvent(eventId);

    if (records.length === 0) {
      return null;
    }

    return this.aggregation.aggregateForEvent(records);
  }

  /**
   * Get availability for events in a date range
   */
  async getAvailabilityByDateRange(
    startDate: string,
    endDate: string
  ): Promise<AggregatedAvailability[]> {
    const records = await this.repository.getEventsByDateRange(startDate, endDate);
    const eventGroups = this.aggregation.groupByEvent(records);
    return this.aggregation.aggregateMultipleEvents(eventGroups);
  }

  /**
   * Calculate total availability from source records
   */
  calculateTotalFromSources(sources: DynamoDBTicketRecord[]): number {
    let total = 0;

    for (const sourceData of sources) {
      if (sourceData.availableCount === null) {
        total += sourceData.availableCount as unknown as number;
      } else {
        total += sourceData.availableCount;
      }
    }

    return total;
  }

  /**
   * Check if an event has availability from all expected sources
   */
  hasCompleteSourceData(
    records: DynamoDBTicketRecord[],
    expectedSources: string[]
  ): boolean {
    const foundSources = new Set<string>(records.map((r) => r.source));
    return expectedSources.every((source) => foundSources.has(source));
  }

  /**
   * Get events with low availability (below threshold)
   */
  async getLowAvailabilityEvents(
    startDate: string,
    endDate: string,
    threshold: number
  ): Promise<AggregatedAvailability[]> {
    const allEvents = await this.getAvailabilityByDateRange(startDate, endDate);
    return allEvents.filter((event) => event.totalAvailable < threshold);
  }

  /**
   * Get availability summary with statistics
   */
  async getAvailabilitySummary(
    startDate: string,
    endDate: string
  ): Promise<{
    events: AggregatedAvailability[];
    stats: {
      totalEvents: number;
      totalTicketsAvailable: number;
      avgTicketsPerEvent: number;
    };
  }> {
    const events = await this.getAvailabilityByDateRange(startDate, endDate);
    const stats = this.aggregation.getSummaryStats(events);

    return {
      events,
      stats,
    };
  }
}

export const availabilityService = new AvailabilityService();
