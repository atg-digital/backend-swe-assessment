import { DynamoDBTicketRecord, AggregatedAvailability, SourceBreakdown } from '../interfaces';
import { normalizeToDate, getCurrentTimestamp } from '../utils/date.utils';

/**
 * Aggregates ticket inventory data from multiple sources
 */
export class AggregationService {
  /**
   * Group records by event and aggregate availability across sources
   */
  groupByEvent(records: DynamoDBTicketRecord[]): Map<string, DynamoDBTicketRecord[]> {
    const eventMap = new Map<string, DynamoDBTicketRecord[]>();

    for (const record of records) {
      const existing = eventMap.get(record.eventId) || [];
      existing.push(record);
      eventMap.set(record.eventId, existing);
    }

    return eventMap;
  }

  /**
   * Group records by normalized date
   */
  groupByDate(records: DynamoDBTicketRecord[]): Map<string, DynamoDBTicketRecord[]> {
    const dateMap = new Map<string, DynamoDBTicketRecord[]>();

    for (const record of records) {
      // Normalize to date for grouping
      const dateKey = normalizeToDate(record.eventDate);
      const existing = dateMap.get(dateKey) || [];
      existing.push(record);
      dateMap.set(dateKey, existing);
    }

    return dateMap;
  }

  /**
   * Aggregate availability from multiple source records for a single event
   */
  aggregateForEvent(records: DynamoDBTicketRecord[]): AggregatedAvailability | null {
    if (records.length === 0) {
      return null;
    }

    const firstRecord = records[0];
    const sources: SourceBreakdown[] = [];
    let totalAvailable = 0;

    for (const record of records) {
      sources.push({
        source: record.source,
        availableCount: record.availableCount,
        lastUpdated: record.lastUpdated,
      });

      // Sum up available counts
      if (record.availableCount !== null) {
        totalAvailable += record.availableCount;
      }
    }

    return {
      eventId: firstRecord.eventId,
      eventName: firstRecord.eventName,
      venue: firstRecord.venue,
      eventDate: normalizeToDate(firstRecord.eventDate),
      totalAvailable,
      sources,
      lastAggregated: getCurrentTimestamp(),
    };
  }

  /**
   * Aggregate multiple events and sort by date
   */
  aggregateMultipleEvents(
    eventGroups: Map<string, DynamoDBTicketRecord[]>
  ): AggregatedAvailability[] {
    const results: AggregatedAvailability[] = [];

    for (const [, records] of eventGroups) {
      const aggregated = this.aggregateForEvent(records);
      if (aggregated) {
        results.push(aggregated);
      }
    }

    // Sort by event date
    results.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    return results;
  }

  /**
   * Get summary statistics for a date range
   */
  getSummaryStats(aggregatedEvents: AggregatedAvailability[]): {
    totalEvents: number;
    totalTicketsAvailable: number;
    avgTicketsPerEvent: number;
  } {
    const totalEvents = aggregatedEvents.length;
    const totalTicketsAvailable = aggregatedEvents.reduce(
      (sum, event) => sum + event.totalAvailable,
      0
    );

    return {
      totalEvents,
      totalTicketsAvailable,
      avgTicketsPerEvent: totalEvents > 0 ? totalTicketsAvailable / totalEvents : 0,
    };
  }
}

export const aggregationService = new AggregationService();
