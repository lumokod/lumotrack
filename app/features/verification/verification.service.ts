import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { organization, organizationVerification } from "@/db/schema";
import type {
  SubmitVerificationInput,
  ReviewVerificationInput,
} from "./verification.validation";

export async function getVerification(orgId: string) {
  const record = await db.query.organizationVerification.findFirst({
    where: eq(organizationVerification.organizationId, orgId),
  });
  if (!record) {
    throw new HTTPException(404, { message: "No verification submitted" });
  }
  return record;
}

export async function getPendingVerifications() {
  return db.query.organizationVerification.findMany({
    where: eq(organizationVerification.status, "pending"),
  });
}

export async function submitVerification(
  orgId: string,
  data: SubmitVerificationInput,
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .insert(organizationVerification)
      .values({ organizationId: orgId, ...data, status: "pending" })
      .onConflictDoUpdate({
        target: organizationVerification.organizationId,
        set: {
          ...data,
          status: "pending",
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    await tx
      .update(organization)
      .set({ verificationStatus: "pending" })
      .where(eq(organization.id, orgId));

    return record;
  });
}

export async function reviewVerification(
  orgId: string,
  reviewerId: string,
  data: ReviewVerificationInput,
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .update(organizationVerification)
      .set({
        status: data.decision,
        rejectionReason:
          data.decision === "rejected" ? data.rejectionReason : null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationVerification.organizationId, orgId),
          eq(organizationVerification.status, "pending"),
        ),
      )
      .returning();

    if (!record) {
      throw new HTTPException(404, {
        message: "No pending verification found for this organization",
      });
    }

    await tx
      .update(organization)
      .set({ verificationStatus: data.decision })
      .where(eq(organization.id, orgId));

    return record;
  });
}
