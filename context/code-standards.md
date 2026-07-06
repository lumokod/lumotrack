# Code Standards

## Conventions

- **Feature structure:** `*.route.ts` / `*.service.ts` / `*.types.ts` / `*.validation.ts` / `*.util.ts`
- **Imports:** Use the `@/` path alias (e.g. `@/core/db`, `@/features/shipments/shipments.service`)
- **Naming — full words for data/object args:** when a function/callback parameter represents a data object or entity, name it with the full word, not an abbreviation — `data` not `d`, `error` not `e`, `request` not `req`. Applies to arrow-function callbacks too (e.g. `(data) => sendEmail(data.email)`). This does **not** apply to numeric indices — `i`, `idx`, `j` are fine for loop counters
- **Errors:** Use `HTTPException` for all error responses (consistent status + message)
- **Validation:** All request inputs (body, query, params) validated with Zod + `@hono/standard-validator`
- **DB transactions:** Use `db.transaction()` for multi-table atomic writes
- **Pagination:** Cursor-based using uuidv7 ordering; `PAGE_LIMIT = 20`
- **Geometry — insert vs output:** PostGIS geometry columns are written as `{ x: longitude, y: latitude }` and read back as `row.column.x` / `row.column.y`; always strip via a `format*` util before returning in responses (output shape: `{ longitude, latitude }`)
- **uuidv7 on insert:** PKs are not DB-generated — always pass `id: uuidv7()` explicitly in `.values()`. Exception: Better Auth-managed tables (`user`, `session`, `organization`, `member`, `invitation`) use their own ID format — never validate these IDs with `z.uuidv7()`, use `z.string().min(1)` instead. Second exception: junction tables (`shipment_tags`, `orders`) have **composite PKs** over their two FKs and no `id` column — never pass an `id` when inserting into them
- **Hono context:** after `sessionMiddleware`, use `c.get("user").id` for the current user's ID and `c.get("session").activeOrganizationId!` for the active org ID
- **Email templates:** React Email `.tsx` files in `app/lib/mail/templates/` must have `/** @jsxImportSource react */` as the first line — this overrides the global `hono/jsx` tsconfig setting. Never remove this pragma; linters may strip it but it is load-bearing
- **Background jobs:** never send emails or SMS inline from a service. Always enqueue via `addNotification(data)` (from `@/lib/queue`) after the DB transaction commits — never inside `db.transaction()`. Add new job types to `NotificationJobData` in `app/lib/queue/jobs.ts` and handle them in `app/lib/queue/worker.ts`. `addNotification` derives the BullMQ job name from `data.type` automatically — never call `notificationQueue.add(...)` directly
- **WebSocket endpoints:** use `upgradeWebSocket` from `hono/bun` as the last handler in a normal middleware chain (`sessionMiddleware` → `requireActiveOrg` → `requirePermission` all run before the upgrade). Per-connection authorization that needs the DB goes **inside the async `createEvents` callback** — Hono awaits it before upgrading, so a thrown `HTTPException` still returns a regular 4xx. The entry point (`app/index.ts`) must keep exporting `websocket` from `hono/bun` next to `fetch`, or upgrades break. Redis pub/sub for tracking lives in `@/lib/tracking` — like `@/lib/queue`, it opens connections at import time and is mocked in tests

---

## How to Extend the Project

### Adding a new feature module

1. **Schema** — add a new file in `app/db/schema/`, export the table from `app/db/schema/index.ts`
2. **Migration** — run `pnpm generate` then `pnpm migrate`
3. **Service** — `app/features/<feature>/<feature>.service.ts`; functions throw `HTTPException` on failure, always scope queries by `orgId`
4. **Types** — `app/features/<feature>/<feature>.types.ts`; derive from Drizzle's `$inferInsert` / `$inferSelect` where possible; all domain types (including enum aliases like `EventStatus`, `ShipmentStatus`) must live here — never redefine them inline in service files or other modules, always import from the owning feature's types file
5. **Validation** — `app/features/<feature>/<feature>.validation.ts`; Zod schemas for request body/params/query
6. **Route** — `app/features/<feature>/<feature>.route.ts`; apply `sessionMiddleware` → `requireActiveOrg` → `requirePermission(...)` in that order. For an org-state gate (e.g. require a verified org), add `requireVerifiedOrg` before `requirePermission` on the specific routes that need it. For platform-admin-only routes (not org-scoped), apply `sessionMiddleware` → `requireAdmin` and skip `requireActiveOrg`/`requirePermission`. A single router can mix both (see `verification.route.ts`).
7. **Register** — import and mount in `app/core/app.ts` via `app.route("/api/<feature>", <feature>Routes)`

### Adding a new AI tool

1. Add the tool function to the relevant file in `app/features/ai/tools/` (or create a new `<feature>.tools.ts`)
2. If creating a new file, export a `get<Feature>Tools(orgId)` function and spread it into the return object in `app/features/ai/tools/index.ts`
3. If the tool returns data the frontend should render, add the field to `chatResponseSchema` in `app/features/ai/validations/index.ts`

