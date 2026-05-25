import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/db";
import { deliveryPartners, user } from "@/db/schema";

export async function registerDeliveryPartner(userId: string, userType: string | null | undefined) {
  if (userType) {
    throw new HTTPException(409, { message: "User already has a role assigned" });
  }

  const [existing] = await db
    .select()
    .from(deliveryPartners)
    .where(eq(deliveryPartners.userId, userId))
    .limit(1);

  if (existing) {
    throw new HTTPException(409, { message: "Already registered as a delivery partner" });
  }

  const { deliveryPartner, updatedUser } = await db.transaction(async (tx) => {
    const [newPartner] = await tx.insert(deliveryPartners).values({ userId }).returning();
    const [updatedUser] = await tx
      .update(user)
      .set({ userType: "delivery_partner" })
      .where(eq(user.id, userId))
      .returning({ id: user.id, name: user.name, email: user.email, image: user.image, userType: user.userType });
    return { deliveryPartner: newPartner, updatedUser };
  });

  return { deliveryPartner, user: updatedUser };
}
