# Ticket Inventory Service

A serverless service that aggregates ticket availability from multiple sources (Ticketmaster, StubHub, and internal systems) and exposes a unified API.

## Architecture Overview

```
                    +------------------+
                    |  Ticket Sources  |
                    |  (TM, SH, Int)  |
                    +--------+---------+
                             |
                             v
+-------------+      +--------------+      +-------------+
| EventBridge |------+     SQS      +------+   Lambda    |
|  (Schedule) |      |    Queue     |      |  (Ingest)   |
+-------------+      +--------------+      +------+------+
       |                                          |
       |                                          v
       |                                   +-------------+
       +-----------------------------------+ DynamoDB    |
                                           | (Inventory) |
                                           +------+------+
                                                  |
                                                  v
                                           +-------------+
                                           | API Gateway |
                                           |  (Query)    |
                                           +-------------+
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm)
- AWS CLI configured (for deployment)

### Installation

```bash
pnpm install
```

### Running Tests

```bash
pnpm test
```

### Local Development

```bash
# Start local API (requires serverless-offline)
pnpm dev
```

## Project Structure

```
src/
+-- handlers/           # Lambda entry points
|   +-- ingest-event.ts      # SQS: process ticket updates
|   +-- get-availability.ts  # API: query availability
|   +-- sync-schedule.ts     # EventBridge: scheduled sync
+-- services/           # Business logic
|   +-- aggregation.service.ts
|   +-- availability.service.ts
+-- repositories/       # Data access layer
|   +-- ticket.repository.ts
+-- models/             # Zod schemas & DynamoDB models
+-- interfaces/         # TypeScript types
+-- utils/              # Helper functions
+-- __tests__/          # Test files
```

## API Endpoints

### Get Event Availability

```
GET /events/{eventId}/availability
```

Returns aggregated availability for a specific event across all sources.

### Get Availability by Date Range

```
GET /availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Returns availability for all events within the specified date range.

