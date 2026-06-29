# LumoTrack — Project Context

## Project Overview

LumoTrack is a logistics and delivery management platform — a B2B marketplace connecting sellers with delivery drivers. Sellers create and manage shipments; drivers register and offer delivery services. The platform includes an AI assistant (Claude-powered) that lets sellers manage shipments via natural language.

## Context Files

Read these before working on any part of the project:

- [`context/architecture.md`](context/architecture.md) — API routes, database schema, authorization model, AI feature
- [`context/code-standards.md`](context/code-standards.md) — conventions, how to extend the project, migrations
- [`context/library-docs.md`](context/library-docs.md) — Hono, Better Auth, Drizzle ORM, Vercel AI SDK usage patterns
- [`context/memory.md`](context/memory.md) — persistent notes on user preferences and project decisions

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Bun                                 |
| Framework  | Hono v4                             |
| Language   | TypeScript (strict)                 |
| Database   | PostgreSQL + PostGIS                |
| ORM        | Drizzle ORM                         |
| Auth       | Better Auth (with Drizzle adapter)  |
| AI         | Vercel AI SDK + `@ai-sdk/anthropic` |
| Email      | Resend                              |
| SMS        | Twilio                              |
| Validation | Zod v4                              |
| UUID       | uuidv7                              |

## Scripts

```bash
pnpm dev            # Hot-reload dev server (bun --hot)
pnpm start          # Production start
pnpm generate       # Generate Drizzle migrations
pnpm migrate        # Run pending migrations

pnpm db:up          # Start the test Postgres container (docker compose)
pnpm db:down        # Stop it
pnpm test:db:setup  # Migrate the lumotrack_test database
pnpm test           # Run tests (bun test)
pnpm test:watch     # Run tests in watch mode
```

> **Testing:** `bun test` against a real Postgres+PostGIS test DB (`lumotrack_test`, host port 5433 via Docker). Auth and the BullMQ queue are mocked. See [`context/code-standards.md`](context/code-standards.md) → Tests.

> **Package manager: pnpm.** Do not use bun or npm to install packages.

## Environment Variables

Validated at startup via Zod in `src/core/env.ts`. Missing vars cause `process.exit(1)`.

```
DATABASE_URL          # PostgreSQL connection string
ANTHROPIC_API_KEY     # Claude API key
ENVIRONMENT           # development | production | test
CORS_ORIGIN           # Allowed CORS origin(s), comma-separated (e.g. http://localhost:3000)
REDIS_URL             # Redis connection string
BETTER_AUTH_SECRET    # Auth encryption key
BETTER_AUTH_URL       # Auth base URL (e.g. http://localhost:3000)
RESEND_API_KEY        # Resend API key for transactional email
TWILIO_ACCOUNT_SID    # Twilio account SID
TWILIO_AUTH_TOKEN     # Twilio auth token
TWILIO_PHONE_NUMBER   # Twilio sender phone number (E.164 format)
```

Local dev uses `.env` (template: `.env.example`). Tests use `.env.test` (template: `.env.test.example`), loaded automatically by `bun test`. Both real env files are gitignored.
