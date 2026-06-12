# LumoTrack — Project Context

## Project Overview

LumoTrack is a logistics and delivery management platform — a B2B marketplace connecting sellers with delivery drivers. Sellers create and manage shipments; drivers register and offer delivery services. The platform includes an AI assistant (Claude-powered) that lets sellers manage shipments via natural language.

## Context Files

Read these before working on any part of the project:

- [`context/architecture.md`](context/architecture.md) — API routes, database schema, authorization model, AI feature
- [`context/code-standards.md`](context/code-standards.md) — conventions, how to extend the project, migrations
- [`context/library-docs.md`](context/library-docs.md) — Hono, Better Auth, Drizzle ORM, Vercel AI SDK usage patterns

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
RESEND_API_KEY        # Resend API key for transactional email
TWILIO_ACCOUNT_SID    # Twilio account SID
TWILIO_AUTH_TOKEN     # Twilio auth token
TWILIO_PHONE_NUMBER   # Twilio sender phone number (E.164 format)
```
