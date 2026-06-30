import { sql } from "drizzle-orm";
import { db } from "@/core/db";
import {
  organization,
  user,
  member,
  addresses,
  shipments,
  driverProfiles,
  tags,
  organizationVerification,
} from "@/db/schema";

/**
 * Truncate every app table between tests for isolation. Excludes Drizzle's
 * migrations table and PostGIS's `spatial_ref_sys`. CASCADE clears FK-dependent
 * rows in one pass.
 */
export async function resetDb() {
  await db.execute(sql`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('__drizzle_migrations', 'spatial_ref_sys')
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

export async function seedOrg(opts: {
  id: string;
  name?: string;
  slug?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
}) {
  await db.insert(organization).values({
    id: opts.id,
    name: opts.name ?? "Test Org",
    slug: opts.slug ?? opts.id,
    createdAt: new Date(),
    verificationStatus: opts.verificationStatus ?? "verified",
  });
}

/** Seed a bare user row (no org membership). `role` is the platform role. */
export async function seedUser(opts: {
  userId: string;
  role?: string;
  email?: string;
}) {
  await db.insert(user).values({
    id: opts.userId,
    name: "Test User",
    email: opts.email ?? `${opts.userId}@test.dev`,
    emailVerified: true,
    role: opts.role ?? "user",
  });
}

/** Seed a user and make them a member of an org (default role: owner). */
export async function seedUserMember(opts: {
  userId: string;
  orgId: string;
  role?: string;
  email?: string;
}) {
  await db.insert(user).values({
    id: opts.userId,
    name: "Test User",
    email: opts.email ?? `${opts.userId}@test.dev`,
    emailVerified: true,
  });
  await db.insert(member).values({
    id: `mem_${opts.userId}`,
    organizationId: opts.orgId,
    userId: opts.userId,
    role: opts.role ?? "owner",
    createdAt: new Date(),
  });
}

/** Seed a user who is a `driver` member of an org, plus their driver profile. */
export async function seedDriver(opts: {
  userId: string;
  orgId: string;
  isAvailable?: boolean;
  email?: string;
}) {
  await seedUserMember({
    userId: opts.userId,
    orgId: opts.orgId,
    role: "driver",
    email: opts.email,
  });
  await db.insert(driverProfiles).values({
    userId: opts.userId,
    organizationId: opts.orgId,
    isAvailable: opts.isAvailable ?? true,
  });
}

/** Seed an org-scoped pickup address. Returns the generated id. */
export async function seedAddress(opts: { orgId: string }) {
  const [row] = await db
    .insert(addresses)
    .values({
      street: "1 Test St",
      city: "Testville",
      country: "Testland",
      organizationId: opts.orgId,
    })
    .returning({ id: addresses.id });
  return row.id;
}

/** Seed a shipment. Returns the inserted row (with its generated id). */
export async function seedShipment(opts: {
  orgId: string;
  status?: (typeof shipments.$inferInsert)["status"];
  originAddressId?: string | null;
  clientContactEmail?: string | null;
  clientContactPhone?: string | null;
  deliveryCode?: string | null;
  driverUserId?: string | null;
  content?: string;
  weight?: number;
  destination?: { longitude: number; latitude: number };
}) {
  const dest = opts.destination ?? { longitude: 35.5, latitude: 33.9 };
  const [row] = await db
    .insert(shipments)
    .values({
      content: opts.content ?? "Books",
      weight: opts.weight ?? 3.2,
      destination: { x: dest.longitude, y: dest.latitude },
      organizationId: opts.orgId,
      ...(opts.status !== undefined && { status: opts.status }),
      ...(opts.originAddressId !== undefined && {
        originAddressId: opts.originAddressId,
      }),
      ...(opts.clientContactEmail !== undefined && {
        clientContactEmail: opts.clientContactEmail,
      }),
      ...(opts.clientContactPhone !== undefined && {
        clientContactPhone: opts.clientContactPhone,
      }),
      ...(opts.deliveryCode !== undefined && {
        deliveryCode: opts.deliveryCode,
      }),
      ...(opts.driverUserId !== undefined && {
        driverUserId: opts.driverUserId,
      }),
    })
    .returning();
  return row;
}

/** Seed an org-scoped tag. Returns the generated id. */
export async function seedTag(opts: { orgId: string; name?: string }) {
  const [row] = await db
    .insert(tags)
    .values({ name: opts.name ?? "express", organizationId: opts.orgId })
    .returning({ id: tags.id });
  return row.id;
}

/** Seed an organization_verification record (defaults to a pending submission). */
export async function seedVerification(opts: {
  orgId: string;
  status?: "pending" | "verified" | "rejected";
}) {
  await db.insert(organizationVerification).values({
    organizationId: opts.orgId,
    legalName: "Test LLC",
    registrationNumber: "REG-123",
    status: opts.status ?? "pending",
  });
}
