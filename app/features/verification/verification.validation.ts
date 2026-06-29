import { z } from "zod";

const documentSchema = z.object({
  type: z.string().min(1).max(50),
  url: z.url(),
});

export const submitVerificationSchema = z.object({
  legalName: z.string().min(1).max(200),
  registrationNumber: z.string().min(1).max(100),
  taxId: z.string().min(1).max(100).optional().nullable(),
  contactPhone: z.string().min(7).max(20).optional().nullable(),
  contactEmail: z.email().optional().nullable(),
  addressLine: z.string().min(1).max(300).optional().nullable(),
  documents: z.array(documentSchema).optional(),
});

export const reviewVerificationSchema = z
  .object({
    decision: z.enum(["verified", "rejected"]),
    rejectionReason: z.string().min(1).max(500).optional(),
  })
  .refine((d) => d.decision !== "rejected" || !!d.rejectionReason, {
    message: "rejectionReason is required when rejecting",
    path: ["rejectionReason"],
  });

export const orgIdParamSchema = z.object({
  organizationId: z.string().min(1),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
