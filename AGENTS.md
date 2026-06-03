# LumoTrack — Project Context

## Project Overview

LumoTrack is a logistics and delivery management platform — a B2B marketplace connecting sellers with delivery drivers. Sellers create and manage shipments; drivers register and offer delivery services. The platform includes an AI assistant (Claude-powered) that lets sellers manage shipments via natural language.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Framework | Hono v4 |
| Language | TypeScript (strict) |
| Database | PostgreSQL + PostGIS |
| ORM | Drizzle ORM |
| Auth | Better Auth (with Drizzle adapter) |
| AI | Vercel AI SDK + `@ai-sdk/anthropic` |
| Validation | Zod v4 |
| UUID | uuidv7 |

## Project Structure

```
src/
  core/           # App bootstrap, DB connection, env validation
  db/
    schema/       # Drizzle table definitions
    migrations/   # Auto-generated SQL migration files
  features/       # Feature modules (route + service + types + validation)
    auth/
    drivers/
    shipments/
    events/
    ai/
      tools/      # AI tool definitions (shipments.tools.ts, events.tools.ts)
      validations/ # AI response schemas (chatResponseSchema)
  lib/
    auth.ts       # Better Auth configuration
    plugins/
      organization.plugin.ts  # Custom org plugin — roles, RBAC, hooks
  shared/
    middleware/   # auth.middleware.ts — session + RBAC
    validations/  # common.ts — shared Zod schemas
  index.ts        # Entry point (port 3000)
```

## Scripts

```bash
pnpm dev        # Hot-reload dev server (bun --hot)
pnpm start      # Production start
pnpm generate   # Generate Drizzle migrations
pnpm migrate    # Run pending migrations
```

> **Package manager: pnpm.** Do not use bun or npm to install packages.

## Environment Variables

Validated at startup via Zod in `src/core/env.ts`. Missing vars cause `process.exit(1)`.

```
DATABASE_URL          # PostgreSQL connection string
ANTHROPIC_API_KEY     # Claude API key
ENVIRONMENT           # development | production | test
REDIS_URL             # Redis connection string
BETTER_AUTH_SECRET    # Auth encryption key
BETTER_AUTH_URL       # Auth base URL (e.g. http://localhost:3000)
```

## API Routes

All routes are prefixed `/api`. Protected routes require a valid session (via `sessionMiddleware`).

| Prefix | Auth | Notes |
|---|---|---|
| `/api/auth/*` | public | Delegated to Better Auth handler |
| `/api/drivers/me/locations` | session + org | POST (add location), DELETE /:locationId (remove) |
| `/api/drivers/me/shipments` | session + org | GET (paginated list), GET /:id |
| `/api/shipments` | session + org | GET (paginated), GET /status/:status, GET /:id, POST, PATCH /:id, DELETE /:id, PATCH /:id/assign |
| `/api/shipments/:id/events` | session + org | POST (log checkpoint), GET (event history) |
| `/api/ai` | session + org + shipment:create | POST /chat — AI shipment assistant |

## Database Schema

- **auth tables** (`auth.schema.ts`) — user, session, account, verification, organization, member, invitation; session has `activeOrganizationId`
- **drivers** (`drivers.schema.ts`) — `driverLocations` (PostGIS POINT geometry, SRID 4326); GiST spatial index
- **addresses** (`addresses.schema.ts`) — addresses; `street`, `city`, `country` are required; `state` and `zipCode` are nullable; FK to organization with cascade delete
- **shipments** (`shipments.schema.ts`) — `shipments` with PostGIS `destination` (coords for live tracking + reverse geocoding on frontend), nullable `originAddressId` FK to addresses (assigned after creation), FK to organization, nullable user FK (assigned driver), status enum (`created | assigned | picked_up | in_transit | out_for_delivery | delivered | cancelled`)
- **events** (`events.schema.ts`) — shipment checkpoint log; each row has `status` (own `eventStatusEnum`: `departed | arrived | delivery_attempted | held_at_facility | customs_cleared | out_for_delivery | delivered | returned`), `address` (plain text, no geometry), optional `description`, FK to shipments with cascade delete

All domain entities use **uuidv7** as primary keys. PostGIS geometry columns (drivers, shipments) have GiST spatial indexes. Events use plain text address — no geometry needed since they are a history log, not a tracking source.

### Design notes
- Shipment `destination` stores coordinates (PostGIS). The frontend converts a typed address to coords via forward geocoding before sending to the API, and displays the address via reverse geocoding when rendering.
- `originAddressId` on shipments is nullable — seller creates the shipment first, assigns a pickup address later.
- Live driver tracking is done via `driverLocations` (updated in real-time), not via events.
- Events are immutable — no update or delete endpoints.

## Code Conventions

- **Feature structure:** `*.route.ts` / `*.service.ts` / `*.types.ts` / `*.validation.ts` / `*.util.ts`
- **Imports:** Use the `@/` path alias (e.g. `@/core/db`, `@/features/shipments/shipments.service`)
- **Errors:** Use `HTTPException` for all error responses (consistent status + message)
- **Validation:** All request inputs (body, query, params) validated with Zod + `@hono/standard-validator`
- **DB transactions:** Use `db.transaction()` for multi-table atomic writes (see driver registration)
- **Pagination:** Cursor-based using uuidv7 ordering; `PAGE_LIMIT = 20`
- **Geometry output:** Utility functions (e.g. `formatShipment`) transform PostGIS geometry columns to `{ lat, lng }` coordinate objects before sending in responses

## Authorization Model

- `sessionMiddleware` — validates the Better Auth session, attaches `user` and `session` to context
- `requireActiveOrg` — ensures `session.activeOrganizationId` is set; use on all org-scoped routes
- `requirePermission(permissions)` — fine-grained RBAC via Better Auth permission API; checks the member's role against defined resource statements

### Organization roles (defined in `lib/plugins/organization.plugin.ts`)

| Role | Permissions |
|---|---|
| `owner` | shipment: create, read, update, delete; event: create, read; location: create, read, delete |
| `seller` | shipment: create, read, update, delete; event: read; location: read |
| `driver` | event: create, read; location: create, read, delete |

Resources: `shipment`, `event`, `location`. Default invitation role is `driver`. Organization limit: 1 per user.

## AI Feature

Located in `src/features/ai/`. Uses the Vercel AI SDK (`generateObject`) with Claude Sonnet 4.6 and tool calling (max 5 steps). Tools are scoped to the authenticated org's context (`orgId` isolation). Tool inputs are validated with Zod schemas.

**Tools** (in `tools/`):
- `get_all_shipments`, `get_shipment_by_id`, `get_shipments_by_status`, `create_shipment`, `update_shipment`, `delete_shipment` — full shipment CRUD
- `get_shipment_events` — fetch event history for a shipment

**Response schema** (`validations/index.ts` — `chatResponseSchema`): `{ message, shipments?, shipment?, events? }` — structured output that the frontend can render directly alongside the conversational message.

## Migrations

Run `pnpm generate` after changing any schema file, then `pnpm migrate` to apply. Migration files live in `src/db/migrations/`. The first migration enables the PostGIS extension.

## No Tests Yet

There is no test suite configured. Manual testing via the running server is the current workflow.
