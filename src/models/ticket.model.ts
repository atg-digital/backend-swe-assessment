import { z } from 'zod';

export const TicketSourceSchema = z.enum(['ticketmaster', 'stubhub', 'internal']);

export const TicketInventorySchema = z.object({
  eventId: z.string().min(1),
  source: TicketSourceSchema,
  eventDate: z.string().datetime(),
  venue: z.string().min(1),
  availableCount: z.number().int().min(0).nullable(),
  lastUpdated: z.string().datetime(),
});

export const TicketUpdateMessageSchema = z.object({
  eventId: z.string().min(1),
  source: TicketSourceSchema,
  eventName: z.string().min(1),
  eventDate: z.string().datetime(),
  venue: z.string().min(1),
  availableCount: z.number().int().min(0).nullable(),
  timestamp: z.string().datetime(),
});

export const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GetAvailabilityQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const EventIdParamSchema = z.object({
  eventId: z.string().min(1),
});

// DynamoDB key helpers
export const createPK = (eventId: string): string => `EVENT#${eventId}`;
export const createSK = (source: string): string => `SOURCE#${source}`;
export const createGSI1PK = (date: string): string => `DATE#${date}`;
export const createGSI1SK = (eventId: string): string => `EVENT#${eventId}`;

// Type exports
export type TicketSource = z.infer<typeof TicketSourceSchema>;
export type TicketInventory = z.infer<typeof TicketInventorySchema>;
export type TicketUpdateMessage = z.infer<typeof TicketUpdateMessageSchema>;
