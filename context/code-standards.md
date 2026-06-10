# Code Standards

## Conventions

- **Feature structure:** `*.route.ts` / `*.service.ts` / `*.types.ts` / `*.validation.ts` / `*.util.ts`
- **Imports:** Use the `@/` path alias (e.g. `@/core/db`, `@/features/shipments/shipments.service`)
- **Errors:** Use `HTTPException` for all error responses (consistent status + message)
- **Validation:** All request inputs (body, query, params) validated with Zod + `@hono/standard-validator`
- **DB transactions:** Use `db.transaction()` for multi-table atomic writes
- **Pagination:** Cursor-based using uuidv7 ordering; `PAGE_LIMIT = 20`
- **Geometry — insert vs output:** PostGIS geometry columns are written as `{ x: longitude, y: latitude }` and read back as `row.column.x` / `row.column.y`; always strip via a `format*` util before returning in responses (output shape: `{ longitude, latitude }`)
- **uuidv7 on insert:** PKs are not DB-generated — always pass `id: uuidv7()` explicitly in `.values()`. Exception: Better Auth-managed tables (`user`, `session`, `organization`, `member`, `invitation`) use their own ID format — never validate these IDs with `z.uuidv7()`, use `z.string().min(1)` instead
- **Hono context:** after `sessionMiddleware`, use `c.get("user").id` for the current user's ID and `c.get("session").activeOrganizationId!` for the active org ID
- **Email templates:** React Email `.tsx` files in `src/lib/mail/templates/` must have `/** @jsxImportSource react */` as the first line — this overrides the global `hono/jsx` tsconfig setting. Never remove this pragma; linters may strip it but it is load-bearing
- **Background jobs:** never send emails inline from a service. Always enqueue via `emailQueue.add(...)` after the DB transaction commits — never inside `db.transaction()`. Add new job types to `EmailJobData` in `src/lib/queue/jobs.ts` and handle them in `src/lib/queue/worker.ts`

---

## How to Extend the Project

### Adding a new feature module

1. **Schema** — add a new file in `src/db/schema/`, export the table from `src/db/schema/index.ts`
2. **Migration** — run `pnpm generate` then `pnpm migrate`
3. **Service** — `src/features/<feature>/<feature>.service.ts`; functions throw `HTTPException` on failure, always scope queries by `orgId`
4. **Types** — `src/features/<feature>/<feature>.types.ts`; derive from Drizzle's `$inferInsert` / `$inferSelect` where possible; all domain types (including enum aliases like `EventStatus`, `ShipmentStatus`) must live here — never redefine them inline in service files or other modules, always import from the owning feature's types file
5. **Validation** — `src/features/<feature>/<feature>.validation.ts`; Zod schemas for request body/params/query
6. **Route** — `src/features/<feature>/<feature>.route.ts`; apply `sessionMiddleware` → `requireActiveOrg` → `requirePermission(...)` in that order
7. **Register** — import and mount in `src/core/app.ts` via `app.route("/api/<feature>", <feature>Routes)`

### Adding a new AI tool

1. Add the tool function to the relevant file in `src/features/ai/tools/` (or create a new `<feature>.tools.ts`)
2. If creating a new file, export a `get<Feature>Tools(orgId)` function and spread it into the return object in `src/features/ai/tools/index.ts`
3. If the tool returns data the frontend should render, add the field to `chatResponseSchema` in `src/features/ai/validations/index.ts`

### Service conventions

- Always include `orgId` in queries — never fetch across org boundaries
- Throw `new HTTPException(404, { message: "..." })` for not-found, `400` for invalid state transitions
- For geometry columns, use a `format*` util to strip raw PostGIS values before returning (see `shipments.util.ts`)
- Use `db.transaction()` for writes that span multiple tables

### Adding a new RBAC resource

1. Add the resource and its actions to `statements` in `src/lib/auth/plugins/organization.plugin.ts`
2. Add the allowed actions to each role (`owner`, `seller`, `driver`) — omit entirely from a role to deny access
3. Use `requirePermission({ <resource>: ["<action>"] })` in the route

### Restricting a Better Auth built-in route

Add a named route in `src/features/auth/auth.route.ts` **before** the `/*` catch-all, apply `sessionMiddleware` + `requirePermission`, then forward to `auth.handler`:

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

Run `pnpm generate` after changing any schema file, then `pnpm migrate` to apply. Migration files live in `src/db/migrations/`. The first migration enables the PostGIS extension.

---

## Tests

No test suite configured. Manual testing via the running server is the current workflow.
