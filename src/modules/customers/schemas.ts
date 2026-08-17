import { z } from "zod";

export const customerInputSchema = z.object({
  kind: z.enum(["person", "company"]),
  name: z.string().trim().min(2, "Името е задължително.").max(160),
  companyName: z.string().trim().max(160).optional(),
  email: z.union([z.literal(""), z.email()]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

