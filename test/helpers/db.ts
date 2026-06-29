import { sql } from "drizzle-orm";
import { db } from "@/core/db";
import { organization, user, member } from "@/db/schema";

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
