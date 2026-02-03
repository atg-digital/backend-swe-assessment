import { handler } from '../../handlers/ingest-event';
import { ticketRepository } from '../../repositories/ticket.repository';
import { SQS_MESSAGES, createTicketUpdateMessage } from '../fixtures/ticket-data';
import { SQSEvent } from 'aws-lambda';

// Mock the repository
jest.mock('../../repositories/ticket.repository', () => ({
  ticketRepository: {
    upsert: jest.fn(),
  },
}));

const mockRepository = ticketRepository as jest.Mocked<typeof ticketRepository>;

describe('ingest-event handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process valid SQS messages', async () => {
    mockRepository.upsert.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [SQS_MESSAGES.validUpdate as never],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockRepository.upsert).toHaveBeenCalledTimes(1);
  });

  it('should report failures for invalid messages', async () => {
    const event: SQSEvent = {
      Records: [SQS_MESSAGES.invalidUpdate as never],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-002');
  });

  it('should process multiple messages in batch', async () => {
    mockRepository.upsert.mockResolvedValue(undefined);

    const messages = [
      {
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
      {
        messageId: 'msg-002',
        body: JSON.stringify(createTicketUpdateMessage('evt-002', 'stubhub', 50)),
        receiptHandle: 'receipt-002',
        attributes: {},
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
        awsRegion: 'us-east-1',
      },
    ];

    const event: SQSEvent = {
      Records: messages as never,
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockRepository.upsert).toHaveBeenCalledTimes(2);
  });

  it('should continue processing after individual message failure', async () => {
    mockRepository.upsert
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);

    const messages = [
      {
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
      {
        messageId: 'msg-002',
        body: JSON.stringify(createTicketUpdateMessage('evt-002', 'stubhub', 50)),
        receiptHandle: 'receipt-002',
        attributes: {},
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
        awsRegion: 'us-east-1',
      },
    ];

    const event: SQSEvent = {
      Records: messages as never,
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-001');
    expect(mockRepository.upsert).toHaveBeenCalledTimes(2);
  });

  it('should handle null availability values', async () => {
    mockRepository.upsert.mockResolvedValue(undefined);

    const message = {
      messageId: 'msg-null',
      body: JSON.stringify(createTicketUpdateMessage('evt-001', 'ticketmaster', null)),
      receiptHandle: 'receipt-null',
      attributes: {},
      messageAttributes: {},
      md5OfBody: '',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:queue',
      awsRegion: 'us-east-1',
    };

    const event: SQSEvent = {
      Records: [message as never],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
  });
});
