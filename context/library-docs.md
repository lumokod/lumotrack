# Library Usage Patterns

Project-specific usage patterns for the four non-trivial libraries in this codebase.
Read this before writing any route, service, middleware, or AI tool.

---

## Hono

### Route setup

Every route file uses the `AppEnv` generic — never omit it:

```ts
import { Hono } from "hono";
import { type AppEnv } from "@/shared/middleware/auth.middleware";

export const myRoutes = new Hono<AppEnv>();
```

### Middleware order

Always apply in this exact order at the top of the route file:

```ts
myRoutes.use(sessionMiddleware);   // 1. validate session
myRoutes.use(requireActiveOrg);    // 2. ensure org is set
// requirePermission goes per-route, not here
```

### Validation

Use `sValidator` from `@hono/standard-validator`, then access with `c.req.valid()`:

```ts
import { sValidator } from "@hono/standard-validator";

route.get("/:id",
  requirePermission({ shipment: ["read"] }),
  sValidator("param", idParamSchema),   // "param" | "json" | "query"
  sValidator("query", paginationSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { cursor } = c.req.valid("query");
  }
);
```

### Context variables

After `sessionMiddleware` runs:

```ts
c.get("user").id                           // current user's ID
c.get("user").name                         // current user's name/email
c.get("session").activeOrganizationId!     // current org ID (assert non-null after requireActiveOrg)
```

### Errors

Always throw `HTTPException` — never return error JSON manually:

```ts
import { HTTPException } from "hono/http-exception";

throw new HTTPException(404, { message: "Shipment not found" });
throw new HTTPException(400, { message: "Cannot cancel a delivered shipment" });
throw new HTTPException(403, { message: "Forbidden" });
```

### Registering routes

Mount in `src/core/app.ts`:

```ts
app.route("/api/myfeature", myFeatureRoutes);
```

---

## Better Auth

### What it owns

Better Auth handles session validation, org membership, and permission checks. Never reimplement these in service layer — always call `auth.api.*` from middleware only.

### Permission check shape

```ts
requirePermission({ shipment: ["read"] })          // one resource
requirePermission({ shipment: ["create", "read"] }) // multiple actions
```

The `permissions` object maps resource names to action arrays. Defined resources and actions are in `src/lib/plugins/organization.plugin.ts`.

### Calling auth API in middleware

Always pass `c.req.raw.headers` — this is how Better Auth reads the session cookie:

```ts
const result = await auth.api.getSession({ headers: c.req.raw.headers });
const result = await auth.api.hasPermission({ headers: c.req.raw.headers, body: { permissions } });
```

### TypeScript types

Context variable types are inferred directly from Better Auth:

```ts
type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};
```

Never manually define user/session types — always use `auth.$Infer`.

### Organization rules

- One org per user (enforced by `organizationLimit: 1` in the plugin)
- Default invitation role is `driver`
- `session.activeOrganizationId` is the org scoping key used in every DB query

---

## Drizzle ORM

### Two query styles — when to use each

**SQL-style** (`db.select().from()`) — use for simple queries, explicit column selection, joins:

```ts
// single row
const [row] = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);

// specific columns only
const drivers = await db
  .select({ id: user.id, name: user.name })
  .from(member)
  .innerJoin(user, eq(member.userId, user.id))
  .where(eq(member.organizationId, orgId));
```

**Relational API** (`db.query.*`) — use only when you need to load relations in one call:

```ts
const shipment = await db.query.shipments.findFirst({
  where: and(eq(shipments.id, id), eq(shipments.organizationId, orgId)),
  with: { events: { orderBy: asc(events.createdAt) } },
});
```

### Single row fetch pattern

Always destructure the array and check for undefined:

```ts
const [shipment] = await db.select().from(shipments).where(...).limit(1);
if (!shipment) throw new HTTPException(404, { message: "Shipment not found" });
```

### Insert pattern

Always provide `id: uuidv7()` — PKs are not DB-generated defaults:

```ts
import { uuidv7 } from "uuidv7";

const [created] = await db
  .insert(shipments)
  .values({ id: uuidv7(), content: "...", organizationId: orgId, ... })
  .returning();
```

Always `.returning()` to get the inserted row back.

### Update / delete pattern

```ts
const [updated] = await db
  .update(shipments)
  .set({ status: "cancelled" })
  .where(and(eq(shipments.id, id), eq(shipments.organizationId, orgId)))
  .returning();
```

### PostGIS geometry

Insert uses `{ x: longitude, y: latitude }`:

```ts
.values({ location: { x: data.longitude, y: data.latitude } })
```

Read back as `row.column.x` (longitude) and `row.column.y` (latitude). Always strip via a `format*` util before returning in responses — never expose raw geometry.

### TypeScript types

```ts
typeof shipments.$inferSelect   // type of a row read from the table
typeof shipments.$inferInsert   // type for inserting into the table
```

