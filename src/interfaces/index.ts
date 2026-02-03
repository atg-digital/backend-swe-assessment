export type TicketSource = 'ticketmaster' | 'stubhub' | 'internal';

export interface TicketInventory {
  eventId: string;
  source: TicketSource;
  eventDate: string;
  venue: string;
  availableCount: number | null;
  lastUpdated: string;
}

export interface SourceBreakdown {
  source: TicketSource;
  availableCount: number | null;
  lastUpdated: string;
}

export interface AggregatedAvailability {
  eventId: string;
  eventName: string;
  venue: string;
  eventDate: string;
  totalAvailable: number;
  sources: SourceBreakdown[];
  lastAggregated: string;
}

export interface TicketUpdateMessage {
  eventId: string;
  source: TicketSource;
  eventName: string;
  eventDate: string;
  venue: string;
  availableCount: number | null;
  timestamp: string;
}

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
}

export interface DynamoDBTicketRecord {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  eventId: string;
  source: TicketSource;
  eventName: string;
  eventDate: string;
  venue: string;
  availableCount: number | null;
  lastUpdated: string;
  ttl?: number;
  cached_availability?: number;
}

export interface SyncEvent {
  source?: string;
  forceSync?: boolean;
}
