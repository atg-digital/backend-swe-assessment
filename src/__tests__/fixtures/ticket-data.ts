import { DynamoDBTicketRecord, TicketUpdateMessage, TicketSource } from '../../interfaces';

/**
 * Test fixtures for ticket inventory tests
 */

export const SOURCES: TicketSource[] = ['ticketmaster', 'stubhub', 'internal'];

// Events with various timestamps
// Note: These include edge cases around midnight in different timezones
export const TEST_EVENTS = {
  // Standard daytime event
  concert1: {
    eventId: 'evt-001',
    eventName: 'Rock Concert',
    venue: 'Madison Square Garden',
    eventDate: '2024-03-15T19:00:00Z', // 7 PM UTC
  },

  // Event near midnight UTC
  concert2: {
    eventId: 'evt-002',
    eventName: 'Jazz Night',
    venue: 'Blue Note',
    eventDate: '2024-03-15T23:30:00Z', // 11:30 PM UTC
  },

  // Event in EST timezone
  concert3: {
    eventId: 'evt-003',
    eventName: 'Late Night Show',
    venue: 'Comedy Club',
    eventDate: '2024-03-15T23:00:00-05:00',
  },

  // Event in PST timezone
  concert4: {
    eventId: 'evt-004',
    eventName: 'West Coast Fest',
    venue: 'Hollywood Bowl',
    eventDate: '2024-03-16T20:00:00-08:00',
  },

  // Sold out event
  soldOut: {
    eventId: 'evt-005',
    eventName: 'Sold Out Show',
    venue: 'Small Venue',
    eventDate: '2024-03-17T20:00:00Z',
  },
};

export function createTicketRecord(
  eventId: string,
  source: TicketSource,
  eventDate: string,
  availableCount: number | null
): DynamoDBTicketRecord {
  const normalizedDate = new Date(eventDate).toISOString().split('T')[0];

  return {
    PK: `EVENT#${eventId}`,
    SK: `SOURCE#${source}`,
    GSI1PK: `DATE#${normalizedDate}`,
    GSI1SK: `EVENT#${eventId}`,
    eventId,
    source,
    eventName: `Test Event ${eventId}`,
    eventDate,
    venue: 'Test Venue',
    availableCount,
    lastUpdated: new Date().toISOString(),
  };
}

export function createTicketUpdateMessage(
  eventId: string,
  source: TicketSource,
  availableCount: number | null
): TicketUpdateMessage {
  return {
    eventId,
    source,
    eventName: `Test Event ${eventId}`,
    eventDate: '2024-03-15T19:00:00Z',
    venue: 'Test Venue',
    availableCount,
    timestamp: new Date().toISOString(),
  };
}

// Pre-built test records for common scenarios
export const MOCK_RECORDS = {
  // Event with all sources reporting
  fullCoverage: [
    createTicketRecord('evt-001', 'ticketmaster', '2024-03-15T19:00:00Z', 100),
    createTicketRecord('evt-001', 'stubhub', '2024-03-15T19:00:00Z', 50),
    createTicketRecord('evt-001', 'internal', '2024-03-15T19:00:00Z', 25),
  ],

  // Event with partial source data
  partialCoverage: [
    createTicketRecord('evt-002', 'ticketmaster', '2024-03-15T23:30:00Z', 200),
    createTicketRecord('evt-002', 'stubhub', '2024-03-15T23:30:00Z', 75),
  ],

  // Event with mixed availability (including null)
  mixedAvailability: [
    createTicketRecord('evt-003', 'ticketmaster', '2024-03-15T23:00:00-05:00', 150),
    createTicketRecord('evt-003', 'stubhub', '2024-03-15T23:00:00-05:00', null), // Unknown
    createTicketRecord('evt-003', 'internal', '2024-03-15T23:00:00-05:00', 30),
  ],

  // Sold out event
  soldOut: [
    createTicketRecord('evt-005', 'ticketmaster', '2024-03-17T20:00:00Z', 0),
    createTicketRecord('evt-005', 'stubhub', '2024-03-17T20:00:00Z', 0),
    createTicketRecord('evt-005', 'internal', '2024-03-17T20:00:00Z', 0),
  ],
};

// SQS message fixtures
export const SQS_MESSAGES = {
  validUpdate: {
    messageId: 'msg-001',
    body: JSON.stringify(createTicketUpdateMessage('evt-001', 'ticketmaster', 100)),
    receiptHandle: 'receipt-001',
    attributes: {},
    messageAttributes: {},
    md5OfBody: '',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
    awsRegion: 'us-east-1',
  },

  invalidUpdate: {
    messageId: 'msg-002',
    body: JSON.stringify({ invalid: 'data' }),
    receiptHandle: 'receipt-002',
    attributes: {},
    messageAttributes: {},
    md5OfBody: '',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
    awsRegion: 'us-east-1',
  },
};

// API Gateway event fixtures
export function createAPIGatewayEvent(
  pathParameters: Record<string, string> | null,
  queryStringParameters: Record<string, string> | null
) {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/availability',
    pathParameters,
    queryStringParameters,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'api-id',
      authorizer: null,
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/availability',
      protocol: 'HTTP/1.1',
      requestId: 'req-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/availability',
      stage: 'test',
    },
    resource: '/availability',
  };
}
