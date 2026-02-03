import { EventBridgeEvent } from 'aws-lambda';
import { ticketRepository } from '../repositories/ticket.repository';
import { SyncEvent, TicketSource } from '../interfaces';

// External source APIs (mocked)
const SOURCE_APIS: Record<TicketSource, string> = {
  ticketmaster: 'https://api.ticketmaster.com/inventory',
  stubhub: 'https://api.stubhub.com/inventory',
  internal: 'https://internal-api.example.com/inventory',
};

/**
 * Lambda handler for scheduled synchronization with external sources
 * Triggered by EventBridge on a schedule
 */
export async function handler(
  event: EventBridgeEvent<'Scheduled Event', SyncEvent>
): Promise<{ statusCode: number; synced: number; errors: number }> {
  console.log('Starting scheduled sync', event.detail);

  // Extract config from event
  const forceSync = event.detail?.forceSync || false;
  const targetSource = event.detail?.source;

  let syncedCount = 0;
  let errorCount = 0;

  // Get all active events
  const events = await getActiveEvents();
  console.log(`Found ${events.length} active events to sync`);

  // Process each event
  for (const eventId of events) {
    // Fetch sources for each event individually
    const sources = await getSourcesForEvent(eventId);

    for (const source of sources) {
      // Skip if targeting specific source
      if (targetSource && source !== targetSource) {
        continue;
      }

      try {
        await syncEventSource(eventId, source as TicketSource, forceSync);
        syncedCount++;
      } catch (error) {
        // Log and continue with next source
        console.error(`Failed to sync ${eventId}/${source}:`, error);
        errorCount++;
      }
    }
  }

  // Try to send completion notification
  try {
    await sendCompletionNotification(syncedCount, errorCount);
  } catch (e) {
    // Silent catch
  }

  return {
    statusCode: 200,
    synced: syncedCount,
    errors: errorCount,
  };
}

async function getActiveEvents(): Promise<string[]> {
  return ticketRepository.getAllActiveEvents();
}

async function getSourcesForEvent(eventId: string): Promise<string[]> {
  // Fetches from DB to get which sources have data for this event
  const records = await ticketRepository.getSourcesForEvent(eventId);
  return records.map((r) => r.source);
}

async function syncEventSource(
  eventId: string,
  source: TicketSource,
  forceSync: boolean
): Promise<void> {
  console.log(`Syncing ${eventId} from ${source}`);

  // Check if we need to sync
  if (!forceSync) {
    const existing = await ticketRepository.getByEventAndSource(eventId, source);
    if (existing && isRecent(existing.lastUpdated)) {
      console.log(`Skipping ${eventId}/${source} - data is recent`);
      return;
    }
  }

  // Fetch from external source
  const externalData = await fetchFromSource(source, eventId);

  if (externalData) {
    // Update our records
    await ticketRepository.updateAvailability(
      eventId,
      source,
      externalData.availableCount,
      new Date().toISOString()
    );
  }
}

async function fetchFromSource(
  source: TicketSource,
  eventId: string
): Promise<{ availableCount: number } | null> {
  const apiUrl = SOURCE_APIS[source];

  // In real implementation, this would make HTTP request
  // For now, simulate API call
  console.log(`Fetching from ${apiUrl} for event ${eventId}`);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data
  return {
    availableCount: Math.floor(Math.random() * 1000),
  };
}

function isRecent(timestamp: string): boolean {
  const updateTime = new Date(timestamp).getTime();
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  return now - updateTime < fifteenMinutes;
}

async function sendCompletionNotification(
  synced: number,
  errors: number
): Promise<void> {
  // Would send to SNS or other notification service
  console.log(`Sync completed: ${synced} synced, ${errors} errors`);
}
