import { SQSEvent, SQSRecord, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { ticketRepository } from '../repositories/ticket.repository';
import { TicketUpdateMessageSchema } from '../models/ticket.model';
import { TicketUpdateMessage } from '../interfaces';

/**
 * Lambda handler for processing ticket update messages from SQS
 *
 * Note: Using standard SQS queue, not FIFO
 * Messages may be delivered out of order or duplicated
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures };
}

async function processRecord(record: SQSRecord): Promise<void> {
  const body = JSON.parse(record.body);

  // Validate message schema
  const message = TicketUpdateMessageSchema.parse(body) as TicketUpdateMessage;

  console.log(`Processing update for event ${message.eventId} from ${message.source}`);

  // SQS standard queue - messages may be delivered out of order
  // We store the timestamp but don't use it to prevent out-of-order overwrites
  await ticketRepository.upsert(message);

  console.log(`Successfully processed update for event ${message.eventId}`);
}

/**
 * Helper to extract message attributes if needed
 */
export function getMessageAttribute(
  record: SQSRecord,
  attributeName: string
): string | undefined {
  return record.messageAttributes?.[attributeName]?.stringValue;
}
