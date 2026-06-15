# Architecture

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
    verification/ # org KYB submission + admin review (no .types.ts — types live in .validation.ts)
    ai/
      tools/      # AI tool definitions (shipments.tools.ts, events.tools.ts)
      validations/ # AI response schemas (chatResponseSchema)
  lib/
    auth/
      index.ts    # Better Auth configuration
      hooks/
        database.hooks.ts      # databaseHooks (exported) — composes per-model slices; session slice auto-sets activeOrganizationId on create
        organization.hooks.ts  # afterAddMember, beforeCreateInvitation, beforeCreateOrganization
      plugins/
        organization.plugin.ts  # Custom org plugin — roles, RBAC statements
    mail/
      client.ts   # Resend instance + FROM constant
      auth.ts     # sendVerificationEmail
      shipments.ts # sendShipmentUpdateEmail
      index.ts    # re-exports all helpers
      templates/
        ShipmentUpdateEmail.tsx  # React Email template (requires /** @jsxImportSource react */ pragma)
        VerificationEmail.tsx    # React Email template (requires /** @jsxImportSource react */ pragma)
    sms/
      client.ts   # Twilio client instance + FROM constant
      shipments.ts # sendShipmentUpdateSms — includes delivery code in out_for_delivery messages
      index.ts    # re-exports all helpers
    queue/
      client.ts   # BullMQ connection + notificationQueue instance + addNotification helper
      jobs.ts     # NotificationJobData discriminated union type
      worker.ts   # startNotificationWorker — processes email and SMS jobs
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
| `/api/shipments`              | session + org                   | GET (paginated), GET /status/:status, GET /:id, POST, PATCH /:id, PATCH /:id/cancel, PATCH /:id/assign |
| `/api/shipments/:id/events`   | session + org                   | POST (log checkpoint → updates shipment status + enqueues notifications), GET (event history)            |
| `/api/addresses`              | session + org                   | GET (list org addresses), POST (create), DELETE /:id                                                    |
| `/api/verification`           | session (+ org / admin per route) | GET (own org KYB, `organization:read`), POST (submit/resubmit, `organization:update`); GET /pending and PATCH /:organizationId/review require platform admin |
| `/api/ai`                     | session + org + shipment:create | POST /chat — AI shipment assistant                                                                      |

---

## Database Schema

- **auth tables** (`auth.schema.ts`) — user, session, account, verification, organization, member, invitation; session has `activeOrganizationId`. `organization` carries two custom `additionalFields` columns: `color` (default `#f59e0b`) and `verificationStatus` (`pending | verified | rejected`, default `pending`) — the latter is the fast gate column read by `requireVerifiedOrg`
- **organization verification** (`organization-verification.schema.ts`) — `organizationVerification`, the full KYB record, one-to-one with organization (unique `organizationId` FK, cascade delete). Holds submitted business data (`legalName`, `registrationNumber`, `taxId`, contact fields, `documents` jsonb) plus the review workflow (`status` via `verificationStatusEnum`, `rejectionReason`, `reviewedBy` user FK, `reviewedAt`); indexed on `status`. Kept separate from the auth `organization` table so Better Auth never touches it; the org's `verificationStatus` column mirrors this record's `status` and is kept in sync within a transaction
- **drivers** (`drivers.schema.ts`) — `driverLocations` (PostGIS POINT geometry, SRID 4326); GiST spatial index; `driverProfiles` (isAvailable boolean, unique per userId+organizationId, auto-created via `afterAddMember` hook when role is `driver`)
- **addresses** (`addresses.schema.ts`) — addresses; `street`, `city`, `country` are required; `state` and `zipCode` are nullable; FK to organization with cascade delete
- **shipments** (`shipments.schema.ts`) — `shipments` with PostGIS `destination` (coords for live tracking + reverse geocoding on frontend), nullable `originAddressId` FK to addresses (assigned after creation), nullable `clientContactEmail` + `clientContactPhone` (snapshot of recipient contact at time of creation), nullable `deliveryCode` varchar(6) (generated when driver logs `out_for_delivery`, cleared after `delivered`), FK to organization, nullable user FK (assigned driver), status enum (`created | assigned | picked_up | in_transit | out_for_delivery | delivered | cancelled`)
- **events** (`events.schema.ts`) — shipment checkpoint log; each row has `status` (own `eventStatusEnum`: `departed | arrived | delivery_attempted | held_at_facility | customs_cleared | out_for_delivery | delivered | returned`), `address` (plain text, no geometry), optional `description`, FK to shipments with cascade delete

