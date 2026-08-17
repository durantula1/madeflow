import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.uuid(),
  templateId: z.uuid(),
  title: z.string().trim().min(2, "Заглавието е задължително.").max(160),
  targetDeliveryDate: z.union([z.literal(""), z.iso.date()]).optional(),
  siteAddress: z.string().trim().max(500).optional(),
});

export const saveDraftSchema = z.object({
  orderId: z.uuid(),
  revision: z.coerce.number().int().positive(),
  values: z.record(z.string(), z.unknown()),
  commercial: z.record(z.string(), z.unknown()),
});

