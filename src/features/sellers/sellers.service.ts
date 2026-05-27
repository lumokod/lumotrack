import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { sellers, user } from "@/db/schema";
import { HTTPException } from "hono/http-exception";

export async function getSeller(userId: string) {
  const [seller] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.userId, userId))
    .limit(1);
  if (!seller) {
    throw new HTTPException(404, { message: "Seller profile not found" });
  }
  return seller;
}

export async function registerSeller(
  userId: string,
  userType: string | null | undefined,
) {
  if (userType) {
    throw new HTTPException(409, {
      message: "User already has a role assigned",
    });
  }

  const [existing] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.userId, userId))
    .limit(1);

  if (existing) {
    throw new HTTPException(409, { message: "Already registered as a seller" });
  }

  const { seller, updatedUser } = await db.transaction(async (tx) => {
    const [newSeller] = await tx.insert(sellers).values({ userId }).returning();
    const [updatedUser] = await tx
      .update(user)
      .set({ userType: "seller" })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        userType: user.userType,
      });
    return { seller: newSeller, updatedUser };
  });

  return { seller, user: updatedUser };
}
