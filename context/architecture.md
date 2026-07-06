# Architecture

## Project Structure

```
app/
  core/           # App bootstrap, DB connection, env validation
  db/
    schema/       # Drizzle table definitions
    migrations/   # Auto-generated SQL migration files
  features/       # Feature modules (route + service + types + validation)
    auth/
    drivers/
    shipments/
    events/
    verification/ # org KYB submission + admin review (no .types.ts — types live in .validation.ts)
    reviews/      # customer delivery reviews via signed link (review-link.ts = HMAC sign/verify; types in .validation.ts)
    tags/         # org-scoped shipment tags (CRUD + default-tag seeding); shipment attach/detach lives in shipments.route.ts
    ai/
      tools/      # AI tool definitions (shipments.tools.ts, events.tools.ts)
      validations/ # AI response schemas (chatResponseSchema)
  lib/
    auth/
      index.ts    # Better Auth configuration
      hooks/
        database.hooks.ts      # databaseHooks (exported) — composes per-model slices; session slice auto-sets activeOrganizationId on create
        organization.hooks.ts  # beforeAddMember (one-org-per-user enforcement), afterAddMember, beforeCreateInvitation, beforeCreateOrganization, afterCreateOrganization (seeds default tags for the new org)
      plugins/
        organization.plugin.ts  # Custom org plugin — roles, RBAC statements
    mail/
      client.ts   # Resend instance + FROM constant
      auth.ts     # sendVerificationEmail
      shipments.ts # sendShipmentUpdateEmail
      reviews.ts  # sendReviewRequestEmail
      index.ts    # re-exports all helpers
      templates/
        ShipmentUpdateEmail.tsx  # React Email template (requires /** @jsxImportSource react */ pragma)
        VerificationEmail.tsx    # React Email template (requires /** @jsxImportSource react */ pragma)
        ReviewRequestEmail.tsx   # React Email template (requires /** @jsxImportSource react */ pragma)
    sms/
      client.ts   # Twilio client instance + FROM constant
      shipments.ts # sendShipmentUpdateSms — includes delivery code in out_for_delivery messages
      reviews.ts  # sendReviewRequestSms — review link sent on delivery
      index.ts    # re-exports all helpers
    queue/
      client.ts   # BullMQ connection + notificationQueue instance + addNotification helper
      jobs.ts     # NotificationJobData discriminated union type
      worker.ts   # startNotificationWorker — processes email and SMS jobs
      index.ts    # re-exports
    tracking/
      client.ts   # Redis pub/sub bus for live driver tracking + last-known position (TTL)
      messages.ts # TrackingMessage discriminated union (location | offline)
      index.ts    # re-exports
  shared/
    middleware/   # auth.middleware.ts — session + RBAC
    validations/  # common.ts — shared Zod schemas
  index.ts        # Entry point (port 3000)
```

---

## API Routes

All routes are prefixed `/api`. Protected routes require a valid session (via `sessionMiddleware`).