### Service conventions

- Always include `orgId` in queries — never fetch across org boundaries
- Throw `new HTTPException(404, { message: "..." })` for not-found, `400` for invalid state transitions
- For geometry columns, use a `format*` util to strip raw PostGIS values before returning (see `shipments.util.ts`)
- Use `db.transaction()` for writes that span multiple tables
- For inserts that can hit a `unique` constraint, catch the error and use `isUniqueViolation(error)` from `@/shared/db.util` to return a clean `409` instead of a 500. Don't check `error.code` directly — Drizzle wraps the driver error, so the code can be on `error.cause`

### Adding a new RBAC resource

1. Add the resource and its actions to `statements` in `app/lib/auth/plugins/organization.plugin.ts`
2. Add the allowed actions to each role (`owner`, `seller`, `driver`) — omit entirely from a role to deny access
3. Use `requirePermission({ <resource>: ["<action>"] })` in the route

### Restricting a Better Auth built-in route

Add a named route in `app/features/auth/auth.route.ts` **before** the `/*` catch-all, apply `sessionMiddleware` + `requirePermission`, then forward to `auth.handler`:

```ts
authRoutes.get(
  "/organization/some-endpoint",
  sessionMiddleware,
  requirePermission({ resource: ["action"] }),
  (c) => auth.handler(c.req.raw),
);
// catch-all must come after
authRoutes.on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));
```

---

## Migrations

Run `pnpm generate` after changing any schema file, then `pnpm migrate` to apply. Migration files live in `app/db/migrations/`.

Migrations do **not** enable the PostGIS extension — it must already exist in the target database, or the `geometry` columns fail to create. The dev DB has it enabled; the test container's `postgis/postgis` image auto-enables it in `lumotrack_test`.

---

## Tests

`bun test` (Bun's built-in, Jest-compatible runner). Test files are `*.test.ts`, colocated with the code they cover (e.g. `shipments.route.test.ts` next to `shipments.route.ts`).

**Test database.** Tests run against a real Postgres + PostGIS instance — services use PostGIS `point` queries, so the DB can't be meaningfully mocked. `docker-compose.yml` provides a disposable, test-only Postgres on host port **5433** with database `lumotrack_test` (PostGIS auto-enabled by the image). It's separate from the dev DB on 5432 and the app never touches it.

**Mocked boundaries** (`test/setup.ts`, loaded via the `bunfig.toml` preload — runs before the app is imported):

- `@/lib/auth` — sessions are injected, not real. Use `loginAs()` / `logout()` / `denyPermission()` from `test/helpers/auth.ts` to set the current user. Don't test Better Auth itself (maintained lib); **do** test that routes enforce `sessionMiddleware` / `requirePermission` / `requireVerifiedOrg`.
- `@/lib/queue` — BullMQ opens a Redis connection on import, so it's stubbed; tests need no Redis. (Resend/Twilio only construct clients on import, so mock them only when testing flows that actually send.)
- `@/lib/tracking` — same reason (Redis on import). Stubbed with the **spy mocks** in `test/helpers/tracking.ts` (`trackingMocks`), so tests can assert publishes/subscriptions and stub a last-known position; call `resetTrackingMocks()` in `beforeEach`.

**Helpers** (`test/helpers/db.ts`): `resetDb()` truncates all tables for isolation — call it in `beforeEach`. Seed fixtures with `seedOrg`, `seedUser`, `seedUserMember`, `seedDriver` (user + driver member + profile), `seedAddress`, `seedShipment`, `seedTag`, `seedVerification`.

**WebSocket endpoints** are tested without real sockets (`test/helpers/ws.ts`): `requestUpgrade(path)` sends the request through the full middleware chain with a fake Bun server that captures the WS event listeners — assert on `response.status` for auth/authorization branches, then invoke `events.onMessage/onOpen/onClose` directly with `fakeSocket()` to test handler logic against `trackingMocks`.

**Writing an endpoint test:** the mocks are already in place — just `loginAs(...)`, seed rows, then `app.request(path, { method, body })` and assert on `res.status` / `await res.json()`. See `app/features/shipments/shipments.route.test.ts`. Suites currently cover shipments, events, reviews, tags, verification, addresses, and drivers (auth gating, business-logic branches, cross-org isolation, pagination). The AI routes are not yet tested (they need the model provider mocked).

**Commands:**

- `pnpm db:up` — start the test Postgres (after a reboot or `pnpm db:down`)
- `pnpm test:migrate` — migrate `lumotrack_test` (first time, or after adding a migration)
- `pnpm test` / `pnpm test:watch` — run the suite

Env comes from `.env.test` (gitignored — same vars as `.env`, with `DATABASE_URL` pointing at `lumotrack_test` on :5433), which `bun test` loads automatically.
