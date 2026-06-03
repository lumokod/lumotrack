import { userTypeEnum } from "@/db/schema";

export type UserRole = "user" | "admin";
export type UserType = (typeof userTypeEnum.enumValues)[number];
