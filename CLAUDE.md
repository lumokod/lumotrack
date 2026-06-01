# LumoTrack — Claude Context

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
    sellers/
    shipments/
    ai/
  lib/            # auth.ts — Better Auth configuration
  shared/
    middleware/   # auth.middleware.ts — session + RBAC
    validators/   # common.ts — shared Zod schemas
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
| `/api/sellers` | session | POST /register |
| `/api/drivers` | session | POST /register, /me/locations CRUD |
| `/api/shipments` | session + seller | Full CRUD + pagination + status filter |
| `/api/ai` | session + seller | POST /chat — AI shipment assistant |

## Database Schema

- **auth tables** (`auth.schema.ts`) — user, session, account, verification, organization, member, invitation
- **drivers** (`drivers.schema.ts`) — `drivers` + `driverLocations` (PostGIS POINT geometry, SRID 4326)
- **sellers** (`sellers.schema.ts`) — `sellers`
- **shipments** (`shipments.schema.ts`) — `shipments` with PostGIS destination, status enum (`created | assigned | in_transit | delivered | cancelled`)

All domain entities use **uuidv7** as primary keys. Geometry columns have GiST spatial indexes.

## Code Conventions

- **Feature structure:** `*.route.ts` / `*.service.ts` / `*.types.ts` / `*.validation.ts` / `*.util.ts`
- **Imports:** Use the `@/` path alias (e.g. `@/core/db`, `@/features/shipments/shipments.service`)
- **Errors:** Use `HTTPException` for all error responses (consistent status + message)
- **Validation:** All request inputs (body, query, params) validated with Zod + `@hono/standard-validator`
- **DB transactions:** Use `db.transaction()` for multi-table atomic writes (see driver registration)
- **Pagination:** Cursor-based using uuidv7 ordering; `PAGE_LIMIT = 20`
- **Geometry output:** Utility functions (e.g. `formatShipment`) transform PostGIS geometry columns to `{ lat, lng }` coordinate objects before sending in responses

## Authorization Model

- `sessionMiddleware` — validates the Better Auth session, attaches `user` to context
- `requireUserType("seller" | "driver")` — RBAC middleware; use on routes that are role-specific
- Users have a `userType` field; a registered seller or driver has a matching row in `sellers` / `drivers`

## AI Feature

Located in `src/features/ai/`. Uses the Vercel AI SDK with Claude tool calls. Tools are scoped to the authenticated seller's context (`sellerId` isolation). Tool inputs are validated with Zod schemas.

## Migrations

Run `pnpm generate` after changing any schema file, then `pnpm migrate` to apply. Migration files live in `src/db/migrations/`. The first migration enables the PostGIS extension.

## No Tests Yet

There is no test suite configured. Manual testing via the running server is the current workflow.
