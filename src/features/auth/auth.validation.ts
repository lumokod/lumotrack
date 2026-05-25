export const USER_TYPES = ["seller", "delivery_partner"] as const;

export const userFields = {
  userType: {
    type: "string" as const,
    nullable: true,
    input: false,
  },
};