### Transactions

Use for any write that spans multiple tables:

```ts
await db.transaction(async (tx) => {
  await tx.insert(tableA).values(...);
  await tx.insert(tableB).values(...);
});
```

### Pagination

Reuse `paginateShipments` from `shipments.util.ts` as the model for any paginated shipment query. For other tables, follow the same pattern: `gt(table.id, cursor)` + `orderBy(asc(table.id))` + fetch `PAGE_LIMIT + 1` rows to determine `hasNextPage`.

---

## Vercel AI SDK + @ai-sdk/anthropic

### Setup

One Anthropic client instance per file, keyed with the env var:

```ts
import { createAnthropic } from "@ai-sdk/anthropic";
const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
```

### Generating structured output

Use `generateText` with `Output.object` — not `generateObject`:

```ts
import { generateText, Output, stepCountIs } from "ai";

const { output } = await generateText({
  model: anthropic("claude-sonnet-4-6"),
  output: Output.object({ schema: chatResponseSchema }),
  system: SYSTEM_PROMPT,
  prompt: question,
  tools: getTools(orgId),
  stopWhen: stepCountIs(5),   // max agentic steps
});
```

### Defining tools

Use `tool()` from `"ai"`. The parameter is `inputSchema` (not `parameters`):

```ts
import { tool } from "ai";
import { z } from "zod";

const my_tool = tool({
  description: "What this tool does — be specific, Claude reads this",
  inputSchema: z.object({ shipment_id: z.string() }),
  execute: async ({ shipment_id }) => someService(shipment_id, orgId),
});
```

### Tool file structure

Each feature's tools are grouped in a `get<Feature>Tools(orgId)` function and spread into the aggregator:

```ts
// tools/myfeature.tools.ts
export function getMyFeatureTools(orgId: string) {
  return { my_tool: tool({ ... }) };
}

// tools/index.ts
export function getTools(orgId: string) {
  return {
    ...getShipmentTools(orgId),
    ...getEventTools(orgId),
    ...getMyFeatureTools(orgId),   // add here
  };
}
```

### Critical rules

- Every tool's `execute` must receive `orgId` via closure — never trust tool input for org scoping
- Tools call service functions directly — no HTTP, no fetch
- If a tool returns data the frontend renders, add it to `chatResponseSchema` in `src/features/ai/validations/index.ts`
- Keep `stopWhen: stepCountIs(5)` — do not increase without good reason
- Model is always `claude-sonnet-4-6` — do not change

---

## Resend

### Setup

The Resend client and `FROM` constant live in `src/lib/mail/client.ts` and are shared across all email files:

```ts
import { Resend } from "resend";
import { env } from "@/core/env";

export const resend = new Resend(env.RESEND_API_KEY);
export const FROM = "LumoTrack <onboarding@resend.dev>";
```

### Structure

```
src/lib/mail/
  client.ts     # Resend instance + FROM constant
  auth.ts       # sendVerificationEmail
  shipments.ts  # sendShipmentUpdateEmail
  index.ts      # re-exports everything
```

All consumers import from `@/lib/mail` — the index re-exports all helpers.

### Adding a new email

1. Create or pick the relevant domain file (e.g. `shipments.ts`, `auth.ts`)
2. Import `resend` and `FROM` from `./client`
3. Export the new function
4. Re-export it from `index.ts`

```ts
// src/lib/mail/shipments.ts
import { resend, FROM } from "./client";

export async function sendSomeEmail(to: string, data: SomeData) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "...",
    html: `...`,
  });
}
```

All emails use the same `FROM` address. Update the domain once a verified sender is set up in Resend.

---

## BullMQ + Redis

### Setup

Queue and connection live in `src/lib/queue/client.ts`. Worker starts in `src/index.ts` via `startEmailWorker()`.

### Enqueuing a job

```ts
import { emailQueue } from "@/lib/queue";

await emailQueue.add("shipment-update", {
  type: "shipment-update",
  email: "user@example.com",
  shipmentContent: "...",
  eventStatus: "departed",
});
```

### Adding a new job type

1. Add a new variant to the `EmailJobData` union in `src/lib/queue/jobs.ts`
2. Add a handler branch in the worker in `src/lib/queue/worker.ts`

### Rules

- Always enqueue after the DB transaction commits — never inside `db.transaction()`
- The worker runs in the same process as the server (started in `src/index.ts`)
- Failed jobs are logged via the `worker.on("failed")` handler — BullMQ retries automatically

---

## Zod v4

### Import

```ts
import { z } from "zod";   // not "zod/v4"
```

### Reusing DB enum values

```ts
import { shipmentStatusEnum } from "@/db/schema";
z.enum(shipmentStatusEnum.enumValues)
```

### Extending schemas

Use `.extend()` to add fields to an existing schema (common in AI tools):

```ts
const toolSchema = updateShipmentSchema.extend({ shipment_id: z.string() });
```