| Prefix                      | Auth                            | Notes                                                                                                   |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/api/auth/*`               | public                          | Delegated to Better Auth handler. Exception: `GET /api/auth/organization/get-full-organization` requires `organization: read` permission (intercepted before catch-all) |
| `/api/drivers/me/locations`   | session + org                   | POST (add location), DELETE /:locationId (remove)                                                       |
| `/api/drivers/me/shipments`   | session + org                   | GET (paginated list), GET /:id                                                                          |
| `/api/drivers/me/availability`| session + org                   | PATCH — driver toggles isAvailable on their profile                                                     |
| `/api/drivers/me/tracking`    | session + org + `location:create` | GET (**WebSocket**) — driver streams `{ latitude, longitude }` pings for live tracking                |
| `/api/shipments/:id/tracking` | session + org + `shipment:read` | GET (**WebSocket**) — seller watches the assigned driver's live position for one shipment              |
| `/api/shipments`              | session + org                   | GET (paginated), GET /status/:status, GET /tags?tagIds=a,b (filter by tags, OR match), GET /:id (includes `tags[]`), POST, PATCH /:id, PATCH /:id/cancel, PATCH /:id/assign |
| `/api/shipments/:id/tags`     | session + org                   | GET (`tag:read` — shipment's tags), PUT (`tag:update` — replace the shipment's tag set, idempotent)      |
| `/api/shipments/:id/events`   | session + org                   | POST (log checkpoint → updates shipment status + enqueues notifications), GET (event history)            |
| `/api/addresses`              | session + org                   | GET (list org addresses), POST (create), DELETE /:id                                                    |
| `/api/verification`           | session (+ org / admin per route) | GET (own org KYB, `organization:read`), POST (submit/resubmit, `organization:update`); GET /pending and PATCH /:organizationId/review require platform admin |
| `/api/reviews`                | mixed                           | POST (public — customer submits via signed link, HMAC-authorized, no session), GET (session + org + `shipment:read` — list org's reviews) |
| `/api/tags`                   | session + org                   | GET (`tag:read` — list), POST (`tag:create`), PATCH /:id (`tag:update`), DELETE /:id (`tag:delete`)      |
| `/api/ai`                     | session + org + shipment:create | POST /chat — AI shipment assistant                                                                      |

---

## Database Schema

- **auth tables** (`auth.schema.ts`) — user, session, account, verification, organization, member, invitation; session has `activeOrganizationId`. `organization` carries two custom `additionalFields` columns: `color` (default `#f59e0b`) and `verificationStatus` (`pending | verified | rejected`, default `pending`) — the latter is the fast gate column read by `requireVerifiedOrg`
- **organization verification** (`organization-verification.schema.ts`) — `organizationVerification`, the full KYB record, one-to-one with organization (unique `organizationId` FK, cascade delete). Holds submitted business data (`legalName`, `registrationNumber`, `taxId`, contact fields, `documents` jsonb) plus the review workflow (`status` via `verificationStatusEnum`, `rejectionReason`, `reviewedBy` user FK, `reviewedAt`); indexed on `status`. Kept separate from the auth `organization` table so Better Auth never touches it; the org's `verificationStatus` column mirrors this record's `status` and is kept in sync within a transaction
- **drivers** (`drivers.schema.ts`) — `driverLocations` (PostGIS POINT geometry, SRID 4326); GiST spatial index; `driverProfiles` (isAvailable boolean, unique per userId+organizationId, auto-created via `afterAddMember` hook when role is `driver`)
- **addresses** (`addresses.schema.ts`) — addresses; `street`, `city`, `country` are required; `state` and `zipCode` are nullable; FK to organization with cascade delete
- **shipments** (`shipments.schema.ts`) — `shipments` with PostGIS `destination` (coords for live tracking + reverse geocoding on frontend), nullable `originAddressId` FK to addresses (assigned after creation), nullable `clientContactEmail` + `clientContactPhone` (snapshot of recipient contact at time of creation), nullable `deliveryCode` varchar(6) (generated when driver logs `out_for_delivery`, cleared after `delivered`), FK to organization, nullable user FK (assigned driver), status enum (`created | assigned | picked_up | in_transit | out_for_delivery | delivered | cancelled`). Many-to-many with `tags` (via `shipment_tags`) and with `products` (via `orders`)
- **tags** (`tags.schema.ts`) — `tags`, org-scoped shipment labels with `name` (varchar 50, normalized lowercase) and optional `description` (varchar 255); `unique(organizationId, name)` so names are unique per org (effectively case-insensitive via the normalization). `shipment_tags` is the many-to-many junction (composite PK `(shipmentId, tagId)`, both cascade). New orgs are seeded a default tag catalog via the `afterCreateOrganization` hook (`seedDefaultTags` in `tags.service.ts`, idempotent via `onConflictDoNothing`)
- **products** (`products.schema.ts`) — org-scoped catalog: `name` (varchar 100), optional `sku` (varchar 50) with `unique(organizationId, sku)`, optional `description` (varchar 500), `weight` (real, per-unit), FK to organization (cascade)
- **orders** (`orders.schema.ts`) — the many-to-many junction between `shipments` and `products` (one row = N units of a product in a shipment). Composite PK `(shipmentId, productId)`; `shipmentId` cascades on shipment delete, `productId` is **restrict** so a product that appears in a shipment cannot be hard-deleted (protects shipment contents); `quantity` integer (≥1, enforced in validation). Note: despite the name, this is a line-item junction, not a customer-purchase entity
- **reviews** (`reviews.schema.ts`) — customer delivery review, one-to-one with shipment (unique `shipmentId` FK, cascade delete). `organizationId` and `driverUserId` are denormalized from the shipment (so per-org/per-driver rating aggregates need no join; `driverUserId` is `set null`). `rating` is `smallint` (1–5, enforced in Zod, not the DB), `comment` is optional varchar(1000). Indexed on `organizationId` and `driverUserId`
- **events** (`events.schema.ts`) — shipment checkpoint log; each row has `status` (own `eventStatusEnum`: `departed | arrived | delivery_attempted | held_at_facility | customs_cleared | out_for_delivery | delivered | returned`), `address` (plain text, no geometry), optional `description`, FK to shipments with cascade delete

All domain entities use **uuidv7** as primary keys. Junction tables (`shipment_tags`, `orders`) are the exception — they use composite primary keys over their two FKs, no surrogate id. PostGIS geometry columns (drivers, shipments) have GiST spatial indexes. Events use plain text address — no geometry needed since they are a history log, not a tracking source.

### Design notes

- Shipment `destination` stores coordinates (PostGIS). The frontend converts a typed address to coords via forward geocoding before sending to the API, and displays the address via reverse geocoding when rendering.
- `originAddressId` on shipments is nullable — seller creates the shipment first, assigns a pickup address later.
- `clientContactEmail` + `clientContactPhone` on shipments are nullable at creation — both must be set before a driver can be assigned.
- Before assigning a driver: shipment must have `originAddressId`, at least one of `clientContactEmail`/`clientContactPhone`, and the driver's `driverProfiles.isAvailable` must be `true`.
- Logging an event updates the shipment status atomically (transaction) and enqueues notifications after the transaction commits — never inline, never inside `db.transaction()`. Email is enqueued for all statuses if `clientContactEmail` is set. SMS is enqueued only for `out_for_delivery` and `delivered` if `clientContactPhone` is set.
- When a driver logs `out_for_delivery`: a 6-digit `deliveryCode` is generated, stored on the shipment, and included in the SMS to the client. The client shares this code with the driver to confirm delivery.
- When a driver logs `delivered`: `confirmationCode` is required in the request body and must match `shipment.deliveryCode`. On success the code is cleared from the shipment.
- Event→status mapping: `departed`→`picked_up`, `arrived`→`in_transit`, `out_for_delivery`→`out_for_delivery`, `delivered`→`delivered`. Other events are checkpoints only.
- **Live driver tracking** is ephemeral — WebSockets + Redis, nothing in Postgres. A driver opens `GET /api/drivers/me/tracking` (WS upgrade; session cookie auth like any route) and streams pings; each valid ping is stored as the driver's last-known position in Redis (`tracking:driver:<userId>:last`, 60s TTL, refreshed per ping) and published on the `tracking:driver:<userId>` pub/sub channel (`app/lib/tracking/`). A seller opens `GET /api/shipments/:id/tracking`; authorization runs inside the async `createEvents` callback **before** the upgrade (org owns the shipment, a driver is assigned, status is `assigned`→`out_for_delivery`), so failures return normal 4xx responses. On connect the watcher gets the last-known snapshot, then relayed live updates; when the driver socket closes, an `offline` message is published and the last-known key deleted. Pings faster than 1/s are dropped. Authorization is resolved at connect time — reassignment/delivery mid-watch just makes the stream go quiet. The `driverLocations` table is unrelated to live tracking (it stores the driver's saved/labeled points); events are unrelated too (history log).
- Events are immutable — no update or delete endpoints.
- Reviews: when a shipment is logged `delivered`, `enqueueNotifications` also enqueues a review request (email if `clientContactEmail`, SMS if `clientContactPhone`) containing a signed review link. The customer is not a logged-in user, so the link is authorized by an **HMAC token** over the `shipmentId` (`review-link.ts`, signed with `BETTER_AUTH_SECRET`) rather than a session — stateless, no token is persisted. The public `POST /api/reviews` verifies the token, requires the shipment to be `delivered`, and the `unique(shipmentId)` constraint enforces a single review per shipment. Link base is `BETTER_AUTH_URL`.
- Tags: org-scoped labels attached to shipments many-to-many. Names are normalized to lowercase (Zod `.trim().toLowerCase()`) so the `unique(organizationId, name)` constraint is effectively case-insensitive; duplicate-name inserts surface as `409`. `PUT /api/shipments/:id/tags` uses **set semantics** — the body's `tagIds` replaces the shipment's whole tag set (send `[]` to clear). Filtering via `GET /api/shipments/tags?tagIds=a,b` is **OR** match, implemented as a subquery on `shipments.id` (not a join) to keep one row per shipment and preserve cursor pagination. New orgs get a seeded starter catalog (`express`, `fragile`, `temperature_controlled`, `gift`, `documents`, `return`).
- Products & orders: `products` is the org's catalog; `orders` is the many-to-many junction carrying `quantity` between a shipment and its products. `products` and `orders` currently have **schema + RBAC only** — no feature module (service/route) yet. Deleting a product referenced by any `orders` row is blocked by the `restrict` FK (surface as `409` when the service is built). Editing a product reflects in existing shipment contents (line items read the live product, not a snapshot).
- Org verification (KYB): the owner submits/resubmits business data via `POST /api/verification` — this upserts the `organizationVerification` record and resets both it and the org's `verificationStatus` to `pending` in a transaction. A platform admin reviews via `PATCH /api/verification/:organizationId/review` (decision `verified | rejected`; `rejectionReason` required when rejecting), which only acts on a `pending` record and updates the record's `status` and the org's `verificationStatus` together in one transaction. Existing orgs default to `pending`, so deploying the `requireVerifiedOrg` gate blocks current sellers until verified — grandfather them with a one-off `UPDATE organization SET verification_status = 'verified'` if needed.

---

## Authorization Model

- `sessionMiddleware` — validates the Better Auth session, attaches `user` and `session` to context
- `requireActiveOrg` — ensures `session.activeOrganizationId` is set; use on all org-scoped routes
- `requirePermission(permissions)` — fine-grained RBAC via Better Auth permission API; checks the member's role against defined resource statements
- `requireVerifiedOrg` — loads the active org and rejects (403) unless its `verificationStatus === "verified"`; applied to `POST /api/shipments` so unverified orgs cannot create shipments
- `requireAdmin` — platform-level gate; requires `user.role === "admin"` (from the Better Auth `admin()` plugin). Used for org verification review. Distinct from org RBAC: org roles (`owner`/`seller`/`driver`) are scoped to a single org, whereas admin is platform-wide. No user is an admin by default — promote via `UPDATE "user" SET role = 'admin'`

A user belongs to **at most one organization**. Org creation is capped at 1 per user (`organizationLimit: 1`), and `beforeAddMember` in `organization.hooks.ts` blocks the only other path into a second org — accepting an invitation while already a member (throws `400 "User already belongs to an organization"`).

`session.activeOrganizationId` is auto-populated on session creation via `databaseHooks` in `database.hooks.ts` — it looks up the user's (single) membership and sets the org automatically, so callers never start with a null active org unless they have no membership.

### Organization roles (defined in `app/lib/auth/plugins/organization.plugin.ts`)

| Role     | Permissions                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `owner`  | shipment: create, read, update; event: create, read, update; tag/product/order: create, read, update, delete; organization: update, delete, read; + org owner statements |
| `seller` | shipment: create, read, update; event: read; tag/product/order: create, read, update, delete; organization: read |
| `driver` | shipment: read, update; event: create; location: create, delete; tag/product/order: read                |

Resources: `shipment` (create/read/update), `event` (create/read/update), `location` (create/delete), `tag` (create/read/update/delete), `product` (create/read/update/delete), `order` (create/read/update/delete), `organization` (read/update/delete). Default invitation role is `driver`. A user belongs to at most one org: creation is capped at 1 (`organizationLimit: 1`) and `beforeAddMember` rejects joining a second org (see Authorization Model).

---

## AI Feature

Located in `app/features/ai/`. Uses the Vercel AI SDK (`generateText`) with Claude Sonnet 4.6 and tool calling (max 5 steps). Tools are scoped to the authenticated org's context (`orgId` isolation). Tool inputs are validated with Zod schemas.

### Tools (in `app/features/ai/tools/`)

- `get_all_shipments`, `get_shipment_by_id`, `get_shipments_by_status`, `create_shipment`, `update_shipment`, `cancel_shipment` — shipment management (no hard delete)
- `get_org_drivers` — list org drivers (used for name-to-ID resolution before assignment)
- `assign_driver` — assign a driver to a shipment
- `get_shipment_events` — fetch event history for a shipment

### Response schema

`validations/index.ts` exports `chatResponseSchema`: `{ message, shipments?, shipment?, events? }` — structured output the frontend renders directly alongside the conversational message.
