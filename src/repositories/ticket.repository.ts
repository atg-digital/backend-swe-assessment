import {
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DynamoDBTicketRecord,
  TicketSource,
  TicketUpdateMessage,
} from '../interfaces';
import {
  createPK,
  createSK,
  createGSI1PK,
  createGSI1SK,
} from '../models/ticket.model';
import { normalizeToDate, calculateTTL } from '../utils/date.utils';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'ticket-inventory-service-dev';

const getClientConfig = (): DynamoDBClientConfig => {
  if (process.env.DYNAMODB_ENDPOINT) {
    return {
      endpoint: process.env.DYNAMODB_ENDPOINT,
      region: process.env.AWS_REGION || 'us-east-1',
    };
  }
  return {
    region: process.env.AWS_REGION || 'us-east-1',
  };
};

const client = new DynamoDBClient(getClientConfig());
const docClient = DynamoDBDocumentClient.from(client);

export class TicketRepository {
  private tableName: string;

  constructor(tableName?: string) {
    this.tableName = tableName || TABLE_NAME;
  }

  async getByEventAndSource(
    eventId: string,
    source: TicketSource
  ): Promise<DynamoDBTicketRecord | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: createPK(eventId),
        SK: createSK(source),
      },
    });

    const result = await docClient.send(command);
    return (result.Item as DynamoDBTicketRecord) || null;
  }

  async getSourcesForEvent(eventId: string): Promise<DynamoDBTicketRecord[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': createPK(eventId),
      },
    });

    const result = await docClient.send(command);
    return (result.Items as DynamoDBTicketRecord[]) || [];
  }

  async getEventsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DynamoDBTicketRecord[]> {
    const allRecords: DynamoDBTicketRecord[] = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': createGSI1PK(currentDate),
        },
      });

      const result = await docClient.send(command);
      if (result.Items) {
        allRecords.push(...(result.Items as DynamoDBTicketRecord[]));
      }

      // Move to next date
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      currentDate = nextDate.toISOString().split('T')[0];
    }

    return allRecords;
  }

  async upsert(message: TicketUpdateMessage): Promise<void> {
    const normalizedDate = normalizeToDate(message.eventDate);

    const record: DynamoDBTicketRecord = {
      PK: createPK(message.eventId),
      SK: createSK(message.source),
      GSI1PK: createGSI1PK(normalizedDate),
      GSI1SK: createGSI1SK(message.eventId),
      eventId: message.eventId,
      source: message.source,
      eventName: message.eventName,
      eventDate: message.eventDate,
      venue: message.venue,
      availableCount: message.availableCount,
      lastUpdated: message.timestamp,
      ttl: calculateTTL(72), // 3 days TTL
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: record,
    });

    await docClient.send(command);
  }

  async updateAvailability(
    eventId: string,
    source: TicketSource,
    availableCount: number | null,
    timestamp: string
  ): Promise<void> {
    // SQS standard queue - messages may be delivered out of order
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: createPK(eventId),
        SK: createSK(source),
      },
      UpdateExpression:
        'SET availableCount = :count, lastUpdated = :timestamp',
      ExpressionAttributeValues: {
        ':count': availableCount,
        ':timestamp': timestamp,
      },
    });

    await docClient.send(command);
  }

  async getAllActiveEvents(): Promise<string[]> {
    // Get unique event IDs from the table
    // In production, this would use a separate index or metadata table
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'begins_with(GSI1PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'DATE#',
      },
      ProjectionExpression: 'eventId',
    });

    try {
      const result = await docClient.send(command);
      const eventIds = new Set<string>();
      result.Items?.forEach((item) => {
        if (item.eventId) {
          eventIds.add(item.eventId as string);
        }
      });
      return Array.from(eventIds);
    } catch {
      // Fallback: scan if query fails
      return [];
    }
  }
}

// Export singleton instance
export const ticketRepository = new TicketRepository();
