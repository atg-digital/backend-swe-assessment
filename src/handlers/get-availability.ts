import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { availabilityService } from '../services/availability.service';
import {
  GetAvailabilityQuerySchema,
  EventIdParamSchema,
} from '../models/ticket.model';
import { getNextNDaysRange } from '../utils/date.utils';

/**
 * Lambda handler for getting ticket availability
 *
 * GET /events/{eventId}/availability - Get availability for a specific event
 * GET /availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Get availability for date range
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Check if this is a single event request
    if (event.pathParameters?.eventId) {
      return await handleSingleEventRequest(event);
    }

    // Otherwise, handle date range request
    return await handleDateRangeRequest(event);
  } catch (error) {
    console.error('Error in get-availability handler:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Invalid request parameters',
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
}

async function handleSingleEventRequest(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = EventIdParamSchema.parse(event.pathParameters);

  const availability = await availabilityService.getEventAvailability(
    params.eventId
  );

  if (!availability) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Event not found',
        eventId: params.eventId,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(availability),
  };
}

async function handleDateRangeRequest(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const queryParams = GetAvailabilityQuerySchema.parse(
    event.queryStringParameters || {}
  );

  // Default to next 7 days if no dates provided
  const { startDate, endDate } = queryParams.startDate && queryParams.endDate
    ? { startDate: queryParams.startDate, endDate: queryParams.endDate }
    : getNextNDaysRange(7);

  const result = await availabilityService.getAvailabilitySummary(
    startDate,
    endDate
  );

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      dateRange: { startDate, endDate },
      ...result,
    }),
  };
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
}
