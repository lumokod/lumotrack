import { userTypeEnum } from "@/db/schema";

export type UserType = (typeof userTypeEnum.enumValues)[number];
