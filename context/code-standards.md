# Code Standards

## Conventions

- **Feature structure:** `*.route.ts` / `*.service.ts` / `*.types.ts` / `*.validation.ts` / `*.util.ts`
- **Imports:** Use the `@/` path alias (e.g. `@/core/db`, `@/features/shipments/shipments.service`)
- **Errors:** Use `HTTPException` for all error responses (consistent status + message)
- **Validation:** All request inputs (body, query, params) validated with Zod + `@hono/standard-validator`
- **DB transactions:** Use `db.transaction()` for multi-table atomic writes
- **Pagination:** Cursor-based using uuidv7 ordering; `PAGE_LIMIT = 20`
- **Geometry — insert vs output:** PostGIS geometry columns are written as `{ x: longitude, y: latitude }` and read back as `row.column.x` / `row.column.y`; always strip via a `format*` util before returning in responses (output shape: `{ longitude, latitude }`)
- **uuidv7 on insert:** PKs are not DB-generated — always pass `id: uuidv7()` explicitly in `.values()`
- **Hono context:** after `sessionMiddleware`, use `c.get("user").id` for the current user's ID and `c.get("session").activeOrganizationId!` for the active org ID

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

---

## Migrations

Run `pnpm generate` after changing any schema file, then `pnpm migrate` to apply. Migration files live in `src/db/migrations/`. The first migration enables the PostGIS extension.

---

## Tests

No test suite configured. Manual testing via the running server is the current workflow.