All domain entities use **uuidv7** as primary keys. PostGIS geometry columns (drivers, shipments) have GiST spatial indexes. Events use plain text address — no geometry needed since they are a history log, not a tracking source.

### Design notes

- Shipment `destination` stores coordinates (PostGIS). The frontend converts a typed address to coords via forward geocoding before sending to the API, and displays the address via reverse geocoding when rendering.
- `originAddressId` on shipments is nullable — seller creates the shipment first, assigns a pickup address later.
- `clientContactEmail` + `clientContactPhone` on shipments are nullable at creation — both must be set before a driver can be assigned.
- Before assigning a driver: shipment must have `originAddressId`, at least one of `clientContactEmail`/`clientContactPhone`, and the driver's `driverProfiles.isAvailable` must be `true`.
- Logging an event updates the shipment status atomically (transaction) and enqueues notifications after the transaction commits — never inline, never inside `db.transaction()`. Email is enqueued for all statuses if `clientContactEmail` is set. SMS is enqueued only for `out_for_delivery` and `delivered` if `clientContactPhone` is set.
- When a driver logs `out_for_delivery`: a 6-digit `deliveryCode` is generated, stored on the shipment, and included in the SMS to the client. The client shares this code with the driver to confirm delivery.
- When a driver logs `delivered`: `confirmationCode` is required in the request body and must match `shipment.deliveryCode`. On success the code is cleared from the shipment.
- Event→status mapping: `departed`→`picked_up`, `arrived`→`in_transit`, `out_for_delivery`→`out_for_delivery`, `delivered`→`delivered`. Other events are checkpoints only.
- Live driver tracking is done via `driverLocations` (updated in real-time), not via events.
- Events are immutable — no update or delete endpoints.

---

## Authorization Model

- `sessionMiddleware` — validates the Better Auth session, attaches `user` and `session` to context
- `requireActiveOrg` — ensures `session.activeOrganizationId` is set; use on all org-scoped routes
- `requirePermission(permissions)` — fine-grained RBAC via Better Auth permission API; checks the member's role against defined resource statements
- `requireVerifiedOrg` — loads the active org and rejects (403) unless its `verificationStatus === "verified"`; applied to `POST /api/shipments` so unverified orgs cannot create shipments
- `requireAdmin` — platform-level gate; requires `user.role === "admin"` (from the Better Auth `admin()` plugin). Used for org verification review. Distinct from org RBAC: org roles (`owner`/`seller`/`driver`) are scoped to a single org, whereas admin is platform-wide. No user is an admin by default — promote via `UPDATE "user" SET role = 'admin'`

`session.activeOrganizationId` is auto-populated on session creation via `databaseHooks` in `session.hooks.ts` — it looks up the user's earliest membership and sets the org automatically, so callers never start with a null active org unless they have no membership.

### Organization roles (defined in `src/lib/auth/plugins/organization.plugin.ts`)

| Role     | Permissions                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `owner`  | shipment: create, read, update; event: create, read, update; organization: update, delete, read; + org owner statements |
| `seller` | shipment: create, read, update; event: read; organization: read                                          |
| `driver` | shipment: read, update; event: create; location: create, delete                                          |

Resources: `shipment` (create/read/update), `event` (create/read/update), `location` (create/delete), `organization` (read/update/delete). Default invitation role is `driver`. Organization limit: 1 per user (creation; membership is unlimited).

---

## AI Feature

Located in `src/features/ai/`. Uses the Vercel AI SDK (`generateText`) with Claude Sonnet 4.6 and tool calling (max 5 steps). Tools are scoped to the authenticated org's context (`orgId` isolation). Tool inputs are validated with Zod schemas.

### Tools (in `src/features/ai/tools/`)

- `get_all_shipments`, `get_shipment_by_id`, `get_shipments_by_status`, `create_shipment`, `update_shipment`, `cancel_shipment` — shipment management (no hard delete)
- `get_org_drivers` — list org drivers (used for name-to-ID resolution before assignment)
- `assign_driver` — assign a driver to a shipment
- `get_shipment_events` — fetch event history for a shipment

### Response schema

`validations/index.ts` exports `chatResponseSchema`: `{ message, shipments?, shipment?, events? }` — structured output the frontend renders directly alongside the conversational message.
